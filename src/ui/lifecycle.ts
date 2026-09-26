import { isElementNode, isHTMLElement, isNode } from "../dom";
import type { DocumentHost } from "../kernel";
import type { StarPluginActivation } from "../plugin";
import type { StarUIStatic } from "../types";

interface UIScope {
  active: boolean;
  host: NonNullable<DocumentHost["services"]>;
}

const scopes = new WeakMap<Document, UIScope>();

function available(scope: UIScope | undefined, root: Element): boolean {
  return Boolean(scope?.active && (scope.host.canOwn?.(root) ?? true));
}

export function uiActive(root: Element): boolean {
  return available(scopes.get(root.ownerDocument), root);
}

export function uiWindow(root: Element): Window {
  const window = root.ownerDocument.defaultView;
  if (!window) throw new Error("UI requires a Document attached to a Window.");
  return window;
}

export function uiElements(root: ParentNode, selector: string): Element[] {
  const elements = Array.from(root.querySelectorAll(selector));
  if (isElementNode(root) && root.matches(selector)) elements.unshift(root);
  return elements.filter(uiActive);
}

export interface UIResources {
  active: boolean;
  cleanup: () => void;
  cleanups: Set<() => void>;
  document: Document;
  revision: number;
  resetRevision?: number;
  root: HTMLElement;
  window: Window;
}

export function uiResources(root: HTMLElement): UIResources {
  return {
    active: true,
    cleanup: () => undefined,
    cleanups: new Set(),
    document: root.ownerDocument,
    revision: 0,
    root,
    window: uiWindow(root),
  };
}

export function uiCurrent(record: UIResources, revision = record.revision): boolean {
  return (
    record.active &&
    record.revision === revision &&
    record.document === record.root.ownerDocument &&
    uiActive(record.root)
  );
}

export function releaseUIResources(record: UIResources): void {
  record.active = false;
  record.revision += 1;
  const cleanups = [...record.cleanups];
  record.cleanups.clear();
  const failures: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw new AggregateError(failures, "UI resource cleanup failed.");
}

export function failUISetup(record: UIResources, error: unknown): never {
  try {
    record.cleanup();
  } catch (cleanupError) {
    throw new AggregateError([error, cleanupError], "UI setup and cleanup failed.", {
      cause: cleanupError,
    });
  }
  throw error;
}

