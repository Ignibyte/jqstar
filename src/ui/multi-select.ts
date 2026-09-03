import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { MultiSelectTarget, StarContext, StarMultiSelectStatic } from "../types";
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

interface MultiSelectRecord {
  activeValue: string | undefined;
  cleanups: Array<() => void>;
  committing: boolean;
  content: HTMLElement;
  control: HTMLSelectElement;
  lastValue: string;
  open: boolean;
  optionsSignature: string;
  root: HTMLElement;
  search: string;
  searchTimer: number | undefined;
  tagSignature: string;
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
let multiSelectId = 0;

function multiSelectRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="multi-select"]')
    ? value
    : undefined;
}

function directControl(root: HTMLElement): HTMLSelectElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLSelectElement =>
      child instanceof HTMLSelectElement && child.dataset.part === "control",
  );
  if (!control)
    throw new Error(`Multi Select #${root.id} needs a direct select[data-part="control"].`);
  if (!control.multiple)
    throw new Error(`Multi Select #${root.id} control needs the multiple attribute.`);
  return control;
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
  );
}

function createTrigger(root: HTMLElement): HTMLButtonElement {
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

function createPart(root: HTMLElement, part: "content" | "tags" | "status"): HTMLElement {
  const element = document.createElement(part === "tags" ? "div" : part === "status" ? "p" : "div");
  element.dataset.part = part;
  element.dataset.generated = "";
  root.append(element);
  return element;
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

function disabled(option: HTMLOptionElement): boolean {
  return option.disabled || option.parentElement?.getAttribute("disabled") !== null;
}

function selectedValues(control: HTMLSelectElement): string[] {
  return Array.from(control.options)
    .filter((option) => option.selected)
    .map((option) => option.value);
}

function optionSignature(control: HTMLSelectElement): string {
  return JSON.stringify(
    Array.from(control.options).map((option) => [
      option.value,
      option.label,
      disabled(option),
      option.parentElement instanceof HTMLOptGroupElement ? option.parentElement.label : "",
    ]),
  );
}

function optionElements(record: MultiSelectRecord): HTMLElement[] {
  return Array.from(record.content.querySelectorAll<HTMLElement>('[data-part="option"]'));
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
  const item = document.createElement("div");
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
    if (child instanceof HTMLOptionElement) {
      record.content.append(createOption(record.root, child, index++));
      continue;
    }
    if (!(child instanceof HTMLOptGroupElement)) continue;
    const group = document.createElement("div");
    group.dataset.part = "group";
    group.setAttribute("role", "group");
    const label = document.createElement("div");
    label.id = `${record.root.id}-group-${index + 1}`;
    label.dataset.part = "label";
    label.textContent = child.label;
    group.setAttribute("aria-labelledby", label.id);
    group.append(label);
    for (const option of Array.from(child.children)) {
      if (option instanceof HTMLOptionElement)
        group.append(createOption(record.root, option, index++));
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
    new CustomEvent(`jquery-star:multi-select:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
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
  const signature = JSON.stringify(record.values);
  if (record.tagSignature === signature) return;
  record.tagSignature = signature;
  record.tags.replaceChildren();
  for (const value of record.values) {
    const option = nativeOption(record, value);
    if (!option) continue;
    const tag = document.createElement("span");
    tag.dataset.part = "tag";
    tag.dataset.value = value;
    tag.textContent = option.label;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.part = "remove";
    remove.dataset.value = value;
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${option.label}`);
    remove.disabled = record.control.disabled;
    tag.append(remove);
    record.tags.append(tag);
  }
}

function render(record: MultiSelectRecord): void {
  record.values = selectedValues(record.control);
  const serialized = JSON.stringify(record.values);
  record.lastValue = serialized;
  if (record.root.dataset.value !== serialized) record.root.dataset.value = serialized;
  record.root.dataset.state = record.open ? "open" : record.values.length ? "selected" : "empty";
  record.trigger.setAttribute("aria-expanded", String(record.open));
  const triggerDisabled = record.control.disabled;
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

function syncOpen(record: MultiSelectRecord, open: boolean): void {
  record.open = open;
  record.root.dataset.state = open ? "open" : record.values.length ? "selected" : "empty";
  record.content.dataset.state = open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(open));
  if (open) activeRecords.add(record);
  else {
    activeRecords.delete(record);
    record.content.removeAttribute("aria-activedescendant");
    if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
    record.searchTimer = undefined;
    record.search = "";
  }
}

function openMultiSelect(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceMultiSelect(root);
  if (
    record.open ||
    record.control.disabled ||
    !emit(record, "before-open", record.values, record.values, true)
  )
    return root;
  for (const other of [...activeRecords]) if (other !== record) closeMultiSelect(other.root, false);
  showFloating(record.content);
  syncOpen(record, true);
  const active =
    record.values.find((value) => !disabled(nativeOption(record, value)!)) ??
    enabledOptions(record)[0]?.dataset.value;
  setActive(record, active);
  position(record);
  record.content.focus();
  emit(record, "open");
  return root;
}

function closeMultiSelect(root: HTMLElement, restoreFocus = true): HTMLElement {
  const record = records.get(root) ?? enhanceMultiSelect(root);
  if (!record.open || !emit(record, "before-close", record.values, record.values, true))
    return root;
  hideFloating(record.content);
  syncOpen(record, false);
  if (restoreFocus && record.trigger.isConnected) record.trigger.focus();
  emit(record, "close");
  return root;
}

function commit(record: MultiSelectRecord, values: readonly string[]): HTMLElement {
  const allowed = new Set(
    Array.from(record.control.options)
      .filter((option) => !disabled(option))
      .map((option) => option.value),
  );
  const requested = [...new Set(values)].filter((value) => allowed.has(value));
  if (requested.length > maxSelections(record)) {
    status(record, `Choose no more than ${maxSelections(record)} options.`);
    return record.root;
  }
  const ordered = Array.from(record.control.options)
    .filter((option) => requested.includes(option.value))
    .map((option) => option.value);
  const previousValue = [...record.values];
  if (JSON.stringify(ordered) === JSON.stringify(previousValue)) return record.root;
  if (!emit(record, "before-change", ordered, previousValue, true)) return record.root;
  record.committing = true;
  for (const option of Array.from(record.control.options))
    option.selected = ordered.includes(option.value);
  render(record);
  record.control.dispatchEvent(new Event("input", { bubbles: true }));
  record.control.dispatchEvent(new Event("change", { bubbles: true }));
  record.committing = false;
  status(
    record,
    `${record.values.length} option${record.values.length === 1 ? "" : "s"} selected.`,
  );
  emit(record, "change", record.values, previousValue);
  return record.root;
}

function toggleValue(record: MultiSelectRecord, value: string): HTMLElement {
  const values = record.values.includes(value)
    ? record.values.filter((candidate) => candidate !== value)
    : [...record.values, value];
  return commit(record, values);
}

function moveActive(record: MultiSelectRecord, offset: number): void {
  const options = enabledOptions(record);
  if (!options.length) return;
  const current = options.findIndex((option) => option.dataset.value === record.activeValue);
  const index = current < 0 ? 0 : (current + offset + options.length) % options.length;
  setActive(record, options[index]?.dataset.value);
}

function typeahead(record: MultiSelectRecord, key: string): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.search += key.toLocaleLowerCase();
  record.searchTimer = window.setTimeout(() => {
    record.search = "";
    record.searchTimer = undefined;
  }, 500);
  const options = enabledOptions(record);
  const current = options.findIndex((option) => option.dataset.value === record.activeValue);
  const ordered = [...options.slice(current + 1), ...options.slice(0, current + 1)];
  const match = ordered.find((option) =>
    option.textContent?.trim().toLocaleLowerCase().startsWith(record.search),
  );
  if (match) setActive(record, match.dataset.value);
}

function listboxKeydown(record: MultiSelectRecord, event: KeyboardEvent): void {
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
    commit(
      record,
      record.values.length === Math.min(available.length, maxSelections(record))
        ? []
        : available.slice(0, maxSelections(record)),
    );
    return;
  }
  if (event.key.length === 1 && /\S/.test(event.key)) typeahead(record, event.key);
}

