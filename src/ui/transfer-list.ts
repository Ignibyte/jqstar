import { registerAction } from "../registry";
import type { StarContext, StarTransferListStatic, TransferListTarget } from "../types";

type TransferListReason = "add" | "remove" | "reorder" | "set";

interface TransferListCollection {
  api: StarTransferListStatic;
  enhance(root: ParentNode): void;
}

interface TransferListEventDetail {
  added: string[];
  previousValue: string[];
  reason: TransferListReason;
  removed: string[];
  transferList: HTMLElement;
  value: string[];
}

interface TransferListRecord {
  available: HTMLSelectElement;
  cleanup: () => void;
  root: HTMLElement;
  selected: HTMLSelectElement;
}

const records = new WeakMap<HTMLElement, TransferListRecord>();
let transferListId = 0;

function transferListRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="transfer-list"]')
    ? value
    : undefined;
}

function scoped<T extends HTMLElement>(root: HTMLElement, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter(
    (element) => element.closest('[data-jqs="transfer-list"]') === root,
  );
}

function selectPart(root: HTMLElement, name: "available" | "selected"): HTMLSelectElement {
  const control = scoped<HTMLSelectElement>(root, `select[data-part="${name}"]`)[0];
  if (!control) throw new Error(`Transfer List #${root.id} needs select[data-part="${name}"].`);
  if (!control.multiple) {
    throw new Error(`Transfer List #${root.id} ${name} control needs the multiple attribute.`);
  }
  return control;
}

function unavailable(record: TransferListRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    record.root.dataset.disabled === "true"
  );
}

function normalizeValues(values: readonly string[]): string[] {
  const normalized = values.map(String);
  if (normalized.some((value) => value.trim() === "")) {
    throw new Error("Transfer List values must be non-empty strings.");
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("Transfer List values must be unique.");
  }
  return normalized;
}

function parsedValue(root: HTMLElement, fallback: string[]): string[] {
  const source = root.dataset.value;
  if (source === undefined) return fallback;
  let value: unknown;
  try {
    value = JSON.parse(source || "[]");
  } catch {
    throw new Error(`Transfer List #${root.id} data-value must be a JSON string array.`);
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Transfer List #${root.id} data-value must be a JSON string array.`);
  }
  return normalizeValues(value);
}

function optionMap(record: TransferListRecord): Map<string, HTMLOptionElement> {
  const map = new Map<string, HTMLOptionElement>();
  for (const option of [
    ...Array.from(record.available.options),
    ...Array.from(record.selected.options),
  ]) {
    if (option.value.trim() === "") {
      throw new Error(`Transfer List #${record.root.id} options need non-empty values.`);
    }
    if (map.has(option.value)) {
      throw new Error(`Transfer List #${record.root.id} option values must be unique.`);
    }
    if (option.parentElement !== record.available && option.parentElement !== record.selected) {
      throw new Error(`Transfer List #${record.root.id} options must be direct select children.`);
    }
    map.set(option.value, option);
  }
  return map;
}

function value(record: TransferListRecord): string[] {
  return Array.from(record.selected.options).map((option) => option.value);
}

function visualSelection(control: HTMLSelectElement): string[] {
  return Array.from(control.selectedOptions)
    .filter((option) => !option.disabled)
    .map((option) => option.value);
}

function applyValue(record: TransferListRecord, values: string[]): void {
  const options = optionMap(record);
  for (const candidate of values) {
    if (!options.has(candidate)) {
      throw new Error(`Transfer List #${record.root.id} has no option value "${candidate}".`);
    }
  }
  const assigned = new Set(values);
  for (const option of options.values()) {
    option.selected = false;
    if (!assigned.has(option.value)) record.available.append(option);
  }
  for (const candidate of values) {
    record.selected.append(options.get(candidate)!);
  }
}

