import { isHTMLElement, isHTMLTag, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { SelectTarget, StarContext, StarSelectStatic } from "../types";
import {
  copyGeneratedAttributes,
  documentRecords,
  hideFloating,
  identifyControlLabel,
  identifyLabel,
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

interface SelectRecord extends UIResources {
  activeValue: string | undefined;
  form: HTMLFormElement | null;
  label: HTMLLabelElement | undefined;
  clickAction: boolean;
  options: HTMLElement[];
  nativeEvent?: Event;
  content: HTMLElement;
  control: HTMLSelectElement;
  open: boolean;
  optionsSignature: string;
  root: HTMLElement;
  search: string;
  cancelSearch?: () => void;
  trigger: HTMLElement;
  value: string;
}

interface SelectEventDetail {
  control: HTMLSelectElement;
  previousValue: string;
  select: HTMLElement;
  value: string;
}

interface SelectCollection {
  api: StarSelectStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, SelectRecord>();
const activeRecords = new Set<SelectRecord>();
const reflected = new WeakMap<HTMLElement, string>();
const retained = new WeakMap<
  HTMLElement,
  { open: boolean; activeValue: string | undefined; value: string }
>();
const generatedOptions = new WeakMap<HTMLElement, { signature: string; options: HTMLElement[] }>();
const documentRevisions = new WeakMap<Document, number>();
let selectId = 0;

function selectRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="select"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLSelectElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLSelectElement =>
      isHTMLTag(child, "select") && child.getAttribute("data-part") === "control",
  );
  if (!control) throw new Error(`Select #${root.id} needs a direct <select data-part="control">.`);
  if (control.multiple)
    throw new Error("jQuery Star Select is single-value; use Listbox for multiple selection.");
  return control;
}

function directPart(root: HTMLElement, part: "trigger" | "content"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      isHTMLElement(child) && child.getAttribute("data-part") === part,
  );
}

