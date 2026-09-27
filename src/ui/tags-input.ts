import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { StarContext, StarTagsInputStatic, TagsInputTarget } from "../types";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

type TagsOperation = "add" | "remove" | "clear";

interface TagsInputRecord extends UIResources {
  input: HTMLInputElement;
  list: HTMLElement;
  root: HTMLElement;
  status: HTMLElement | undefined;
  values: string[];
}

interface TagsInputEventDetail {
  operation: TagsOperation;
  previousValues: string[];
  tagsInput: HTMLElement;
  value?: string;
  values: string[];
}

interface TagsInputCollection {
  api: StarTagsInputStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, TagsInputRecord>();
let tagsInputId = 0;

function tagsInputRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="tags-input"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      isHTMLTag(child, "input") && child.dataset.part === "control",
  );
  if (!control) {
    throw new Error(`Tags Input #${root.id} needs a direct <input data-part="control">.`);
  }
  if (!["text", "search"].includes(control.type)) {
    throw new Error(`Tags Input #${root.id} control must use type="text" or type="search".`);
  }
  return control;
}

function directPart(root: HTMLElement, part: "list" | "status"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}

function createList(root: HTMLElement): HTMLElement {
  const list = root.ownerDocument.createElement("ul");
  list.dataset.part = "list";
  list.dataset.generated = "";
  root.prepend(list);
  return list;
}

function parseValues(serialized: string | undefined): string[] {
  if (!serialized?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return serialized
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function maximum(root: HTMLElement): number | undefined {
  const value = Number(root.dataset.max);
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function unavailable(record: TagsInputRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    record.input.disabled ||
    record.input.readOnly
  );
}

function current(record: TagsInputRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.querySelector(':scope > input[data-part="control"]') === record.input &&
    directPart(record.root, "list") === record.list &&
    directPart(record.root, "status") === record.status
  );
}

function announce(record: TagsInputRecord, message: string): void {
  if (!record.status) return;
  record.status.textContent = message;
}

function emit(
  record: TagsInputRecord,
  name: "before-change" | "change",
  operation: TagsOperation,
  previousValues: string[],
  values: string[],
  value?: string,
  cancelable = false,
): boolean {
  const detail: TagsInputEventDetail = {
    operation,
    previousValues,
    tagsInput: record.root,
    ...(value === undefined ? {} : { value }),
    values,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:tags-input:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
  );
}

function tagElement(record: TagsInputRecord, value: string): HTMLElement {
  const document = record.root.ownerDocument;
  const tag = document.createElement(
    isHTMLTag(record.list, "ul") || isHTMLTag(record.list, "ol") ? "li" : "span",
  );
  tag.dataset.part = "tag";
  tag.dataset.value = value;
  if (!isHTMLTag(tag, "li")) tag.setAttribute("role", "listitem");

  const label = document.createElement("span");
  label.dataset.part = "tag-label";
  label.textContent = value;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.dataset.part = "remove";
  remove.dataset.value = value;
  remove.setAttribute("aria-label", `Remove ${value}`);
  remove.textContent = "×";
  remove.disabled = unavailable(record);
  tag.append(label, remove);
  return tag;
}

function syncFormInputs(record: TagsInputRecord): void {
  const existing = Array.from(
    record.root.querySelectorAll<HTMLInputElement>(':scope > input[data-generated="tags-input"]'),
  );
  const name = record.root.dataset.name?.trim();
  if (
    existing.length === record.values.length &&
    existing.every((input, index) => input.name === name && input.value === record.values[index])
  ) {
    return;
  }
  for (const input of existing) input.remove();
  if (!name) return;
  for (const value of record.values) {
    const input = record.root.ownerDocument.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    input.dataset.generated = "tags-input";
    record.root.append(input);
  }
}

function render(record: TagsInputRecord): void {
  const serialized = JSON.stringify(record.values);
  if (record.root.dataset.value !== serialized) record.root.dataset.value = serialized;
  record.root.dataset.state = unavailable(record) ? "disabled" : "ready";
  if (record.list.dataset.jqsValues !== serialized) {
    record.list.replaceChildren(...record.values.map((value) => tagElement(record, value)));
    record.list.dataset.jqsValues = serialized;
  } else {
    for (const remove of record.list.querySelectorAll<HTMLButtonElement>('[data-part="remove"]')) {
      const disabled = unavailable(record);
      if (remove.disabled !== disabled) remove.disabled = disabled;
    }
  }
  syncFormInputs(record);
}

function commit(
  record: TagsInputRecord,
  operation: TagsOperation,
  values: string[],
  value?: string,
): HTMLElement {
  const revision = ++record.revision;
  const previousValues = [...record.values];
  const authored = record.root.dataset.value;
  const max = maximum(record.root);
  if (
    previousValues.join("\0") === values.join("\0") ||
    !emit(record, "before-change", operation, previousValues, values, value, true) ||
    !current(record, revision) ||
    unavailable(record) ||
    maximum(record.root) !== max ||
    record.root.dataset.value !== authored
  ) {
    return record.root;
  }
  record.values = values;
  render(record);
  record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  if (!current(record, revision)) return record.root;
  record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
  );
  if (!current(record, revision)) return record.root;
  emit(record, "change", operation, previousValues, values, value);
  return record.root;
}