function emit(
  record: TransferListRecord,
  name: "before-change" | "change",
  values: string[],
  previousValue: string[],
  reason: TransferListReason,
  cancelable = false,
): boolean {
  const before = new Set(previousValue);
  const after = new Set(values);
  const detail: TransferListEventDetail = {
    added: values.filter((candidate) => !before.has(candidate)),
    previousValue,
    reason,
    removed: previousValue.filter((candidate) => !after.has(candidate)),
    transferList: record.root,
    value: values,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:transfer-list:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function replaceHiddenInputs(record: TransferListRecord, values: string[]): void {
  const name = record.root.dataset.name?.trim();
  const current = scoped<HTMLInputElement>(
    record.root,
    'input[data-jqs-generated="transfer-list"]',
  );
  if (
    name &&
    current.length === values.length &&
    current.every((input, index) => input.name === name && input.value === values[index])
  ) {
    return;
  }
  for (const input of current) input.remove();
  if (!name) return;
  for (const candidate of values) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = candidate;
    input.dataset.jqsGenerated = "transfer-list";
    record.root.append(input);
  }
}

function setButtonDisabled(button: HTMLButtonElement | undefined, disabled: boolean): void {
  if (!button) return;
  button.type = "button";
  if (button.disabled !== disabled) button.disabled = disabled;
}

function button(record: TransferListRecord, part: string): HTMLButtonElement | undefined {
  return scoped<HTMLButtonElement>(record.root, `button[data-part="${part}"]`)[0];
}

function renderControls(record: TransferListRecord): void {
  const blocked = unavailable(record);
  const availableSelection = visualSelection(record.available);
  const selectedSelection = visualSelection(record.selected);
  const selectedValues = value(record);
  const selectedSet = new Set(selectedSelection);
  const canMoveUp = selectedValues.some(
    (candidate, index) =>
      selectedSet.has(candidate) && index > 0 && !selectedSet.has(selectedValues[index - 1]!),
  );
  const canMoveDown = selectedValues.some(
    (candidate, index) =>
      selectedSet.has(candidate) &&
      index < selectedValues.length - 1 &&
      !selectedSet.has(selectedValues[index + 1]!),
  );
  setButtonDisabled(button(record, "add"), blocked || availableSelection.length === 0);
  setButtonDisabled(
    button(record, "add-all"),
    blocked || !Array.from(record.available.options).some((option) => !option.disabled),
  );
  setButtonDisabled(button(record, "remove"), blocked || selectedSelection.length === 0);
  setButtonDisabled(
    button(record, "remove-all"),
    blocked || !Array.from(record.selected.options).some((option) => !option.disabled),
  );
  setButtonDisabled(button(record, "move-up"), blocked || !canMoveUp);
  setButtonDisabled(button(record, "move-down"), blocked || !canMoveDown);
}

function render(record: TransferListRecord): void {
  const values = value(record);
  const serialized = JSON.stringify(values);
  if (record.root.dataset.value !== serialized) record.root.dataset.value = serialized;
  if (record.root.dataset.count !== String(values.length)) {
    record.root.dataset.count = String(values.length);
  }
  const state = unavailable(record)
    ? "disabled"
    : values.length === 0
      ? "empty"
      : record.available.options.length === 0
        ? "full"
        : "ready";
  if (record.root.dataset.state !== state) record.root.dataset.state = state;
  const ariaDisabled = String(unavailable(record));
  if (record.root.getAttribute("aria-disabled") !== ariaDisabled) {
    record.root.setAttribute("aria-disabled", ariaDisabled);
  }
  replaceHiddenInputs(record, values);
  const status = scoped<HTMLElement>(record.root, '[data-part="status"]')[0];
  const message = `${values.length} assigned`;
  if (status && status.textContent !== message) status.textContent = message;
  renderControls(record);
}

function restoreSelection(control: HTMLSelectElement, values: readonly string[]): void {
  const selected = new Set(values);
  for (const option of Array.from(control.options)) {
    option.selected = selected.has(option.value);
  }
}

function commit(
  record: TransferListRecord,
  values: string[],
  reason: TransferListReason,
  selectedControl?: HTMLSelectElement,
  selection: readonly string[] = [],
): HTMLElement {
  if (unavailable(record)) return record.root;
  const previousValue = value(record);
  const normalized = normalizeValues(values);
  if (normalized.join("\u0000") === previousValue.join("\u0000")) {
    render(record);
    return record.root;
  }
  const options = optionMap(record);
  for (const candidate of normalized) {
    if (!options.has(candidate)) {
      throw new Error(`Transfer List #${record.root.id} has no option value "${candidate}".`);
    }
  }
  if (!emit(record, "before-change", normalized, previousValue, reason, true)) {
    render(record);
    return record.root;
  }
  applyValue(record, normalized);
  if (selectedControl) restoreSelection(selectedControl, selection);
  render(record);
  emit(record, "change", normalized, previousValue, reason);
  record.root.dispatchEvent(new Event("input", { bubbles: true }));
  record.root.dispatchEvent(new Event("change", { bubbles: true }));
  return record.root;
}

function add(record: TransferListRecord, values?: readonly string[]): HTMLElement {
  const requested = values ? normalizeValues(values) : visualSelection(record.available);
  const options = optionMap(record);
  const moving = requested.filter(
    (candidate) =>
      options.get(candidate)?.parentElement === record.available &&
      !options.get(candidate)!.disabled,
  );
  return commit(
    record,
    [...value(record), ...moving.filter((candidate) => !value(record).includes(candidate))],
    "add",
    record.selected,
    moving,
  );
}

function remove(record: TransferListRecord, values?: readonly string[]): HTMLElement {
  const requested = new Set(values ? normalizeValues(values) : visualSelection(record.selected));
  const options = optionMap(record);
  const moving = value(record).filter(
    (candidate) => requested.has(candidate) && !options.get(candidate)!.disabled,
  );
  return commit(
    record,
    value(record).filter((candidate) => !moving.includes(candidate)),
    "remove",
    record.available,
    moving,
  );
}

function reorder(
  record: TransferListRecord,
  direction: "up" | "down",
  values?: readonly string[],
): HTMLElement {
  const moving = new Set(values ? normalizeValues(values) : visualSelection(record.selected));
  const next = value(record);
  if (direction === "up") {
    for (let index = 1; index < next.length; index += 1) {
      if (moving.has(next[index]!) && !moving.has(next[index - 1]!)) {
        [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      }
    }
  } else {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (moving.has(next[index]!) && !moving.has(next[index + 1]!)) {
        [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
      }
    }
  }
  return commit(record, next, "reorder", record.selected, [...moving]);
}

function wire(record: TransferListRecord): () => void {
  const cleanups: Array<() => void> = [];
  const listen = <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    name: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ): void => {
    element.addEventListener(name, listener as EventListener);
    cleanups.push(() => element.removeEventListener(name, listener as EventListener));
  };
  const rerender = (): void => renderControls(record);
  listen(record.available, "change", rerender);
  listen(record.selected, "change", rerender);
  listen(record.available, "dblclick", () => add(record));
  listen(record.selected, "dblclick", () => remove(record));
  listen(record.available, "keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add(record);
  });
  listen(record.selected, "keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    remove(record);
  });
  const actions: Record<string, () => HTMLElement> = {
    add: () => add(record),
    "add-all": () =>
      add(
        record,
        Array.from(record.available.options)
          .filter((option) => !option.disabled)
          .map((option) => option.value),
      ),
    remove: () => remove(record),
    "remove-all": () =>
      remove(
        record,
        Array.from(record.selected.options)
          .filter((option) => !option.disabled)
          .map((option) => option.value),
      ),
    "move-up": () => reorder(record, "up"),
    "move-down": () => reorder(record, "down"),
  };
  for (const [part, action] of Object.entries(actions)) {
    const control = button(record, part);
    if (control) listen(control, "click", () => void action());
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}

