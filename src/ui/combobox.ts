import { isHTMLElement, isHTMLTag, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { ComboboxTarget, StarComboboxStatic, StarContext } from "../types";
import {
  copyGeneratedAttributes,
  documentRecords,
  hideFloating,
  identifyElements,
  identifyControlLabel,
  identifyLabel,
  listenToViewportChanges,
  positionFloating,
  prepareFloating,
  showFloating,
  usesNativePopover,
} from "./floating";
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

interface ComboboxRecord extends UIResources {
  activeValue: string | undefined;
  form: HTMLFormElement | null;
  valueForm: HTMLFormElement | null;
  inline: boolean;
  composing: boolean;
  nativeEvent?: Event;
  options: HTMLElement[];
  optionsSignature: string;
  query: string;
  content: HTMLElement;
  control: HTMLInputElement;
  defaultQuery: string;
  defaultValue: string;
  open: boolean;
  root: HTMLElement;
  selectedLabel: string | undefined;
  value: string;
  valueControl: HTMLInputElement;
}

interface ComboboxEventDetail {
  combobox: HTMLElement;
  control: HTMLInputElement;
  label?: string;
  option?: HTMLElement;
  query: string;
  value: string;
  valueControl: HTMLInputElement;
}

interface ComboboxCollection {
  api: StarComboboxStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, ComboboxRecord>();
const activeRecords = new Set<ComboboxRecord>();
const reflected = new WeakMap<HTMLElement, string>();
const defaults = new WeakMap<HTMLInputElement, string>();
interface RetainedCombobox {
  open: boolean;
  activeValue: string | undefined;
  composing: boolean;
  control: HTMLInputElement;
  value: string;
  selectedLabel: string | undefined;
}
const retained = new WeakMap<HTMLElement, RetainedCombobox>();
const documentRevisions = new WeakMap<Document, number>();
let comboboxId = 0;

function comboboxRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="combobox"]') ? value : undefined;
}

function directPart(
  root: HTMLElement,
  part: "control" | "value" | "content",
): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      isHTMLElement(child) && child.getAttribute("data-part") === part,
  );
}

function inputControl(root: HTMLElement): HTMLInputElement {
  const control = directPart(root, "control");
  if (!isHTMLTag(control, "input") || control.type === "hidden") {
    throw new Error(`Combobox #${root.id} needs a direct text <input data-part="control">.`);
  }
  return control;
}

function valueControl(root: HTMLElement, control: HTMLInputElement): HTMLInputElement {
  const existing = directPart(root, "value");
  if (existing) {
    if (!isHTMLTag(existing, "input") || existing.type !== "hidden") {
      throw new Error(`Combobox #${root.id} data-part="value" must be a hidden input.`);
    }
    return existing;
  }
  const hidden = root.ownerDocument.createElement("input");
  hidden.type = "hidden";
  hidden.dataset.part = "value";
  hidden.dataset.generated = "";
  const name = root.getAttribute("data-name");
  if (name) hidden.name = name;
  control.after(hidden);
  return hidden;
}

function contentPart(root: HTMLElement): HTMLElement {
  const content = directPart(root, "content");
  if (!content) throw new Error(`Combobox #${root.id} needs a direct data-part="content" child.`);
  return content;
}

function ownedParts(record: ComboboxRecord, part: string): HTMLElement[] {
  return Array.from(record.content.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)).filter(
    (element) => isHTMLElement(element) && element.closest('[data-jqs="combobox"]') === record.root,
  );
}

function options(record: ComboboxRecord): HTMLElement[] {
  return ownedParts(record, "option");
}

function isDisabled(option: HTMLElement): boolean {
  return (
    option.hasAttribute("disabled") ||
    option.hasAttribute("data-disabled") ||
    option.getAttribute("aria-disabled") === "true"
  );
}

function optionValue(option: HTMLElement): string {
  const value = option.getAttribute("data-value");
  if (value === null) throw new Error("Combobox options need data-value.");
  return value;
}

function optionLabel(option: HTMLElement): string {
  return option.getAttribute("data-label")?.trim() || option.textContent?.trim() || "";
}

