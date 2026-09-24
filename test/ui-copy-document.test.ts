import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
type Kind = "clipboard" | "code-block";
type UI = ReturnType<typeof uiPlugin.install>;
const stars: ReturnType<typeof installStarCore>["star"][] = [];
const restores: Array<() => void> = [];
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing copy fixture part");
  return value;
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  return required(frame.contentWindow);
}
function property(target: object, name: string, value: unknown): void {
  const old = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { configurable: true, value });
  restores.push(() => {
    if (old) Object.defineProperty(target, name, old);
    else Reflect.deleteProperty(target, name);
  });
}
function writer(owner: Window = window) {
  const write = vi.fn<(value: string) => Promise<void>>().mockResolvedValue();
  property(owner.navigator, "clipboard", { writeText: write });
  return write;
}
function install(owner: Window = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  const star = jquery.star;
  stars.push(star);
  return { owner, jquery, star, ui: star.use(uiPlugin) };
}
function fixture(kind: Kind, owner: Window = window) {
  const root = owner.document.createElement("section");
  root.dataset.jqs = kind;
  root.dataset.resetDelay = "500";
  root.id = "copy-root";
  root.className = "copy-target";
  root.innerHTML =
    kind === "clipboard"
      ? '<input data-part="value" value="initial"><button data-part="trigger">Copy</button><p data-part="status"></p>'
      : '<pre><code data-part="code">initial</code></pre><button data-part="copy">Copy</button><p data-part="status"></p>';
  owner.document.body.append(root);
  return {
    root,
    source: required(root.querySelector<HTMLElement>('[data-part="value"], [data-part="code"]')),
    trigger: required(root.querySelector<HTMLButtonElement>("button")),
    status: required(root.querySelector<HTMLElement>('[data-part="status"]')),
  };
}
function api(ui: UI, kind: Kind) {
  return kind === "clipboard" ? ui.clipboard : ui.codeBlock;
}
function sourceText(source: HTMLElement, value: string): void {
  if (source.localName === "input") (source as HTMLInputElement).value = value;
  else source.textContent = value;
}
function deferred() {
  let resolve: (() => void) | undefined;
  let reject: ((reason: Error) => void) | undefined;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {
    promise,
    resolve: () => required(resolve)(),
    reject: (error: Error) => required(reject)(error),
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  for (const restore of restores.splice(0).reverse()) restore();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe.each(["clipboard", "code-block"] as const)(
  "%s document and async copy ownership",
  (kind) => {
    it("uses its foreign document's native writer and lifecycle events", async () => {
      const ambient = writer();
      const { owner, ui } = install(realm());
      const write = writer(owner);
      const { root } = fixture(kind, owner);
      const events: Event[] = [];
      root.addEventListener(`jquery-star:${kind}:copy`, (event) => events.push(event));
      expect(api(ui, kind).text(root)).toBe("initial");
      await expect(api(ui, kind).copy(root)).resolves.toBe("initial");
      expect(write).toHaveBeenCalledWith("initial");
      expect(ambient).not.toHaveBeenCalled();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf((owner as Window & typeof globalThis).CustomEvent);
    });
    it("automatically enhances a foreign root before facade use", async () => {
      const { owner, star } = install(realm());
      await star.whenEnhanced();
      const { status } = fixture(kind, owner);
      await star.whenEnhanced();
      expect(status.getAttribute("aria-live")).toBe("polite");
    });
    it.each(["implicit", "selector", "class", "element"] as const)(
      "runs a foreign %s action",
      async (mode) => {
        const ambient = writer();
        const { owner, jquery } = install(realm());
        const write = writer(owner);
        const { root } = fixture(kind, owner);
        const app = jquery(root).star();
        const args: unknown[] =
          mode === "implicit"
            ? []
            : [mode === "element" ? root : mode === "selector" ? "#copy-root" : ".copy-target"];
        await app.star("instance")?.run(`ui.${kind}.copy`, { args });
        expect(write).toHaveBeenCalledWith("initial");
        expect(ambient).not.toHaveBeenCalled();
      },
    );
    it.each(["enhance", "disposed-first", "facade"] as const)(
      "reacquires adopted work through %s",
      async (mode) => {
        const source = install();
        const destination = install(realm());
        const oldWrite = writer();
        const write = writer(destination.owner);
        const { root } = fixture(kind);
        source.ui.enhance(root);
        destination.owner.document.body.append(destination.owner.document.adoptNode(root));
        if (mode === "disposed-first") source.star.dispose();
        if (mode === "facade") expect(api(destination.ui, kind).text(root)).toBe("initial");
        else destination.ui.enhance(root);
        source.star.dispose();
        await expect(api(destination.ui, kind).copy(root)).resolves.toBe("initial");
        expect(write).toHaveBeenCalledWith("initial");
        expect(oldWrite).not.toHaveBeenCalled();
        expect(root.dataset.state).toBe("copied");
      },
    );
    it.each([false, true])(
      "transfers an accepted pending result across adoption, disposed first=%s",
      async (disposedFirst) => {
        const source = install();
        const destination = install(realm());
        const oldWrite = writer();
        const write = writer(destination.owner);
        const pending = deferred();
        oldWrite.mockReturnValueOnce(pending.promise);
        const { root, trigger, status } = fixture(kind);
        const result = api(source.ui, kind).copy(root);
        destination.owner.document.body.append(destination.owner.document.adoptNode(root));
        if (disposedFirst) source.star.dispose();
        destination.ui.enhance(root);
        source.star.dispose();
        if (kind === "clipboard") expect(trigger.disabled).toBe(true);
        const copied = vi.fn();
        root.addEventListener(`jquery-star:${kind}:copy`, copied);
        pending.resolve();
        await expect(result).resolves.toBe("initial");
        expect(status.textContent).toContain("Copied");
        expect(root.dataset.state).toBe("copied");
        expect(trigger.disabled).toBe(false);
        expect(copied).toHaveBeenCalledOnce();
        expect(copied.mock.calls[0]?.[0]).toBeInstanceOf(
          (destination.owner as Window & typeof globalThis).CustomEvent,
        );
        expect(write).not.toHaveBeenCalled();
      },
    );
    it.each([false, true])(
      "retains a result settled before the destination claims adoption, disposed first=%s",
      async (disposedFirst) => {
        const source = install();
        const destination = install(realm());
        const pending = deferred();
        writer().mockReturnValueOnce(pending.promise);
        const { root, status, trigger } = fixture(kind);
        const result = api(source.ui, kind).copy(root);
        destination.owner.document.adoptNode(root);
        if (disposedFirst) source.star.dispose();
        pending.resolve();
        await expect(result).resolves.toBe("initial");
        destination.owner.document.body.append(root);
        destination.ui.enhance(root);
        expect(root.dataset.state).toBe("copied");
        expect(status.textContent).toBe("Copied to clipboard.");
        expect(trigger.disabled).toBe(false);
      },
    );
    it.each([false, true])(
      "retains a failure settled before the destination claims adoption, disposed first=%s",
      async (disposedFirst) => {
        const source = install();
        const destination = install(realm());
        const pending = deferred();
        writer().mockReturnValueOnce(pending.promise);
        const { root, status, trigger } = fixture(kind);
        const result = api(source.ui, kind).copy(root);
        destination.owner.document.adoptNode(root);
        if (disposedFirst) source.star.dispose();
        const failure = new Error("native copy failed");
        pending.reject(failure);
        await expect(result).rejects.toBe(failure);
        destination.owner.document.body.append(root);
        destination.ui.enhance(root);
        expect(root.dataset.state).toBe("error");
        expect(status.textContent).toContain("Copy failed.");
        expect(trigger.disabled).toBe(false);
      },
    );
    it("removes a copied generated description from a replacement trigger", () => {
      const { ui } = install();
      const { root, trigger, status } = fixture(kind);
      trigger.setAttribute("aria-describedby", "authored-hint");
      ui.enhance(root);
      const next = trigger.cloneNode(true) as HTMLButtonElement;
      trigger.replaceWith(next);
      status.id = "replacement-status";
      api(ui, kind).text(root);
      expect(next.getAttribute("aria-describedby")).toBe("authored-hint replacement-status");
      expect(trigger.getAttribute("aria-describedby")).toBe("authored-hint");
    });
    it("reads a replaced source and current status through the facade", async () => {
      const { ui } = install();
      const write = writer();
      const { root, source, status } = fixture(kind);
      ui.enhance(root);
      const next = source.cloneNode(true) as HTMLElement;
      sourceText(next, "replacement");
      source.replaceWith(next);
      const nextStatus = status.cloneNode(false);
      status.replaceWith(nextStatus);
      expect(api(ui, kind).text(root)).toBe("replacement");
      await expect(api(ui, kind).copy(root)).resolves.toBe("replacement");
      expect(write).toHaveBeenCalledWith("replacement");
      expect(nextStatus.textContent).toContain("Copied");
      expect(status.textContent).toBe("");
    });
    it("routes an accepted copy to replacement output while preserving original text", async () => {
      const { ui } = install();
      const write = writer();
      const pending = deferred();
      write.mockReturnValue(pending.promise);
      const { root, source, status } = fixture(kind);
      const result = api(ui, kind).copy(root);
      const next = status.cloneNode(false);
      status.replaceWith(next);
      sourceText(source, "changed");
      ui.enhance(root);
      pending.resolve();
      await expect(result).resolves.toBe("initial");
      expect(next.textContent).toContain("Copied");
      expect(status.textContent).not.toContain("Copied");
      expect(write).toHaveBeenCalledWith("initial");
    });
    it("ignores parts owned by a nested controller", () => {
      const { ui } = install();
      const { root, trigger, status } = fixture(kind);
      root.insertAdjacentHTML(
        "afterbegin",
        `<section data-jqs="native-test"><code data-part="${kind === "clipboard" ? "value" : "code"}">nested</code><button data-part="${kind === "clipboard" ? "trigger" : "copy"}">Nested</button><p data-part="status" id="nested-status"></p></section>`,
      );
      expect(api(ui, kind).text(root)).toBe("initial");
      expect(trigger.getAttribute("aria-describedby")).toBe(status.id);
      expect(root.querySelector("#nested-status")?.hasAttribute("aria-live")).toBe(false);
    });
    it("preserves authored descriptions while replacing generated status tokens", () => {
      const { ui } = install();
      const { root, trigger, status } = fixture(kind);
      trigger.setAttribute("aria-describedby", "authored-hint");
      ui.enhance(root);
      expect(trigger.getAttribute("aria-describedby")?.split(/\s+/)).toEqual([
        "authored-hint",
        status.id,
      ]);
      status.id = "new-status";
      api(ui, kind).text(root);
      expect(trigger.getAttribute("aria-describedby")?.split(/\s+/)).toEqual([
        "authored-hint",
        "new-status",
      ]);
      status.remove();
      ui.enhance(root);
      expect(trigger.getAttribute("aria-describedby")).toBe("authored-hint");
    });
    it.each(["root-data", "root-aria", "inert", "trigger-aria", "native", "fieldset"] as const)(
      "respects %s before browser access",
      async (constraint) => {
        const { ui } = install();
        const write = writer();
        const { root, trigger } = fixture(kind);
        ui.enhance(root);
        if (constraint === "root-data") root.dataset.disabled = "true";
        else if (constraint === "root-aria") root.setAttribute("aria-disabled", "true");
        else if (constraint === "inert") root.setAttribute("inert", "");
        else if (constraint === "trigger-aria") trigger.setAttribute("aria-disabled", "true");
        else if (constraint === "native") trigger.disabled = true;
        else {
          const fieldset = document.createElement("fieldset");
          fieldset.disabled = true;
          root.before(fieldset);
          fieldset.append(root);
        }
        await expect(api(ui, kind).copy(root)).resolves.toBe("initial");
        expect(write).not.toHaveBeenCalled();
      },
    );
    it("allows data-disabled=false and rechecks constraints after before-copy", async () => {
      const { ui } = install();
      const write = writer();
      const { root, trigger } = fixture(kind);
      root.dataset.disabled = "false";
      trigger.dataset.disabled = "false";
      await api(ui, kind).copy(root);
      expect(write).toHaveBeenCalledOnce();
      write.mockClear();
      root.addEventListener(
        `jquery-star:${kind}:before-copy`,
        () => root.setAttribute("inert", ""),
        { once: true },
      );
      await api(ui, kind).copy(root);
      expect(write).not.toHaveBeenCalled();
    });
    it("does not start an older copy after before-copy requests a newer one", async () => {
      const { ui } = install();
      const write = writer();
      const { root, source } = fixture(kind);
      let newer: Promise<string> | undefined;
      root.addEventListener(
        `jquery-star:${kind}:before-copy`,
        () => {
          sourceText(source, "new");
          newer = api(ui, kind).copy(root);
        },
        { once: true },
      );
      await expect(api(ui, kind).copy(root)).resolves.toBe("initial");
      await expect(required(newer)).resolves.toBe("new");
      expect(write.mock.calls.map(([text]) => text)).toEqual(["new"]);
    });
    it.each([false, true])(
      "keeps the newest completion while preserving older caller outcomes, older failure=%s",
      async (olderFailure) => {
        const { ui } = install();
        const write = writer();
        const { root, source, trigger, status } = fixture(kind);
        trigger.remove();
        const first = deferred();
        const second = deferred();
        const error = new Error("denied");
        write.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        const events: string[] = [];
        root.addEventListener(`jquery-star:${kind}:copy`, () => events.push("copy"));
        root.addEventListener(`jquery-star:${kind}:error`, () => events.push("error"));
        const old = api(ui, kind)
          .copy(root)
          .catch((failure: unknown) => failure);
        sourceText(source, "new");
        const next = api(ui, kind)
          .copy(root)
          .catch((failure: unknown) => failure);
        if (olderFailure) second.resolve();
        else second.reject(error);
        expect(await next).toBe(olderFailure ? "new" : error);
        const message = status.textContent;
        if (olderFailure) first.reject(error);
        else first.resolve();
        expect(await old).toBe(olderFailure ? error : "initial");
        expect(root.dataset.state).toBe(olderFailure ? "copied" : "error");
        expect(status.textContent).toBe(message);
        expect(events).toEqual([olderFailure ? "copy" : "error"]);
      },
    );
    it.each(["success", "refused", "copy-throws", "selection-throws"] as const)(
      "uses only the owning document's fallback and cleans it on %s",
      async (outcome) => {
        property(window.navigator, "clipboard", undefined);
        const ambient = vi.fn(() => true);
        property(document, "execCommand", ambient);
        const owner = realm();
        const { ui } = install(owner);
        property(owner.navigator, "clipboard", undefined);
        const { root } = fixture(kind);
        owner.document.body.append(owner.document.adoptNode(root));
        const unrelated = owner.document.createElement("textarea");
        owner.document.body.append(unrelated);
        const execute = vi.fn(() => {
          if (outcome === "copy-throws") throw new Error("copy failed");
          return outcome !== "refused";
        });
        property(owner.document, "execCommand", execute);
        const select = vi.spyOn(
          (owner as Window & typeof globalThis).HTMLTextAreaElement.prototype,
          "select",
        );
        if (outcome === "selection-throws")
          select.mockImplementation(() => {
            throw new Error("selection failed");
          });
        const result = api(ui, kind).copy(root);
        if (outcome === "success") await expect(result).resolves.toBe("initial");
        else await expect(result).rejects.toThrow();
        expect(select).toHaveBeenCalledOnce();
        expect(ambient).not.toHaveBeenCalled();
        expect([...owner.document.querySelectorAll("textarea")]).toEqual([unrelated]);
      },
    );
  },
);

it.each([false, true])(
  "Clipboard retains reset state and remaining delay across adoption, disposed first=%s",
  async (disposedFirst) => {
    const source = install();
    const destination = install(realm());
    writer();
    writer(destination.owner);
    const { root } = fixture("clipboard");
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    let old: (() => void) | undefined;
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
      old = callback as () => void;
      return 900;
    });
    const clear = vi.spyOn(window as Window, "clearTimeout");
    await source.ui.clipboard.copy(root);
    now = 1200;
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (disposedFirst) source.star.dispose();
    const delays: number[] = [];
    let current: (() => void) | undefined;
    vi.spyOn(destination.owner, "setTimeout").mockImplementation((callback, delay) => {
      delays.push(delay ?? 0);
      current = callback as () => void;
      return 901;
    });
    destination.ui.enhance(root);
    source.star.dispose();
    expect(destination.ui.clipboard.state(root)).toBe("copied");
    expect(clear).toHaveBeenCalledWith(900);
    expect(delays).toEqual([300]);
    required(old)();
    expect(destination.ui.clipboard.state(root)).toBe("copied");
    required(current)();
    expect(destination.ui.clipboard.state(root)).toBe("idle");
  },
);
it("Clipboard releases a reset timer acquired after owner disposal", async () => {
  const { star, ui } = install();
  writer();
  const { root, trigger } = fixture("clipboard");
  ui.enhance(root);
  const clear = vi.spyOn(window as Window, "clearTimeout");
  vi.spyOn(window as Window, "setTimeout").mockImplementationOnce(() => {
    star.dispose();
    return 910;
  });
  await ui.clipboard.copy(root);
  expect(clear).toHaveBeenCalledWith(910);
  expect(trigger.disabled).toBe(false);
});
it("Clipboard ignores a canceled reset callback while a newer copy is pending", async () => {
  const { ui } = install();
  const write = writer();
  const { root, trigger } = fixture("clipboard");
  trigger.remove();
  let callback: (() => void) | undefined;
  vi.spyOn(window as Window, "setTimeout").mockImplementation((run) => {
    callback = run as () => void;
    return 920;
  });
  await ui.clipboard.copy(root);
  const old = required(callback);
  const next = deferred();
  write.mockReturnValueOnce(next.promise);
  const result = ui.clipboard.copy(root, "new");
  old();
  expect(ui.clipboard.state(root)).toBe("copying");
  next.resolve();
  await result;
});
it("Clipboard resolves changed external source selectors through the facade", () => {
  const { ui } = install();
  const { root } = fixture("clipboard");
  document.body.insertAdjacentHTML("beforeend", '<textarea id="outside-copy">outside</textarea>');
  expect(ui.clipboard.text(root)).toBe("initial");
  root.dataset.copyFrom = "#outside-copy";
  expect(ui.clipboard.text(root)).toBe("outside");
  root.dataset.copyFrom = "[";
  try {
    expect(() => ui.clipboard.text(root)).toThrow("invalid");
  } finally {
    root.dataset.copyFrom = "#outside-copy";
  }
});

