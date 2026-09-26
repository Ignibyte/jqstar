import { isHTMLElement, isHTMLTag, isElementNode, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { MultiSelectTarget, StarContext, StarMultiSelectStatic } from "../types";
import {
  copyGeneratedAttributes,
  identifyControlLabel,
  identifyLabel,
  documentRecords,
  hideFloating,
  listenToViewportChanges,
  positionFloating,
  prepareFloating,
  showFloating,
  usesNativePopover,
} from "./floating";
import {
  acquireUIResource,
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

interface MultiSelectRecord extends UIResources {
  activeValue: string | undefined;
  cleanup: () => void;
  form: HTMLFormElement | null;
  label: HTMLLabelElement | undefined;
  window: Window;
  nativeEvent?: Event;
  options: HTMLElement[];
  nativeOptions: HTMLOptionElement[];
  status: HTMLElement;
  content: HTMLElement;
  control: HTMLSelectElement;
  lastValue: string;
  open: boolean;
  optionsSignature: string;
  root: HTMLElement;
  search: string;
  cancelSearch?: () => void;
  searchExpires: number;
  tags: HTMLElement;
  trigger: HTMLButtonElement;
  values: string[];
}

interface MultiSelectCollection {
  api: StarMultiSelectStatic;
  enhance(root: ParentNode): void;
}

interface MultiSelectEventDetail {
  control: HTMLSelectElement;
  multiSelect: HTMLElement;
  previousValue: string[];
  value: string[];
}

const records = new WeakMap<HTMLElement, MultiSelectRecord>();
const activeRecords = new Set<MultiSelectRecord>();
const reflected = new WeakMap<HTMLElement, string>();
interface RetainedMultiSelect {
  control: HTMLSelectElement;
  content: HTMLElement;
  open: boolean;
  activeValue: string | undefined;
  search: string;
  searchExpires: number;
}
const retained = new WeakMap<HTMLElement, RetainedMultiSelect>();
const generatedOptions = new WeakMap<HTMLElement, { signature: string; options: HTMLElement[] }>();
const generatedTags = new WeakMap<HTMLElement, { signature: string; children: Element[] }>();
const documentRevisions = new WeakMap<Document, number>();
let multiSelectId = 0;

function multiSelectRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="multi-select"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLSelectElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLSelectElement =>
      isHTMLTag(child, "select") && child.dataset.part === "control",
  );
  if (!control)
    throw new Error(`Multi Select #${root.id} needs a direct select[data-part="control"].`);
  if (!control.multiple)
    throw new Error(`Multi Select #${root.id} control needs the multiple attribute.`);
  return control;
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}

function createTrigger(root: HTMLElement): HTMLButtonElement {
  const trigger = root.ownerDocument.createElement("button");
  trigger.type = "button";
  trigger.dataset.part = "trigger";
  trigger.dataset.generated = "";
  const value = root.ownerDocument.createElement("span");
  value.dataset.part = "value";
  const indicator = root.ownerDocument.createElement("span");
  indicator.dataset.part = "indicator";
  indicator.setAttribute("aria-hidden", "true");
  indicator.textContent = "⌄";
  trigger.append(value, indicator);
  root.append(trigger);
  return trigger;
}

function createPart(root: HTMLElement, part: "content" | "tags" | "status"): HTMLElement {
  const element = root.ownerDocument.createElement(
    part === "tags" ? "div" : part === "status" ? "p" : "div",
  );
  element.dataset.part = part;
  element.dataset.generated = "";
  root.append(element);
  return element;
}

function valuePart(trigger: HTMLElement): HTMLElement {
  let value = trigger.querySelector<HTMLElement>('[data-part="value"]');
  if (!value) {
    value = trigger.ownerDocument.createElement("span");
    value.dataset.part = "value";
    trigger.prepend(value);
  }
  return value;
}

function disabled(option: HTMLOptionElement): boolean {
  return (
    option.disabled ||
    (isHTMLTag(option.parentElement, "optgroup") && option.parentElement.disabled)
  );
}

function selectedValues(control: HTMLSelectElement): string[] {
  return Array.from(control.options)
    .filter((option) => option.selected)
    .map((option) => option.value);
}

