import type { StarDOMRealmOptions, StarDOMWindow } from "./types";

export const STAR_DOM_GLOBALS = Object.freeze([
  "window",
  "self",
  "document",
  "navigator",
  "location",
  "history",
  "Node",
  "Element",
  "HTMLElement",
  "HTMLButtonElement",
  "HTMLDialogElement",
  "HTMLFormElement",
  "HTMLInputElement",
  "HTMLOptionElement",
  "HTMLSelectElement",
  "HTMLTextAreaElement",
  "SVGElement",
  "MathMLElement",
  "Document",
  "DocumentFragment",
  "MutationObserver",
  "Event",
  "CustomEvent",
  "FocusEvent",
  "KeyboardEvent",
  "MouseEvent",
  "InputEvent",
  "FormData",
  "File",
  "Blob",
  "DOMParser",
  "URL",
  "URLSearchParams",
  "AbortController",
  "AbortSignal",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "getComputedStyle",
  "localStorage",
  "sessionStorage",
  "CSS",
] as const);

let activeRealm: StarDOMWindow | undefined;

function realmDocument(options: StarDOMRealmOptions): Document {
  const owner = options.document ?? options.window.document;
  if (
    owner !== options.window.document ||
    owner.defaultView !== options.window ||
    options.window.document.defaultView !== options.window
  ) {
    throw new TypeError("The supplied Window and Document must belong to the same realm.");
  }
  return owner;
}

export function assertStarDOMRealm(options: StarDOMRealmOptions): Document {
  if (!options || typeof options !== "object") {
    throw new TypeError("jQStar DOM realm options must be an object.");
  }
  const owner = realmDocument(options);
  if (options.jQuery) {
    const probe = owner.createElement("div");
    let selected: unknown;
    try {
      selected = options.jQuery(probe).get(0);
    } catch (error) {
      throw new TypeError("The supplied jQuery instance cannot select elements in this realm.", {
        cause: error,
      });
    }
    if (selected !== probe) {
      throw new TypeError("The supplied jQuery instance does not operate on the supplied realm.");
    }
  }
  return owner;
}

function realmValue(windowHost: StarDOMWindow, documentHost: Document, name: string): unknown {
  if (name === "window" || name === "self") return windowHost;
  if (name === "document") return documentHost;
  if (name === "requestAnimationFrame") {
    return (callback: FrameRequestCallback) => windowHost.requestAnimationFrame(callback);
  }
  if (name === "cancelAnimationFrame") {
    return (handle: number) => windowHost.cancelAnimationFrame(handle);
  }
  if (name === "getComputedStyle") {
    return (element: Element, pseudoElement?: string | null) =>
      windowHost.getComputedStyle(element, pseudoElement);
  }
  return (windowHost as unknown as Record<string, unknown>)[name];
}

function installGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

export async function withStarDOMRealm<Result>(
  options: StarDOMRealmOptions,
  work: () => Result | PromiseLike<Result>,
): Promise<Result> {
  if (typeof work !== "function") throw new TypeError("A DOM realm callback must be a function.");
  const documentHost = assertStarDOMRealm(options);
  if (activeRealm) {
    throw new Error("A jQStar ambient DOM realm lease is already active in this process.");
  }
  activeRealm = options.window;

  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  const installed: string[] = [];
  let result: Result | undefined;
  let workError: Error | undefined;
  let workFailed = false;
  try {
    for (const name of STAR_DOM_GLOBALS) {
      const value = realmValue(options.window, documentHost, name);
      if (value === undefined && !Reflect.has(options.window, name)) continue;
      descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
      installGlobal(name, value);
      installed.push(name);
    }
    result = await work();
  } catch (error) {
    workFailed = true;
    workError =
      error instanceof Error
        ? error
        : new Error("The DOM realm callback threw a non-Error value.", { cause: error });
  }

  const restorationErrors: unknown[] = [];
  for (const name of installed.reverse()) {
    try {
      const descriptor = descriptors.get(name);
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    } catch (error) {
      restorationErrors.push(error);
    }
  }
  activeRealm = undefined;
  if (workFailed && restorationErrors.length === 0) throw workError!;
  if (workFailed || restorationErrors.length > 0) {
    throw new AggregateError(
      [...(workError ? [workError] : []), ...restorationErrors],
      "jQStar ambient DOM realm work or restoration failed.",
    );
  }
  return result as Result;
}