function createTrigger(root: HTMLElement): HTMLElement {
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

function createContent(root: HTMLElement): HTMLElement {
  const content = root.ownerDocument.createElement("div");
  content.dataset.part = "content";
  content.dataset.generated = "";
  root.append(content);
  return content;
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

function optionElements(record: SelectRecord): HTMLElement[] {
  return Array.from(record.content.querySelectorAll<HTMLElement>('[data-part="option"]'));
}

function enabledOptions(record: SelectRecord): HTMLElement[] {
  return optionElements(record).filter((option) => option.getAttribute("aria-disabled") !== "true");
}

function optionElement(record: SelectRecord, value: string): HTMLElement | undefined {
  return optionElements(record).find((option) => option.dataset.value === value);
}

function nativeOption(record: SelectRecord, value: string): HTMLOptionElement | undefined {
  return Array.from(record.control.options).find((option) => option.value === value);
}

function isDisabled(option: HTMLOptionElement): boolean {
  return (
    option.disabled ||
    (isHTMLTag(option.parentElement, "optgroup") && option.parentElement.disabled)
  );
}

function createOption(root: HTMLElement, option: HTMLOptionElement, index: number): HTMLElement {
  const item = root.ownerDocument.createElement("div");
  item.id = `${root.id}-option-${index}`;
  item.dataset.part = "option";
  item.dataset.value = option.value;
  item.setAttribute("role", "option");
  item.textContent = option.label;
  if (isDisabled(option)) {
    item.dataset.disabled = "";
    item.setAttribute("aria-disabled", "true");
  }
  return item;
}

function optionSignature(control: HTMLSelectElement): string {
  return JSON.stringify(
    Array.from(control.children).map((child) => {
      if (isHTMLTag(child, "option")) {
        return ["option", child.value, child.label, isDisabled(child)];
      }
      if (isHTMLTag(child, "optgroup")) {
        return [
          "group",
          child.label,
          child.disabled,
          Array.from(child.querySelectorAll<HTMLOptionElement>(":scope > option")).map((option) => [
            option.value,
            option.label,
            isDisabled(option),
          ]),
        ];
      }
      return ["ignored", child.tagName];
    }),
  );
}

function rebuildOptions(root: HTMLElement, control: HTMLSelectElement, content: HTMLElement): void {
  const values = new Set<string>();
  for (const option of Array.from(control.options)) {
    if (values.has(option.value)) {
      throw new Error(
        `Select #${root.id} needs unique option values; duplicate: "${option.value}".`,
      );
    }
    values.add(option.value);
  }
  content.replaceChildren();
  let index = 0;
  for (const child of Array.from(control.children)) {
    if (isHTMLTag(child, "option")) {
      content.append(createOption(root, child, index++));
      continue;
    }
    if (!isHTMLTag(child, "optgroup")) continue;
    const group = root.ownerDocument.createElement("div");
    group.dataset.part = "group";
    group.setAttribute("role", "group");
    const label = root.ownerDocument.createElement("div");
    label.id = `${root.id}-group-${index}`;
    label.dataset.part = "label";
    label.textContent = child.label;
    group.setAttribute("aria-labelledby", label.id);
    group.append(label);
    for (const option of Array.from(child.children)) {
      if (isHTMLTag(option, "option")) group.append(createOption(root, option, index++));
    }
    content.append(group);
  }
}

function emit(
  record: SelectRecord,
  name: "before-open" | "open" | "before-close" | "close" | "before-change" | "change",
  cancelable = false,
  value = record.value,
  previousValue = record.value,
): boolean {
  const detail: SelectEventDetail = {
    control: record.control,
    previousValue,
    select: record.root,
    value,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:select:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function current(record: SelectRecord, revision = record.revision): boolean {
  const options = optionElements(record);
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.matches('[data-jqs="select"]') &&
    record.root.querySelector(':scope > select[data-part="control"]') === record.control &&
    directPart(record.root, "trigger") === record.trigger &&
    directPart(record.root, "content") === record.content &&
    !record.control.multiple &&
    record.control.form === record.form &&
    labelFor(record.control) === record.label &&
    hasClickAction(record.trigger) === record.clickAction &&
    optionSignature(record.control) === record.optionsSignature &&
    options.length === record.options.length &&
    options.every((option, index) => option === record.options[index])
  );
}

function unavailable(record: SelectRecord): boolean {
  return record.control.matches(":disabled");
}

function currentOpen(record: SelectRecord, revision = record.revision): boolean {
  return current(record, revision) && record.open;
}

function clearSearch(record: SelectRecord): void {
  record.search = "";
  record.cancelSearch?.();
}

function nativeEvent(record: SelectRecord, type: "input" | "change"): void {
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

function renderValue(record: SelectRecord): void {
  reflected.set(record.root, record.value);
  const selected = record.control.selectedOptions[0];
  valuePart(record.trigger).textContent =
    selected?.label || record.root.getAttribute("data-placeholder") || "Select an option";
  if (record.root.dataset.value !== record.value) record.root.dataset.value = record.value;
  for (const option of optionElements(record)) {
    const selectedOption = option.dataset.value === record.value;
    option.setAttribute("aria-selected", String(selectedOption));
    option.dataset.state = selectedOption ? "selected" : "unselected";
  }
}

function setActive(record: SelectRecord, value: string | undefined): void {
  const option = value === undefined ? undefined : optionElement(record, value);
  if (!option || option.getAttribute("aria-disabled") === "true") return;
  record.activeValue = value;
  for (const candidate of optionElements(record)) {
    if (candidate === option) candidate.dataset.highlighted = "";
    else delete candidate.dataset.highlighted;
  }
  record.trigger.setAttribute("aria-activedescendant", option.id);
  try {
    option.scrollIntoView({ block: "nearest" });
  } catch {
    // DOM test environments may not implement scrolling.
  }
}

function initialActive(record: SelectRecord): string | undefined {
  const selected = optionElement(record, record.value);
  if (selected && selected.getAttribute("aria-disabled") !== "true") return record.value;
  return enabledOptions(record)[0]?.dataset.value;
}

function syncState(record: SelectRecord, open: boolean): void {
  record.open = open;
  if (open) activeRecords.add(record);
  else activeRecords.delete(record);
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(open));
  if (!open) record.trigger.removeAttribute("aria-activedescendant");
}

function settleFloating(record: SelectRecord, opening: boolean): void {
  const latest = records.get(record.root);
  const wantsOpen = latest?.content === record.content && current(latest) && latest.open;
  if (opening && !wantsOpen) hideFloating(record.content);
  else if (!opening && wantsOpen) showFloating(record.content);
}

function show(record: SelectRecord, revision: number): boolean {
  syncState(record, true);
  try {
    showFloating(record.content);
  } catch (error) {
    if (current(record, revision)) {
      syncState(record, false);
      hideFloating(record.content);
    }
    throw error;
  }
  if (!current(record, revision) || !record.open) {
    settleFloating(record, true);
    return false;
  }
  if (nativeOpen(record) === false) {
    syncState(record, false);
    return false;
  }
  return true;
}

function nativeOpen(record: SelectRecord): boolean | undefined {
  if (!usesNativePopover(record.content)) return undefined;
  try {
    return record.content.matches(":popover-open");
  } catch {
    return undefined;
  }
}

function openSelect(root: HTMLElement): HTMLElement {
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
    !emit(record, "before-open", true) ||
    !accepted() ||
    unavailable(record)
  )
    return root;
  for (const other of documentRecords(activeRecords, record.document)) {
    if (other !== record && current(other)) closeSelect(other.root, false, false);
    if (!accepted() || (other !== record && current(other) && other.open)) return root;
  }
  if (!show(record, revision)) return root;
  setActive(record, initialActive(record));
  if (!accepted() || !currentOpen(record, revision)) return root;
  positionSelect(record);
  if (!accepted() || !currentOpen(record, revision)) return root;
  record.trigger.focus();
  if (accepted() && currentOpen(record, revision)) emit(record, "open");
  return root;
}

function commitValue(record: SelectRecord, value: string): number | undefined {
  const revision = ++record.revision;
  if (!current(record, revision) || unavailable(record)) return undefined;
  const option = nativeOption(record, value);
  if (!option || isDisabled(option)) return undefined;
  const previousValue = record.control.value;
  if (previousValue === value) {
    syncFromControl(record, false);
    return revision;
  }
  if (
    !emit(record, "before-change", true, value, previousValue) ||
    !current(record, revision) ||
    unavailable(record) ||
    record.control.value !== previousValue ||
    nativeOption(record, value) !== option ||
    isDisabled(option)
  )
    return undefined;
  record.control.value = value;
  record.value = value;
  record.activeValue = value;
  renderValue(record);
  const accepted = (): boolean => current(record, revision) && record.control.value === value;
  nativeEvent(record, "input");
  if (!accepted()) return undefined;
  nativeEvent(record, "change");
  if (!accepted()) return undefined;
  emit(record, "change", false, value, previousValue);
  return accepted() ? revision : undefined;
}

function closeSelect(root: HTMLElement, commit = false, restoreFocus = true): HTMLElement {
  const record = recordFor(root);
  let revision = ++record.revision;
  if (!currentOpen(record, revision)) return root;
  if (commit && record.activeValue !== undefined) {
    const committed = commitValue(record, record.activeValue);
    if (committed === undefined) return root;
    revision = committed;
  }
  if (!emit(record, "before-close", true) || !current(record, revision)) return root;
  syncState(record, false);
  record.activeValue = record.value;
  clearSearch(record);
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

function toggleSelect(root: HTMLElement): HTMLElement {
  const record = recordFor(root);
  if (!current(record)) return root;
  return record.open ? closeSelect(root) : openSelect(root);
}

function moveActive(record: SelectRecord, offset: number): void {
  const options = enabledOptions(record);
  if (options.length === 0) return;
  const current = options.findIndex((option) => option.dataset.value === record.activeValue);
  const next = current < 0 ? 0 : (current + offset + options.length) % options.length;
  setActive(record, options[next]?.dataset.value);
}

function typeahead(record: SelectRecord, key: string): void {
  const revision = ++record.revision;
  const search = record.search + key.toLocaleLowerCase();
  record.cancelSearch?.();
  if (!currentOpen(record, revision)) return;
  record.search = search;
  let timer: number | undefined;
  let active = true;
  const valid = (): boolean =>
    active && current(record) && record.open && record.cancelSearch === cancel;
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
        if (accepted && current(record) && !record.cancelSearch) record.search = "";
      }, 500);
    },
    cancel,
  );
  if (!currentOpen(record, revision)) return;
  const options = enabledOptions(record);
  const activeIndex = options.findIndex((option) => option.dataset.value === record.activeValue);
  const ordered = [...options.slice(activeIndex + 1), ...options.slice(0, activeIndex + 1)];
  const match = ordered.find((option) =>
    option.textContent?.trim().toLocaleLowerCase().startsWith(search),
  );
  if (match) setActive(record, match.dataset.value);
}

