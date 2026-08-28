import { registerAction } from "../registry";
import type { SelectTarget, StarContext, StarSelectStatic } from "../types";
import {
  hideFloating,
  positionFloating,
  prepareFloating,
  showFloating,
  usesNativePopover,
} from "./floating";

interface SelectRecord {
  activeValue: string | undefined;
  cleanups: Array<() => void>;
  committing: boolean;
  content: HTMLElement;
  control: HTMLSelectElement;
  open: boolean;
  optionsSignature: string;
  root: HTMLElement;
  search: string;
  searchTimer: number | undefined;
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
let selectId = 0;
let globalListenersInstalled = false;

function selectRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="select"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLSelectElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLSelectElement =>
      child instanceof HTMLSelectElement && child.getAttribute("data-part") === "control",
  );
  if (!control) throw new Error(`Select #${root.id} needs a direct <select data-part="control">.`);
  if (control.multiple)
    throw new Error("jQuery Star Select is single-value; use Listbox for multiple selection.");
  return control;
}

function directPart(root: HTMLElement, part: "trigger" | "content"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === part,
  );
}

function createTrigger(root: HTMLElement): HTMLElement {
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.dataset.part = "trigger";
  trigger.dataset.generated = "";
  const value = document.createElement("span");
  value.dataset.part = "value";
  const indicator = document.createElement("span");
  indicator.dataset.part = "indicator";
  indicator.setAttribute("aria-hidden", "true");
  indicator.textContent = "⌄";
  trigger.append(value, indicator);
  root.append(trigger);
  return trigger;
}

function createContent(root: HTMLElement): HTMLElement {
  const content = document.createElement("div");
  content.dataset.part = "content";
  content.dataset.generated = "";
  root.append(content);
  return content;
}

function valuePart(trigger: HTMLElement): HTMLElement {
  let value = trigger.querySelector<HTMLElement>('[data-part="value"]');
  if (!value) {
    value = document.createElement("span");
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
    (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled)
  );
}

