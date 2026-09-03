import type { ActionRegistrar } from "../registry";
import type { JSONViewerTarget, StarContext, StarJSONViewerStatic } from "../types";

interface JSONViewerCollection {
  api: StarJSONViewerStatic;
  enhance(root: ParentNode): void;
}

interface JSONViewerRecord {
  root: HTMLElement;
  signature: string | undefined;
  source: HTMLScriptElement;
  status: HTMLElement | undefined;
  tree: HTMLElement;
  value: unknown;
}

interface JSONViewerEventDetail {
  error?: unknown;
  jsonViewer: HTMLElement;
  nodes: number;
  value?: unknown;
}

const records = new WeakMap<HTMLElement, JSONViewerRecord>();
let jsonViewerId = 0;

function jsonViewerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="json-viewer"]')
    ? value
    : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="json-viewer"]') === root,
  );
}

function resolve(target: JSONViewerTarget, root: ParentNode = document): HTMLElement {
  const value =
    typeof target === "string"
      ? jsonViewerRoot(root.querySelector(target))
      : jsonViewerRoot(target);
  if (value) return value;
  throw new Error(`JSON Viewer target did not match data-jqs="json-viewer": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="json-viewer"]')) return target;
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="json-viewer"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function emit(
  record: JSONViewerRecord,
  name: "update" | "expand" | "collapse" | "error",
  options: { error?: unknown; nodes?: number } = {},
): void {
  const detail: JSONViewerEventDetail = {
    ...(options.error === undefined ? {} : { error: options.error }),
    jsonViewer: record.root,
    nodes: options.nodes ?? record.tree.querySelectorAll('[data-part="node"]').length,
    ...(options.error === undefined ? { value: record.value } : {}),
  };
  record.root.dispatchEvent(
    new CustomEvent(`jquery-star:json-viewer:${name}`, { bubbles: true, detail }),
  );
}

function setText(element: HTMLElement | undefined, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

function primitiveType(value: unknown): "null" | "boolean" | "number" | "string" {
  if (value === null) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

function primitiveLabel(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function keyLabel(key: string | undefined): HTMLElement | undefined {
  if (key === undefined) return undefined;
  const element = document.createElement("span");
  element.dataset.part = "key";
  element.textContent = key;
  return element;
}

function appendKey(parent: HTMLElement, key: string | undefined): void {
  const label = keyLabel(key);
  if (!label) return;
  const separator = document.createElement("span");
  separator.dataset.part = "separator";
  separator.setAttribute("aria-hidden", "true");
  separator.textContent = ": ";
  parent.append(label, separator);
}

interface RenderContext {
  expanded: ReadonlySet<string>;
  maxDepth: number;
  nodes: number;
  openAll: boolean;
}

function renderNode(
  value: unknown,
  key: string | undefined,
  path: string,
  depth: number,
  context: RenderContext,
): HTMLLIElement {
  context.nodes += 1;
  const item = document.createElement("li");
  item.dataset.part = "node";
  const object = value !== null && typeof value === "object";
  if (!object || depth >= context.maxDepth) {
    appendKey(item, key);
    const leaf = document.createElement("span");
    leaf.dataset.part = "value";
    if (object) {
      leaf.dataset.type = "truncated";
      leaf.textContent = "…";
    } else {
      leaf.dataset.type = primitiveType(value);
      leaf.textContent = primitiveLabel(value);
    }
    item.append(leaf);
    return item;
  }

  const entries = Array.isArray(value)
    ? value.map((entry, index) => [String(index), entry] as const)
    : Object.entries(value as Record<string, unknown>);
  const details = document.createElement("details");
  details.dataset.part = "branch";
  details.dataset.path = path;
  details.open = context.openAll || depth === 0 || context.expanded.has(path);
  const summary = document.createElement("summary");
  summary.dataset.part = "summary";
  appendKey(summary, key);
  const kind = document.createElement("span");
  kind.dataset.part = "kind";
  kind.textContent = Array.isArray(value)
    ? `Array(${entries.length})`
    : `Object(${entries.length})`;
  summary.append(kind);
  const children = document.createElement("ul");
  children.dataset.part = "children";
  entries.forEach(([childKey, childValue]) => {
    const encoded = childKey.replaceAll("~", "~0").replaceAll("/", "~1");
    children.append(renderNode(childValue, childKey, `${path}/${encoded}`, depth + 1, context));
  });
  details.append(summary, children);
  item.append(details);
  return item;
}

function maxDepth(record: JSONViewerRecord): number {
  const value = Number(record.root.dataset.maxDepth);
  return Number.isInteger(value) && value > 0 ? value : 20;
}

function render(record: JSONViewerRecord, signature: string): void {
  const expanded = new Set(
    Array.from(
      record.tree.querySelectorAll<HTMLDetailsElement>('details[data-part="branch"][open]'),
    )
      .map((details) => details.dataset.path)
      .filter((path): path is string => Boolean(path)),
  );
  try {
    const value = JSON.parse(signature) as unknown;
    const context: RenderContext = {
      expanded,
      maxDepth: maxDepth(record),
      nodes: 0,
      openAll: record.root.dataset.expanded === "true",
    };
    const list = document.createElement("ul");
    list.dataset.part = "document";
    list.append(renderNode(value, undefined, "", 0, context));
    record.tree.replaceChildren(list);
    record.signature = signature;
    record.value = value;
    if (record.root.dataset.state !== "ready") record.root.dataset.state = "ready";
    setText(
      record.status,
      `${context.nodes.toLocaleString()} JSON ${context.nodes === 1 ? "value" : "values"}.`,
    );
    emit(record, "update", { nodes: context.nodes });
  } catch (error) {
    const message = document.createElement("p");
    message.dataset.part = "error";
    message.setAttribute("role", "alert");
    message.textContent = error instanceof Error ? error.message : String(error);
    record.tree.replaceChildren(message);
    record.signature = signature;
    record.value = undefined;
    if (record.root.dataset.state !== "error") record.root.dataset.state = "error";
    setText(record.status, "JSON could not be parsed.");
    emit(record, "error", { error, nodes: 0 });
  }
}

function sync(record: JSONViewerRecord): void {
  const signature = record.source.textContent?.trim() ?? "";
  if (signature === record.signature) return;
  render(record, signature || "null");
}

function enhanceJSONViewer(root: HTMLElement): JSONViewerRecord {
  let record = records.get(root);
  if (record) {
    sync(record);
    return record;
  }
  root.id ||= `jqs-json-viewer-${++jsonViewerId}`;
  const source = owned<HTMLScriptElement>(root, 'script[data-part="source"]');
  const tree = owned<HTMLElement>(root, '[data-part="tree"]');
  if (!source || !tree) {
    throw new Error(`JSON Viewer #${root.id} needs a JSON script source and data-part="tree".`);
  }
  if (source.type !== "application/json") source.type = "application/json";
  record = {
    root,
    signature: undefined,
    source,
    status: owned<HTMLElement>(root, '[data-part="status"]'),
    tree,
    value: undefined,
  };
  records.set(root, record);
  sync(record);
  return record;
}

