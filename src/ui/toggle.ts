import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type {
  StarContext,
  StarToggleGroupStatic,
  StarToggleStatic,
  ToggleGroupTarget,
  ToggleTarget,
} from "../types";
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

type Orientation = "horizontal" | "vertical";
type ToggleGroupType = "single" | "multiple";

interface ToggleRecord extends UIResources {
  root: HTMLButtonElement;
}

interface ToggleGroupRecord extends UIResources {
  items: HTMLButtonElement[];
  signature: string;
  values: Set<string>;
}

interface ToggleEventDetail {
  pressed: boolean;
  toggle: HTMLButtonElement;
}

interface ToggleGroupEventDetail {
  group: HTMLElement;
  item: HTMLButtonElement;
  pressed: boolean;
  previousValues: string[];
  value: string;
  values: string[];
}

interface ToggleCollection {
  toggle: StarToggleStatic;
  toggleGroup: StarToggleGroupStatic;
  enhance(root: ParentNode): void;
}

const toggleRecords = new WeakMap<HTMLButtonElement, ToggleRecord>();
const groupRecords = new WeakMap<HTMLElement, ToggleGroupRecord>();
let groupId = 0;

function isDisabled(element: HTMLElement): boolean {
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.dataset.disabled !== undefined
  );
}

function toggleRoot(value: Element | null): HTMLButtonElement | undefined {
  return isHTMLTag(value, "button") && value.matches('[data-jqs="toggle"]') ? value : undefined;
}

function groupRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="toggle-group"]') ? value : undefined;
}

function groupItems(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLButtonElement =>
      isHTMLTag(child, "button") && child.getAttribute("data-part") === "item",
  );
}

function itemValue(item: HTMLButtonElement): string {
  const value = item.getAttribute("data-value")?.trim();
  if (!value) throw new Error("Each Toggle Group item needs a non-empty data-value.");
  if (/\s/.test(value)) {
    throw new Error(`Toggle Group item values cannot contain whitespace: ${value}`);
  }
  return value;
}

function groupType(root: HTMLElement): ToggleGroupType {
  return root.dataset.type === "multiple" ? "multiple" : "single";
}

function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}

function rootValues(root: HTMLElement): Set<string> {
  return new Set((root.dataset.value ?? "").split(/\s+/).filter(Boolean));
}

function orderedValues(root: HTMLElement, values: Set<string>): string[] {
  return groupItems(root)
    .map(itemValue)
    .filter((value) => values.has(value));
}

function setPressed(toggle: HTMLButtonElement, pressed: boolean): void {
  if (!toggle.hasAttribute("type")) toggle.type = "button";
  toggle.setAttribute("aria-pressed", String(pressed));
  toggle.dataset.state = pressed ? "on" : "off";
}

function emitToggle(
  toggle: HTMLButtonElement,
  name: "before-change" | "change",
  pressed: boolean,
  cancelable = false,
): boolean {
  const detail: ToggleEventDetail = { pressed, toggle };
  return toggle.dispatchEvent(
    new (toggle.ownerDocument.defaultView as Window & typeof globalThis).CustomEvent(
      `jquery-star:toggle:${name}`,
      { bubbles: true, cancelable, detail },
    ),
  );
}

function applyToggle(toggle: HTMLButtonElement, pressed: boolean): HTMLButtonElement {
  setPressed(toggle, pressed);
  emitToggle(toggle, "change", pressed);
  return toggle;
}

function toggleCurrent(record: ToggleRecord, revision = record.revision): boolean {
  return uiCurrent(record, revision) && toggleRecords.get(record.root) === record;
}

function requestToggle(toggle: HTMLButtonElement, pressed: boolean): HTMLButtonElement {
  const record = enhanceToggle(toggle);
  const revision = ++record.revision;
  const previous = toggle.getAttribute("aria-pressed");
  if (isDisabled(toggle) || previous === String(pressed)) return toggle;
  if (
    !emitToggle(toggle, "before-change", pressed, true) ||
    !toggleCurrent(record, revision) ||
    isDisabled(toggle) ||
    toggle.getAttribute("aria-pressed") !== previous
  )
    return toggle;
  return applyToggle(toggle, pressed);
}