function createOption(root: HTMLElement, option: HTMLOptionElement, index: number): HTMLElement {
  const item = document.createElement("div");
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
      if (child instanceof HTMLOptionElement) {
        return ["option", child.value, child.label, isDisabled(child)];
      }
      if (child instanceof HTMLOptGroupElement) {
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
    if (child instanceof HTMLOptionElement) {
      content.append(createOption(root, child, index++));
      continue;
    }
    if (!(child instanceof HTMLOptGroupElement)) continue;
    const group = document.createElement("div");
    group.dataset.part = "group";
    group.setAttribute("role", "group");
    const label = document.createElement("div");
    label.id = `${root.id}-group-${index}`;
    label.dataset.part = "label";
    label.textContent = child.label;
    group.setAttribute("aria-labelledby", label.id);
    group.append(label);
    for (const option of Array.from(child.children)) {
      if (option instanceof HTMLOptionElement) group.append(createOption(root, option, index++));
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
    new CustomEvent(`jquery-star:select:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function clearSearch(record: SelectRecord): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.searchTimer = undefined;
  record.search = "";
}

function renderValue(record: SelectRecord): void {
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
  if (selected?.getAttribute("aria-disabled") !== "true") return record.value;
  return enabledOptions(record)[0]?.dataset.value;
}

function syncState(record: SelectRecord, open: boolean): void {
  record.open = open;
  if (open) {
    for (const other of [...activeRecords]) {
      if (other !== record) closeSelect(other.root, false, false);
    }
    activeRecords.delete(record);
    activeRecords.add(record);
  } else {
    activeRecords.delete(record);
    clearSearch(record);
  }
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(open));
  if (!open) record.trigger.removeAttribute("aria-activedescendant");
}

function openSelect(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceSelect(root);
  if (record.open || record.control.disabled || !emit(record, "before-open", true)) return root;
  showFloating(record.content);
  syncState(record, true);
  setActive(record, initialActive(record));
  positionSelect(record);
  record.trigger.focus();
  emit(record, "open");
  return root;
}

function commitValue(record: SelectRecord, value: string): boolean {
  const option = nativeOption(record, value);
  if (!option || isDisabled(option)) return false;
  const previousValue = record.value;
  if (previousValue === value) return true;
  if (!emit(record, "before-change", true, value, previousValue)) return false;
  record.committing = true;
  record.control.value = value;
  record.value = value;
  record.activeValue = value;
  renderValue(record);
  record.control.dispatchEvent(new Event("input", { bubbles: true }));
  record.control.dispatchEvent(new Event("change", { bubbles: true }));
  record.committing = false;
  emit(record, "change", false, value, previousValue);
  return true;
}

function closeSelect(root: HTMLElement, commit = false, restoreFocus = true): HTMLElement {
  const record = records.get(root) ?? enhanceSelect(root);
  if (!record.open) return root;
  if (commit && record.activeValue !== undefined && !commitValue(record, record.activeValue))
    return root;
  if (!emit(record, "before-close", true)) return root;
  hideFloating(record.content);
  syncState(record, false);
  record.activeValue = record.value;
  if (restoreFocus && record.trigger.isConnected) record.trigger.focus();
  emit(record, "close");
  return root;
}

function toggleSelect(root: HTMLElement): HTMLElement {
  return (records.get(root) ?? enhanceSelect(root)).open ? closeSelect(root) : openSelect(root);
}

function moveActive(record: SelectRecord, offset: number): void {
  const options = enabledOptions(record);
  if (options.length === 0) return;
  const current = options.findIndex((option) => option.dataset.value === record.activeValue);
  const next = current < 0 ? 0 : (current + offset + options.length) % options.length;
  setActive(record, options[next]?.dataset.value);
}

function typeahead(record: SelectRecord, key: string): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.search += key.toLocaleLowerCase();
  record.searchTimer = window.setTimeout(() => clearSearch(record), 500);
  const options = enabledOptions(record);
  const current = options.findIndex((option) => option.dataset.value === record.activeValue);
  const ordered = [...options.slice(current + 1), ...options.slice(0, current + 1)];
  const match = ordered.find((option) =>
    option.textContent?.trim().toLocaleLowerCase().startsWith(record.search),
  );
  if (match) setActive(record, match.dataset.value);
}

function triggerKeydown(record: SelectRecord, event: KeyboardEvent): void {
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
    else moveActive(record, event.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    if (!record.open) openSelect(record.root);
    const options = enabledOptions(record);
    setActive(
      record,
      (event.key === "Home" ? options[0] : options[options.length - 1])?.dataset.value,
    );
    return;
  }
  if (event.key.length === 1 && /\S/.test(event.key)) {
    if (!record.open) openSelect(record.root);
    typeahead(record, event.key);
  }
}

function syncFromControl(record: SelectRecord, emitChange: boolean): void {
  const previousValue = record.value;
  record.value = record.control.value;
  record.activeValue = record.value;
  renderValue(record);
  if (emitChange && previousValue !== record.value) {
    emit(record, "change", false, record.value, previousValue);
  }
}

function labelFor(control: HTMLSelectElement): HTMLLabelElement | undefined {
  return control.labels?.[0] ?? undefined;
}

function labelTrigger(root: HTMLElement, control: HTMLSelectElement, trigger: HTMLElement): void {
  const labelledBy = control.getAttribute("aria-labelledby");
  const ariaLabel = control.getAttribute("aria-label") || root.getAttribute("aria-label");
  const label = labelFor(control);
  if (label) {
    label.id ||= `${root.id}-label`;
    trigger.setAttribute("aria-labelledby", label.id);
  } else if (labelledBy) {
    trigger.setAttribute("aria-labelledby", labelledBy);
  } else {
    trigger.setAttribute("aria-label", ariaLabel || control.name || "Select");
  }
}

function hasClickAction(trigger: HTMLElement): boolean {
  return Array.from(trigger.attributes).some((attribute) => attribute.name === "data-on:click");
}

function wire(record: SelectRecord): void {
  const click = (): void => {
    toggleSelect(record.root);
  };
  const keydown = (event: KeyboardEvent): void => triggerKeydown(record, event);
  if (!hasClickAction(record.trigger)) {
    record.trigger.addEventListener("click", click);
    record.cleanups.push(() => record.trigger.removeEventListener("click", click));
  }
  record.trigger.addEventListener("keydown", keydown);
  record.cleanups.push(() => record.trigger.removeEventListener("keydown", keydown));

  const controlChange = (): void => {
    if (!record.committing) syncFromControl(record, true);
  };
  record.control.addEventListener("change", controlChange);
  record.control.addEventListener("jquery-star:model-write", controlChange);
  record.cleanups.push(
    () => record.control.removeEventListener("change", controlChange),
    () => record.control.removeEventListener("jquery-star:model-write", controlChange),
  );

  const reset = (): void => {
    window.setTimeout(() => {
      syncFromControl(record, true);
      record.control.dispatchEvent(new Event("input", { bubbles: true }));
    }, 0);
  };
  record.control.form?.addEventListener("reset", reset);
  if (record.control.form) {
    const form = record.control.form;
    record.cleanups.push(() => form.removeEventListener("reset", reset));
  }

  const label = labelFor(record.control);
  if (label) {
    const labelClick = (event: MouseEvent): void => {
      event.preventDefault();
      record.trigger.focus();
    };
    label.addEventListener("click", labelClick);
    record.cleanups.push(() => label.removeEventListener("click", labelClick));
  }

  for (const option of optionElements(record)) {
    const optionClick = (): void => {
      const value = option.dataset.value;
      if (value !== undefined && commitValue(record, value)) closeSelect(record.root);
    };
    const pointerMove = (): void => setActive(record, option.dataset.value);
    option.addEventListener("click", optionClick);
    option.addEventListener("pointermove", pointerMove);
    record.cleanups.push(
      () => option.removeEventListener("click", optionClick),
      () => option.removeEventListener("pointermove", pointerMove),
    );
  }
}

function enhanceSelect(root: HTMLElement): SelectRecord {
  root.id ||= `jqs-select-${++selectId}`;
  const control = directControl(root);
  control.id ||= `${root.id}-control`;
  const trigger = directPart(root, "trigger") ?? createTrigger(root);
  const content = directPart(root, "content") ?? createContent(root);
  trigger.id ||= `${root.id}-trigger`;
  content.id ||= `${root.id}-content`;
  prepareFloating(content);
  let record = records.get(root);
  const signature = optionSignature(control);
  if (!record || record.content !== content || record.optionsSignature !== signature) {
    rebuildOptions(root, control, content);
  }
  control.dataset.enhanced = "true";
  control.setAttribute("aria-hidden", "true");
  control.hidden = true;
  control.tabIndex = -1;
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-controls", content.id);
  trigger.setAttribute("aria-disabled", String(control.disabled));
  if (trigger instanceof HTMLButtonElement) trigger.disabled = control.disabled;
  else if (!trigger.hasAttribute("tabindex")) trigger.tabIndex = 0;
  content.setAttribute("role", "listbox");
  labelTrigger(root, control, trigger);
  const labelledBy = trigger.getAttribute("aria-labelledby");
  const ariaLabel = trigger.getAttribute("aria-label");
  if (labelledBy) content.setAttribute("aria-labelledby", labelledBy);
  else if (ariaLabel) content.setAttribute("aria-label", ariaLabel);
  else content.setAttribute("aria-labelledby", trigger.id);

  let notifyValueWrite = false;
  if (!record) {
    const requested = root.getAttribute("data-value");
    if (
      requested !== null &&
      Array.from(control.options).some((option) => option.value === requested)
    ) {
      control.value = requested;
    }
    record = {
      activeValue: control.value,
      cleanups: [],
      committing: false,
      content,
      control,
      open: false,
      optionsSignature: signature,
      root,
      search: "",
      searchTimer: undefined,
      trigger,
      value: control.value,
    };
    records.set(root, record);
    if (!usesNativePopover(content)) content.hidden = true;
  } else {
    const contentChanged = record.content !== content;
    if (contentChanged && record.open) hideFloating(record.content);
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.control = control;
    record.trigger = trigger;
    record.content = content;
    record.optionsSignature = signature;
    const requested = root.getAttribute("data-value");
    if (
      requested !== null &&
      requested !== record.value &&
      Array.from(control.options).some((option) => option.value === requested)
    ) {
      control.value = requested;
      notifyValueWrite = true;
    }
    record.value = control.value;
    record.activeValue = record.value;
    if (!usesNativePopover(content)) content.hidden = !record.open;
    if (contentChanged && record.open) showFloating(content);
  }

  renderValue(record);
  syncState(record, record.open);
  wire(record);
  if (notifyValueWrite) control.dispatchEvent(new Event("input", { bubbles: true }));
  installGlobalListeners();
  if (record.open) {
    setActive(record, record.activeValue ?? initialActive(record));
    positionSelect(record);
  }
  return record;
}

function positionSelect(record: SelectRecord): void {
  record.content.style.minWidth = `${record.trigger.getBoundingClientRect().width}px`;
  positionFloating(record.root, record.trigger, record.content, {
    align: "start",
    side: "bottom",
  });
}

function installGlobalListeners(): void {
  if (globalListenersInstalled || typeof document === "undefined") return;
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) return;
      for (const record of [...activeRecords]) {
        if (!record.root.isConnected) activeRecords.delete(record);
        else if (!record.root.contains(event.target)) closeSelect(record.root, false, false);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of [...activeRecords]) {
      if (record.root.isConnected) {
        positionSelect(record);
      } else {
        activeRecords.delete(record);
      }
    }
  };
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  globalListenersInstalled = true;
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="select"]')));
  for (const element of elements) {
    const select = selectRoot(element);
    if (select) enhanceSelect(select);
  }
}

function resolveRoot(target: SelectTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? selectRoot(root.querySelector(target)) : selectRoot(target);
  if (resolved) return resolved;
  throw new Error(`Select target did not match data-jqs="select": ${String(target)}`);
}

function controlledSelect(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="select"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
  }
  const root = context.element?.closest('[data-jqs="select"]') ?? null;
  const resolved = selectRoot(root);
  if (resolved) return resolved;
  throw new Error('Select action needs a selector or an element inside data-jqs="select".');
}

function registerActions(api: StarSelectStatic): void {
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

export function createSelects(): SelectCollection {
  const api: StarSelectStatic = {
    select: (target, value) => {
      const root = resolveRoot(target);
      const record = records.get(root) ?? enhanceSelect(root);
      if (commitValue(record, value) && record.open) closeSelect(root);
      return root;
    },
    open: (target) => openSelect(resolveRoot(target)),
    close: (target) => closeSelect(resolveRoot(target)),
    toggle: (target) => toggleSelect(resolveRoot(target)),
    value: (target) => {
      const root = resolveRoot(target);
      return (records.get(root) ?? enhanceSelect(root)).value;
    },
  };
  registerActions(api);
  return { api, enhance: enhanceTree };
}
