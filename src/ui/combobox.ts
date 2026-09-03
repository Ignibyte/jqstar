import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { ComboboxTarget, StarComboboxStatic, StarContext } from "../types";
import {
  documentRecordCleanup,
  documentRecords,
  hideFloating,
  listenToViewportChanges,
  positionFloating,
  prepareFloating,
  showFloating,
  usesNativePopover,
} from "./floating";

interface ComboboxRecord {
  activeValue: string | undefined;
  cleanups: Array<() => void>;
  committing: boolean;
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
let comboboxId = 0;

function comboboxRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="combobox"]') ? value : undefined;
}

function directPart(
  root: HTMLElement,
  part: "control" | "value" | "content",
): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === part,
  );
}

function inputControl(root: HTMLElement): HTMLInputElement {
  const control = directPart(root, "control");
  if (!(control instanceof HTMLInputElement) || control.type === "hidden") {
    throw new Error(`Combobox #${root.id} needs a direct text <input data-part="control">.`);
  }
  return control;
}

function valueControl(root: HTMLElement, control: HTMLInputElement): HTMLInputElement {
  const existing = directPart(root, "value");
  if (existing) {
    if (!(existing instanceof HTMLInputElement) || existing.type !== "hidden") {
      throw new Error(`Combobox #${root.id} data-part="value" must be a hidden input.`);
    }
    return existing;
  }
  const hidden = document.createElement("input");
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
    (element) => element.closest('[data-jqs="combobox"]') === record.root,
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
  return options(record).filter((option) => !option.hidden && !isDisabled(option));
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
    new CustomEvent(`jquery-star:combobox:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
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
  if (open) {
    for (const other of [...activeRecords]) {
      if (other !== record) closeCombobox(other.root, false);
    }
    activeRecords.delete(record);
    activeRecords.add(record);
  } else {
    activeRecords.delete(record);
    setActive(record, undefined);
  }
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  record.control.setAttribute("aria-expanded", String(open));
}

function positionCombobox(record: ComboboxRecord): void {
  if (record.root.hasAttribute("data-inline")) {
    record.content.style.removeProperty("left");
    record.content.style.removeProperty("top");
    record.content.style.removeProperty("min-width");
    delete record.content.dataset.side;
    delete record.content.dataset.align;
    return;
  }
  record.content.style.minWidth = `${record.control.getBoundingClientRect().width}px`;
  positionFloating(record.root, record.control, record.content, {
    align: "start",
    side: "bottom",
  });
}

function showContent(record: ComboboxRecord): void {
  if (record.root.hasAttribute("data-inline")) record.content.hidden = false;
  else showFloating(record.content);
}

function hideContent(record: ComboboxRecord): void {
  if (record.root.hasAttribute("data-inline")) record.content.hidden = true;
  else hideFloating(record.content);
}

function openCombobox(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceCombobox(root);
  if (record.open || record.control.disabled || !emit(record, "before-open", true)) return root;
  filterOptions(record);
  showContent(record);
  syncState(record, true);
  setActive(record, initialOption(record));
  positionCombobox(record);
  record.control.focus();
  emit(record, "open");
  return root;
}

function closeCombobox(root: HTMLElement, restoreFocus = true): HTMLElement {
  const record = records.get(root) ?? enhanceCombobox(root);
  if (!record.open || !emit(record, "before-close", true)) return root;
  hideContent(record);
  syncState(record, false);
  if (restoreFocus && record.control.isConnected) record.control.focus();
  emit(record, "close");
  return root;
}

function toggleCombobox(root: HTMLElement): HTMLElement {
  return (records.get(root) ?? enhanceCombobox(root)).open
    ? closeCombobox(root)
    : openCombobox(root);
}

function dispatchValue(record: ComboboxRecord): void {
  record.valueControl.dispatchEvent(new Event("input", { bubbles: true }));
  record.valueControl.dispatchEvent(new Event("change", { bubbles: true }));
}

function dispatchQuery(record: ComboboxRecord): void {
  record.control.dispatchEvent(new Event("change", { bubbles: true }));
}

function clearSelection(record: ComboboxRecord, clearQuery: boolean, notify: boolean): void {
  const changed = record.value !== "";
  record.committing = true;
  record.value = "";
  record.selectedLabel = undefined;
  record.valueControl.value = "";
  if (clearQuery) record.control.value = "";
  renderSelection(record);
  if (notify && changed) dispatchValue(record);
  if (notify && clearQuery) dispatchQuery(record);
  record.committing = false;
  if (changed || clearQuery) emit(record, "clear");
}

function commitOption(record: ComboboxRecord, option: HTMLElement): boolean {
  if (option.hidden || isDisabled(option) || !emit(record, "before-select", true, option)) {
    return false;
  }
  const value = optionValue(option);
  const label = optionLabel(option);
  record.committing = true;
  record.value = value;
  record.selectedLabel = label;
  record.valueControl.value = value;
  record.control.value = label;
  record.activeValue = value;
  renderSelection(record);
  dispatchValue(record);
  dispatchQuery(record);
  record.committing = false;
  emit(record, "select", false, option);
  return true;
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
  if (record.committing) return;
  if (record.value && record.control.value !== record.selectedLabel) {
    clearSelection(record, false, notify);
  }
  filterOptions(record);
  if (record.open) setActive(record, initialOption(record));
  if (notify) emit(record, "query");
  if (open) {
    if (record.control.value.length >= minimumLength(record)) openCombobox(record.root);
    else closeCombobox(record.root, false);
  }
}

function keydown(record: ComboboxRecord, event: KeyboardEvent): void {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (record.open) moveActive(record, 1);
    else openCombobox(record.root);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (record.open) moveActive(record, -1);
    else {
      openCombobox(record.root);
      const available = visibleOptions(record);
      setActive(record, available[available.length - 1]);
    }
    return;
  }
  if (event.key === "Enter" && record.open && record.activeValue !== undefined) {
    const option = optionFor(record, record.activeValue);
    if (!option) return;
    event.preventDefault();
    if (commitOption(record, option)) closeCombobox(record.root);
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
  let index = 0;
  for (const option of options(record)) {
    const value = optionValue(option);
    if (values.has(value)) {
      throw new Error(
        `Combobox #${record.root.id} needs unique option values; duplicate: "${value}".`,
      );
    }
    values.add(value);
    option.id ||= `${record.root.id}-option-${index++}`;
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
  const input = (): void => handleQuery(record, true, true);
  const modelWrite = (): void => handleQuery(record, false, false);
  const key = (event: KeyboardEvent): void => keydown(record, event);
  const click = (): void => {
    openCombobox(record.root);
  };
  const focus = (): void => {
    if (record.root.hasAttribute("data-open-on-focus")) openCombobox(record.root);
  };
  record.control.addEventListener("input", input);
  record.control.addEventListener("jquery-star:model-write", modelWrite);
  record.control.addEventListener("keydown", key);
  record.control.addEventListener("click", click);
  record.control.addEventListener("focus", focus);
  record.cleanups.push(
    () => record.control.removeEventListener("input", input),
    () => record.control.removeEventListener("jquery-star:model-write", modelWrite),
    () => record.control.removeEventListener("keydown", key),
    () => record.control.removeEventListener("click", click),
    () => record.control.removeEventListener("focus", focus),
  );

  const valueWrite = (): void => {
    if (record.committing) return;
    const value = record.valueControl.value;
    const option = optionFor(record, value);
    record.value = value;
    record.selectedLabel = option ? optionLabel(option) : undefined;
    if (record.selectedLabel !== undefined) record.control.value = record.selectedLabel;
    renderSelection(record);
  };
  record.valueControl.addEventListener("change", valueWrite);
  record.valueControl.addEventListener("jquery-star:model-write", valueWrite);
  record.cleanups.push(
    () => record.valueControl.removeEventListener("change", valueWrite),
    () => record.valueControl.removeEventListener("jquery-star:model-write", valueWrite),
  );

  const reset = (): void => {
    const applyDefaults = (): void => {
      record.value = record.defaultValue;
      const selected = optionFor(record, record.defaultValue);
      record.selectedLabel = selected ? optionLabel(selected) : undefined;
      record.valueControl.value = record.defaultValue;
      record.control.value = record.selectedLabel ?? record.defaultQuery;
      renderSelection(record);
      filterOptions(record);
    };
    record.committing = true;
    applyDefaults();
    record.committing = false;
    window.setTimeout(() => {
      record.committing = true;
      applyDefaults();
      dispatchValue(record);
      dispatchQuery(record);
      record.committing = false;
    }, 0);
  };
  record.control.form?.addEventListener("reset", reset);
  if (record.control.form) {
    const form = record.control.form;
    record.cleanups.push(() => form.removeEventListener("reset", reset));
  }

  for (const option of options(record)) {
    const pointerDown = (event: PointerEvent): void => event.preventDefault();
    const pointerMove = (): void => setActive(record, option);
    const optionClick = (): void => {
      if (commitOption(record, option)) closeCombobox(record.root);
    };
    option.addEventListener("pointerdown", pointerDown);
    option.addEventListener("pointermove", pointerMove);
    option.addEventListener("click", optionClick);
    record.cleanups.push(
      () => option.removeEventListener("pointerdown", pointerDown),
      () => option.removeEventListener("pointermove", pointerMove),
      () => option.removeEventListener("click", optionClick),
    );
  }
}