function optionSignature(control: HTMLSelectElement): string {
  return JSON.stringify(
    Array.from(control.children).map((child) => {
      if (isHTMLTag(child, "option")) {
        return ["option", child.value, child.label, disabled(child)];
      }
      if (isHTMLTag(child, "optgroup")) {
        return [
          "group",
          child.label,
          child.disabled,
          Array.from(child.querySelectorAll<HTMLOptionElement>(":scope > option")).map((option) => [
            option.value,
            option.label,
            disabled(option),
          ]),
        ];
      }
      return ["ignored", child.tagName];
    }),
  );
}

function optionElements(record: MultiSelectRecord): HTMLElement[] {
  return Array.from(record.content.querySelectorAll<HTMLElement>('[data-part="option"]')).filter(
    (option) => option.closest('[data-jqs="multi-select"]') === record.root,
  );
}

function enabledOptions(record: MultiSelectRecord): HTMLElement[] {
  return optionElements(record).filter((option) => option.getAttribute("aria-disabled") !== "true");
}

function nativeOption(record: MultiSelectRecord, value: string): HTMLOptionElement | undefined {
  return Array.from(record.control.options).find((option) => option.value === value);
}

function optionElement(record: MultiSelectRecord, value: string): HTMLElement | undefined {
  return optionElements(record).find((option) => option.dataset.value === value);
}

function createOption(root: HTMLElement, option: HTMLOptionElement, index: number): HTMLElement {
  const item = root.ownerDocument.createElement("div");
  item.id = `${root.id}-option-${index + 1}`;
  item.dataset.part = "option";
  item.dataset.value = option.value;
  item.setAttribute("role", "option");
  item.textContent = option.label;
  if (disabled(option)) {
    item.dataset.disabled = "";
    item.setAttribute("aria-disabled", "true");
  }
  return item;
}

function rebuildOptions(record: MultiSelectRecord): void {
  const values = new Set<string>();
  for (const option of Array.from(record.control.options)) {
    if (values.has(option.value)) {
      throw new Error(
        `Multi Select #${record.root.id} needs unique option values; duplicate: "${option.value}".`,
      );
    }
    values.add(option.value);
  }
  record.content.replaceChildren();
  let index = 0;
  for (const child of Array.from(record.control.children)) {
    if (isHTMLTag(child, "option")) {
      record.content.append(createOption(record.root, child, index++));
      continue;
    }
    if (!isHTMLTag(child, "optgroup")) continue;
    const group = record.root.ownerDocument.createElement("div");
    group.dataset.part = "group";
    group.setAttribute("role", "group");
    const label = record.root.ownerDocument.createElement("div");
    label.id = `${record.root.id}-group-${index + 1}`;
    label.dataset.part = "label";
    label.textContent = child.label;
    group.setAttribute("aria-labelledby", label.id);
    group.append(label);
    for (const option of Array.from(child.children)) {
      if (isHTMLTag(option, "option")) group.append(createOption(record.root, option, index++));
    }
    record.content.append(group);
  }
}

function emit(
  record: MultiSelectRecord,
  name: "before-open" | "open" | "before-close" | "close" | "before-change" | "change",
  value = record.values,
  previousValue = record.values,
  cancelable = false,
): boolean {
  const detail: MultiSelectEventDetail = {
    control: record.control,
    multiSelect: record.root,
    previousValue: [...previousValue],
    value: [...value],
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:multi-select:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
  );
}

function current(record: MultiSelectRecord, revision = record.revision): boolean {
  const present = optionElements(record);
  const native = Array.from(record.control.options);
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.matches('[data-jqs="multi-select"]') &&
    directPart(record.root, "control") === record.control &&
    record.control.multiple &&
    directPart(record.root, "trigger") === record.trigger &&
    directPart(record.root, "content") === record.content &&
    directPart(record.root, "tags") === record.tags &&
    directPart(record.root, "status") === record.status &&
    record.control.form === record.form &&
    record.control.labels[0] === record.label &&
    optionSignature(record.control) === record.optionsSignature &&
    native.length === record.nativeOptions.length &&
    native.every((option, index) => option === record.nativeOptions[index]) &&
    present.length === record.options.length &&
    present.every((option, index) => option === record.options[index])
  );
}