function labelTrigger(
  root: HTMLElement,
  control: HTMLSelectElement,
  trigger: HTMLElement,
  content: HTMLElement,
): void {
  const label = control.labels?.[0];
  const labelledBy = control.getAttribute("aria-labelledby");
  const ariaLabel = control.getAttribute("aria-label") || root.getAttribute("aria-label");
  if (label) {
    label.id ||= `${root.id}-label`;
    trigger.setAttribute("aria-labelledby", label.id);
    content.setAttribute("aria-labelledby", label.id);
  } else if (labelledBy) {
    trigger.setAttribute("aria-labelledby", labelledBy);
    content.setAttribute("aria-labelledby", labelledBy);
  } else {
    const name = ariaLabel || control.name || "Multi Select";
    trigger.setAttribute("aria-label", name);
    content.setAttribute("aria-label", name);
  }
}

function wire(record: MultiSelectRecord): void {
  const triggerClick = (): void => {
    if (record.open) closeMultiSelect(record.root);
    else openMultiSelect(record.root);
  };
  const triggerKeydown = (event: KeyboardEvent): void => {
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      openMultiSelect(record.root);
    }
  };
  const listboxKeys = (event: KeyboardEvent): void => listboxKeydown(record, event);
  const contentClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const option = event.target.closest<HTMLElement>('[data-part="option"]');
    if (!option || option.getAttribute("aria-disabled") === "true") return;
    const value = option.dataset.value;
    if (value !== undefined) {
      setActive(record, value);
      toggleValue(record, value);
    }
  };
  const contentPointer = (event: PointerEvent): void => {
    if (!(event.target instanceof Element)) return;
    const option = event.target.closest<HTMLElement>('[data-part="option"]');
    if (option && option.getAttribute("aria-disabled") !== "true")
      setActive(record, option.dataset.value);
  };
  const tagsClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const remove = event.target.closest<HTMLElement>('[data-part="remove"]');
    const value = remove?.dataset.value;
    if (value !== undefined)
      commit(
        record,
        record.values.filter((candidate) => candidate !== value),
      );
  };
  const nativeChange = (): void => {
    if (record.committing) return;
    const previousValue = [...record.values];
    render(record);
    if (JSON.stringify(previousValue) !== JSON.stringify(record.values))
      emit(record, "change", record.values, previousValue);
  };
  const reset = (): void => {
    window.setTimeout(nativeChange, 0);
  };
  record.trigger.addEventListener("click", triggerClick);
  record.trigger.addEventListener("keydown", triggerKeydown);
  record.content.addEventListener("keydown", listboxKeys);
  record.content.addEventListener("click", contentClick);
  record.content.addEventListener("pointermove", contentPointer);
  record.tags.addEventListener("click", tagsClick);
  record.control.addEventListener("change", nativeChange);
  record.control.addEventListener("jquery-star:model-write", nativeChange);
  record.control.form?.addEventListener("reset", reset);
  record.cleanups.push(
    () => record.trigger.removeEventListener("click", triggerClick),
    () => record.trigger.removeEventListener("keydown", triggerKeydown),
    () => record.content.removeEventListener("keydown", listboxKeys),
    () => record.content.removeEventListener("click", contentClick),
    () => record.content.removeEventListener("pointermove", contentPointer),
    () => record.tags.removeEventListener("click", tagsClick),
    () => record.control.removeEventListener("change", nativeChange),
    () => record.control.removeEventListener("jquery-star:model-write", nativeChange),
  );
  if (record.control.form)
    record.cleanups.push(() => record.control.form?.removeEventListener("reset", reset));
  const label = record.control.labels?.[0];
  if (label) {
    const click = (event: MouseEvent): void => {
      event.preventDefault();
      record.trigger.focus();
    };
    label.addEventListener("click", click);
    record.cleanups.push(() => label.removeEventListener("click", click));
  }
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

