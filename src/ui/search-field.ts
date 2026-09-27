import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { SearchFieldTarget, StarContext, StarSearchFieldStatic } from "../types";
import {
  failUISetup,
  listenUI,
  listenUIReset,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

interface SearchFieldRecord extends UIResources {
  form: HTMLFormElement | null;
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
const reflected = new WeakMap<HTMLElement, string>();
let searchFieldId = 0;

function searchFieldRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="search-field"]') ? value : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="search-field"]') === root,
  );
}

function controlPart(root: HTMLElement): HTMLInputElement {
  const control = owned<HTMLInputElement>(root, 'input[data-part="control"]');
  if (!isHTMLTag(control, "input"))
    throw new Error(`Search Field #${root.id} needs an input data-part="control".`);
  if (control.type !== "search") {
    throw new Error(`Search Field #${root.id} control must use type="search".`);
  }
  return control;
}

function buttonPart(root: HTMLElement, part: "clear" | "submit"): HTMLButtonElement | undefined {
  const button = owned<HTMLElement>(root, `[data-part="${part}"]`);
  if (button && !isHTMLTag(button, "button")) {
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:search-field:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
  );
}

function loading(record: SearchFieldRecord): boolean {
  return record.root.dataset.loading === "true";
}

function unavailable(record: SearchFieldRecord): boolean {
  return record.control.disabled || loading(record);
}

function current(record: SearchFieldRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    owned(record.root, 'input[data-part="control"]') === record.control &&
    owned(record.root, '[data-part="clear"]') === record.clear &&
    owned(record.root, '[data-part="submit"]') === record.submit &&
    record.control.form === record.form
  );
}

function render(record: SearchFieldRecord): void {
  const value = record.control.value;
  record.lastValue = value;
  reflected.set(record.root, value);
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  record.root.dataset.state = loading(record) ? "loading" : value ? "filled" : "empty";
  record.control.setAttribute("aria-busy", String(loading(record)));
  if (record.clear) {
    record.clear.type = "button";
    record.clear.hidden = !value;
    const disabled = unavailable(record);
    if (record.clear.disabled !== disabled) record.clear.disabled = disabled;
  }
  if (record.submit) {
    record.submit.type = "submit";
    const disabled = unavailable(record);
    if (record.submit.disabled !== disabled) record.submit.disabled = disabled;
  }
}

function commit(record: SearchFieldRecord, value: string, nativeEvents = true): HTMLElement {
  const revision = ++record.revision;
  if (unavailable(record)) return record.root;
  const previousValue = record.lastValue;
  const nativeValue = record.control.value;
  if (value === previousValue) return record.root;
  if (
    !emit(record, "before-change", value, previousValue, true) ||
    !current(record, revision) ||
    unavailable(record) ||
    record.control.value !== nativeValue
  )
    return record.root;
  record.control.value = value;
  render(record);
  if (nativeEvents) {
    record.control.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
    );
    if (!current(record, revision) || record.control.value !== value) return record.root;
    record.control.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
    );
    if (!current(record, revision) || record.control.value !== value) return record.root;
  }
  emit(record, "change", value, previousValue);
  return record.root;
}

function submit(record: SearchFieldRecord): HTMLElement {
  if (unavailable(record)) return record.root;
  const form = record.control.form;
  if (form) form.requestSubmit(record.submit);
  else emit(record, "search", record.control.value, record.lastValue);
  return record.root;
}

function wire(record: SearchFieldRecord): void {
  const input = (): void => {
    const value = record.control.value;
    const previousValue = record.lastValue;
    if (value === previousValue) return;
    const revision = ++record.revision;
    if (!emit(record, "before-change", value, previousValue, true)) {
      if (current(record, revision)) record.control.value = previousValue;
      return;
    }
    if (!current(record, revision) || record.control.value !== value) return;
    render(record);
    emit(record, "change", value, previousValue);
  };
  const clear = (): void => {
    const revision = record.revision + 1;
    commit(record, "");
    if (current(record, revision)) record.control.focus();
  };
  const search = (): void => {
    if (!record.control.form) emit(record, "search", record.control.value, record.lastValue);
  };
  const formSubmit = (): void => {
    emit(record, "search", record.control.value, record.lastValue);
  };
  const listen = listenUI.bind(undefined, record, () => current(record));
  listen(record.control, "input", input);
  listen(record.control, "search", search);
  listen(record.clear, "click", clear);
  listen(record.form ?? undefined, "submit", formSubmit);
  listenUIReset(
    record,
    () => current(record),
    record.form,
    () => render(record),
  );
}

function enhanceSearchField(root: HTMLElement): SearchFieldRecord {
  root.id ||= `jqs-search-field-${++searchFieldId}`;
  const control = controlPart(root);
  const clear = buttonPart(root, "clear");
  const submitButton = buttonPart(root, "submit");
  const existing = records.get(root);
  if (
    existing?.control === control &&
    current(existing) &&
    existing.clear === clear &&
    existing.submit === submitButton
  ) {
    if (existing.resetRevision === existing.revision && root.dataset.value === reflected.get(root))
      return existing;
    if (root.dataset.value !== undefined && root.dataset.value !== existing.lastValue) {
      control.value = root.dataset.value;
    }
    if (existing.lastValue !== control.value) existing.revision += 1;
    render(existing);
    return existing;
  }
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (root.dataset.value !== undefined && root.dataset.value !== reflected.get(root))
    control.value = root.dataset.value;
  const record: SearchFieldRecord = {
    ...uiResources(root),
    form: control.form,
    clear,
    control,
    lastValue: control.value,
    root,
    submit: submitButton,
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    render(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): SearchFieldRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceSearchField(root);
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
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="search-field"]');
  return resolve(isHTMLElement(closest) ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="search-field"]')) {
    const searchField = searchFieldRoot(element);
    if (searchField) enhanceSearchField(searchField);
  }
}

export function createSearchFields(registerAction: ActionRegistrar): SearchFieldCollection {
  const api: StarSearchFieldStatic = {
    set: (target, value) => {
      const root = resolve(target);
      return commit(recordFor(root), value);
    },
    clear: (target) => {
      const root = resolve(target);
      const record = recordFor(root);
      const revision = record.revision + 1;
      const result = commit(record, "");
      if (current(record, revision)) record.control.focus();
      return result;
    },
    focus: (target) => {
      const root = resolve(target);
      recordFor(root).control.focus();
      return root;
    },
    submit: (target) => {
      const root = resolve(target);
      return submit(recordFor(root));
    },
    value: (target) => {
      const root = resolve(target);
      return recordFor(root).control.value;
    },
  };
  registerAction("ui.search-field.set", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
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
