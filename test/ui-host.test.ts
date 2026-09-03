import $ from "jquery";
import { afterEach, expect, it, vi } from "vitest";
import type { DocumentHost } from "../src/kernel";
import { createUI, enhancementObserverOptions } from "../src/ui/index";
import {
  documentRecordCleanup,
  documentRecords,
  listenToViewportChanges,
} from "../src/ui/floating";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

it("installs viewport reposition listeners with the shared host contract", () => {
  const listen = vi.fn();
  const listener = vi.fn();
  const host = { listen, window } as unknown as DocumentHost;

  listenToViewportChanges(host, listener);

  expect(listen).toHaveBeenNthCalledWith(1, window, "resize", listener);
  expect(listen).toHaveBeenNthCalledWith(2, window, "scroll", listener, true);
});

it("filters and releases component records by their owning document", () => {
  const otherDocument = document.implementation.createHTMLDocument("other");
  const owned = { root: document.createElement("div") };
  const foreign = { root: otherDocument.createElement("div") };
  const records = new Set([owned, foreign]);
  const cleanup = vi.fn((record: typeof owned) => records.delete(record));

  expect(documentRecords(records, document)).toEqual([owned]);
  documentRecordCleanup(records, document, cleanup)();
  expect(cleanup).toHaveBeenCalledWith(owned);
  expect(records).toEqual(new Set([foreign]));

  documentRecordCleanup(records, otherDocument)();
  expect(records).toEqual(new Set());
});

it("keeps auto enhancement inside the host observer and lifecycle contract", () => {
  const listeners: Array<{
    listener: EventListener;
    options: boolean | AddEventListenerOptions | undefined;
    target: EventTarget;
    type: string;
  }> = [];
  const observations: Array<{
    callback: MutationCallback;
    options: MutationObserverInit;
    target: Node;
  }> = [];
  const cleanups = new Map<string, () => void>();
  const host: DocumentHost = {
    document,
    window,
    listen: (target, type, listener, options) => {
      listeners.push({ listener: listener as EventListener, options, target, type });
      return vi.fn();
    },
    observe: (target, callback, options) => {
      observations.push({ callback, options, target });
      return {} as MutationObserver;
    },
    own: (_kind, owner, cleanup) => {
      cleanups.set(owner, cleanup);
      return vi.fn();
    },
  };
  vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
  const registerAction = vi.fn();
  createUI({ documentHost: host, registerAction });

  expect(listeners.filter(({ type }) => type === "resize")).toHaveLength(7);
  expect(listeners.filter(({ type }) => type === "scroll")).toHaveLength(7);
  expect(registerAction).toHaveBeenCalledTimes(165);
  expect(registerAction.mock.calls.every(([name]) => String(name).startsWith("ui."))).toBe(true);

  expect(enhancementObserverOptions).toEqual({
    attributes: true,
    attributeFilter: [
      "data-jqs",
      "data-mode",
      "data-collapsible",
      "data-value",
      "data-start",
      "data-end",
      "data-activation",
      "data-orientation",
      "data-filter",
      "data-inline",
      "data-min-length",
      "data-loading",
      "disabled",
      "label",
      "selected",
      "data-page",
      "data-page-count",
      "data-page-size",
      "data-sort",
      "data-direction",
      "data-processing",
      "data-type",
      "data-name",
      "data-required",
      "data-month",
      "data-min",
      "data-max",
      "min",
      "max",
      "step",
      "data-disabled-dates",
      "data-week-start",
      "data-disable-weekends",
      "data-show-label",
      "data-hide-label",
      "data-add-on-blur",
      "data-length",
      "data-pattern",
      "data-storage-key",
      "data-step",
      "data-selection",
      "data-expanded",
      "data-loop",
      "data-autoplay",
      "data-shortcut",
      "data-linear",
      "data-disabled",
      "data-validate",
      "data-max-files",
      "data-max-size",
      "accept",
      "multiple",
    ],
    childList: true,
    subtree: true,
  });
  const observation = observations.find(({ target }) => target === document)!;
  expect(observation.options).toBe(enhancementObserverOptions);

  const attributeToggle = document.createElement("button");
  attributeToggle.dataset.jqs = "toggle";
  document.body.append(attributeToggle);
  observation.callback(
    [
      {
        addedNodes: [] as unknown as NodeList,
        target: attributeToggle,
        type: "attributes",
      } as unknown as MutationRecord,
    ],
    {} as MutationObserver,
  );
  expect(attributeToggle.getAttribute("aria-pressed")).toBe("false");

  const addedToggle = document.createElement("button");
  addedToggle.dataset.jqs = "toggle";
  document.body.append(addedToggle);
  observation.callback(
    [
      {
        addedNodes: [addedToggle] as unknown as NodeList,
        target: document.body,
        type: "childList",
      } as unknown as MutationRecord,
    ],
    {} as MutationObserver,
  );
  expect(addedToggle.getAttribute("aria-pressed")).toBe("false");

  const unsupportedToggle = document.createElement("button");
  unsupportedToggle.dataset.jqs = "toggle";
  document.body.append(unsupportedToggle);
  observation.callback(
    [
      {
        addedNodes: [unsupportedToggle] as unknown as NodeList,
        target: document.body,
        type: "characterData",
      } as unknown as MutationRecord,
    ],
    {} as MutationObserver,
  );
  expect(unsupportedToggle.hasAttribute("aria-pressed")).toBe(false);

  const dialog = document.createElement("dialog");
  dialog.dataset.jqs = "dialog";
  const dialogChild = document.createElement("span");
  dialog.append(dialogChild);
  document.body.append(dialog);
  observation.callback(
    [
      {
        addedNodes: [] as unknown as NodeList,
        target: dialogChild,
        type: "attributes",
      } as unknown as MutationRecord,
    ],
    {} as MutationObserver,
  );
  expect(dialog.getAttribute("aria-modal")).toBe("true");

  const plainTarget = document.createElement("span");
  const invalidToast = document.createElement("div");
  invalidToast.dataset.jqs = "toast";
  invalidToast.innerHTML = '<button data-part="action">Undo</button>';
  document.body.append(plainTarget, invalidToast);
  expect(() =>
    observation.callback(
      [
        {
          addedNodes: [] as unknown as NodeList,
          target: plainTarget,
          type: "attributes",
        } as unknown as MutationRecord,
      ],
      {} as MutationObserver,
    ),
  ).not.toThrow();
  invalidToast.remove();

  const readyToggle = document.createElement("button");
  readyToggle.dataset.jqs = "toggle";
  document.body.append(readyToggle);
  const ready = listeners.find(({ type }) => type === "DOMContentLoaded")!;
  expect(ready.target).toBe(document);
  expect(ready.options).toEqual({ once: true });
  ready.listener(new Event("DOMContentLoaded"));
  expect(readyToggle.getAttribute("aria-pressed")).toBe("false");

  const deferredToggle = document.createElement("button");
  deferredToggle.dataset.jqs = "toggle";
  document.body.append(deferredToggle);
  cleanups.get("ui:auto-enhancement")!();
  ready.listener(new Event("DOMContentLoaded"));
  expect(deferredToggle.hasAttribute("aria-pressed")).toBe(false);
});