function labelCombobox(record: ComboboxRecord): void {
  const label = record.control.labels?.[0];
  const labelledBy = record.control.getAttribute("aria-labelledby");
  const ariaLabel =
    record.control.getAttribute("aria-label") || record.root.getAttribute("aria-label");
  if (label) {
    label.id ||= `${record.root.id}-label`;
    record.content.setAttribute("aria-labelledby", label.id);
  } else if (labelledBy) {
    record.content.setAttribute("aria-labelledby", labelledBy);
  } else if (ariaLabel) {
    record.content.setAttribute("aria-label", ariaLabel);
  } else {
    record.control.setAttribute("aria-label", record.control.name || "Search options");
    record.content.setAttribute("aria-label", record.control.name || "Search options");
  }
}

function enhanceCombobox(root: HTMLElement): ComboboxRecord {
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

  let record = records.get(root);
  let notifyExternalValue = false;
  if (!record) {
    const requested = root.getAttribute("data-value") ?? hidden.value;
    const selected = Array.from(content.querySelectorAll<HTMLElement>('[data-part="option"]')).find(
      (option) => option.getAttribute("data-value") === requested,
    );
    record = {
      activeValue: requested || undefined,
      cleanups: [],
      committing: false,
      content,
      control,
      defaultQuery: control.value,
      defaultValue: hidden.value,
      open: false,
      root,
      selectedLabel: selected ? optionLabel(selected) : undefined,
      value: requested,
      valueControl: hidden,
    };
    if (!control.value && record.selectedLabel !== undefined) control.value = record.selectedLabel;
    records.set(root, record);
    if (inline || !usesNativePopover(content)) content.hidden = true;
  } else {
    const contentChanged = record.content !== content;
    const controlChanged = record.control !== control;
    const valueControlChanged = record.valueControl !== hidden;
    if (contentChanged && record.open) hideContent(record);
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.control = control;
    record.valueControl = hidden;
    record.content = content;
    if (controlChanged) record.defaultQuery = control.value;
    if (valueControlChanged) record.defaultValue = hidden.value;
    const requested = root.getAttribute("data-value");
    if (requested !== null && requested !== record.value) {
      record.value = requested;
      hidden.value = requested;
      const selected = optionFor(record, requested);
      record.selectedLabel = selected ? optionLabel(selected) : undefined;
      if (record.selectedLabel !== undefined) control.value = record.selectedLabel;
      notifyExternalValue = true;
    } else {
      const selected = optionFor(record, record.value);
      if (selected && control.value === record.selectedLabel) control.value = optionLabel(selected);
      record.selectedLabel = selected ? optionLabel(selected) : undefined;
    }
    if (inline || !usesNativePopover(content)) content.hidden = !record.open;
    if (contentChanged && record.open) showContent(record);
  }

  control.setAttribute("role", "combobox");
  control.setAttribute("aria-autocomplete", "list");
  control.setAttribute("aria-haspopup", "listbox");
  control.setAttribute("aria-controls", content.id);
  control.setAttribute("aria-disabled", String(control.disabled));
  control.autocomplete = "off";
  content.setAttribute("role", "listbox");
  labelCombobox(record);
  configureOptions(record);
  filterOptions(record);
  renderSelection(record);
  syncState(record, record.open);
  if (record.open) {
    setActive(record, initialOption(record));
    positionCombobox(record);
  }
  wire(record);
  if (notifyExternalValue) dispatchValue(record);
  return record;
}

