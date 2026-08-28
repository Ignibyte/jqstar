import { Idiomorph } from "idiomorph";
import type {
  PatchElementsOptions,
  PatchNamespace,
  PatchSignalsOptions,
  StateRecord,
} from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneValue(child)]),
    ) as T;
  }
  return value;
}

export function patchSignals(
  state: StateRecord,
  patch: Record<string, unknown>,
  options: PatchSignalsOptions = {},
): void {
  const onlyIfMissing = options.onlyIfMissing ?? false;
  const removeNull = options.removeNull ?? true;

  for (const [key, value] of Object.entries(patch)) {
    const exists = Object.prototype.hasOwnProperty.call(state, key);

    if (value === null && removeNull) {
      if (!onlyIfMissing && exists) delete state[key];
      continue;
    }

    if (isPlainObject(value)) {
      const current = state[key];
      if (!isPlainObject(current)) {
        if (onlyIfMissing && exists) continue;
        state[key] = {};
      }
      patchSignals(state[key] as StateRecord, value, options);
      continue;
    }

    if (onlyIfMissing && exists) continue;
    state[key] = cloneValue(value);
  }
}

function parseFragment(source: string, namespace: PatchNamespace): Node[] {
  if (namespace === "html") {
    const template = document.createElement("template");
    template.innerHTML = source;
    return Array.from(template.content.childNodes);
  }

  const wrapper =
    namespace === "svg"
      ? `<svg xmlns="http://www.w3.org/2000/svg">${source}</svg>`
      : `<math xmlns="http://www.w3.org/1998/Math/MathML">${source}</math>`;
  const documentType = namespace === "svg" ? "image/svg+xml" : "application/xml";
  const parsed = new DOMParser().parseFromString(wrapper, documentType);
  if (parsed.querySelector("parsererror")) throw new Error(`Invalid ${namespace} patch markup.`);
  return Array.from(parsed.documentElement.childNodes, (node) => document.importNode(node, true));
}

function scopedTargets(root: Element, selector: string): Element[] {
  const targets: Element[] = [];
  if (root.matches(selector)) targets.push(root);
  targets.push(...Array.from(root.querySelectorAll(selector)));
  return targets;
}

function targetById(root: Element, id: string): Element | undefined {
  if (root.id === id) return root;
  const candidate = document.getElementById(id);
  return candidate && root.contains(candidate) ? candidate : undefined;
}

function ignored(node: Node): boolean {
  return node instanceof Element && Boolean(node.closest("[data-ignore-morph]"));
}

function clones(nodes: Node[]): Node[] {
  return nodes.map((node) => node.cloneNode(true));
}

function runPatch(apply: () => void, useViewTransition: boolean): void {
  const viewDocument = document as Document & {
    startViewTransition?: (update: () => void) => unknown;
  };
  if (useViewTransition && viewDocument.startViewTransition) {
    viewDocument.startViewTransition(apply);
  } else {
    apply();
  }
}

export function patchElements(
  root: Element,
  source: string,
  options: PatchElementsOptions = {},
): void {
  const mode = options.mode ?? "outer";
  const namespace = options.namespace ?? "html";
  const nodes = mode === "remove" && options.selector ? [] : parseFragment(source, namespace);

  let targets: Element[];
  if (options.selector) {
    targets = scopedTargets(root, options.selector);
  } else if (mode === "outer" || mode === "replace" || mode === "remove") {
    targets = nodes
      .filter((node): node is Element => node instanceof Element && Boolean(node.id))
      .map((node) => targetById(root, node.id))
      .filter((target): target is Element => Boolean(target));
  } else {
    throw new Error(`The ${mode} patch mode requires a selector.`);
  }

  if (targets.length === 0)
    throw new Error("The element patch did not match a target inside this application.");

  runPatch(() => {
    if (mode === "remove") {
      for (const target of targets) target.remove();
      return;
    }

    if (mode === "replace") {
      for (const target of targets) target.replaceWith(...clones(nodes));
      return;
    }

    if (mode === "append" || mode === "prepend" || mode === "before" || mode === "after") {
      for (const target of targets) {
        const content = clones(nodes);
        if (mode === "append") target.append(...content);
        else if (mode === "prepend") target.prepend(...content);
        else if (mode === "before") target.before(...content);
        else target.after(...content);
      }
      return;
    }

    const callbacks = {
      beforeNodeMorphed(oldNode: Node): boolean {
        return !ignored(oldNode);
      },
      beforeNodeRemoved(node: Node): boolean {
        return !ignored(node);
      },
    };

    if (mode === "inner") {
      for (const target of targets) {
        Idiomorph.morph(target, clones(nodes), {
          morphStyle: "innerHTML",
          ignoreActiveValue: true,
          restoreFocus: true,
          callbacks,
        });
      }
      return;
    }

    if (options.selector) {
      for (const target of targets) {
        Idiomorph.morph(target, clones(nodes), {
          morphStyle: "outerHTML",
          ignoreActiveValue: true,
          restoreFocus: true,
          callbacks,
        });
      }
      return;
    }

    for (const node of nodes) {
      if (!(node instanceof Element) || !node.id) continue;
      const target = targetById(root, node.id);
      if (!target) continue;
      Idiomorph.morph(target, node.cloneNode(true), {
        morphStyle: "outerHTML",
        ignoreActiveValue: true,
        restoreFocus: true,
        callbacks,
      });
    }
  }, options.useViewTransition ?? false);
}