it("queues initial enhancement immediately for an already-ready document", async () => {
  const listeners: string[] = [];
  const host: DocumentHost = {
    document,
    window,
    listen: (_target, type) => {
      listeners.push(type);
      return vi.fn();
    },
    observe: () => ({}) as MutationObserver,
    own: () => vi.fn(),
  };
  const toggle = document.createElement("button");
  toggle.dataset.jqs = "toggle";
  document.body.append(toggle);
  vi.spyOn(document, "readyState", "get").mockReturnValue("complete");

  createUI({ documentHost: host, registerAction: vi.fn() });
  expect(listeners).not.toContain("DOMContentLoaded");
  expect(toggle.hasAttribute("aria-pressed")).toBe(false);

  await Promise.resolve();

  expect(toggle.getAttribute("aria-pressed")).toBe("false");
});

it("releases UI listeners, observers, and services through the document host", async () => {
  const readyState = vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
  const kernel = new Kernel($, document);
  createUI({ documentHost: kernel.documentHost, registerAction: kernel.registerAction });

  expect(kernel.resourceSummary().some(({ kind }) => kind === "listener")).toBe(true);
  expect(kernel.resourceSummary().some(({ kind }) => kind === "observer")).toBe(true);
  expect(kernel.resourceSummary().some(({ kind }) => kind === "service")).toBe(true);

  kernel.dispose();
  document.dispatchEvent(new Event("DOMContentLoaded"));
  await Promise.resolve();

  expect(kernel.resourceSummary()).toEqual([]);
  readyState.mockRestore();
});