function enhanceMultiSelect(root: HTMLElement): MultiSelectRecord {
  root.id ||= `jqs-multi-select-${++multiSelectId}`;
  const control = directControl(root);
  control.id ||= `${root.id}-control`;
  const triggerElement = directPart(root, "trigger") ?? createTrigger(root);
  if (!(triggerElement instanceof HTMLButtonElement))
    throw new Error(`Multi Select #${root.id} trigger must be a button.`);
  const trigger = triggerElement;
  const content = directPart(root, "content") ?? createPart(root, "content");
  const tags = directPart(root, "tags") ?? createPart(root, "tags");
  const statusElement = directPart(root, "status") ?? createPart(root, "status");
  trigger.type = "button";
  trigger.id ||= `${root.id}-trigger`;
  content.id ||= `${root.id}-content`;
  content.tabIndex = 0;
  content.setAttribute("role", "listbox");
  content.setAttribute("aria-multiselectable", "true");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-controls", content.id);
  statusElement.setAttribute("aria-live", "polite");
  statusElement.setAttribute("aria-atomic", "true");
  control.dataset.enhanced = "true";
  control.setAttribute("aria-hidden", "true");
  control.tabIndex = -1;
  prepareFloating(content);
  labelTrigger(root, control, trigger, content);

  let record = records.get(root);
  const signature = optionSignature(control);
  if (!record || record.control !== control || record.content !== content) {
    record?.cleanups.forEach((cleanup) => cleanup());
    record = {
      activeValue: undefined,
      cleanups: [],
      committing: false,
      content,
      control,
      lastValue: "",
      open: false,
      optionsSignature: "",
      root,
      search: "",
      searchTimer: undefined,
      tagSignature: "",
      tags,
      trigger,
      values: selectedValues(control),
    };
    records.set(root, record);
    if (!usesNativePopover(content)) content.hidden = true;
  } else {
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.tags = tags;
    record.trigger = trigger;
  }
  if (record.optionsSignature !== signature) {
    rebuildOptions(record);
    record.optionsSignature = signature;
  }
  const patched = parseValue(root.dataset.value);
  if (patched && root.dataset.value !== record.lastValue) {
    for (const option of Array.from(control.options))
      option.selected = patched.includes(option.value);
  }
  render(record);
  syncOpen(record, record.open);
  wire(record);
  if (record.open) {
    showFloating(content);
    setActive(
      record,
      record.activeValue ?? record.values[0] ?? enabledOptions(record)[0]?.dataset.value,
    );
    position(record);
  }
  return record;
}