function installGlobalListeners(host: DocumentHost): void {
  const { document } = host;
  host.listen(
    document,
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) return;
      for (const record of documentRecords(activeRecords, document)) {
        if (!record.root.isConnected) activeRecords.delete(record);
        else if (!record.root.contains(event.target)) closeCombobox(record.root, false);
      }
    },
    true,
  );
  host.listen(
    document,
    "focusin",
    (event) => {
      if (!(event.target instanceof Node)) return;
      for (const record of documentRecords(activeRecords, document)) {
        if (!record.root.contains(event.target)) closeCombobox(record.root, false);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (record.root.isConnected) positionCombobox(record);
      else activeRecords.delete(record);
    }
  };
  listenToViewportChanges(host, reposition);
  host.own("service", "ui:combobox:active-records", documentRecordCleanup(activeRecords, document));
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="combobox"]')));
  for (const element of elements) {
    const combobox = comboboxRoot(element);
    if (combobox) enhanceCombobox(combobox);
  }
}

function resolveRoot(target: ComboboxTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? comboboxRoot(root.querySelector(target)) : comboboxRoot(target);
  if (resolved) return resolved;
  throw new Error(`Combobox target did not match data-jqs="combobox": ${String(target)}`);
}

function controlledCombobox(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="combobox"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
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
      const record = records.get(root) ?? enhanceCombobox(root);
      const option = optionFor(record, value);
      if (!option) throw new Error(`Combobox #${root.id} has no option with value "${value}".`);
      if (commitOption(record, option) && record.open) closeCombobox(root);
      return root;
    },
    clear: (target) => {
      const root = resolveRoot(target);
      clearSelection(records.get(root) ?? enhanceCombobox(root), true, true);
      return root;
    },
    open: (target) => openCombobox(resolveRoot(target)),
    close: (target) => closeCombobox(resolveRoot(target)),
    toggle: (target) => toggleCombobox(resolveRoot(target)),
    value: (target) => {
      const root = resolveRoot(target);
      return (records.get(root) ?? enhanceCombobox(root)).value;
    },
    query: (target) => {
      const root = resolveRoot(target);
      return (records.get(root) ?? enhanceCombobox(root)).control.value;
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}