function currentOpen(record: MultiSelectRecord, revision = record.revision): boolean {
  return current(record, revision) && record.open;
}

function unavailable(record: MultiSelectRecord): boolean {
  return record.control.matches(":disabled");
}

function serialized(record: MultiSelectRecord): string {
  return JSON.stringify(selectedValues(record.control));
}

function unchanged(record: MultiSelectRecord, revision: number, value: string): boolean {
  return current(record, revision) && serialized(record) === value;
}

function nativeEvent(record: MultiSelectRecord, type: "input" | "change"): void {
  const previous = record.nativeEvent;
  const event = new (record.window as Window & typeof globalThis).Event(type, { bubbles: true });
  record.nativeEvent = event;
  try {
    record.control.dispatchEvent(event);
  } finally {
    if (previous) record.nativeEvent = previous;
    else delete record.nativeEvent;
  }
}

function maxSelections(record: MultiSelectRecord): number {
  const value = Number(record.root.dataset.max);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : Number.POSITIVE_INFINITY;
}

function status(record: MultiSelectRecord, message: string): void {
  const element = directPart(record.root, "status");
  if (element) element.textContent = message;
}

function rebuildTags(record: MultiSelectRecord): void {
  const signature = JSON.stringify([record.values, record.optionsSignature, unavailable(record)]);
  const previous = generatedTags.get(record.tags);
  const children = Array.from(record.tags.children);
  if (
    previous?.signature === signature &&
    previous.children.length === children.length &&
    children.every((child, index) => child === previous.children[index])
  )
    return;
  record.tags.replaceChildren();
  for (const value of record.values) {
    const option = nativeOption(record, value);
    if (!option) continue;
    const tag = record.root.ownerDocument.createElement("span");
    tag.dataset.part = "tag";
    tag.dataset.value = value;
    tag.textContent = option.label;
    const remove = record.root.ownerDocument.createElement("button");
    remove.type = "button";
    remove.dataset.part = "remove";
    remove.dataset.value = value;
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${option.label}`);
    remove.disabled = unavailable(record) || disabled(option);
    tag.append(remove);
    record.tags.append(tag);
  }
  generatedTags.set(record.tags, { signature, children: Array.from(record.tags.children) });
}

function render(record: MultiSelectRecord): void {
  record.values = selectedValues(record.control);
  const serialized = JSON.stringify(record.values);
  record.lastValue = serialized;
  reflected.set(record.root, serialized);
  if (record.root.dataset.value !== serialized) record.root.dataset.value = serialized;
  record.root.dataset.state = record.open ? "open" : record.values.length ? "selected" : "empty";
  record.trigger.setAttribute("aria-expanded", String(record.open));
  const triggerDisabled = unavailable(record);
  if (record.trigger.disabled !== triggerDisabled) record.trigger.disabled = triggerDisabled;

  const labels = record.values
    .map((value) => nativeOption(record, value)?.label)
    .filter((label): label is string => Boolean(label));
  valuePart(record.trigger).textContent = labels.length
    ? labels.length <= 2
      ? labels.join(", ")
      : `${labels.length} selected`
    : record.root.dataset.placeholder || "Select options";
  for (const option of optionElements(record)) {
    const selected = record.values.includes(option.dataset.value ?? "");
    option.setAttribute("aria-selected", String(selected));
    option.dataset.state = selected ? "selected" : "unselected";
  }
  rebuildTags(record);
}

function setActive(record: MultiSelectRecord, value: string | undefined): void {
  const option = value === undefined ? undefined : optionElement(record, value);
  if (!option || option.getAttribute("aria-disabled") === "true") return;
  record.activeValue = value;
  for (const candidate of optionElements(record)) {
    if (candidate === option) candidate.dataset.highlighted = "";
    else delete candidate.dataset.highlighted;
  }
  record.content.setAttribute("aria-activedescendant", option.id);
  try {
    option.scrollIntoView({ block: "nearest" });
  } catch {
    // DOM test environments may not implement scrolling.
  }
}

function clearSearch(record: MultiSelectRecord): void {
  record.search = "";
  record.searchExpires = 0;
  record.cancelSearch?.();
}

function syncOpen(record: MultiSelectRecord, open: boolean): void {
  record.open = open;
  record.root.dataset.state = open ? "open" : record.values.length ? "selected" : "empty";
  record.content.dataset.state = open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(open));
  if (open) activeRecords.add(record);
  else {
    activeRecords.delete(record);
    record.content.removeAttribute("aria-activedescendant");
    clearSearch(record);
  }
}

function settleFloating(record: MultiSelectRecord, opening: boolean): void {
  const latest = records.get(record.root);
  const wantsOpen = latest?.content === record.content && current(latest) && latest.open;
  if (opening && !wantsOpen) hideFloating(record.content);
  else if (!opening && wantsOpen) showFloating(record.content);
}

function nativeOpen(record: MultiSelectRecord): boolean | undefined {
  if (!usesNativePopover(record.content)) return undefined;
  try {
    return record.content.matches(":popover-open");
  } catch {
    return undefined;
  }
}

function show(record: MultiSelectRecord, revision: number): boolean {
  syncOpen(record, true);
  try {
    showFloating(record.content);
  } catch (error) {
    if (current(record, revision)) {
      syncOpen(record, false);
      hideFloating(record.content);
    }
    throw error;
  }
  if (!currentOpen(record, revision)) {
    settleFloating(record, true);
    return false;
  }
  if (nativeOpen(record) === false) {
    syncOpen(record, false);
    return false;
  }
  return true;
}

function initialActive(record: MultiSelectRecord): string | undefined {
  return (
    record.values.find((value) => {
      const option = nativeOption(record, value);
      return option && !disabled(option);
    }) ?? enabledOptions(record)[0]?.dataset.value
  );
}

function openMultiSelect(root: HTMLElement): HTMLElement {
  const record = recordFor(root);
  const revision = ++record.revision;
  const documentRevision = (documentRevisions.get(record.document) ?? 0) + 1;
  documentRevisions.set(record.document, documentRevision);
  const accepted = (): boolean =>
    current(record, revision) && documentRevisions.get(record.document) === documentRevision;
  if (
    !current(record, revision) ||
    record.open ||
    unavailable(record) ||
    !emit(record, "before-open", record.values, record.values, true) ||
    !accepted() ||
    unavailable(record)
  )
    return root;
  for (const other of documentRecords(activeRecords, record.document)) {
    if (other !== record && current(other)) closeMultiSelect(other.root, false);
    if (!accepted() || (other !== record && currentOpen(other))) return root;
  }
  if (!show(record, revision)) return root;
  setActive(record, initialActive(record));
  if (!accepted() || !currentOpen(record, revision)) return root;
  position(record);
  if (!accepted() || !currentOpen(record, revision)) return root;
  record.content.focus();
  if (accepted() && currentOpen(record, revision)) emit(record, "open");
  return root;
}

function closeMultiSelect(root: HTMLElement, restoreFocus = true): HTMLElement {
  const record = recordFor(root);
  const revision = ++record.revision;
  if (
    !currentOpen(record, revision) ||
    !emit(record, "before-close", record.values, record.values, true) ||
    !current(record, revision)
  )
    return root;
  syncOpen(record, false);
  if (!current(record, revision)) return root;
  hideFloating(record.content);
  if (!current(record, revision)) {
    settleFloating(record, false);
    return root;
  }
  if (restoreFocus && record.trigger.isConnected) record.trigger.focus();
  if (current(record, revision) && !currentOpen(record, revision)) emit(record, "close");
  return root;
}

function commit(record: MultiSelectRecord, values: readonly string[]): HTMLElement {
  const revision = ++record.revision;
  if (!current(record, revision) || unavailable(record)) return record.root;
  const requested = new Set(values);
  const ordered = Array.from(record.control.options)
    .filter((option) => (disabled(option) ? option.selected : requested.has(option.value)))
    .map((option) => option.value);
  if (ordered.length > maxSelections(record)) {
    status(record, `Choose no more than ${maxSelections(record)} options.`);
    return record.root;
  }
  const previousValue = selectedValues(record.control);
  const previous = JSON.stringify(previousValue);
  const value = JSON.stringify(ordered);
  if (value === previous) {
    render(record);
    return record.root;
  }
  if (
    !emit(record, "before-change", ordered, previousValue, true) ||
    !unchanged(record, revision, previous) ||
    unavailable(record) ||
    ordered.length > maxSelections(record)
  )
    return record.root;
  for (const option of record.control.options) option.selected = ordered.includes(option.value);
  render(record);
  const accepted = (): boolean =>
    unchanged(record, revision, value) &&
    !unavailable(record) &&
    ordered.length <= maxSelections(record);
  nativeEvent(record, "input");
  if (!accepted()) return record.root;
  nativeEvent(record, "change");
  if (!accepted()) return record.root;
  status(
    record,
    `${record.values.length} option${record.values.length === 1 ? "" : "s"} selected.`,
  );
  emit(record, "change", record.values, previousValue);
  return record.root;
}

function toggleValue(record: MultiSelectRecord, value: string): HTMLElement {
  const currentValues = selectedValues(record.control);
  const values = currentValues.includes(value)
    ? currentValues.filter((candidate) => candidate !== value)
    : [...currentValues, value];
  return commit(record, values);
}

function moveActive(record: MultiSelectRecord, offset: number): void {
  const options = enabledOptions(record);
  if (!options.length) return;
  const current = options.findIndex((option) => option.dataset.value === record.activeValue);
  const index = current < 0 ? 0 : (current + offset + options.length) % options.length;
  setActive(record, options[index]?.dataset.value);
}

function scheduleSearch(record: MultiSelectRecord, search: string, delay = 500): void {
  const revision = ++record.revision;
  record.cancelSearch?.();
  if (!currentOpen(record, revision)) return;
  record.search = search;
  record.searchExpires = Date.now() + delay;
  let timer: number | undefined;
  let active = true;
  const valid = (): boolean => active && currentOpen(record) && record.cancelSearch === cancel;
  const cancel = (): void => {
    active = false;
    if (record.cancelSearch === cancel) delete record.cancelSearch;
    record.cleanups.delete(cancel);
    const handle = timer;
    timer = undefined;
    if (handle !== undefined) record.window.clearTimeout(handle);
  };
  record.cancelSearch = cancel;
  acquireUIResource(
    record,
    valid,
    () => {
      timer = record.window.setTimeout(() => {
        const accepted = valid();
        cancel();
        if (accepted && current(record)) {
          record.search = "";
          record.searchExpires = 0;
        }
      }, delay);
    },
    cancel,
  );
}

function typeahead(record: MultiSelectRecord, key: string): void {
  const revision = record.revision + 1;
  scheduleSearch(record, record.search + key.toLocaleLowerCase());
  if (!currentOpen(record, revision)) return;
  const options = enabledOptions(record);
  const current = options.findIndex((option) => option.dataset.value === record.activeValue);
  const ordered = [...options.slice(current + 1), ...options.slice(0, current + 1)];
  const match = ordered.find((option) =>
    option.textContent?.trim().toLocaleLowerCase().startsWith(record.search),
  );
  if (match) setActive(record, match.dataset.value);
}

function listboxKeydown(record: MultiSelectRecord, event: KeyboardEvent): void {
  if (
    !record.open ||
    unavailable(record) ||
    event.isComposing ||
    event.altKey ||
    !isElementNode(event.target) ||
    event.target.closest("[data-jqs]") !== record.root ||
    event.target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    )
  )
    return;
  const all = (event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "a";
  if ((event.ctrlKey || event.metaKey) && !all) return;
  record.revision += 1;
  if (event.key === "Escape") {
    event.preventDefault();
    closeMultiSelect(record.root);
    return;
  }
  if (event.key === "Tab") {
    closeMultiSelect(record.root, false);
    return;
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (record.activeValue !== undefined) toggleValue(record, record.activeValue);
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveActive(record, event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    const options = enabledOptions(record);
    setActive(record, (event.key === "Home" ? options[0] : options.at(-1))?.dataset.value);
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "a") {
    event.preventDefault();
    const available = Array.from(record.control.options)
      .filter((option) => !disabled(option))
      .map((option) => option.value);
    const selected = selectedValues(record.control);
    const locked = Array.from(record.control.options).filter(
      (option) => option.selected && disabled(option),
    ).length;
    const desired = available.slice(0, Math.max(0, maxSelections(record) - locked));
    const enabledSelected = selected.filter((value) => available.includes(value));
    const allSelected =
      desired.length === enabledSelected.length &&
      desired.every((value) => enabledSelected.includes(value));
    commit(record, allSelected ? [] : desired);
    return;
  }
  if (event.key.length === 1 && /\S/.test(event.key)) typeahead(record, event.key);
}

function syncFromControl(record: MultiSelectRecord, notify: boolean): void {
  const previous = [...record.values];
  render(record);
  if (notify && JSON.stringify(previous) !== record.lastValue)
    emit(record, "change", record.values, previous);
}

function ownedTarget(
  record: MultiSelectRecord,
  target: EventTarget | null,
  part: string,
  container: HTMLElement,
): HTMLElement | undefined {
  if (!isElementNode(target) || target.closest("[data-jqs]") !== record.root) return undefined;
  const element = target.closest(`[data-part="${part}"]`);
  return isHTMLElement(element) && container.contains(element) ? element : undefined;
}

function wire(record: MultiSelectRecord): void {
  const listen = (target: EventTarget | undefined, type: string, callback: EventListener): void =>
    listenUI(record, () => current(record), target, type, callback);
  listen(record.trigger, "click", () => {
    if (record.open) closeMultiSelect(record.root);
    else openMultiSelect(record.root);
  });
  listen(record.trigger, "keydown", (event) => {
    const key = event as KeyboardEvent;
    if (
      !key.isComposing &&
      !key.ctrlKey &&
      !key.metaKey &&
      !key.altKey &&
      ["ArrowDown", "ArrowUp"].includes(key.key)
    ) {
      key.preventDefault();
      openMultiSelect(record.root);
    }
  });
  listen(record.content, "keydown", (event) => listboxKeydown(record, event as KeyboardEvent));
  listen(record.content, "click", (event) => {
    const option = ownedTarget(record, event.target, "option", record.content);
    if (!option || unavailable(record) || option.getAttribute("aria-disabled") === "true") return;
    const value = option.dataset.value;
    if (value === undefined) return;
    const revision = ++record.revision;
    setActive(record, value);
    if (current(record, revision)) toggleValue(record, value);
  });
  listen(record.content, "pointermove", (event) => {
    const option = ownedTarget(record, event.target, "option", record.content);
    if (
      !record.open ||
      unavailable(record) ||
      !option ||
      option.getAttribute("aria-disabled") === "true"
    )
      return;
    record.revision += 1;
    setActive(record, option.dataset.value);
  });
  listen(record.tags, "click", (event) => {
    const remove = ownedTarget(record, event.target, "remove", record.tags);
    const value = remove?.dataset.value;
    if (value !== undefined)
      commit(
        record,
        selectedValues(record.control).filter((candidate) => candidate !== value),
      );
  });
  const nativeChange = (event: Event): void => {
    if (event === record.nativeEvent) return;
    record.revision += 1;
    syncFromControl(record, true);
  };
  listen(record.control, "change", nativeChange);
  listen(record.control, "jquery-star:model-write", nativeChange);
  listenUIReset(
    record,
    () => current(record),
    record.form,
    () => syncFromControl(record, true),
  );
  listen(record.label, "click", (event) => {
    event.preventDefault();
    record.trigger.focus();
  });
}

function parseValue(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function metadata(record: MultiSelectRecord): void {
  const { root, control, trigger, content, status } = record;
  trigger.type = "button";
  content.tabIndex = 0;
  content.setAttribute("role", "listbox");
  content.setAttribute("aria-multiselectable", "true");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-controls", content.id);
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  control.dataset.enhanced = "true";
  control.setAttribute("aria-hidden", "true");
  control.tabIndex = -1;
  identifyControlLabel(root, control, trigger, "Multi Select");
  identifyLabel(
    content,
    control.labels[0]?.id || control.getAttribute("aria-labelledby") || undefined,
    control.getAttribute("aria-label") ||
      root.getAttribute("aria-label") ||
      control.name ||
      "Multi Select",
  );
}

function requestedValue(record: MultiSelectRecord): void {
  const value = record.root.dataset.value;
  const requested = parseValue(value);
  if (!requested || value === reflected.get(record.root)) return;
  record.revision += 1;
  for (const option of record.control.options) option.selected = requested.includes(option.value);
}

function refreshOpen(record: MultiSelectRecord): void {
  const revision = record.revision;
  if (!currentOpen(record, revision)) return;
  const active =
    record.activeValue === undefined ? undefined : optionElement(record, record.activeValue);
  setActive(
    record,
    active && active.getAttribute("aria-disabled") !== "true"
      ? record.activeValue
      : initialActive(record),
  );
  if (!currentOpen(record, revision)) return;
  if (nativeOpen(record) === false && !show(record, revision)) return;
  if (currentOpen(record, revision)) position(record);
}

function snapshot(record: MultiSelectRecord, open = record.open): RetainedMultiSelect {
  return {
    control: record.control,
    content: record.content,
    open,
    activeValue: record.activeValue,
    search: record.search,
    searchExpires: record.searchExpires,
  };
}

function enhanceMultiSelect(root: HTMLElement): MultiSelectRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    metadata(existing);
    if (
      existing.resetRevision === existing.revision &&
      root.dataset.value === reflected.get(root)
    ) {
      refreshOpen(existing);
      return existing;
    }
    requestedValue(existing);
    if (serialized(existing) !== existing.lastValue) existing.revision += 1;
    render(existing);
    refreshOpen(existing);
    return existing;
  }
  const previous = existing ? snapshot(existing) : retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && !uiActive(root)) return existing;
  root.id ||= `jqs-multi-select-${++multiSelectId}`;
  const control = directControl(root);
  control.id ||= `${root.id}-control`;
  const trigger = directPart(root, "trigger") ?? createTrigger(root);
  if (!isHTMLTag(trigger, "button"))
    throw new Error(`Multi Select #${root.id} trigger must be a button.`);
  const content = directPart(root, "content") ?? createPart(root, "content");
  const tags = directPart(root, "tags") ?? createPart(root, "tags");
  const status = directPart(root, "status") ?? createPart(root, "status");
  trigger.id ||= `${root.id}-trigger`;
  content.id ||= `${root.id}-content`;
  prepareFloating(content);
  if (existing) {
    copyGeneratedAttributes(existing.trigger, trigger);
    copyGeneratedAttributes(existing.content, content);
  }
  const record: MultiSelectRecord = {
    ...uiResources(root),
    activeValue: previous?.activeValue,
    form: control.form,
    label: control.labels[0],
    content,
    control,
    lastValue: "",
    open: false,
    options: [],
    nativeOptions: Array.from(control.options),
    optionsSignature: optionSignature(control),
    root,
    search: "",
    searchExpires: 0,
    tags,
    trigger,
    status,
    values: selectedValues(control),
  };
  record.cleanups.add(() => {
    retained.set(root, snapshot(record, record.open && record.document !== root.ownerDocument));
    const wasOpen = record.open;
    activeRecords.delete(record);
    record.open = false;
    const latest = records.get(root);
    if (!latest || latest.content !== content) {
      root.dataset.state = record.values.length ? "selected" : "empty";
      content.dataset.state = "closed";
      trigger.setAttribute("aria-expanded", "false");
      content.removeAttribute("aria-activedescendant");
      if (wasOpen) {
        hideFloating(content);
        settleFloating(record, false);
      }
    }
  });
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    if (!record.active) return record;
    const generated = generatedOptions.get(content);
    const present = optionElements(record);
    if (
      !generated ||
      generated.signature !== record.optionsSignature ||
      generated.options.length !== present.length ||
      generated.options.some((option, index) => option !== present[index])
    ) {
      rebuildOptions(record);
      generatedOptions.set(content, {
        signature: record.optionsSignature,
        options: optionElements(record),
      });
    }
    record.options = optionElements(record);
    metadata(record);
    requestedValue(record);
    render(record);
    syncOpen(record, false);
    if (!usesNativePopover(content)) content.hidden = true;
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    const revision = record.revision;
    if (
      previous?.open &&
      previous.control === control &&
      previous.content === content &&
      current(record, revision) &&
      !unavailable(record) &&
      show(record, revision)
    ) {
      if (previous.search && previous.searchExpires > Date.now())
        scheduleSearch(record, previous.search, previous.searchExpires - Date.now());
      refreshOpen(record);
    }
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): MultiSelectRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceMultiSelect(root);
}