function requestAdd(root: HTMLElement, rawValue: string): HTMLElement {
  const record = recordFor(root);
  if (unavailable(record)) return root;
  const value = rawValue.trim();
  if (!value) return root;
  if (
    record.values.some((candidate) => candidate.toLocaleLowerCase() === value.toLocaleLowerCase())
  ) {
    announce(record, `${value} is already added.`);
    return root;
  }
  const max = maximum(root);
  if (max !== undefined && record.values.length >= max) {
    announce(record, `You can add up to ${max} tags.`);
    return root;
  }
  const revision = record.revision + 1;
  const draft = record.input.value;
  const result = commit(record, "add", [...record.values, value], value);
  if (current(record, revision) && record.values.includes(value) && record.input.value === draft) {
    record.input.value = "";
    announce(record, `${value} added.`);
  }
  return result;
}

function requestRemove(root: HTMLElement, value: string): HTMLElement {
  const record = recordFor(root);
  if (unavailable(record)) return root;
  const match = record.values.find(
    (candidate) => candidate.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
  );
  if (!match) return root;
  const revision = record.revision + 1;
  const result = commit(
    record,
    "remove",
    record.values.filter((candidate) => candidate !== match),
    match,
  );
  if (current(record, revision) && !record.values.includes(match))
    announce(record, `${match} removed.`);
  return result;
}

function requestClear(root: HTMLElement): HTMLElement {
  const record = recordFor(root);
  if (unavailable(record)) return root;
  const revision = record.revision + 1;
  const result = commit(record, "clear", []);
  if (current(record, revision) && record.values.length === 0)
    announce(record, "All tags removed.");
  return result;
}

function enhanceTagsInput(root: HTMLElement): TagsInputRecord {
  const existing = records.get(root);
  root.id ||= `jqs-tags-input-${++tagsInputId}`;
  const control = directControl(root);
  const list = directPart(root, "list") ?? createList(root);
  const status = directPart(root, "status");
  control.id ||= `${root.id}-control`;
  list.id ||= `${root.id}-list`;
  if (!(isHTMLTag(list, "ul") || isHTMLTag(list, "ol"))) {
    list.setAttribute("role", "list");
  }
  control.setAttribute("aria-controls", list.id);
  control.setAttribute("autocomplete", "off");
  if (status) {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
  }
  const values = unique(parseValues(root.dataset.value));
  if (existing && current(existing)) {
    if (JSON.stringify(values) !== JSON.stringify(existing.values)) existing.revision += 1;
    existing.values = values;
    render(existing);
    return existing;
  }
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && existing.list !== list) delete list.dataset.jqsValues;
  const record: TagsInputRecord = {
    ...uiResources(root),
    input: control,
    list,
    root,
    status,
    values,
  };
  const keydown = (nativeEvent: Event): void => {
    const event = nativeEvent as KeyboardEvent;
    if (event.isComposing) return;
    if (event.key === "Enter" || event.key === ",") {
      if (!control.value.trim()) return;
      event.preventDefault();
      requestAdd(root, control.value);
      return;
    }
    if (event.key === "Backspace" && control.value === "" && record.values.length > 0) {
      event.preventDefault();
      const last = record.values.at(-1);
      if (last) requestRemove(root, last);
      return;
    }
    if (event.key === "Escape" && control.value !== "") {
      record.revision += 1;
      event.preventDefault();
      control.value = "";
      announce(record, "Entry cleared.");
    }
  };
  const click = (event: Event): void => {
    const remove = isElementNode(event.target)
      ? event.target.closest('[data-part="remove"]')
      : null;
    if (!isHTMLTag(remove, "button") || !list.contains(remove)) return;
    const value = remove.dataset.value;
    const revision = record.revision + 1;
    if (value) requestRemove(root, value);
    if (current(record, revision)) control.focus();
  };
  const blur = (): void => {
    if (root.hasAttribute("data-add-on-blur")) requestAdd(root, control.value);
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const listen = listenUI.bind(undefined, record, () => current(record));
    listen(control, "keydown", keydown);
    listen(control, "blur", blur);
    listen(list, "click", click);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    render(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): TagsInputRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceTagsInput(root);
}

function resolveTagsInput(target: TagsInputTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? tagsInputRoot(root.querySelector(target)) : tagsInputRoot(target);
  if (resolved) return resolved;
  throw new Error(`Tags Input target did not match data-jqs="tags-input": ${String(target)}`);
}

function controlledTagsInput(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveTagsInput(target, context.root);
  if (typeof target === "string" && target.startsWith("#"))
    return resolveTagsInput(target, context.root);
  const closest = context.element?.closest('[data-jqs="tags-input"]');
  return resolveTagsInput(isHTMLElement(closest) ? closest : String(target));
}

function registerActions(api: StarTagsInputStatic, registerAction: ActionRegistrar): void {
  for (const name of ["add", "remove"] as const) {
    registerAction(`ui.tags-input.${name}`, (context) => {
      const first = context.args?.[0];
      const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
      const target = controlledTagsInput(context, explicit ? first : undefined);
      const value = explicit ? context.args?.[1] : first;
      if (typeof value !== "string") throw new Error(`ui.tags-input.${name} needs a tag value.`);
      return api[name](target, value);
    });
  }
  registerAction("ui.tags-input.clear", (context) =>
    api.clear(controlledTagsInput(context, context.args?.[0])),
  );
}

function enhanceTree(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="tags-input"]')) {
    const input = tagsInputRoot(element);
    if (input) enhanceTagsInput(input);
  }
}

export function createTagsInputs(registerAction: ActionRegistrar): TagsInputCollection {
  const api: StarTagsInputStatic = {
    add: (target, value) => requestAdd(resolveTagsInput(target), value),
    remove: (target, value) => requestRemove(resolveTagsInput(target), value),
    clear: (target) => requestClear(resolveTagsInput(target)),
    value: (target) => {
      const root = resolveTagsInput(target);
      return [...recordFor(root).values];
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}
