import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { JSONViewerTarget, StarContext, StarJSONViewerStatic } from "../types";
import {
  failUISetup,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

interface JSONViewerCollection {
  api: StarJSONViewerStatic;
  enhance(root: ParentNode): void;
}

interface JSONViewerState {
  text: string | undefined;
  signature: string | undefined;
  expanded: boolean | undefined;
  json: HTMLScriptElement;
  status: HTMLElement | undefined;
  tree: HTMLElement;
  value: unknown;
  branches: Map<string, boolean>;
}
interface JSONViewerRecord extends UIResources, JSONViewerState {
  rendering: string | undefined;
}

interface JSONViewerEventDetail {
  error?: unknown;
  jsonViewer: HTMLElement;
  nodes: number;
  value?: unknown;
}

const records = new WeakMap<HTMLElement, JSONViewerRecord>();
const retained = new WeakMap<HTMLElement, JSONViewerState>();
const intents = new WeakMap<HTMLElement, number>();
let jsonViewerId = 0;

function jsonViewerRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="json-viewer"]') ? value : undefined;
}

function owned(root: HTMLElement, selector: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll(selector)).find(
    (element): element is HTMLElement =>
      isHTMLElement(element) &&
      element.closest('[data-jqs]:not(button[data-jqs="button"])') === root,
  );
}
function current(record: JSONViewerRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.dataset.jqs === "json-viewer" &&
    owned(record.root, 'script[data-part="source"]') === record.json &&
    owned(record.root, '[data-part="tree"]') === record.tree &&
    owned(record.root, '[data-part="status"]') === record.status
  );
}
function disclosures(record: JSONViewerState): HTMLDetailsElement[] {
  return Array.from(record.tree.querySelectorAll('details[data-part="branch"]')).filter(
    (element): element is HTMLDetailsElement =>
      isHTMLTag(element, "details") &&
      element.closest("[data-jqs]") === record.tree.closest("[data-jqs]"),
  );
}
function branchState(record: JSONViewerState): Map<string, boolean> {
  return new Map(disclosures(record).map((branch) => [branch.dataset.path ?? "", branch.open]));
}
function snapshot(record: JSONViewerRecord): JSONViewerState {
  const { text, signature, expanded, json, status, tree, value } = record;
  return { text, signature, expanded, json, status, tree, value, branches: branchState(record) };
}