function position(record: MultiSelectRecord): void {
  const revision = record.revision;
  const width = record.trigger.getBoundingClientRect().width;
  const accepted = (): boolean => currentOpen(record, revision);
  if (!accepted()) return;
  record.content.style.minWidth = `${width}px`;
  positionFloating(
    record.root,
    record.trigger,
    record.content,
    { align: "start", side: "bottom" },
    accepted,
  );
}

function installGlobalListeners(host: DocumentHost): void {
  const { document } = host;
  host.listen(
    document,
    "pointerdown",
    (event) => {
      if (!isNode(event.target)) return;
      for (const record of documentRecords(activeRecords, document)) {
        if (!current(record) || record.document !== document || !record.root.isConnected)
          activeRecords.delete(record);
        else if (!record.root.contains(event.target)) closeMultiSelect(record.root, false);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (current(record) && record.document === document && record.root.isConnected)
        position(record);
      else activeRecords.delete(record);
    }
  };
  listenToViewportChanges(host, reposition);
}

function resolve(target: MultiSelectTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? multiSelectRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : multiSelectRoot(target);
  if (resolved) return resolved;
  throw new Error(`Multi Select target did not match data-jqs="multi-select": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="multi-select"]');
  return resolve(isHTMLElement(closest) ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements = uiElements(root, '[data-jqs="multi-select"]');
  for (const element of elements) {
    const component = multiSelectRoot(element);
    if (component) enhanceMultiSelect(component);
  }
}

export function createMultiSelects(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): MultiSelectCollection {
  installGlobalListeners(host);
  const api: StarMultiSelectStatic = {
    open: (target) => openMultiSelect(resolve(target)),
    close: (target) => closeMultiSelect(resolve(target)),
    toggle: (target) => {
      const root = resolve(target);
      const record = recordFor(root);
      if (!current(record)) return root;
      return record.open ? closeMultiSelect(root) : openMultiSelect(root);
    },
    set: (target, values) => {
      const root = resolve(target);
      return commit(recordFor(root), values);
    },
    select: (target, value, selected = true) => {
      const root = resolve(target);
      const record = recordFor(root);
      return commit(
        record,
        selected
          ? [...selectedValues(record.control), value]
          : selectedValues(record.control).filter((candidate) => candidate !== value),
      );
    },
    clear: (target) => {
      const root = resolve(target);
      return commit(recordFor(root), []);
    },
    value: (target) => {
      const root = resolve(target);
      return [...recordFor(root).values];
    },
  };
  for (const operation of ["open", "close", "toggle", "clear"] as const) {
    registerAction(`ui.multi-select.${operation}`, (context) =>
      api[operation](controlled(context, context.args?.[0])),
    );
  }
  registerAction("ui.multi-select.select", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    const selected = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof value !== "string") throw new Error("ui.multi-select.select needs an option value.");
    return api.select(target, value, typeof selected === "boolean" ? selected : true);
  });
  registerAction("ui.multi-select.set", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlled(context, explicit ? first : undefined);
    const values = explicit ? context.args?.[1] : first;
    if (!Array.isArray(values) || !values.every((value) => typeof value === "string"))
      throw new Error("ui.multi-select.set needs an array of option values.");
    return api.set(target, values);
  });
  return { api, enhance: enhanceAll };
}