function position(record: MultiSelectRecord): void {
  record.content.style.minWidth = `${record.trigger.getBoundingClientRect().width}px`;
  positionFloating(record.root, record.trigger, record.content, { align: "start", side: "bottom" });
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
        else if (!record.root.contains(event.target)) closeMultiSelect(record.root, false);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (record.root.isConnected) position(record);
      else activeRecords.delete(record);
    }
  };
  listenToViewportChanges(host, reposition);
  host.own(
    "service",
    "ui:multi-select:active-records",
    documentRecordCleanup(activeRecords, document),
  );
}

function resolve(target: MultiSelectTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? multiSelectRoot(root.querySelector(target))
      : multiSelectRoot(target);
  if (resolved) return resolved;
  throw new Error(`Multi Select target did not match data-jqs="multi-select": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="multi-select"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="multi-select"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="multi-select"]')));
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
      return (records.get(root) ?? enhanceMultiSelect(root)).open
        ? closeMultiSelect(root)
        : openMultiSelect(root);
    },
    set: (target, values) => {
      const root = resolve(target);
      return commit(records.get(root) ?? enhanceMultiSelect(root), values);
    },
    select: (target, value, selected = true) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceMultiSelect(root);
      return commit(
        record,
        selected
          ? [...record.values, value]
          : record.values.filter((candidate) => candidate !== value),
      );
    },
    clear: (target) => {
      const root = resolve(target);
      return commit(records.get(root) ?? enhanceMultiSelect(root), []);
    },
    value: (target) => {
      const root = resolve(target);
      return [...(records.get(root) ?? enhanceMultiSelect(root)).values];
    },
  };
  for (const operation of ["open", "close", "toggle", "clear"] as const) {
    registerAction(`ui.multi-select.${operation}`, (context) =>
      api[operation](controlled(context, context.args?.[0])),
    );
  }
  registerAction("ui.multi-select.select", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    const selected = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof value !== "string") throw new Error("ui.multi-select.select needs an option value.");
    return api.select(target, value, typeof selected === "boolean" ? selected : true);
  });
  registerAction("ui.multi-select.set", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const values = explicit ? context.args?.[1] : first;
    if (!Array.isArray(values) || !values.every((value) => typeof value === "string"))
      throw new Error("ui.multi-select.set needs an array of option values.");
    return api.set(target, values);
  });
  return { api, enhance: enhanceAll };
}