function triggerKeydown(record: SelectRecord, event: KeyboardEvent): void {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || unavailable(record))
    return;
  if (event.key === "Escape" && record.open) {
    event.preventDefault();
    closeSelect(record.root);
    return;
  }
  if (event.key === "Tab" && record.open) {
    closeSelect(record.root, true, false);
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (record.open) closeSelect(record.root, true);
    else openSelect(record.root);
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!record.open) openSelect(record.root);
    else {
      record.revision += 1;
      moveActive(record, event.key === "ArrowDown" ? 1 : -1);
    }
    return;
  }
  if (
    event.key === "Home" ||
    event.key === "End" ||
    (event.key.length === 1 && /\S/.test(event.key))
  ) {
    const revision = record.revision + 1;
    if (!record.open) openSelect(record.root);
    else record.revision += 1;
    if (!current(record, revision) || !record.open) return;
    if (event.key.length === 1) typeahead(record, event.key);
    else {
      event.preventDefault();
      const options = enabledOptions(record);
      setActive(
        record,
        (event.key === "Home" ? options[0] : options[options.length - 1])?.dataset.value,
      );
    }
  }
}

function syncFromControl(record: SelectRecord, emitChange: boolean): void {
  const previousValue = record.value;
  record.value = record.control.value;
  if (record.value !== previousValue) {
    record.revision += 1;
    record.activeValue = record.value;
  }
  renderValue(record);
  if (emitChange && previousValue !== record.value) {
    emit(record, "change", false, record.value, previousValue);
  }
}