function optionFor(record: ComboboxRecord, value: string): HTMLElement | undefined {
  return options(record).find((option) => option.getAttribute("data-value") === value);
}

function visibleOptions(record: ComboboxRecord): HTMLElement[] {
  return options(record).filter(selectable);
}

function selectable(option: HTMLElement): boolean {
  return !option.hidden && !isDisabled(option);
}

function emit(
  record: ComboboxRecord,
  name:
    | "before-open"
    | "open"
    | "before-close"
    | "close"
    | "query"
    | "before-select"
    | "select"
    | "clear",
  cancelable = false,
  option?: HTMLElement,
): boolean {
  const detail: ComboboxEventDetail = {
    combobox: record.root,
    control: record.control,
    query: record.control.value,
    value: option ? optionValue(option) : record.value,
    valueControl: record.valueControl,
    ...(option ? { label: optionLabel(option), option } : {}),
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:combobox:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function optionSignature(record: ComboboxRecord): string {
  return JSON.stringify(
    options(record).map((option) => [
      option.getAttribute("data-value"),
      optionLabel(option),
      isDisabled(option),
    ]),
  );
}

function current(record: ComboboxRecord, revision = record.revision): boolean {
  const present = options(record);
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.matches('[data-jqs="combobox"]') &&
    directPart(record.root, "control") === record.control &&
    record.control.type !== "hidden" &&
    directPart(record.root, "value") === record.valueControl &&
    record.valueControl.type === "hidden" &&
    directPart(record.root, "content") === record.content &&
    record.control.form === record.form &&
    record.valueControl.form === record.valueForm &&
    record.root.hasAttribute("data-inline") === record.inline &&
    present.length === record.options.length &&
    present.every((option, index) => option === record.options[index]) &&
    optionSignature(record) === record.optionsSignature
  );
}

function currentOpen(record: ComboboxRecord, revision = record.revision): boolean {
  return current(record, revision) && record.open;
}

function unavailable(record: ComboboxRecord): boolean {
  return record.control.matches(":disabled") || record.control.readOnly;
}

function unchanged(
  record: ComboboxRecord,
  revision: number,
  query: string,
  value: string,
): boolean {
  return (
    current(record, revision) &&
    record.control.value === query &&
    record.valueControl.value === value
  );
}

function nativeEvent(
  record: ComboboxRecord,
  target: HTMLInputElement,
  type: "input" | "change",
): void {
  const previous = record.nativeEvent;
  const event = new (record.window as Window & typeof globalThis).Event(type, { bubbles: true });
  record.nativeEvent = event;
  try {
    target.dispatchEvent(event);
  } finally {
    if (previous) record.nativeEvent = previous;
    else delete record.nativeEvent;
  }
}

function syncEmptyState(record: ComboboxRecord): void {
  const loading = record.root.getAttribute("data-loading") === "true";
  for (const part of ownedParts(record, "loading")) part.hidden = !loading;
  for (const part of ownedParts(record, "empty")) {
    part.hidden = loading || visibleOptions(record).length > 0;
  }
  record.content.setAttribute("aria-busy", String(loading));
}

function filterOptions(record: ComboboxRecord): void {
  const mode = record.root.getAttribute("data-filter") ?? "contains";
  if (mode !== "manual") {
    const query = record.control.value.trim().toLocaleLowerCase();
    for (const option of options(record)) {
      const label = optionLabel(option).toLocaleLowerCase();
      option.hidden = query
        ? mode === "starts-with"
          ? !label.startsWith(query)
          : !label.includes(query)
        : false;
    }
  }
  syncEmptyState(record);
}

function setActive(record: ComboboxRecord, option: HTMLElement | undefined): void {
  if (option && (option.hidden || isDisabled(option))) return;
  record.activeValue = option?.getAttribute("data-value") ?? undefined;
  for (const candidate of options(record)) {
    if (candidate === option) candidate.dataset.highlighted = "";
    else delete candidate.dataset.highlighted;
  }
  if (option) {
    record.control.setAttribute("aria-activedescendant", option.id);
    try {
      option.scrollIntoView({ block: "nearest" });
    } catch {
      // DOM test environments may not implement scrolling.
    }
  } else {
    record.control.removeAttribute("aria-activedescendant");
  }
}

function initialOption(record: ComboboxRecord): HTMLElement | undefined {
  const selected = optionFor(record, record.value);
  return selected && !selected.hidden && !isDisabled(selected)
    ? selected
    : visibleOptions(record)[0];
}

function renderSelection(record: ComboboxRecord): void {
  reflected.set(record.root, record.value);
  if (record.root.dataset.value !== record.value) record.root.dataset.value = record.value;
  if (record.valueControl.value !== record.value) record.valueControl.value = record.value;
  for (const option of options(record)) {
    const selected = option.getAttribute("data-value") === record.value && record.value !== "";
    option.setAttribute("aria-selected", String(selected));
    option.dataset.state = selected ? "selected" : "unselected";
  }
}

function syncState(record: ComboboxRecord, open: boolean): void {
  record.open = open;
  if (open) activeRecords.add(record);
  else {
    activeRecords.delete(record);
    setActive(record, undefined);
  }
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  record.control.setAttribute("aria-expanded", String(open));
}

function positionCombobox(record: ComboboxRecord): void {
  const revision = record.revision;
  if (!currentOpen(record, revision)) return;
  if (record.inline) {
    record.content.style.removeProperty("left");
    record.content.style.removeProperty("top");
    record.content.style.removeProperty("min-width");
    delete record.content.dataset.side;
    delete record.content.dataset.align;
    return;
  }
  const width = record.control.getBoundingClientRect().width;
  const accepted = (): boolean => currentOpen(record, revision);
  if (!accepted()) return;
  record.content.style.minWidth = `${width}px`;
  positionFloating(
    record.root,
    record.control,
    record.content,
    {
      align: "start",
      side: "bottom",
    },
    accepted,
  );
}

function showContent(record: ComboboxRecord): void {
  if (record.inline) record.content.hidden = false;
  else showFloating(record.content);
}

function hideContent(record: ComboboxRecord): void {
  if (record.inline) record.content.hidden = true;
  else hideFloating(record.content);
}

function settleFloating(record: ComboboxRecord, opening: boolean): void {
  const latest = records.get(record.root);
  const wantsOpen = latest?.content === record.content && current(latest) && latest.open;
  if (opening && !wantsOpen) hideContent(record);
  else if (!opening && wantsOpen) showContent(latest);
}

function nativeOpen(record: ComboboxRecord): boolean | undefined {
  if (record.inline || !usesNativePopover(record.content)) return undefined;
  try {
    return record.content.matches(":popover-open");
  } catch {
    return undefined;
  }
}

function show(record: ComboboxRecord, revision: number): boolean {
  syncState(record, true);
  try {
    showContent(record);
  } catch (error) {
    if (current(record, revision)) {
      syncState(record, false);
      hideContent(record);
    }
    throw error;
  }
  if (!currentOpen(record, revision)) {
    settleFloating(record, true);
    return false;
  }
  if (nativeOpen(record) === false) {
    syncState(record, false);
    return false;
  }
  return true;
}

function openCombobox(root: HTMLElement): HTMLElement {
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
    if (other !== record && current(other)) closeCombobox(other.root, false);
    if (!accepted() || (other !== record && currentOpen(other))) return root;
  }
  filterOptions(record);
  if (!show(record, revision)) return root;
  setActive(record, initialOption(record));
  if (!accepted() || !currentOpen(record, revision)) return root;
  positionCombobox(record);
  if (!accepted() || !currentOpen(record, revision)) return root;
  record.control.focus();
  if (accepted() && currentOpen(record, revision)) emit(record, "open");
  return root;
}

