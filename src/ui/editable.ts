import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { EditableTarget, StarContext, StarEditableStatic } from "../types";
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

interface EditableCollection {
  api: StarEditableStatic;
  enhance(root: ParentNode): void;
}

interface EditableRecord extends UIResources {
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  view: HTMLElement;
  edit: HTMLButtonElement;
  panel: HTMLElement;
  text: HTMLElement;
  status: HTMLElement | undefined;
  value: string;
}

interface EditableEventDetail {
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  editable: HTMLElement;
  previousValue: string;
  value: string;
}

const records = new WeakMap<HTMLElement, EditableRecord>();
let editableId = 0;

function editableRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="editable"]') ? value : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => isHTMLElement(element) && element.closest('[data-jqs="editable"]') === root,
  );
}

function requirePart<T extends HTMLElement>(
  root: HTMLElement,
  selector: string,
  description: string,
): T {
  const part = owned<T>(root, selector);
  if (!part) throw new Error(`Editable #${root.id} needs ${description}.`);
  return part;
}

function unavailable(record: EditableRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    record.input.disabled
  );
}

function previewText(record: EditableRecord, value: string): string {
  return value || record.root.dataset.placeholder || "Empty";
}

function emit(
  record: EditableRecord,
  name: "before-edit" | "edit" | "before-change" | "change" | "cancel" | "invalid",
  value: string,
  cancelable = false,
  previousValue = record.value,
): boolean {
  const detail: EditableEventDetail = {
    control: record.input,
    editable: record.root,
    previousValue,
    value,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:editable:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function setMode(record: EditableRecord, editing: boolean): void {
  const state = editing ? "editing" : "display";
  if (record.root.dataset.state !== state) record.root.dataset.state = state;
  if (record.view.hidden !== editing) record.view.hidden = editing;
  if (record.panel.hidden === editing) record.panel.hidden = !editing;
  if (record.edit.getAttribute("aria-expanded") !== String(editing)) {
    record.edit.setAttribute("aria-expanded", String(editing));
  }
}

function sync(record: EditableRecord): void {
  const disabled = unavailable(record);
  if (record.edit.disabled !== disabled) record.edit.disabled = disabled;
  if (record.edit.getAttribute("aria-controls") !== record.panel.id) {
    record.edit.setAttribute("aria-controls", record.panel.id);
  }
  const preview = previewText(record, record.value);
  if (record.text.textContent !== preview) record.text.textContent = preview;
  if (record.root.dataset.value !== record.value) record.root.dataset.value = record.value;
  setMode(record, record.root.dataset.state === "editing");
}

function current(record: EditableRecord, revision = record.revision): boolean {
  if (!uiCurrent(record, revision) || records.get(record.root) !== record) return false;
  return (
    [
      ["display", record.view],
      ["preview", record.text],
      ["editor", record.panel],
      ["control", record.input],
      ["edit", record.edit],
      ["status", record.status],
    ] as const
  ).every(([part, element]) => owned(record.root, `[data-part="${part}"]`) === element);
}

function snapshot(record: EditableRecord): string {
  return JSON.stringify([record.root.dataset.value, record.root.dataset.state, record.input.value]);
}

function edit(record: EditableRecord): HTMLElement {
  const revision = ++record.revision;
  const before = snapshot(record);
  if (!current(record)) return record.root;
  if (unavailable(record) || record.root.dataset.state === "editing") return record.root;
  if (
    !emit(record, "before-edit", record.value, true) ||
    !current(record, revision) ||
    snapshot(record) !== before ||
    unavailable(record)
  )
    return record.root;
  record.input.value = record.value;
  setMode(record, true);
  record.input.focus();
  if (!current(record, revision)) return record.root;
  if (record.root.hasAttribute("data-select-on-edit") && "select" in record.input) {
    record.input.select();
  }
  if (!current(record, revision)) return record.root;
  if (record.status) record.status.textContent = record.root.dataset.editMessage ?? "Editing.";
  emit(record, "edit", record.value);
  return record.root;
}

function commit(record: EditableRecord): HTMLElement {
  const revision = ++record.revision;
  const before = snapshot(record);
  if (!current(record)) return record.root;
  if (unavailable(record) || record.root.dataset.state !== "editing") return record.root;
  const valid = record.input.checkValidity();
  if (!current(record, revision) || snapshot(record) !== before || unavailable(record))
    return record.root;
  if (!valid) {
    record.input.reportValidity();
    if (!current(record, revision)) return record.root;
    if (record.status) {
      record.status.textContent =
        record.input.validationMessage || record.root.dataset.invalidMessage || "Invalid value.";
    }
    emit(record, "invalid", record.input.value);
    return record.root;
  }
  const value = record.input.value;
  if (
    !emit(record, "before-change", value, true) ||
    !current(record, revision) ||
    snapshot(record) !== before ||
    unavailable(record) ||
    !record.input.validity.valid
  )
    return record.root;
  const previous = record.value;
  record.value = value;
  record.text.textContent = previewText(record, value);
  record.root.dataset.value = value;
  setMode(record, false);
  if (record.status) {
    record.status.textContent =
      value === previous
        ? (record.root.dataset.unchangedMessage ?? "No changes.")
        : (record.root.dataset.successMessage ?? "Value updated.");
  }
  if (value !== previous) {
    record.input.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
    );
  }
  if (!current(record, revision)) return record.root;
  emit(record, "change", value, false, previous);
  if (current(record, revision)) record.edit.focus();
  return record.root;
}

function cancel(record: EditableRecord): HTMLElement {
  const revision = ++record.revision;
  if (!current(record)) return record.root;
  if (record.root.dataset.state !== "editing") return record.root;
  const draft = record.input.value;
  record.input.value = record.value;
  setMode(record, false);
  if (record.status)
    record.status.textContent = record.root.dataset.cancelMessage ?? "Edit canceled.";
  emit(record, "cancel", draft);
  if (current(record, revision)) record.edit.focus();
  return record.root;
}

function setValue(record: EditableRecord, value: string): HTMLElement {
  const revision = ++record.revision;
  const before = snapshot(record);
  if (!current(record)) return record.root;
  const previous = record.value;
  if (
    !emit(record, "before-change", value, true) ||
    !current(record, revision) ||
    snapshot(record) !== before
  )
    return record.root;
  record.input.value = value;
  record.value = value;
  record.text.textContent = previewText(record, value);
  record.root.dataset.value = value;
  setMode(record, false);
  if (record.status)
    record.status.textContent = record.root.dataset.successMessage ?? "Value updated.";
  if (value !== previous)
    record.input.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
    );
  if (!current(record, revision)) return record.root;
  emit(record, "change", value, false, previous);
  return record.root;
}