function labelFor(control: HTMLSelectElement): HTMLLabelElement | undefined {
  return control.labels?.[0] ?? undefined;
}

function hasClickAction(trigger: HTMLElement): boolean {
  return Array.from(trigger.attributes).some((attribute) => attribute.name === "data-on:click");
}

function wire(record: SelectRecord): void {
  const listen = listenUI.bind(undefined, record, () => current(record));
  if (!record.clickAction)
    listen(record.trigger, "click", () => {
      toggleSelect(record.root);
    });
  listen(record.trigger, "keydown", (event) => triggerKeydown(record, event as KeyboardEvent));
  const controlChange = (event: Event): void => {
    if (event !== record.nativeEvent) syncFromControl(record, true);
  };
  listen(record.control, "change", controlChange);
  listen(record.control, "jquery-star:model-write", controlChange);
  listen(record.label, "click", (event) => {
    event.preventDefault();
    record.trigger.focus();
  });
  for (const option of record.options) {
    listen(option, "click", () => {
      const value = option.dataset.value;
      if (value === undefined) return;
      const revision = commitValue(record, value);
      if (revision !== undefined && current(record, revision) && record.open)
        closeSelect(record.root);
    });
    listen(option, "pointermove", () => {
      if (!record.open || unavailable(record)) return;
      record.revision += 1;
      setActive(record, option.dataset.value);
    });
  }
  listenUIReset(
    record,
    () => current(record),
    record.form,
    () => {
      const previousValue = record.value;
      syncFromControl(record, false);
      const revision = record.revision;
      const value = record.value;
      if (previousValue !== value) emit(record, "change", false, value, previousValue);
      if (current(record, revision) && record.control.value === value) nativeEvent(record, "input");
    },
  );
}