function closeCombobox(root: HTMLElement, restoreFocus = true): HTMLElement {
  const record = recordFor(root);
  const revision = ++record.revision;
  if (
    !currentOpen(record, revision) ||
    !emit(record, "before-close", true) ||
    !current(record, revision)
  )
    return root;
  syncState(record, false);
  hideContent(record);
  if (!current(record, revision)) {
    settleFloating(record, false);
    return root;
  }
  if (restoreFocus && record.control.isConnected) record.control.focus();
  if (current(record, revision) && !currentOpen(record, revision)) emit(record, "close");
  return root;
}

function toggleCombobox(root: HTMLElement): HTMLElement {
  const record = recordFor(root);
  if (!current(record)) return root;
  return record.open ? closeCombobox(root) : openCombobox(root);
}

function dispatchValue(record: ComboboxRecord, revision: number): boolean {
  const query = record.control.value;
  const value = record.valueControl.value;
  nativeEvent(record, record.valueControl, "input");
  if (!unchanged(record, revision, query, value)) return false;
  nativeEvent(record, record.valueControl, "change");
  return unchanged(record, revision, query, value);
}

function dispatchQuery(record: ComboboxRecord): void {
  nativeEvent(record, record.control, "change");
}

function clearSelection(
  record: ComboboxRecord,
  clearQuery: boolean,
  notify: boolean,
  revision = ++record.revision,
): boolean {
  if (!current(record, revision) || (clearQuery && unavailable(record))) return false;
  const changed = record.value !== "";
  record.value = "";
  record.selectedLabel = undefined;
  record.valueControl.value = "";
  if (clearQuery) record.control.value = "";
  record.query = record.control.value;
  const query = record.query;
  renderSelection(record);
  if (notify && changed && !dispatchValue(record, revision)) return false;
  if (notify && clearQuery) dispatchQuery(record);
  if (!unchanged(record, revision, query, "")) return false;
  if (changed || clearQuery) emit(record, "clear");
  return unchanged(record, revision, query, "");
}

