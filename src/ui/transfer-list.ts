import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { StarContext, StarTransferListStatic, TransferListTarget } from "../types";
import { syncGeneratedAttribute } from "./floating";
import {
  failUISetup,
  listenUI,
  listenUIReset,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

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
interface TransferListRecord extends UIResources {
  available: HTMLSelectElement;
  selected: HTMLSelectElement;
  availableForm: HTMLFormElement | null;
  selectedForm: HTMLFormElement | null;
  buttons: HTMLButtonElement[];
  buttonParts: string[];
  status: HTMLElement | undefined;
  options: HTMLOptionElement[];
  fields: HTMLInputElement[];
  state: string;
}
interface DisabledState {
  authored: boolean;
  reflected: boolean;
}
const records = new WeakMap<HTMLElement, TransferListRecord>();
const reflected = new WeakMap<HTMLElement, string>();
const intents = new WeakMap<HTMLElement, number>();
const disabledStates = new WeakMap<HTMLButtonElement, DisabledState>();
let transferListId = 0;

function transferListRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="transfer-list"]') ? value : undefined;
}
function controllerRoot(element: Element): Element | null {
  return element.closest('[data-jqs]:not(button[data-jqs="button"])');
}
function scoped<T extends HTMLElement>(root: HTMLElement, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter(
    (element) => isHTMLElement(element) && controllerRoot(element) === root,
  );
}
function selectPart(root: HTMLElement, name: "available" | "selected"): HTMLSelectElement {
  const control = scoped<HTMLSelectElement>(root, `select[data-part="${name}"]`)[0];
  if (!control) throw new Error(`Transfer List #${root.id} needs select[data-part="${name}"].`);
  if (!control.multiple)
    throw new Error(`Transfer List #${root.id} ${name} control needs the multiple attribute.`);
  return control;
}
function same<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
function options(record: TransferListRecord): HTMLOptionElement[] {
  return [...record.available.options, ...record.selected.options];
}
function fields(record: TransferListRecord): HTMLInputElement[] {
  return scoped<HTMLInputElement>(record.root, 'input[data-jqs-generated="transfer-list"]');
}
function current(record: TransferListRecord, revision = record.revision): boolean {
  if (
    !uiCurrent(record, revision) ||
    records.get(record.root) !== record ||
    !transferListRoot(record.root)
  )
    return false;
  const buttons = scoped<HTMLButtonElement>(record.root, "button[data-part]");
  return (
    record.available === scoped(record.root, 'select[data-part="available"]')[0] &&
    record.selected === scoped(record.root, 'select[data-part="selected"]')[0] &&
    record.available.multiple &&
    record.selected.multiple &&
    record.available.form === record.availableForm &&
    record.selected.form === record.selectedForm &&
    record.status === scoped(record.root, '[data-part="status"]')[0] &&
    same(buttons, record.buttons) &&
    buttons.every((button, index) => button.dataset.part === record.buttonParts[index])
  );
}
function nativeBlocked(record: TransferListRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    (record.root.dataset.disabled !== undefined && record.root.dataset.disabled !== "false") ||
    record.available.matches(":disabled") ||
    record.selected.matches(":disabled")
  );
}
function unavailable(record: TransferListRecord): boolean {
  return nativeBlocked(record) || record.root.getAttribute("aria-disabled") === "true";
}
function state(record: TransferListRecord): string {
  return JSON.stringify([
    record.root.dataset.value,
    record.root.dataset.name,
    record.root.dataset.disabled,
    record.root.getAttribute("aria-disabled"),
    nativeBlocked(record),
    options(record).map((option) => [
      option.value,
      option.label,
      option.disabled,
      option.selected,
      option.defaultSelected,
      option.parentElement === record.available
        ? "available"
        : option.parentElement === record.selected
          ? "selected"
          : "nested",
    ]),
    record.buttons.map((button) => [
      button.disabled,
      button.matches(":disabled"),
      button.getAttribute("aria-disabled"),
    ]),
    fields(record).map((input) => [input.name, input.value, input.disabled]),
  ]);
}
function continuation(record: TransferListRecord, revision: number): () => boolean {
  const captured = state(record);
  const nodes = options(record);
  const inputs = fields(record);
  return () =>
    current(record, revision) &&
    state(record) === captured &&
    same(options(record), nodes) &&
    same(fields(record), inputs);
}
function nextIntent(root: HTMLElement): number {
  const next = (intents.get(root) ?? 0) + 1;
  intents.set(root, next);
  return next;
}
function begin(record: TransferListRecord): number {
  nextIntent(record.root);
  return ++record.revision;
}
function normalizeValues(values: readonly string[]): string[] {
  const normalized = values.map(String);
  if (normalized.some((value) => value.trim() === ""))
    throw new Error("Transfer List values must be non-empty strings.");
  if (new Set(normalized).size !== normalized.length)
    throw new Error("Transfer List values must be unique.");
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
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    throw new Error(`Transfer List #${root.id} data-value must be a JSON string array.`);
  return normalizeValues(value);
}
function optionMap(record: TransferListRecord): Map<string, HTMLOptionElement> {
  const map = new Map<string, HTMLOptionElement>();
  for (const option of options(record)) {
    if (option.value.trim() === "")
      throw new Error(`Transfer List #${record.root.id} options need non-empty values.`);
    if (map.has(option.value))
      throw new Error(`Transfer List #${record.root.id} option values must be unique.`);
    if (option.parentElement !== record.available && option.parentElement !== record.selected)
      throw new Error(`Transfer List #${record.root.id} options must be direct select children.`);
    map.set(option.value, option);
  }
  return map;
}
function value(record: TransferListRecord): string[] {
  return Array.from(record.selected.options, (option) => option.value);
}
function visualSelection(control: HTMLSelectElement): string[] {
  return Array.from(control.options)
    .filter((option) => option.selected && !option.disabled)
    .map((option) => option.value);
}
function requireOptions(
  record: TransferListRecord,
  values: readonly string[],
): Map<string, HTMLOptionElement> {
  const map = optionMap(record);
  for (const candidate of values)
    if (!map.has(candidate))
      throw new Error(`Transfer List #${record.root.id} has no option value "${candidate}".`);
  return map;
}
function applyValue(record: TransferListRecord, values: string[], revision: number): boolean {
  const map = requireOptions(record, values);
  const assigned = new Set(values);
  const rootValue = record.root.dataset.value;
  const valid = (): boolean => current(record, revision) && record.root.dataset.value === rootValue;
  for (const option of map.values()) {
    if (!valid()) return false;
    option.selected = false;
    if (!valid()) return false;
    if (!assigned.has(option.value) && option.parentElement !== record.available)
      record.available.append(option);
  }
  for (const candidate of values) {
    if (!valid()) return false;
    const option = map.get(candidate);
    if (option) record.selected.append(option);
  }
  return valid();
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
    previousValue: [...previousValue],
    reason,
    removed: previousValue.filter((candidate) => !after.has(candidate)),
    transferList: record.root,
    value: [...values],
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:transfer-list:${name}`,
      { bubbles: true, cancelable, detail },
    ),
  );
}
function replaceHiddenInputs(record: TransferListRecord, values: string[]): void {
  const name = record.root.dataset.name?.trim();
  let inputs = fields(record);
  if (
    !name ||
    inputs.length !== values.length ||
    !inputs.every((input, index) => input.name === name && input.value === values[index])
  ) {
    for (const input of inputs) input.remove();
    inputs = [];
    if (name)
      for (const candidate of values) {
        const input = record.document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = candidate;
        input.dataset.jqsGenerated = "transfer-list";
        record.root.append(input);
        inputs.push(input);
      }
  }
  const map = optionMap(record);
  for (const input of inputs) {
    const disabled = unavailable(record) || Boolean(map.get(input.value)?.disabled);
    if (input.disabled !== disabled) input.disabled = disabled;
  }
}
function setButtonDisabled(button: HTMLButtonElement, disabled: boolean): void {
  let state = disabledStates.get(button);
  if (!state) {
    state = { authored: button.disabled, reflected: button.disabled };
    disabledStates.set(button, state);
  } else if (button.disabled !== state.reflected) state.authored = button.disabled;
  state.reflected = state.authored || disabled;
  if (button.type !== "button") button.type = "button";
  if (button.disabled !== state.reflected) button.disabled = state.reflected;
}
function renderControls(record: TransferListRecord): void {
  const blocked = unavailable(record);
  const availableSelection = visualSelection(record.available);
  const selectedSelection = visualSelection(record.selected);
  const selectedValues = value(record);
  const selectedSet = new Set(selectedSelection);
  const canMoveUp = selectedValues.some(
    (candidate, index) =>
      selectedSet.has(candidate) && index > 0 && !selectedSet.has(selectedValues[index - 1] ?? ""),
  );
  const canMoveDown = selectedValues.some(
    (candidate, index) =>
      selectedSet.has(candidate) &&
      index < selectedValues.length - 1 &&
      !selectedSet.has(selectedValues[index + 1] ?? ""),
  );
  const enabled: Record<string, boolean> = {
    add: availableSelection.length > 0,
    "add-all": Array.from(record.available.options).some((option) => !option.disabled),
    remove: selectedSelection.length > 0,
    "remove-all": Array.from(record.selected.options).some((option) => !option.disabled),
    "move-up": canMoveUp,
    "move-down": canMoveDown,
  };
  for (const button of record.buttons) {
    const part = button.dataset.part ?? "";
    if (Object.hasOwn(enabled, part)) setButtonDisabled(button, blocked || !enabled[part]);
  }
}
function remember(record: TransferListRecord): void {
  record.options = options(record);
  record.fields = fields(record);
  record.state = state(record);
}
function render(record: TransferListRecord): void {
  syncGeneratedAttribute(record.root, "aria-disabled", nativeBlocked(record) ? "true" : "false");
  const values = value(record);
  const serialized = JSON.stringify(values);
  reflected.set(record.root, serialized);
  if (record.root.dataset.value !== serialized) record.root.dataset.value = serialized;
  if (record.root.dataset.count !== String(values.length))
    record.root.dataset.count = String(values.length);
  const state = unavailable(record)
    ? "disabled"
    : values.length === 0
      ? "empty"
      : record.available.options.length === 0
        ? "full"
        : "ready";
  if (record.root.dataset.state !== state) record.root.dataset.state = state;
  replaceHiddenInputs(record, values);
  const message = `${values.length} assigned`;
  if (record.status && record.status.textContent !== message) record.status.textContent = message;
  renderControls(record);
  remember(record);
}
function sync(record: TransferListRecord): void {
  if (
    record.resetRevision === record.revision &&
    record.root.dataset.value === reflected.get(record.root)
  )
    return;
  if (
    record.state &&
    (record.state !== state(record) ||
      !same(record.options, options(record)) ||
      !same(record.fields, fields(record)))
  )
    record.revision += 1;
  optionMap(record);
  if (record.root.dataset.value !== reflected.get(record.root)) {
    const requested = parsedValue(record.root, value(record));
    if (!same(requested, value(record)) && !applyValue(record, requested, record.revision)) return;
  }
  render(record);
}
function restoreSelection(control: HTMLSelectElement, values: readonly string[]): void {
  const selected = new Set(values);
  for (const option of control.options) option.selected = selected.has(option.value);
}
function protectedValues(record: TransferListRecord, values: string[]): string[] {
  const map = requireOptions(record, values);
  const current = value(record);
  const desired = values.filter(
    (candidate) => !map.get(candidate)?.disabled || current.includes(candidate),
  );
  current.forEach((candidate, index) => {
    if (map.get(candidate)?.disabled && !desired.includes(candidate))
      desired.splice(Math.min(index, desired.length), 0, candidate);
  });
  return desired;
}
function commit(
  record: TransferListRecord,
  values: string[],
  reason: TransferListReason,
  revision: number,
  selectedControl?: HTMLSelectElement,
  selection: readonly string[] = [],
): void {
  if (!current(record, revision) || unavailable(record)) return;
  const previousValue = value(record);
  const normalized = protectedValues(record, normalizeValues(values));
  if (same(normalized, previousValue)) return;
  const valid = continuation(record, revision);
  if (!emit(record, "before-change", normalized, previousValue, reason, true) || !valid()) return;
  if (!applyValue(record, normalized, revision)) return;
  if (selectedControl) restoreSelection(selectedControl, selection);
  render(record);
  const committed = continuation(record, revision);
  emit(record, "change", normalized, previousValue, reason);
  if (!committed()) return;
  record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  if (committed())
    record.root.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
    );
}
function add(record: TransferListRecord, revision: number, values?: readonly string[]): void {
  const requested = values ? normalizeValues(values) : visualSelection(record.available);
  const map = optionMap(record);
  const moving = requested.filter((candidate) => {
    const option = map.get(candidate);
    return option?.parentElement === record.available && !option.disabled;
  });
  const previous = value(record);
  commit(
    record,
    [...previous, ...moving.filter((candidate) => !previous.includes(candidate))],
    "add",
    revision,
    record.selected,
    moving,
  );
}
function remove(record: TransferListRecord, revision: number, values?: readonly string[]): void {
  const requested = new Set(values ? normalizeValues(values) : visualSelection(record.selected));
  const map = optionMap(record);
  const moving = value(record).filter(
    (candidate) => requested.has(candidate) && !map.get(candidate)?.disabled,
  );
  commit(
    record,
    value(record).filter((candidate) => !moving.includes(candidate)),
    "remove",
    revision,
    record.available,
    moving,
  );
}
function reorder(
  record: TransferListRecord,
  direction: "up" | "down",
  revision: number,
  values?: readonly string[],
): void {
  const map = optionMap(record);
  const moving = new Set(
    (values ? normalizeValues(values) : visualSelection(record.selected)).filter(
      (candidate) => !map.get(candidate)?.disabled,
    ),
  );
  const next = value(record);
  const offset = direction === "up" ? -1 : 1;
  for (
    let index = direction === "up" ? 1 : next.length - 2;
    index >= 0 && index < next.length;
    index -= offset
  ) {
    const candidate = next[index];
    const neighbor = next[index + offset];
    if (
      candidate !== undefined &&
      neighbor !== undefined &&
      moving.has(candidate) &&
      !moving.has(neighbor)
    ) {
      next[index] = neighbor;
      next[index + offset] = candidate;
    }
  }
  commit(record, next, "reorder", revision, record.selected, [...moving]);
}
function allValues(control: HTMLSelectElement): string[] {
  return Array.from(control.options)
    .filter((option) => !option.disabled)
    .map((option) => option.value);
}
function runPart(record: TransferListRecord, part: string, revision: number): void {
  if (part === "add") add(record, revision);
  else if (part === "add-all") add(record, revision, allValues(record.available));
  else if (part === "remove") remove(record, revision);
  else if (part === "remove-all") remove(record, revision, allValues(record.selected));
  else if (part === "move-up") reorder(record, "up", revision);
  else if (part === "move-down") reorder(record, "down", revision);
}
function wire(record: TransferListRecord): void {
  const valid = (): boolean => current(record);
  for (const control of [record.available, record.selected]) {
    listenUI(record, valid, control, "change", (event) => {
      if (event.target !== control) return;
      begin(record);
      sync(record);
    });
    const move = (): void => {
      sync(record);
      const revision = begin(record);
      if (control === record.available) add(record, revision);
      else remove(record, revision);
    };
    listenUI(record, valid, control, "dblclick", (event) => {
      if (
        !event.defaultPrevented &&
        (event.target === control ||
          (isHTMLTag(event.target, "option") && event.target.parentElement === control))
      )
        move();
    });
    listenUI(record, valid, control, "keydown", (event) => {
      const key = event as KeyboardEvent;
      if (
        key.key !== "Enter" ||
        key.isComposing ||
        key.altKey ||
        key.ctrlKey ||
        key.metaKey ||
        key.defaultPrevented ||
        event.target !== control ||
        unavailable(record)
      )
        return;
      key.preventDefault();
      move();
    });
  }
  for (const button of record.buttons)
    listenUI(record, valid, button, "click", (event) => {
      if (
        event.defaultPrevented ||
        !(isElementNode(event.target) && controllerRoot(event.target) === record.root)
      )
        return;
      sync(record);
      if (button.matches(':disabled,[aria-disabled="true"]')) return;
      runPart(record, button.dataset.part ?? "", begin(record));
    });
  for (const form of new Set([record.availableForm, record.selectedForm]))
    listenUIReset(record, valid, form, () => sync(record));
}
function enhanceTransferList(root: HTMLElement): TransferListRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    sync(existing);
    return existing;
  }
  existing?.cleanup();
  if (existing && !uiActive(root)) return existing;
  const replacement = records.get(root);
  if (replacement) return replacement;
  root.id ||= `jqs-transfer-list-${++transferListId}`;
  const available = selectPart(root, "available");
  const selected = selectPart(root, "selected");
  const buttons = scoped<HTMLButtonElement>(root, "button[data-part]");
  for (const button of buttons) {
    const previous = existing?.buttons.find(
      (candidate) => candidate.dataset.part === button.dataset.part,
    );
    const saved = previous && disabledStates.get(previous);
    if (saved && !disabledStates.has(button) && button.disabled === saved.reflected)
      disabledStates.set(button, { ...saved });
  }
  const record: TransferListRecord = {
    ...uiResources(root),
    available,
    selected,
    availableForm: available.form,
    selectedForm: selected.form,
    buttons,
    buttonParts: buttons.map((button) => button.dataset.part ?? ""),
    status: scoped(root, '[data-part="status"]')[0],
    options: [],
    fields: [],
    state: "",
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    if (!record.active) return record;
    sync(record);
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function resolve(target: TransferListTarget, root: ParentNode = document): HTMLElement {
  const match =
    typeof target === "string"
      ? transferListRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : transferListRoot(target);
  if (match) return match;
  throw new Error(`Transfer List target did not match data-jqs="transfer-list": ${String(target)}`);
}
function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="transfer-list"]');
  return resolve(isHTMLElement(closest) ? closest : String(target), context.root);
}
function actionTarget(context: StarContext): { offset: number; root: HTMLElement } {
  const first = context.args?.[0];
  const explicit =
    isHTMLElement(first) ||
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
  for (const element of uiElements(root, '[data-jqs="transfer-list"]')) {
    const transferList = transferListRoot(element);
    if (transferList) enhanceTransferList(transferList);
  }
}
function operate(
  target: TransferListTarget,
  change: (record: TransferListRecord, revision: number) => void,
): HTMLElement {
  const root = resolve(target);
  const intent = nextIntent(root);
  const record = enhanceTransferList(root);
  if (intents.get(root) === intent && current(record) && record.state === state(record))
    change(record, ++record.revision);
  return root;
}
export function createTransferLists(registerAction: ActionRegistrar): TransferListCollection {
  const api: StarTransferListStatic = {
    add: (target, values) => operate(target, (record, revision) => add(record, revision, values)),
    addAll: (target) =>
      operate(target, (record, revision) => add(record, revision, allValues(record.available))),
    remove: (target, values) =>
      operate(target, (record, revision) => remove(record, revision, values)),
    removeAll: (target) =>
      operate(target, (record, revision) => remove(record, revision, allValues(record.selected))),
    set: (target, values) =>
      operate(target, (record, revision) =>
        commit(record, normalizeValues(values), "set", revision),
      ),
    up: (target, values) =>
      operate(target, (record, revision) => reorder(record, "up", revision, values)),
    down: (target, values) =>
      operate(target, (record, revision) => reorder(record, "down", revision, values)),
    value: (target) => [...value(enhanceTransferList(resolve(target)))],
  };
  const action = (
    context: StarContext,
    callback: (root: HTMLElement, values?: string[]) => HTMLElement,
  ): HTMLElement => {
    const target = actionTarget(context);
    return callback(target.root, actionValues(context, target.offset));
  };
  const registerActions = (): void => {
    registerAction("ui.transfer-list.add", (context) =>
      action(context, (root, values) => api.add(root, values)),
    );
    registerAction("ui.transfer-list.add-all", (context) => api.addAll(actionTarget(context).root));
    registerAction("ui.transfer-list.remove", (context) =>
      action(context, (root, values) => api.remove(root, values)),
    );
    registerAction("ui.transfer-list.remove-all", (context) =>
      api.removeAll(actionTarget(context).root),
    );
    registerAction("ui.transfer-list.set", (context) => {
      const target = actionTarget(context);
      return api.set(target.root, actionValues(context, target.offset) ?? []);
    });
    registerAction("ui.transfer-list.up", (context) =>
      action(context, (root, values) => api.up(root, values)),
    );
    registerAction("ui.transfer-list.down", (context) =>
      action(context, (root, values) => api.down(root, values)),
    );
  };
  registerActions();
  return {
    api,
    enhance(root) {
      enhanceAll(root);
    },
  };
}