function recordFor(target: JSONViewerTarget): JSONViewerRecord {
  const root = resolve(target);
  return records.get(root) ?? enhanceJSONViewer(root);
}

function setValue(record: JSONViewerRecord, value: unknown): HTMLElement {
  let signature: string;
  try {
    signature = JSON.stringify(value, null, 2);
  } catch (error) {
    emit(record, "error", { error });
    throw error;
  }
  if (signature === undefined) signature = "null";
  if (record.source.textContent !== signature) record.source.textContent = signature;
  render(record, signature);
  return record.root;
}

function toggleAll(record: JSONViewerRecord, open: boolean): HTMLElement {
  record.tree
    .querySelectorAll<HTMLDetailsElement>('details[data-part="branch"]')
    .forEach((details) => {
      details.open = open;
    });
  record.root.dataset.expanded = String(open);
  emit(record, open ? "expand" : "collapse");
  return record.root;
}

function enhanceAll(root: ParentNode): void {
  const candidates: Element[] = root instanceof Element ? [root] : [];
  candidates.push(...Array.from(root.querySelectorAll('[data-jqs="json-viewer"]')));
  for (const candidate of candidates) {
    const viewer = jsonViewerRoot(candidate);
    if (viewer) enhanceJSONViewer(viewer);
  }
}

export function createJSONViewers(registerAction: ActionRegistrar): JSONViewerCollection {
  const api: StarJSONViewerStatic = {
    set: (target, value) => setValue(recordFor(target), value),
    value: (target) => structuredClone(recordFor(target).value),
    expandAll: (target) => toggleAll(recordFor(target), true),
    collapseAll: (target) => toggleAll(recordFor(target), false),
  };
  registerAction("ui.json-viewer.expand-all", (context) =>
    api.expandAll(controlled(context, context.args?.[0])),
  );
  registerAction("ui.json-viewer.collapse-all", (context) =>
    api.collapseAll(controlled(context, context.args?.[0])),
  );
  return { api, enhance: enhanceAll };
}