function enhanceTransferList(root: HTMLElement): TransferListRecord {
  root.id ||= `jqs-transfer-list-${++transferListId}`;
  const available = selectPart(root, "available");
  const selected = selectPart(root, "selected");
  const existing = records.get(root);
  existing?.cleanup();
  const record: TransferListRecord = existing ?? {
    available,
    cleanup: () => undefined,
    root,
    selected,
  };
  record.available = available;
  record.selected = selected;
  optionMap(record);
  const requested = parsedValue(root, value(record));
  if (requested.join("\u0000") !== value(record).join("\u0000")) {
    applyValue(record, requested);
  }
  records.set(root, record);
  render(record);
  record.cleanup = wire(record);
  return record;
}

function resolve(target: TransferListTarget, root: ParentNode = document): HTMLElement {
  const match =
    typeof target === "string"
      ? transferListRoot(root.querySelector(target))
      : transferListRoot(target);
  if (match) return match;
  throw new Error(`Transfer List target did not match data-jqs="transfer-list": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="transfer-list"]')) return target;
  if (typeof target === "string") {
    const local = transferListRoot(context.root.querySelector(target));
    if (local) return local;
  }
  const closest = context.element?.closest('[data-jqs="transfer-list"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function actionTarget(context: StarContext): { offset: number; root: HTMLElement } {
  const first = context.args?.[0];
  const explicit =
    first instanceof HTMLElement ||
    (typeof first === "string" &&
      (first.startsWith("#") || first.startsWith(".") || first.startsWith("[")));
  return { offset: explicit ? 1 : 0, root: controlled(context, explicit ? first : undefined) };
}

function actionValues(context: StarContext, offset: number): string[] | undefined {
  const value = context.args?.[offset];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error("Transfer List action values must be an array.");
  return normalizeValues(value.map(String));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="transfer-list"]')));
  for (const element of elements) {
    const transferList = transferListRoot(element);
    if (transferList) enhanceTransferList(transferList);
  }
}

export function createTransferLists(): TransferListCollection {
  const record = (target: TransferListTarget): TransferListRecord => {
    const root = resolve(target);
    return records.get(root) ?? enhanceTransferList(root);
  };
  const api: StarTransferListStatic = {
    add: (target, values) => add(record(target), values),
    addAll: (target) => {
      const current = record(target);
      return add(
        current,
        Array.from(current.available.options)
          .filter((option) => !option.disabled)
          .map((option) => option.value),
      );
    },
    remove: (target, values) => remove(record(target), values),
    removeAll: (target) => {
      const current = record(target);
      return remove(
        current,
        Array.from(current.selected.options)
          .filter((option) => !option.disabled)
          .map((option) => option.value),
      );
    },
    set: (target, values) => commit(record(target), normalizeValues(values), "set"),
    up: (target, values) => reorder(record(target), "up", values),
    down: (target, values) => reorder(record(target), "down", values),
    value: (target) => [...value(record(target))],
  };
  const action = (
    context: StarContext,
    callback: (root: HTMLElement, values?: string[]) => HTMLElement,
  ): HTMLElement => {
    const target = actionTarget(context);
    return callback(target.root, actionValues(context, target.offset));
  };
  registerAction("ui.transfer-list.add", (context) => action(context, api.add));
  registerAction("ui.transfer-list.add-all", (context) => api.addAll(actionTarget(context).root));
  registerAction("ui.transfer-list.remove", (context) => action(context, api.remove));
  registerAction("ui.transfer-list.remove-all", (context) =>
    api.removeAll(actionTarget(context).root),
  );
  registerAction("ui.transfer-list.set", (context) => {
    const target = actionTarget(context);
    return api.set(target.root, actionValues(context, target.offset) ?? []);
  });
  registerAction("ui.transfer-list.up", (context) => action(context, api.up));
  registerAction("ui.transfer-list.down", (context) => action(context, api.down));
  return { api, enhance: enhanceAll };
}
