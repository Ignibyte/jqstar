import { registerAction } from "../registry";
import type { EditableTarget, StarContext, StarEditableStatic } from "../types";

interface EditableCollection {
  api: StarEditableStatic;
  enhance(root: ParentNode): void;
}

interface EditableRecord {
  cleanup: () => void;
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  display: HTMLElement;
  edit: HTMLButtonElement;
  editor: HTMLElement;
  preview: HTMLElement;
  root: HTMLElement;
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
  return value instanceof HTMLElement && value.matches('[data-jqs="editable"]') ? value : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="editable"]') === root,
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
    record.control.disabled
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
    control: record.control,
    editable: record.root,
    previousValue,
    value,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:editable:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function setMode(record: EditableRecord, editing: boolean): void {
  const state = editing ? "editing" : "display";
  if (record.root.dataset.state !== state) record.root.dataset.state = state;
  if (record.display.hidden !== editing) record.display.hidden = editing;
  if (record.editor.hidden === editing) record.editor.hidden = !editing;
  if (record.edit.getAttribute("aria-expanded") !== String(editing)) {
    record.edit.setAttribute("aria-expanded", String(editing));
  }
}

function sync(record: EditableRecord): void {
  const disabled = unavailable(record);
  if (record.edit.disabled !== disabled) record.edit.disabled = disabled;
  if (record.edit.getAttribute("aria-controls") !== record.editor.id) {
    record.edit.setAttribute("aria-controls", record.editor.id);
  }
  const preview = previewText(record, record.value);
  if (record.preview.textContent !== preview) record.preview.textContent = preview;
  if (record.root.dataset.value !== record.value) record.root.dataset.value = record.value;
  if (record.root.dataset.state !== "editing") setMode(record, false);
}

function edit(record: EditableRecord): HTMLElement {
  if (unavailable(record) || record.root.dataset.state === "editing") return record.root;
  if (!emit(record, "before-edit", record.value, true)) return record.root;
  record.control.value = record.value;
  setMode(record, true);
  record.control.focus();
  if (record.root.hasAttribute("data-select-on-edit") && "select" in record.control) {
    record.control.select();
  }
  if (record.status) record.status.textContent = record.root.dataset.editMessage ?? "Editing.";
  emit(record, "edit", record.value);
  return record.root;
}

function commit(record: EditableRecord): HTMLElement {
  if (unavailable(record) || record.root.dataset.state !== "editing") return record.root;
  if (!record.control.checkValidity()) {
    record.control.reportValidity();
    if (record.status) {
      record.status.textContent =
        record.control.validationMessage || record.root.dataset.invalidMessage || "Invalid value.";
    }
    emit(record, "invalid", record.control.value);
    return record.root;
  }
  const value = record.control.value;
  if (!emit(record, "before-change", value, true)) return record.root;
  const previous = record.value;
  record.value = value;
  record.preview.textContent = previewText(record, value);
  record.root.dataset.value = value;
  setMode(record, false);
  if (record.status) {
    record.status.textContent =
      value === previous
        ? (record.root.dataset.unchangedMessage ?? "No changes.")
        : (record.root.dataset.successMessage ?? "Value updated.");
  }
  if (value !== previous) {
    record.control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  emit(record, "change", value, false, previous);
  record.edit.focus();
  return record.root;
}

function cancel(record: EditableRecord): HTMLElement {
  if (record.root.dataset.state !== "editing") return record.root;
  const draft = record.control.value;
  record.control.value = record.value;
  setMode(record, false);
  if (record.status)
    record.status.textContent = record.root.dataset.cancelMessage ?? "Edit canceled.";
  emit(record, "cancel", draft);
  record.edit.focus();
  return record.root;
}

function setValue(record: EditableRecord, value: string): HTMLElement {
  const previous = record.value;
  if (!emit(record, "before-change", value, true)) return record.root;
  record.control.value = value;
  record.value = value;
  record.preview.textContent = previewText(record, value);
  record.root.dataset.value = value;
  setMode(record, false);
  if (record.status)
    record.status.textContent = record.root.dataset.successMessage ?? "Value updated.";
  if (value !== previous) record.control.dispatchEvent(new Event("change", { bubbles: true }));
  emit(record, "change", value, false, previous);
  return record.root;
}

function enhanceEditable(root: HTMLElement): EditableRecord {
  const existing = records.get(root);
  if (existing) {
    if (root.dataset.state !== "editing") {
      if (root.dataset.value !== undefined && root.dataset.value !== existing.value) {
        existing.value = root.dataset.value;
        existing.control.value = existing.value;
      } else if (existing.control.value !== existing.value) {
        existing.value = existing.control.value;
      }
    }
    sync(existing);
    return existing;
  }

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
  const record: EditableRecord = {
    cleanup: () => undefined,
    control,
    display,
    edit: editButton,
    editor,
    preview,
    root,
    status,
    value: root.dataset.value ?? control.value,
  };
  const keydown = (rawEvent: Event): void => {
    const event = rawEvent as KeyboardEvent;
    if (event.key === "Escape") {
      event.preventDefault();
      cancel(record);
      return;
    }
    const submit =
      event.key === "Enter" &&
      (!(control instanceof HTMLTextAreaElement) || event.metaKey || event.ctrlKey);
    if (submit) {
      event.preventDefault();
      commit(record);
    }
  };
  control.addEventListener("keydown", keydown);
  record.cleanup = () => control.removeEventListener("keydown", keydown);
  records.set(root, record);
  control.value = record.value;
  sync(record);
  return record;
}

function recordFor(root: HTMLElement): EditableRecord {
  return records.get(root) ?? enhanceEditable(root);
}

function resolve(target: EditableTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? editableRoot(root.querySelector(target)) : editableRoot(target);
  if (resolved) return resolved;
  throw new Error(`Editable target did not match data-jqs="editable": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="editable"]')) return target;
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="editable"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="editable"]')));
  for (const element of elements) {
    const editable = editableRoot(element);
    if (editable) enhanceEditable(editable);
  }
}

export function createEditables(): EditableCollection {
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