function enhanceToggle(toggle: HTMLButtonElement): ToggleRecord {
  const existing = toggleRecords.get(toggle);
  setPressed(
    toggle,
    toggle.getAttribute("aria-pressed") === "true" || toggle.dataset.state === "on",
  );
  if (existing && toggleCurrent(existing)) return existing;
  existing?.cleanup();
  const replacement = toggleRecords.get(toggle);
  if (replacement) return replacement;
  const record: ToggleRecord = { ...uiResources(toggle), root: toggle };
  record.cleanup = ownUIRecord(toggleRecords, toggle, record, () => releaseUIResources(record));
  try {
    if (!toggle.closest('[data-jqs="toggle-group"]')) {
      listenUI(
        record,
        () => toggleCurrent(record),
        toggle,
        "click",
        () => {
          requestToggle(toggle, toggle.getAttribute("aria-pressed") !== "true");
        },
      );
    }
    if (!toggleCurrent(record)) throw new Error("This UI root cannot acquire resources.");
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function emitGroup(
  root: HTMLElement,
  name: "before-change" | "change",
  item: HTMLButtonElement,
  pressed: boolean,
  previousValues: string[],
  values: string[],
  cancelable = false,
): boolean {
  const detail: ToggleGroupEventDetail = {
    group: root,
    item,
    pressed,
    previousValues,
    value: itemValue(item),
    values,
  };
  return root.dispatchEvent(
    new (root.ownerDocument.defaultView as Window & typeof globalThis).CustomEvent(
      `jquery-star:toggle-group:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
  );
}

function syncFormInputs(root: HTMLElement, values: string[]): void {
  const existing = Array.from(
    root.querySelectorAll<HTMLInputElement>(':scope > input[data-generated="toggle-group"]'),
  );
  const name = root.dataset.name?.trim();
  if (
    existing.length === values.length &&
    existing.every((input, index) => input.name === name && input.value === values[index])
  ) {
    return;
  }
  for (const input of existing) input.remove();
  if (!name) return;
  for (const value of values) {
    const input = root.ownerDocument.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    input.dataset.generated = "toggle-group";
    root.append(input);
  }
}

function applyGroupValues(root: HTMLElement, values: Set<string>): string[] {
  const record = groupRecords.get(root);
  if (!record) throw new Error("Toggle Group must be enhanced before changing its value.");
  const next = orderedValues(root, values);
  record.values = new Set(next);
  const serialized = next.join(" ");
  if (root.dataset.value !== serialized) root.dataset.value = serialized;
  for (const item of groupItems(root)) setPressed(item, record.values.has(itemValue(item)));
  syncFormInputs(root, next);
  record.signature = groupSignature(root);
  return next;
}

function requestGroupValue(root: HTMLElement, value: string, pressed: boolean): HTMLElement {
  const record = groupRecordFor(root);
  const revision = ++record.revision;
  const signature = groupSignature(root);
  const item = groupItems(root).find((candidate) => itemValue(candidate) === value);
  if (!item || isDisabled(item)) return root;

  const previousValues = orderedValues(root, record.values);
  const next = new Set(record.values);
  if (groupType(root) === "single") {
    if (pressed) {
      next.clear();
      next.add(value);
    } else {
      next.delete(value);
    }
  } else if (pressed) next.add(value);
  else next.delete(value);

  if (root.hasAttribute("data-required") && next.size === 0) return root;
  const values = orderedValues(root, next);
  if (previousValues.join("\0") === values.join("\0")) return root;
  if (
    !emitGroup(root, "before-change", item, pressed, previousValues, values, true) ||
    !groupCurrent(record, revision) ||
    groupSignature(root) !== signature ||
    isDisabled(item)
  )
    return root;
  applyGroupValues(root, next);
  if (groupCurrent(record, revision))
    emitGroup(root, "change", item, pressed, previousValues, values);
  return root;
}

function moveFocus(root: HTMLElement, current: HTMLButtonElement, event: KeyboardEvent): void {
  const currentOrientation = orientation(root);
  const previousKey = currentOrientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const nextKey = currentOrientation === "vertical" ? "ArrowDown" : "ArrowRight";
  if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;

  const items = groupItems(root).filter((item) => !isDisabled(item));
  const index = items.indexOf(current);
  if (index < 0 || items.length === 0) return;
  let next = index;
  if (event.key === previousKey) next = (index - 1 + items.length) % items.length;
  else if (event.key === nextKey) next = (index + 1) % items.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = items.length - 1;
  event.preventDefault();
  items[next]?.focus();
}

function groupCurrent(record: ToggleGroupRecord, revision = record.revision): boolean {
  const items = groupItems(record.root);
  return (
    uiCurrent(record, revision) &&
    groupRecords.get(record.root) === record &&
    items.length === record.items.length &&
    items.every((item, index) => item === record.items[index])
  );
}

function groupSignature(root: HTMLElement): string {
  return JSON.stringify([
    root.dataset.value,
    groupType(root),
    orientation(root),
    root.hasAttribute("data-required"),
    groupItems(root).map((item) => [item.getAttribute("data-value"), isDisabled(item)]),
  ]);
}

function groupRecordFor(root: HTMLElement): ToggleGroupRecord {
  const record = groupRecords.get(root);
  return record && groupCurrent(record) ? record : enhanceGroup(root);
}

function wireGroup(record: ToggleGroupRecord): void {
  const root = record.root;
  const listen = listenUI.bind(undefined, record, () => groupCurrent(record));
  listen(root, "click", (event) => {
    const target = isElementNode(event.target) ? event.target.closest("[data-part='item']") : null;
    if (!isHTMLTag(target, "button") || target.parentElement !== root) return;
    requestGroupValue(root, itemValue(target), target.getAttribute("aria-pressed") !== "true");
  });
  listen(root, "keydown", (event) => {
    const target = event.target;
    if (!isHTMLTag(target, "button") || target.parentElement !== root) return;
    moveFocus(root, target, event as KeyboardEvent);
  });
  listen(root, "focusin", (event) => {
    const target = event.target;
    if (!isHTMLTag(target, "button") || target.parentElement !== root) return;
    for (const item of groupItems(root)) item.tabIndex = item === target ? 0 : -1;
  });
}

function enhanceGroup(root: HTMLElement): ToggleGroupRecord {
  root.id ||= `jqs-toggle-group-${++groupId}`;
  const items = groupItems(root);
  if (items.length === 0) throw new Error(`Toggle Group #${root.id} needs at least one item.`);

  root.setAttribute("role", "toolbar");
  const currentType = groupType(root);
  const currentOrientation = orientation(root);
  if (root.dataset.type !== currentType) root.dataset.type = currentType;
  if (root.dataset.orientation !== currentOrientation)
    root.dataset.orientation = currentOrientation;
  if (root.getAttribute("aria-orientation") !== currentOrientation) {
    root.setAttribute("aria-orientation", currentOrientation);
  }

  const existing = groupRecords.get(root);
  const retained = existing && groupCurrent(existing);
  let record = retained ? existing : undefined;
  if (!record) {
    existing?.cleanup();
    const replacement = groupRecords.get(root);
    if (replacement) return replacement;
    record = { ...uiResources(root), items, signature: "", values: new Set() };
    const acquired = record;
    record.cleanup = ownUIRecord(groupRecords, root, record, () => releaseUIResources(acquired));
    try {
      wireGroup(record);
      if (!groupCurrent(record)) throw new Error("This UI root cannot acquire resources.");
    } catch (error) {
      failUISetup(record, error);
    }
  }
  try {
    syncGroup(record, Boolean(retained));
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function syncGroup(record: ToggleGroupRecord, retainTab: boolean): void {
  const { root, items } = record;
  const signature = groupSignature(root);
  const unchanged = retainTab && signature === record.signature;
  if (!unchanged) record.revision += 1;

  for (const item of items) {
    if (!item.hasAttribute("type")) item.type = "button";
    itemValue(item);
  }

  const requested = rootValues(root);
  const stateMarked = new Set(
    items
      .filter((item) => item.getAttribute("aria-pressed") === "true" || item.dataset.state === "on")
      .map(itemValue),
  );
  const next =
    root.dataset.value !== undefined
      ? requested
      : record.values.size > 0
        ? new Set(record.values)
        : stateMarked;
  if (groupType(root) === "single" && next.size > 1) {
    const first = orderedValues(root, next)[0];
    next.clear();
    if (first) next.add(first);
  }
  if (root.hasAttribute("data-required") && next.size === 0) {
    const first = items.find((item) => !isDisabled(item));
    if (first) next.add(itemValue(first));
  }
  const values = applyGroupValues(root, next);
  const focusValue = values[0];
  const focusItem = items.find((item) => itemValue(item) === focusValue && !isDisabled(item));
  const fallback = items.find((item) => !isDisabled(item));
  const focused = items.find((item) => item === record.document.activeElement && !isDisabled(item));
  const retainedTab = unchanged
    ? items.find((item) => item.tabIndex === 0 && !isDisabled(item))
    : undefined;
  for (const item of items)
    item.tabIndex = item === (focused ?? retainedTab ?? focusItem ?? fallback) ? 0 : -1;
  record.signature = groupSignature(root);
}

function enhanceTree(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="toggle-group"]')) {
    const group = groupRoot(element);
    if (group) enhanceGroup(group);
  }

  for (const element of uiElements(root, '[data-jqs="toggle"]')) {
    const toggle = toggleRoot(element);
    if (toggle && !toggle.closest('[data-jqs="toggle-group"]')) enhanceToggle(toggle);
  }
}

function resolveToggle(
  target: ToggleTarget | HTMLElement,
  root: ParentNode = document,
): HTMLButtonElement {
  const resolved =
    typeof target === "string" ? toggleRoot(root.querySelector(target)) : toggleRoot(target);
  if (resolved) return resolved;
  throw new Error(`Toggle target did not match a button[data-jqs="toggle"]: ${String(target)}`);
}

function resolveGroup(target: ToggleGroupTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? groupRoot(root.querySelector(target)) : groupRoot(target);
  if (resolved) return resolved;
  throw new Error(`Toggle Group target did not match data-jqs="toggle-group": ${String(target)}`);
}

function controlledToggle(context: StarContext, target?: unknown): HTMLButtonElement {
  if (isHTMLElement(target)) return resolveToggle(target);
  if (typeof target === "string") return resolveToggle(target, context.root);
  const closest = context.element?.closest('button[data-jqs="toggle"]') ?? null;
  return resolveToggle(isHTMLTag(closest, "button") ? closest : String(target));
}

function controlledGroup(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveGroup(target);
  if (typeof target === "string" && target.startsWith("#"))
    return resolveGroup(target, context.root);
  const closest = context.element?.closest('[data-jqs="toggle-group"]') ?? null;
  return resolveGroup(isHTMLElement(closest) ? closest : String(target));
}

function registerActions(
  toggle: StarToggleStatic,
  group: StarToggleGroupStatic,
  registerAction: ActionRegistrar,
): void {
  registerAction("ui.toggle.press", (context) => {
    const first = context.args?.[0];
    const explicitTarget =
      (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlledToggle(context, explicitTarget ? first : undefined);
    const pressed = explicitTarget ? context.args?.[1] : first;
    return toggle.press(target, pressed === undefined ? true : Boolean(pressed));
  });
  registerAction("ui.toggle.toggle", (context) =>
    toggle.toggle(controlledToggle(context, context.args?.[0])),
  );
  registerAction("ui.toggle-group.select", (context) => {
    const first = context.args?.[0];
    const explicitTarget =
      (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlledGroup(context, explicitTarget ? first : undefined);
    const value = explicitTarget ? context.args?.[1] : first;
    if (typeof value !== "string") throw new Error("ui.toggle-group.select needs an item value.");
    const pressed = explicitTarget ? context.args?.[2] : context.args?.[1];
    return group.select(target, value, pressed === undefined ? true : Boolean(pressed));
  });
  registerAction("ui.toggle-group.toggle", (context) => {
    const first = context.args?.[0];
    const explicitTarget =
      (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlledGroup(context, explicitTarget ? first : undefined);
    const value = explicitTarget ? context.args?.[1] : first;
    if (typeof value !== "string") throw new Error("ui.toggle-group.toggle needs an item value.");
    return group.toggle(target, value);
  });
}

export function createToggles(registerAction: ActionRegistrar): ToggleCollection {
  const toggle: StarToggleStatic = {
    press: (target, pressed = true) => requestToggle(resolveToggle(target), pressed),
    toggle: (target) => {
      const root = resolveToggle(target);
      return requestToggle(root, root.getAttribute("aria-pressed") !== "true");
    },
    pressed: (target) => {
      const root = resolveToggle(target);
      enhanceToggle(root);
      return root.getAttribute("aria-pressed") === "true";
    },
  };
  const toggleGroup: StarToggleGroupStatic = {
    select: (target, value, pressed = true) =>
      requestGroupValue(resolveGroup(target), value, pressed),
    toggle: (target, value) => {
      const root = resolveGroup(target);
      const item = groupItems(root).find((candidate) => itemValue(candidate) === value);
      if (!item) return root;
      return requestGroupValue(root, value, item.getAttribute("aria-pressed") !== "true");
    },
    value: (target) => {
      const root = resolveGroup(target);
      const record = groupRecordFor(root);
      const values = orderedValues(root, record.values);
      return groupType(root) === "multiple" ? values : values[0];
    },
  };
  registerActions(toggle, toggleGroup, registerAction);
  return { toggle, toggleGroup, enhance: enhanceTree };
}