function commitOption(record: ComboboxRecord, option: HTMLElement): number | undefined {
  const revision = ++record.revision;
  if (!current(record, revision) || unavailable(record) || !selectable(option)) return undefined;
  const value = optionValue(option);
  const label = optionLabel(option);
  const previousQuery = record.control.value;
  const previousValue = record.valueControl.value;
  if (
    !emit(record, "before-select", true, option) ||
    !unchanged(record, revision, previousQuery, previousValue) ||
    unavailable(record) ||
    !selectable(option) ||
    optionFor(record, value) !== option ||
    optionLabel(option) !== label
  )
    return undefined;
  record.value = value;
  record.selectedLabel = label;
  record.valueControl.value = value;
  record.control.value = label;
  record.query = label;
  record.activeValue = value;
  renderSelection(record);
  if (!dispatchValue(record, revision)) return undefined;
  dispatchQuery(record);
  if (!unchanged(record, revision, label, value)) return undefined;
  emit(record, "select", false, option);
  return unchanged(record, revision, label, value) ? revision : undefined;
}

function moveActive(record: ComboboxRecord, offset: number): void {
  const available = visibleOptions(record);
  if (available.length === 0) return;
  const current = available.findIndex(
    (option) => option.getAttribute("data-value") === record.activeValue,
  );
  const next = current < 0 ? 0 : (current + offset + available.length) % available.length;
  setActive(record, available[next]);
}