it.each([undefined, "authored"])(
  "Code Block enhancement preserves its initial reflected state %s",
  (state) => {
    const { ui } = install();
    const { root } = fixture("code-block");
    if (state) root.dataset.state = state;
    ui.enhance(root);
    expect(root.dataset.state).toBe(state);
  },
);

it.each(["clipboard", "code-block"] as const)(
  "%s initial enhancement preserves authored status text",
  (kind) => {
    const { ui } = install();
    const { root, status } = fixture(kind);
    status.textContent = "Instructions";
    ui.enhance(root);
    expect(status.textContent).toBe("Instructions");
  },
);

it.each(["clipboard", "code-block"] as const)(
  "%s stops when native writer lookup disposes the owner",
  async (kind) => {
    const { ui, star } = install();
    const { root } = fixture(kind);
    const write = vi.fn<(value: string) => Promise<void>>().mockResolvedValue();
    property(window.navigator, "clipboard", {
      get writeText() {
        star.dispose();
        return write;
      },
    });
    await expect(api(ui, kind).copy(root)).resolves.toBe("initial");
    expect(write).not.toHaveBeenCalled();
  },
);
it.each(["clipboard", "code-block"] as const)(
  "%s stops legacy work after selection disposes the owner",
  async (kind) => {
    const { ui, star } = install();
    const { root } = fixture(kind);
    property(window.navigator, "clipboard", undefined);
    const execute = vi.fn(() => true);
    property(document, "execCommand", execute);
    vi.spyOn(HTMLTextAreaElement.prototype, "select").mockImplementation(() => star.dispose());
    await expect(api(ui, kind).copy(root)).resolves.toBe("initial");
    expect(execute).not.toHaveBeenCalled();
    expect(document.querySelector("textarea")).toBeNull();
  },
);
it("Clipboard releases temporary button state acquired after disposal", async () => {
  const { ui, star } = install();
  const write = writer();
  const pending = deferred();
  write.mockReturnValue(pending.promise);
  const { root, trigger } = fixture("clipboard");
  ui.enhance(root);
  const set = required(
    Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, "disabled")?.set,
  );
  vi.spyOn(trigger, "disabled", "set").mockImplementationOnce((value) => {
    star.dispose();
    set.call(trigger, value);
  });
  const result = ui.clipboard.copy(root);
  expect(trigger.disabled).toBe(false);
  pending.resolve();
  await expect(result).resolves.toBe("initial");
});
it("Clipboard allows a copy notification to start newer work without releasing its button", async () => {
  const { ui } = install();
  const write = writer();
  const { root, trigger } = fixture("clipboard");
  const next = deferred();
  write.mockResolvedValueOnce().mockReturnValueOnce(next.promise);
  let newer: Promise<string> | undefined;
  root.addEventListener(
    "jquery-star:clipboard:copy",
    () => {
      newer = ui.clipboard.copy(root, "new");
    },
    { once: true },
  );
  await ui.clipboard.copy(root);
  expect(write).toHaveBeenCalledTimes(2);
  expect(root.dataset.state).toBe("copying");
  expect(trigger.disabled).toBe(true);
  next.resolve();
  await expect(required(newer)).resolves.toBe("new");
  expect(trigger.disabled).toBe(false);
});
it("Clipboard releases the pending trigger even when unrelated label cleanup throws", async () => {
  const { ui, star } = install();
  const write = writer();
  const pending = deferred();
  write.mockReturnValue(pending.promise);
  const { root, trigger } = fixture("clipboard");
  const result = ui.clipboard.copy(root);
  const remove = trigger.removeAttribute.bind(trigger);
  vi.spyOn(trigger, "removeAttribute").mockImplementationOnce((name) => {
    remove(name);
    throw new Error("description cleanup");
  });
  try {
    expect(() => star.dispose()).toThrow();
    expect(trigger.disabled).toBe(false);
    pending.resolve();
    await expect(result).resolves.toBe("initial");
  } finally {
    stars.splice(stars.indexOf(star), 1);
    root.remove();
  }
});

it("Clipboard observes an accepted writer rejection when acquiring button state throws", async () => {
  const { ui } = install();
  const pending = deferred();
  writer().mockReturnValueOnce(pending.promise);
  const { root, trigger } = fixture("clipboard");
  ui.enhance(root);
  const failure = new Error("button acquisition failed");
  vi.spyOn(trigger, "disabled", "set").mockImplementationOnce(() => {
    throw failure;
  });
  const result = ui.clipboard.copy(root);
  await expect(result).rejects.toBe(failure);
  pending.reject(new Error("accepted writer failed later"));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(root.dataset.state).toBe("error");
  expect(trigger.disabled).toBe(false);
});