function enhanceEditable(root: HTMLElement): EditableRecord {
  const existing = records.get(root);

  root.id ||= `jqs-editable-${++editableId}`;
  const display = requirePart<HTMLElement>(root, '[data-part="display"]', 'data-part="display"');
  const preview = requirePart<HTMLElement>(root, '[data-part="preview"]', 'data-part="preview"');
  const editor = requirePart<HTMLElement>(root, '[data-part="editor"]', 'data-part="editor"');
  const control = requirePart<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    root,
    'input[data-part="control"], textarea[data-part="control"], select[data-part="control"]',
    'a native input, textarea, or select with data-part="control"',
  );
  const editButton = requirePart<HTMLButtonElement>(
    root,
    'button[data-part="edit"]',
    'a button with data-part="edit"',
  );
  const status = owned<HTMLElement>(root, '[data-part="status"]');
  root.dataset.state ||= "display";
  editor.id ||= `${root.id}-editor`;
  control.id ||= `${root.id}-control`;
  editButton.type = "button";
  for (const button of editor.querySelectorAll<HTMLButtonElement>("button")) button.type = "button";
  if (status) {
    status.id ||= `${root.id}-status`;
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    editButton.setAttribute("aria-describedby", status.id);
  }
  const reusable = existing && current(existing);
  if (!reusable) existing?.cleanup();
  const replacement = records.get(root);
  if (!reusable && replacement) return replacement;
  const record: EditableRecord = reusable
    ? existing
    : {
        ...uiResources(root),
        value: existing?.value ?? root.dataset.value ?? control.value,
        input: control,
        view: display,
        edit: editButton,
        panel: editor,
        text: preview,
        status,
      };
  if (!reusable)
    record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const previous = record.value;
    if (root.dataset.state !== "editing") {
      if (root.dataset.value !== undefined && root.dataset.value !== record.value) {
        record.value = root.dataset.value;
        control.value = record.value;
      } else if (existing && control.value !== record.value) record.value = control.value;
      else if (!existing) control.value = record.value;
    }
    if (record.value !== previous) record.revision += 1;
    const keydown = (rawEvent: Event): void => {
      const event = rawEvent as KeyboardEvent;
      if (event.isComposing || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        cancel(record);
        return;
      }
      const submit =
        event.key === "Enter" &&
        (!isHTMLTag(control, "textarea") || event.metaKey || event.ctrlKey);
      if (submit) {
        event.preventDefault();
        commit(record);
      }
    };
    if (!reusable) listenUI(record, () => current(record), control, "keydown", keydown);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    sync(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): EditableRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceEditable(root);
}

function resolve(target: EditableTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? editableRoot(root.querySelector(target)) : editableRoot(target);
  if (resolved) return resolved;
  throw new Error(`Editable target did not match data-jqs="editable": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="editable"]');
  return resolve(isHTMLElement(closest) ? closest : String(target), context.root);
}

function enhanceAll(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="editable"]')) {
    const editable = editableRoot(element);
    if (editable) enhanceEditable(editable);
  }
}

export function createEditables(registerAction: ActionRegistrar): EditableCollection {
  const api: StarEditableStatic = {
    cancel: (target) => cancel(recordFor(resolve(target))),
    commit: (target) => commit(recordFor(resolve(target))),
    edit: (target) => edit(recordFor(resolve(target))),
    editing: (target) => recordFor(resolve(target)).root.dataset.state === "editing",
    set: (target, value) => setValue(recordFor(resolve(target)), value),
    value: (target) => recordFor(resolve(target)).value,
  };
  registerAction("ui.editable.edit", (context) => api.edit(controlled(context, context.args?.[0])));
  registerAction("ui.editable.commit", (context) =>
    api.commit(controlled(context, context.args?.[0])),
  );
  registerAction("ui.editable.cancel", (context) =>
    api.cancel(controlled(context, context.args?.[0])),
  );
  return { api, enhance: enhanceAll };
}