function minimumLength(record: ComboboxRecord): number {
  const value = Number(record.root.getAttribute("data-min-length") ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function handleQuery(record: ComboboxRecord, notify: boolean, open: boolean): void {
  const revision = ++record.revision;
  record.query = record.control.value;
  const query = record.query;
  if (
    record.value &&
    query !== record.selectedLabel &&
    !clearSelection(record, false, notify, revision)
  )
    return;
  const value = record.valueControl.value;
  filterOptions(record);
  if (record.open) setActive(record, initialOption(record));
  if (!unchanged(record, revision, query, value)) return;
  if (notify) emit(record, "query");
  if (!unchanged(record, revision, query, value)) return;
  if (open) {
    if (query.length >= minimumLength(record)) openCombobox(record.root);
    else closeCombobox(record.root, false);
  }
}

function selectAndClose(record: ComboboxRecord, option: HTMLElement): void {
  const revision = commitOption(record, option);
  if (revision !== undefined && currentOpen(record, revision)) closeCombobox(record.root);
}

function keydown(record: ComboboxRecord, event: KeyboardEvent): void {
  if (
    unavailable(record) ||
    record.composing ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    record.revision += 1;
    if (record.open) moveActive(record, event.key === "ArrowDown" ? 1 : -1);
    else {
      const revision = record.revision + 1;
      openCombobox(record.root);
      if (currentOpen(record, revision) && event.key === "ArrowUp") {
        const available = visibleOptions(record);
        setActive(record, available[available.length - 1]);
      }
    }
    return;
  }
  if (event.key === "Enter" && record.open && record.activeValue !== undefined) {
    const option = optionFor(record, record.activeValue);
    if (!option) return;
    event.preventDefault();
    selectAndClose(record, option);
    return;
  }
  if (event.key === "Escape" && record.open) {
    event.preventDefault();
    closeCombobox(record.root);
    return;
  }
  if (event.key === "Tab" && record.open) closeCombobox(record.root, false);
}

function configureOptions(record: ComboboxRecord): void {
  const values = new Set<string>();
  const current = options(record);
  identifyElements(current, `${record.root.id}-option`);
  for (const option of current) {
    const value = optionValue(option);
    if (values.has(value)) {
      throw new Error(
        `Combobox #${record.root.id} needs unique option values; duplicate: "${value}".`,
      );
    }
    values.add(value);
    option.setAttribute("role", "option");
    option.tabIndex = -1;
    if (isDisabled(option)) option.setAttribute("aria-disabled", "true");
  }
  for (const part of [...ownedParts(record, "loading"), ...ownedParts(record, "empty")]) {
    part.setAttribute("role", "option");
    part.setAttribute("aria-disabled", "true");
  }
}

function wire(record: ComboboxRecord): void {
  const listen = (target: EventTarget, type: string, callback: EventListener): void =>
    listenUI(record, () => current(record), target, type, callback);
  listen(record.control, "input", (event) => {
    if (event !== record.nativeEvent) handleQuery(record, true, true);
  });
  listen(record.control, "jquery-star:model-write", () => handleQuery(record, false, false));
  listen(record.control, "keydown", (event) => keydown(record, event as KeyboardEvent));
  listen(record.control, "click", () => {
    openCombobox(record.root);
  });
  listen(record.control, "focus", () => {
    if (record.root.hasAttribute("data-open-on-focus")) openCombobox(record.root);
  });
  listen(record.control, "compositionstart", () => {
    record.composing = true;
  });
  listen(record.control, "compositionend", () => {
    record.composing = false;
  });
  const valueWrite = (event: Event): void => {
    if (event === record.nativeEvent) return;
    record.revision += 1;
    record.value = record.valueControl.value;
    const option = optionFor(record, record.value);
    record.selectedLabel = option ? optionLabel(option) : undefined;
    if (record.selectedLabel !== undefined) record.control.value = record.selectedLabel;
    record.query = record.control.value;
    renderSelection(record);
  };
  listen(record.valueControl, "change", valueWrite);
  listen(record.valueControl, "jquery-star:model-write", valueWrite);
  for (const option of record.options) {
    listen(option, "pointerdown", (event) => event.preventDefault());
    listen(option, "pointermove", () => {
      if (!record.open || unavailable(record)) return;
      record.revision += 1;
      setActive(record, option);
    });
    listen(option, "click", () => selectAndClose(record, option));
  }
  listenUIReset(
    record,
    () => current(record),
    record.form,
    () => {
      const revision = record.revision;
      record.value = record.defaultValue;
      const selected = optionFor(record, record.defaultValue);
      record.selectedLabel = selected ? optionLabel(selected) : undefined;
      record.valueControl.value = record.defaultValue;
      record.control.value = record.selectedLabel ?? record.defaultQuery;
      record.query = record.control.value;
      renderSelection(record);
      filterOptions(record);
      if (dispatchValue(record, revision)) dispatchQuery(record);
    },
  );
}

function labelCombobox(record: ComboboxRecord): void {
  identifyLabel(
    record.control,
    undefined,
    record.control.labels?.length
      ? undefined
      : record.root.getAttribute("aria-label") || record.control.name || "Search options",
  );
  identifyControlLabel(record.root, record.control, record.content, "Search options");
}

function metadata(record: ComboboxRecord): void {
  const { control, content } = record;
  control.setAttribute("role", "combobox");
  control.setAttribute("aria-autocomplete", "list");
  control.setAttribute("aria-haspopup", "listbox");
  control.setAttribute("aria-controls", content.id);
  control.setAttribute("aria-disabled", String(record.control.matches(":disabled")));
  control.autocomplete = "off";
  content.setAttribute("role", "listbox");
  labelCombobox(record);
}

function refreshOpen(record: ComboboxRecord): void {
  const revision = record.revision;
  if (!currentOpen(record, revision)) return;
  const active =
    record.activeValue === undefined ? undefined : optionFor(record, record.activeValue);
  setActive(
    record,
    active && !active.hidden && !isDisabled(active) ? active : initialOption(record),
  );
  if (!currentOpen(record, revision)) return;
  if (nativeOpen(record) === false && !show(record, revision)) return;
  if (currentOpen(record, revision)) positionCombobox(record);
}

function syncNative(record: ComboboxRecord, initial = false): boolean {
  const requested = record.root.dataset.value;
  const patched = requested !== undefined && requested !== reflected.get(record.root);
  const value = patched ? requested : record.valueControl.value;
  const selected = optionFor(record, value);
  const label = selected ? optionLabel(selected) : undefined;
  if (patched || value !== record.value || record.control.value !== record.query)
    record.revision += 1;
  if (
    label !== undefined &&
    (patched ||
      value !== record.value ||
      (initial && !record.control.value) ||
      record.control.value === record.selectedLabel)
  ) {
    if (record.control.value !== label) record.control.value = label;
  }
  record.value = value;
  record.selectedLabel = label;
  record.query = record.control.value;
  renderSelection(record);
  filterOptions(record);
  return patched;
}

function snapshot(record: ComboboxRecord, open = record.open): RetainedCombobox {
  return {
    open,
    activeValue: record.activeValue,
    composing: record.composing,
    control: record.control,
    value: record.value,
    selectedLabel: record.selectedLabel,
  };
}

function defaultFor(control: HTMLInputElement): string {
  const previous = defaults.get(control);
  if (previous !== undefined) return previous;
  defaults.set(control, control.value);
  return control.value;
}

function enhanceCombobox(root: HTMLElement): ComboboxRecord {
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
    const notify = syncNative(existing);
    if (notify) dispatchValue(existing, existing.revision);
    refreshOpen(existing);
    return existing;
  }
  const previous = existing ? snapshot(existing) : retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && !uiActive(root)) return existing;
  root.id ||= `jqs-combobox-${++comboboxId}`;
  const control = inputControl(root);
  const hidden = valueControl(root, control);
  const content = contentPart(root);
  control.id ||= `${root.id}-control`;
  hidden.id ||= `${root.id}-value`;
  content.id ||= `${root.id}-content`;
  const inline = root.hasAttribute("data-inline");
  if (inline) content.removeAttribute("popover");
  else prepareFloating(content);
  if (existing) {
    copyGeneratedAttributes(existing.control, control);
    copyGeneratedAttributes(existing.content, content);
  }
  const record: ComboboxRecord = {
    ...uiResources(root),
    activeValue:
      previous?.value === hidden.value ? previous.activeValue : hidden.value || undefined,
    form: control.form,
    valueForm: hidden.form,
    inline,
    composing: previous?.control === control && previous.composing,
    content,
    control,
    defaultQuery: defaultFor(control),
    defaultValue: defaultFor(hidden),
    open: false,
    options: [],
    optionsSignature: "",
    query: control.value,
    root,
    selectedLabel: previous?.control === control ? previous.selectedLabel : undefined,
    value: hidden.value,
    valueControl: hidden,
  };
  record.cleanups.add(() => {
    retained.set(root, snapshot(record, record.open && record.document !== root.ownerDocument));
    const wasOpen = record.open;
    activeRecords.delete(record);
    record.open = false;
    const latest = records.get(root);
    if (!latest || latest.content !== content) {
      root.dataset.state = "closed";
      content.dataset.state = "closed";
      control.setAttribute("aria-expanded", "false");
      control.removeAttribute("aria-activedescendant");
      if (wasOpen) {
        hideContent(record);
        settleFloating(record, false);
      }
    }
  });
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    if (!record.active) return record;
    configureOptions(record);
    record.options = options(record);
    record.optionsSignature = optionSignature(record);
    metadata(record);
    const notify = syncNative(record, true) && reflected.has(root) && previous !== undefined;
    const activeValue = record.activeValue;
    syncState(record, false);
    record.activeValue = activeValue;
    if (inline || !usesNativePopover(content)) content.hidden = true;
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    if (notify) dispatchValue(record, record.revision);
    const revision = record.revision;
    if (
      previous?.open &&
      current(record, revision) &&
      !unavailable(record) &&
      show(record, revision)
    )
      refreshOpen(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): ComboboxRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceCombobox(root);
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
        else if (!record.root.contains(event.target)) closeCombobox(record.root, false);
      }
    },
    true,
  );
  host.listen(
    document,
    "focusin",
    (event) => {
      if (!isNode(event.target)) return;
      for (const record of documentRecords(activeRecords, document)) {
        if (!current(record) || record.document !== document || !record.root.isConnected)
          activeRecords.delete(record);
        else if (!record.root.contains(event.target)) closeCombobox(record.root, false);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (current(record) && record.document === document && record.root.isConnected)
        positionCombobox(record);
      else activeRecords.delete(record);
    }
  };
  listenToViewportChanges(host, reposition);
}