function metadata(record: SelectRecord): void {
  const { root, control, trigger, content } = record;
  control.dataset.enhanced = "true";
  control.setAttribute("aria-hidden", "true");
  control.hidden = true;
  control.tabIndex = -1;
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-controls", content.id);
  const disabled = unavailable(record);
  trigger.setAttribute("aria-disabled", String(disabled));
  if (isHTMLTag(trigger, "button")) {
    if (trigger.disabled !== disabled) trigger.disabled = disabled;
  } else if (!trigger.hasAttribute("tabindex")) trigger.tabIndex = 0;
  content.setAttribute("role", "listbox");
  identifyControlLabel(root, control, trigger, "Select");
  identifyLabel(
    content,
    trigger.getAttribute("aria-labelledby") || undefined,
    trigger.getAttribute("aria-label") || undefined,
  );
}

function requestedValue(record: SelectRecord): boolean {
  const requested = record.root.dataset.value;
  if (
    requested === undefined ||
    requested === reflected.get(record.root) ||
    !nativeOption(record, requested)
  )
    return false;
  record.control.value = requested;
  record.revision += 1;
  return true;
}

function refreshOpen(record: SelectRecord): void {
  const revision = record.revision;
  if (!current(record, revision) || !record.open) return;
  if (nativeOpen(record) === false && !show(record, revision)) return;
  if (currentOpen(record, revision)) positionSelect(record);
}

function enhanceSelect(root: HTMLElement): SelectRecord {
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
    const notify = requestedValue(existing);
    syncFromControl(existing, false);
    if (notify) nativeEvent(existing, "input");
    refreshOpen(existing);
    return existing;
  }
  const previous = existing
    ? { open: existing.open, activeValue: existing.activeValue, value: existing.value }
    : retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && !uiActive(root)) return existing;
  root.id ||= `jqs-select-${++selectId}`;
  const control = directControl(root);
  control.id ||= `${root.id}-control`;
  const trigger = directPart(root, "trigger") ?? createTrigger(root);
  const content = directPart(root, "content") ?? createContent(root);
  trigger.id ||= `${root.id}-trigger`;
  content.id ||= `${root.id}-content`;
  prepareFloating(content);
  if (existing) {
    copyGeneratedAttributes(existing.trigger, trigger);
    copyGeneratedAttributes(existing.content, content);
  }
  const signature = optionSignature(control);
  const generated = generatedOptions.get(content);
  const present = Array.from(content.querySelectorAll<HTMLElement>('[data-part="option"]'));
  if (
    !generated ||
    generated.signature !== signature ||
    generated.options.length !== present.length ||
    generated.options.some((option, index) => option !== present[index])
  ) {
    rebuildOptions(root, control, content);
    generatedOptions.set(content, {
      signature,
      options: Array.from(content.querySelectorAll<HTMLElement>('[data-part="option"]')),
    });
  }
  const record: SelectRecord = {
    ...uiResources(root),
    activeValue: control.value,
    form: control.form,
    label: labelFor(control),
    clickAction: hasClickAction(trigger),
    content,
    control,
    open: false,
    optionsSignature: signature,
    options: Array.from(content.querySelectorAll<HTMLElement>('[data-part="option"]')),
    root,
    search: "",
    trigger,
    value: control.value,
  };
  const wasEnhanced = reflected.has(root);
  const notify = requestedValue(record) && wasEnhanced;
  record.value = control.value;
  record.activeValue = previous?.value === control.value ? previous.activeValue : control.value;
  record.cleanups.add(() => {
    retained.set(root, {
      open: record.open && record.document !== root.ownerDocument,
      activeValue: record.activeValue,
      value: record.value,
    });
    const wasOpen = record.open;
    activeRecords.delete(record);
    record.open = false;
    const latest = records.get(root);
    if (!latest || latest.content !== content) {
      root.dataset.state = "closed";
      content.dataset.state = "closed";
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      if (wasOpen) {
        hideFloating(content);
        settleFloating(record, false);
      }
    }
  });
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    if (!record.active) return record;
    metadata(record);
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    renderValue(record);
    syncState(record, false);
    if (!usesNativePopover(content)) content.hidden = true;
    if (notify) nativeEvent(record, "input");
    const revision = record.revision;
    if (
      previous?.open &&
      current(record, revision) &&
      !unavailable(record) &&
      show(record, revision)
    ) {
      setActive(record, record.activeValue ?? initialActive(record));
      if (current(record, revision) && record.open) positionSelect(record);
    }
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): SelectRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceSelect(root);
}