export function acquireUIResource(
  record: UIResources,
  current: () => boolean,
  setup: () => void,
  cleanup: () => void,
): void {
  if (!current()) return;
  record.cleanups.add(cleanup);
  const failures: unknown[] = [];
  try {
    setup();
  } catch (error) {
    failures.push(error);
  }
  if (!current()) {
    try {
      cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(failures, "UI resource setup and cleanup failed.");
}

export function listenUI(
  record: UIResources,
  current: () => boolean,
  target: EventTarget | undefined,
  type: string,
  callback: EventListener,
  options?: AddEventListenerOptions | boolean,
): void {
  if (!target) return;
  const listener: EventListener = (event) => {
    if (current()) callback(event);
  };
  const capture = typeof options === "boolean" ? options : options?.capture;
  const cleanup = (): void => {
    if (capture === undefined) target.removeEventListener(type, listener);
    else target.removeEventListener(type, listener, capture);
  };
  acquireUIResource(
    record,
    current,
    () => target.addEventListener(type, listener, options),
    cleanup,
  );
}

export function listenUIReset(
  record: UIResources,
  current: () => boolean,
  form: HTMLFormElement | null,
  callback: () => void,
): void {
  if (!form) return;
  let cancelPending: (() => void) | undefined;
  listenUI(record, current, form, "reset", (event) => {
    const revision = ++record.revision;
    cancelPending?.();
    if (!current() || record.revision !== revision) return;
    record.resetRevision = revision;
    let timer: number | undefined;
    let active = true;
    const valid = (): boolean => active && current() && record.revision === revision;
    const cancel = (): void => {
      active = false;
      if (cancelPending === cancel) cancelPending = undefined;
      if (record.resetRevision === revision) delete record.resetRevision;
      record.cleanups.delete(cancel);
      const handle = timer;
      timer = undefined;
      if (handle !== undefined) record.window.clearTimeout(handle);
    };
    cancelPending = cancel;
    acquireUIResource(
      record,
      valid,
      () => {
        timer = record.window.setTimeout(() => {
          const accepted = valid() && !event.defaultPrevented;
          cancel();
          if (accepted && current() && record.revision === revision) callback();
        }, 0);
      },
      cancel,
    );
  });
}

export function ownUI(root: Element, cleanup: () => void): () => void {
  try {
    const scope = scopes.get(root.ownerDocument);
    if (!scope || !available(scope, root))
      throw new Error("This UI root cannot acquire resources.");
    return scope.host.own("service", `ui:${root.getAttribute("data-jqs")}`, cleanup, root);
  } catch (error) {
    try {
      cleanup();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "UI resource acquisition and cleanup failed.",
        { cause: cleanupError },
      );
    }
    throw error;
  }
}

export function ownUIRecord<Root extends Element, Record extends { cleanup: () => void }>(
  records: WeakMap<Root, Record>,
  root: Root,
  record: Record,
  cleanup: () => void = () => undefined,
): () => void {
  const lifetime: { active: boolean; release?: () => void } = { active: true };
  const retire = (): void => {
    if (!lifetime.active) return;
    lifetime.active = false;
    if (records.get(root) === record) records.delete(root);
    cleanup();
  };
  const releaseRecord = (): void => {
    if (lifetime.release) lifetime.release();
    else retire();
  };
  record.cleanup = releaseRecord;
  records.set(root, record);
  lifetime.release = ownUI(root, retire);
  if (!lifetime.active || records.get(root) !== record) lifetime.release();
  return releaseRecord;
}

export function createUILifecycle(
  host: DocumentHost,
  activate?: (setup: StarPluginActivation) => void,
): { guard(ui: StarUIStatic): void; canEnhance(root: ParentNode): boolean } {
  const owner = host.document;
  const scope: UIScope = { active: false, host: host.services ?? host };
  host.own("service", "ui:lifecycle", () => {
    scope.active = false;
    if (scopes.get(owner) === scope) scopes.delete(owner);
  });
  const start = (): void => {
    scopes.set(owner, scope);
    scope.active = true;
  };
  if (activate) activate(start);
  else start();
  const assertActive = (): void => {
    if (!scope.active) throw new Error("This UI installation has been disposed.");
  };
  const target = (value: unknown, name: string): unknown => {
    let element: unknown = value;
    if (typeof value === "string") {
      if (name === "menubar") {
        try {
          element = Array.from(owner.querySelectorAll(value)).find(
            (candidate) => isHTMLElement(candidate) && candidate.matches('[data-jqs="menubar"]'),
          );
        } catch {
          throw new Error('Menubar target did not match data-jqs="menubar".');
        }
        if (!element) throw new Error('Menubar target did not match data-jqs="menubar".');
      } else element = owner.querySelector(value);
    }
    if (!isElementNode(element) || element.ownerDocument !== owner || !available(scope, element)) {
      throw new Error("This UI target is unavailable in its owning Document.");
    }
    return element;
  };
  return {
    canEnhance(root) {
      return (
        scope.active &&
        scopes.get(owner) === scope &&
        ((root === owner && available(scope, owner.documentElement)) ||
          (isNode(root) &&
            root.ownerDocument === owner &&
            available(scope, isElementNode(root) ? root : owner.documentElement)))
      );
    },
    guard(ui) {
      const enhance = ui.enhance.bind(ui);
      ui.enhance = (root = owner) => {
        assertActive();
        if (!this.canEnhance(root)) throw new Error("This UI enhancement root is unavailable.");
        enhance(root);
      };
      for (const [name, api] of Object.entries(ui)) {
        if (typeof api === "function") continue;
        const methods = api as Record<string, (...args: unknown[]) => unknown>;
        for (const [method, call] of Object.entries(methods)) {
          methods[method] = (...args) => {
            assertActive();
            if (name !== "toast" || method === "dismiss") args[0] = target(args[0], name);
            else target(owner.documentElement, name);
            return call(...args);
          };
        }
      }
    },
  };
}
