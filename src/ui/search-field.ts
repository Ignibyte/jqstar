import { registerAction } from "../registry";
import type { SearchFieldTarget, StarContext, StarSearchFieldStatic } from "../types";

interface SearchFieldRecord {
  cleanup: () => void;
  clear: HTMLButtonElement | undefined;
  control: HTMLInputElement;
  lastValue: string;
  root: HTMLElement;
  submit: HTMLButtonElement | undefined;
}

interface SearchFieldCollection {
  api: StarSearchFieldStatic;
  enhance(root: ParentNode): void;
}

interface SearchFieldEventDetail {
  control: HTMLInputElement;
  previousValue: string;
  searchField: HTMLElement;
  value: string;
}

const records = new WeakMap<HTMLElement, SearchFieldRecord>();
let searchFieldId = 0;

function searchFieldRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="search-field"]')
    ? value
    : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="search-field"]') === root,
  );
}

function controlPart(root: HTMLElement): HTMLInputElement {
  const control = owned<HTMLInputElement>(root, 'input[data-part="control"]');
  if (!control) throw new Error(`Search Field #${root.id} needs an input data-part="control".`);
  if (control.type !== "search") {
    throw new Error(`Search Field #${root.id} control must use type="search".`);
  }
  return control;
}

function buttonPart(root: HTMLElement, part: "clear" | "submit"): HTMLButtonElement | undefined {
  const button = owned<HTMLElement>(root, `[data-part="${part}"]`);
  if (button && !(button instanceof HTMLButtonElement)) {
    throw new Error(`Search Field #${root.id} ${part} part must be a button.`);
  }
  return button;
}

function emit(
  record: SearchFieldRecord,
  name: "before-change" | "change" | "search",
  value: string,
  previousValue: string,
  cancelable = false,
): boolean {
  const detail: SearchFieldEventDetail = {
    control: record.control,
    previousValue,
    searchField: record.root,
    value,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:search-field:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function loading(record: SearchFieldRecord): boolean {
  return record.root.dataset.loading === "true";
}

function render(record: SearchFieldRecord): void {
  const value = record.control.value;
  record.lastValue = value;
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  record.root.dataset.state = loading(record) ? "loading" : value ? "filled" : "empty";
  record.control.setAttribute("aria-busy", String(loading(record)));
  if (record.clear) {
    record.clear.type = "button";
    record.clear.hidden = !value;
    const disabled = record.control.disabled || loading(record);
    if (record.clear.disabled !== disabled) record.clear.disabled = disabled;
  }
  if (record.submit) {
    record.submit.type = "submit";
    const disabled = record.control.disabled || loading(record);
    if (record.submit.disabled !== disabled) record.submit.disabled = disabled;
  }
}

function commit(record: SearchFieldRecord, value: string, nativeEvents = true): HTMLElement {
  if (record.control.disabled || loading(record)) return record.root;
  const previousValue = record.lastValue;
  if (value === previousValue) return record.root;
  if (!emit(record, "before-change", value, previousValue, true)) return record.root;
  record.control.value = value;
  render(record);
  if (nativeEvents) {
    record.control.dispatchEvent(new Event("input", { bubbles: true }));
    record.control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  emit(record, "change", value, previousValue);
  return record.root;
}

function submit(record: SearchFieldRecord): HTMLElement {
  if (record.control.disabled || loading(record)) return record.root;
  const form = record.control.form;
  if (form) form.requestSubmit(record.submit);
  else emit(record, "search", record.control.value, record.lastValue);
  return record.root;
}

function wire(record: SearchFieldRecord): () => void {
  const input = (): void => {
    const value = record.control.value;
    const previousValue = record.lastValue;
    if (value === previousValue) return;
    if (!emit(record, "before-change", value, previousValue, true)) {
      record.control.value = previousValue;
      return;
    }
    render(record);
    emit(record, "change", value, previousValue);
  };
  const clear = (): void => {
    commit(record, "");
    record.control.focus();
  };
  const search = (): void => {
    if (!record.control.form) emit(record, "search", record.control.value, record.lastValue);
  };
  const formSubmit = (): void => {
    emit(record, "search", record.control.value, record.lastValue);
  };
  record.control.addEventListener("input", input);
  record.control.addEventListener("search", search);
  record.clear?.addEventListener("click", clear);
  record.control.form?.addEventListener("submit", formSubmit);
  return () => {
    record.control.removeEventListener("input", input);
    record.control.removeEventListener("search", search);
    record.clear?.removeEventListener("click", clear);
    record.control.form?.removeEventListener("submit", formSubmit);
  };
}

function enhanceSearchField(root: HTMLElement): SearchFieldRecord {
  root.id ||= `jqs-search-field-${++searchFieldId}`;
  const control = controlPart(root);
  const clear = buttonPart(root, "clear");
  const submitButton = buttonPart(root, "submit");
  const existing = records.get(root);
  if (
    existing?.control === control &&
    existing.clear === clear &&
    existing.submit === submitButton
  ) {
    if (root.dataset.value !== undefined && root.dataset.value !== existing.lastValue) {
      control.value = root.dataset.value;
    }
    render(existing);
    return existing;
  }
  existing?.cleanup();
  if (root.dataset.value !== undefined) control.value = root.dataset.value;
  const record: SearchFieldRecord = {
    cleanup: () => undefined,
    clear,
    control,
    lastValue: control.value,
    root,
    submit: submitButton,
  };
  records.set(root, record);
  render(record);
  record.cleanup = wire(record);
  return record;
}

function resolve(target: SearchFieldTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? searchFieldRoot(root.querySelector(target))
      : searchFieldRoot(target);
  if (resolved) return resolved;
  throw new Error(`Search Field target did not match data-jqs="search-field": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="search-field"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="search-field"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="search-field"]')));
  for (const element of elements) {
    const searchField = searchFieldRoot(element);
    if (searchField) enhanceSearchField(searchField);
  }
}

export function createSearchFields(): SearchFieldCollection {
  const api: StarSearchFieldStatic = {
    set: (target, value) => {
      const root = resolve(target);
      return commit(records.get(root) ?? enhanceSearchField(root), value);
    },
    clear: (target) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceSearchField(root);
      const result = commit(record, "");
      record.control.focus();
      return result;
    },
    focus: (target) => {
      const root = resolve(target);
      (records.get(root) ?? enhanceSearchField(root)).control.focus();
      return root;
    },
    submit: (target) => {
      const root = resolve(target);
      return submit(records.get(root) ?? enhanceSearchField(root));
    },
    value: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhanceSearchField(root)).control.value;
    },
  };
  registerAction("ui.search-field.set", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    return api.set(target, typeof value === "string" ? value : "");
  });
  registerAction("ui.search-field.clear", (context) =>
    api.clear(controlled(context, context.args?.[0])),
  );
  registerAction("ui.search-field.focus", (context) =>
    api.focus(controlled(context, context.args?.[0])),
  );
  registerAction("ui.search-field.submit", (context) =>
    api.submit(controlled(context, context.args?.[0])),
  );
  return { api, enhance: enhanceAll };
}