function resolve(target: JSONViewerTarget, root: ParentNode = document): HTMLElement {
  const value =
    typeof target === "string"
      ? jsonViewerRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : jsonViewerRoot(target);
  if (value) return value;
  throw new Error(`JSON Viewer target did not match data-jqs="json-viewer": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string") return resolve(target, context.root);
  const closest =
    context.element?.closest('[data-jqs="json-viewer"]') ??
    (isHTMLElement(context.root) ? jsonViewerRoot(context.root) : undefined);
  return resolve(isHTMLElement(closest) ? closest : String(target));
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:json-viewer:${name}`,
      { bubbles: true, detail },
    ),
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

function keyLabel(key: string | undefined, document: Document): HTMLElement | undefined {
  if (key === undefined) return undefined;
  const element = document.createElement("span");
  element.dataset.part = "key";
  element.textContent = key;
  return element;
}

function appendKey(parent: HTMLElement, key: string | undefined): void {
  const document = parent.ownerDocument;
  const label = keyLabel(key, document);
  if (!label) return;
  const separator = document.createElement("span");
  separator.dataset.part = "separator";
  separator.setAttribute("aria-hidden", "true");
  separator.textContent = ": ";
  parent.append(label, separator);
}

interface RenderContext {
  document: Document;
  expanded: ReadonlyMap<string, boolean>;
  maxDepth: number;
  nodes: number;
  openAll: boolean | undefined;
}

function renderNode(
  value: unknown,
  key: string | undefined,
  path: string,
  depth: number,
  context: RenderContext,
): HTMLLIElement {
  const { document } = context;
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
  details.open = context.expanded.get(path) ?? context.openAll ?? depth === 0;
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

function configuration(record: JSONViewerRecord) {
  const text = record.json.textContent.trim() || "null";
  const expanded =
    record.root.dataset.expanded === "true"
      ? true
      : record.root.dataset.expanded === "false"
        ? false
        : undefined;
  const depth = maxDepth(record);
  return { text, expanded, depth, signature: JSON.stringify([text, expanded, depth]) };
}
function sync(record: JSONViewerRecord): void {
  if (!current(record)) return;
  const config = configuration(record);
  if (record.signature === config.signature || record.rendering === config.signature) return;
  const revision = ++record.revision;
  const valid = (): boolean =>
    current(record, revision) && configuration(record).signature === config.signature;
  const document = record.document;
  const expanded =
    record.expanded === config.expanded ? branchState(record) : new Map<string, boolean>();
  if (record.expanded === config.expanded && expanded.size === 0) {
    for (const entry of record.branches) expanded.set(...entry);
  }
  record.rendering = config.signature;
  let committed = false;
  try {
    let value: unknown;
    let error: unknown;
    let parsed = true;
    try {
      value = JSON.parse(config.text) as unknown;
    } catch (failure) {
      parsed = false;
      error = failure;
    }
    if (!valid()) return;
    let content: HTMLElement;
    let nodes = 0;
    if (parsed) {
      const context: RenderContext = {
        document,
        expanded,
        maxDepth: config.depth,
        nodes: 0,
        openAll: config.expanded,
      };
      content = document.createElement("ul");
      content.dataset.part = "document";
      content.append(renderNode(value, undefined, "", 0, context));
      nodes = context.nodes;
    } else {
      content = document.createElement("p");
      content.dataset.part = "error";
      content.setAttribute("role", "alert");
      content.textContent = error instanceof Error ? error.message : String(error);
    }
    if (!valid()) return;
    record.text = config.text;
    record.signature = config.signature;
    record.expanded = config.expanded;
    record.value = value;
    record.tree.replaceChildren(content);
    if (!valid()) return;
    const state = parsed ? "ready" : "error";
    if (record.root.dataset.state !== state) record.root.dataset.state = state;
    if (!valid()) return;
    setText(
      record.status,
      parsed
        ? `${nodes.toLocaleString()} JSON ${nodes === 1 ? "value" : "values"}.`
        : "JSON could not be parsed.",
    );
    if (!valid()) return;
    committed = true;
    record.branches = branchState(record);
    emit(record, parsed ? "update" : "error", parsed ? { nodes } : { error, nodes: 0 });
  } finally {
    if (record.rendering === config.signature) record.rendering = undefined;
    if (record.revision === revision && !committed) record.signature = undefined;
  }
}
function enhanceJSONViewer(root: HTMLElement): JSONViewerRecord {
  const previous = records.get(root);
  if (previous && current(previous)) {
    sync(previous);
    return previous;
  }
  const saved = previous ? snapshot(previous) : retained.get(root);
  previous?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  const source = owned(root, 'script[data-part="source"]');
  const tree = owned(root, '[data-part="tree"]');
  if (!isHTMLTag(source, "script") || !tree)
    throw new Error(`JSON Viewer #${root.id} needs a JSON script source and data-part="tree".`);
  const status = owned(root, '[data-part="status"]');
  const same = saved?.json === source && saved.tree === tree && saved.status === status;
  const record: JSONViewerRecord = {
    ...uiResources(root),
    json: source,
    tree,
    status,
    text: same ? saved.text : undefined,
    signature: same ? saved.signature : undefined,
    value: same ? saved.value : undefined,
    expanded: saved?.expanded,
    branches: saved?.branches ?? new Map<string, boolean>(),
    rendering: undefined,
  };
  record.cleanups.add(() => retained.set(root, snapshot(record)));
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    root.id ||= `jqs-json-viewer-${++jsonViewerId}`;
    if (current(record) && source.type !== "application/json") source.type = "application/json";
    if (current(record)) sync(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function request(
  target: JSONViewerTarget,
  run: (record: JSONViewerRecord, valid: () => boolean) => void,
): HTMLElement {
  const root = resolve(target);
  const requested = (intents.get(root) ?? 0) + 1;
  intents.set(root, requested);
  const record = enhanceJSONViewer(root);
  const revision = ++record.revision;
  const valid = (): boolean => current(record, revision) && intents.get(root) === requested;
  if (valid()) run(record, valid);
  return root;
}
function setValue(record: JSONViewerRecord, value: unknown, valid: () => boolean): void {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch (error) {
    if (valid()) emit(record, "error", { error });
    throw error;
  }
  if (!valid()) return;
  if (text === undefined) text = "null";
  if (record.json.textContent !== text) record.json.textContent = text;
  if (valid()) sync(record);
}
function toggleAll(record: JSONViewerRecord, open: boolean, valid: () => boolean): void {
  for (const details of disclosures(record)) {
    if (!valid()) return;
    if (details.open !== open) details.open = open;
  }
  if (!valid()) return;
  record.root.dataset.expanded = String(open);
  if (!valid()) return;
  record.expanded = open;
  record.signature = configuration(record).signature;
  record.branches = branchState(record);
  emit(record, open ? "expand" : "collapse");
}

function enhanceAll(root: ParentNode): void {
  for (const candidate of uiElements(root, '[data-jqs="json-viewer"]')) {
    const viewer = jsonViewerRoot(candidate);
    if (viewer) enhanceJSONViewer(viewer);
  }
}

export function createJSONViewers(registerAction: ActionRegistrar): JSONViewerCollection {
  const api: StarJSONViewerStatic = {
    set: (target, value) => request(target, (record, valid) => setValue(record, value, valid)),
    value: (target) => structuredClone(enhanceJSONViewer(resolve(target)).value),
    expandAll: (target) => request(target, (record, valid) => toggleAll(record, true, valid)),
    collapseAll: (target) => request(target, (record, valid) => toggleAll(record, false, valid)),
  };
  for (const [name, method] of [
    ["expand-all", "expandAll"],
    ["collapse-all", "collapseAll"],
  ] as const) {
    registerAction(`ui.json-viewer.${name}`, (context) => {
      const root = controlled(context, context.args?.[0]);
      const selector =
        ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]';
      if (root.closest(selector) || context.element?.closest(selector)) return root;
      return api[method](root);
    });
  }
  return { api, enhance: enhanceAll };
}