function enhanceTree(root: ParentNode): void {
  const elements = uiElements(root, '[data-jqs="combobox"]');
  for (const element of elements) {
    const combobox = comboboxRoot(element);
    if (combobox) enhanceCombobox(combobox);
  }
}

function resolveRoot(target: ComboboxTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? comboboxRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : comboboxRoot(target);
  if (resolved) return resolved;
  throw new Error(`Combobox target did not match data-jqs="combobox": ${String(target)}`);
}

function controlledCombobox(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveRoot(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveRoot(target, context.root);
  }
  const root = context.element?.closest('[data-jqs="combobox"]') ?? null;
  const resolved = comboboxRoot(root);
  if (resolved) return resolved;
  throw new Error('Combobox action needs a selector or an element inside data-jqs="combobox".');
}

function registerActions(api: StarComboboxStatic, registerAction: ActionRegistrar): void {
  for (const operation of ["open", "close", "toggle", "clear"] as const) {
    registerAction(`ui.combobox.${operation}`, (context) => {
      const root = controlledCombobox(context, context.args?.[0]);
      return api[operation](root);
    });
  }
  registerAction("ui.combobox.select", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicitRoot =
      second !== undefined || (typeof first === "string" && first.startsWith("#"));
    const root = controlledCombobox(context, explicitRoot ? first : undefined);
    const value = explicitRoot ? second : first;
    if (typeof value !== "string") throw new Error("ui.combobox.select needs an option value.");
    return api.select(root, value);
  });
}

export function createComboboxes(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): ComboboxCollection {
  installGlobalListeners(host);
  const api: StarComboboxStatic = {
    select: (target, value) => {
      const root = resolveRoot(target);
      const record = recordFor(root);
      if (!current(record)) return root;
      const option = optionFor(record, value);
      if (!option) throw new Error(`Combobox #${root.id} has no option with value "${value}".`);
      selectAndClose(record, option);
      return root;
    },
    clear: (target) => {
      const root = resolveRoot(target);
      clearSelection(recordFor(root), true, true);
      return root;
    },
    open: (target) => openCombobox(resolveRoot(target)),
    close: (target) => closeCombobox(resolveRoot(target)),
    toggle: (target) => toggleCombobox(resolveRoot(target)),
    value: (target) => {
      const root = resolveRoot(target);
      return recordFor(root).value;
    },
    query: (target) => {
      const root = resolveRoot(target);
      return recordFor(root).control.value;
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}
