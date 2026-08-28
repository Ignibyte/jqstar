import { registerAction } from "../registry";
import type { StarContext, StarTagsInputStatic, TagsInputTarget } from "../types";

type TagsOperation = "add" | "remove" | "clear";

interface TagsInputRecord {
  cleanup: () => void;
  control: HTMLInputElement;
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
  return value instanceof HTMLElement && value.matches('[data-jqs="tags-input"]')
    ? value
    : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      child instanceof HTMLInputElement && child.dataset.part === "control",
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
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
  );
}

function createList(root: HTMLElement): HTMLElement {
  const list = document.createElement("ul");
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
    record.control.disabled ||
    record.control.readOnly
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
    new CustomEvent(`jquery-star:tags-input:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function tagElement(record: TagsInputRecord, value: string): HTMLElement {
  const tag = document.createElement(record.list instanceof HTMLUListElement ? "li" : "span");
  tag.dataset.part = "tag";
  tag.dataset.value = value;
  if (!(tag instanceof HTMLLIElement)) tag.setAttribute("role", "listitem");

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
    const input = document.createElement("input");
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
  const previousValues = [...record.values];
  if (
    previousValues.join("\0") === values.join("\0") ||
    !emit(record, "before-change", operation, previousValues, values, value, true)
  ) {
    return record.root;
  }
  record.values = values;
  render(record);
  record.root.dispatchEvent(new Event("input", { bubbles: true }));
  record.root.dispatchEvent(new Event("change", { bubbles: true }));
  emit(record, "change", operation, previousValues, values, value);
  return record.root;
}

function requestAdd(root: HTMLElement, rawValue: string): HTMLElement {
  const record = records.get(root) ?? enhanceTagsInput(root);
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
  const result = commit(record, "add", [...record.values, value], value);
  if (record.values.includes(value)) {
    record.control.value = "";
    announce(record, `${value} added.`);
  }
  return result;
}

function requestRemove(root: HTMLElement, value: string): HTMLElement {
  const record = records.get(root) ?? enhanceTagsInput(root);
  if (unavailable(record)) return root;
  const match = record.values.find(
    (candidate) => candidate.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
  );
  if (!match) return root;
  const result = commit(
    record,
    "remove",
    record.values.filter((candidate) => candidate !== match),
    match,
  );
  if (!record.values.includes(match)) announce(record, `${match} removed.`);
  return result;
}

function requestClear(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceTagsInput(root);
  if (unavailable(record)) return root;
  const result = commit(record, "clear", []);
  if (record.values.length === 0) announce(record, "All tags removed.");
  return result;
}

function enhanceTagsInput(root: HTMLElement): TagsInputRecord {
  const existing = records.get(root);
  if (existing) {
    const patched = unique(parseValues(root.dataset.value));
    if (JSON.stringify(patched) !== JSON.stringify(existing.values)) existing.values = patched;
    render(existing);
    return existing;
  }

  root.id ||= `jqs-tags-input-${++tagsInputId}`;
  const control = directControl(root);
  const list = directPart(root, "list") ?? createList(root);
  const status = directPart(root, "status");
  control.id ||= `${root.id}-control`;
  list.id ||= `${root.id}-list`;
  if (!(list instanceof HTMLUListElement || list instanceof HTMLOListElement)) {
    list.setAttribute("role", "list");
  }
  control.setAttribute("aria-controls", list.id);
  control.setAttribute("autocomplete", "off");
  if (status) {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
  }
  const record: TagsInputRecord = {
    cleanup: () => undefined,
    control,
    list,
    root,
    status,
    values: unique(parseValues(root.dataset.value)),
  };
  const keydown = (event: KeyboardEvent): void => {
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
      event.preventDefault();
      control.value = "";
      announce(record, "Entry cleared.");
    }
  };
  const click = (event: MouseEvent): void => {
    const remove =
      event.target instanceof Element ? event.target.closest('[data-part="remove"]') : null;
    if (!(remove instanceof HTMLButtonElement) || !list.contains(remove)) return;
    const value = remove.dataset.value;
    if (value) requestRemove(root, value);
    control.focus();
  };
  const blur = (): void => {
    if (root.hasAttribute("data-add-on-blur")) requestAdd(root, control.value);
  };
  control.addEventListener("keydown", keydown);
  control.addEventListener("blur", blur);
  list.addEventListener("click", click);
  record.cleanup = () => {
    control.removeEventListener("keydown", keydown);
    control.removeEventListener("blur", blur);
    list.removeEventListener("click", click);
  };
  records.set(root, record);
  render(record);
  return record;
}

function resolveTagsInput(target: TagsInputTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? tagsInputRoot(root.querySelector(target)) : tagsInputRoot(target);
  if (resolved) return resolved;
  throw new Error(`Tags Input target did not match data-jqs="tags-input": ${String(target)}`);
}

function controlledTagsInput(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="tags-input"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveTagsInput(target, context.root);
  const closest = context.element?.closest('[data-jqs="tags-input"]');
  return resolveTagsInput(closest instanceof HTMLElement ? closest : String(target));
}

function registerActions(api: StarTagsInputStatic): void {
  for (const name of ["add", "remove"] as const) {
    registerAction(`ui.tags-input.${name}`, (context) => {
      const first = context.args?.[0];
      const explicit = typeof first === "string" && first.startsWith("#");
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
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="tags-input"]')));
  for (const element of elements) {
    const input = tagsInputRoot(element);
    if (input) enhanceTagsInput(input);
  }
}

export function createTagsInputs(): TagsInputCollection {
  const api: StarTagsInputStatic = {
    add: (target, value) => requestAdd(resolveTagsInput(target), value),
    remove: (target, value) => requestRemove(resolveTagsInput(target), value),
    clear: (target) => requestClear(resolveTagsInput(target)),
    value: (target) => {
      const root = resolveTagsInput(target);
      return [...(records.get(root) ?? enhanceTagsInput(root)).values];
    },
  };
  registerActions(api);
  return { api, enhance: enhanceTree };
}