function positionSelect(record: SelectRecord): void {
  const revision = record.revision;
  const width = record.trigger.getBoundingClientRect().width;
  const accepted = (): boolean => current(record, revision) && record.open;
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
        else if (!record.root.contains(event.target)) closeSelect(record.root, false, false);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (current(record) && record.document === document && record.root.isConnected) {
        positionSelect(record);
      } else {
        activeRecords.delete(record);
      }
    }
  };
  listenToViewportChanges(host, reposition);
}

function enhanceTree(root: ParentNode): void {
  const elements = uiElements(root, '[data-jqs="select"]');
  for (const element of elements) {
    const select = selectRoot(element);
    if (select) enhanceSelect(select);
  }
}

function resolveRoot(target: SelectTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? selectRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : selectRoot(target);
  if (resolved) return resolved;
  throw new Error(`Select target did not match data-jqs="select": ${String(target)}`);
}

function controlledSelect(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveRoot(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveRoot(target, context.root);
  }
  const root = context.element?.closest('[data-jqs="select"]') ?? null;
  const resolved = selectRoot(root);
  if (resolved) return resolved;
  throw new Error('Select action needs a selector or an element inside data-jqs="select".');
}

function registerActions(api: StarSelectStatic, registerAction: ActionRegistrar): void {
  for (const operation of ["open", "close", "toggle"] as const) {
    registerAction(`ui.select.${operation}`, (context) => {
      const root = controlledSelect(context, context.args?.[0]);
      return api[operation](root);
    });
  }
  registerAction("ui.select.select", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicitRoot =
      second !== undefined || (typeof first === "string" && first.startsWith("#"));
    const root = controlledSelect(context, explicitRoot ? first : undefined);
    const value = explicitRoot ? second : first;
    if (typeof value !== "string") throw new Error("ui.select.select needs an option value.");
    return api.select(root, value);
  });
}

export function createSelects(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): SelectCollection {
  installGlobalListeners(host);
  const api: StarSelectStatic = {
    select: (target, value) => {
      const root = resolveRoot(target);
      const record = recordFor(root);
      const revision = commitValue(record, value);
      if (revision !== undefined && current(record, revision) && record.open) closeSelect(root);
      return root;
    },
    open: (target) => openSelect(resolveRoot(target)),
    close: (target) => closeSelect(resolveRoot(target)),
    toggle: (target) => toggleSelect(resolveRoot(target)),
    value: (target) => {
      const root = resolveRoot(target);
      return recordFor(root).value;
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}
