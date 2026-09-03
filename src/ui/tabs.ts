import type { ActionRegistrar } from "../registry";
import type { StarContext, StarTabsStatic, TabsTarget, TabTarget } from "../types";

type Orientation = "horizontal" | "vertical";

interface TabParts {
  panel: HTMLElement;
  trigger: HTMLElement;
  value: string;
}

interface TabsRecord {
  cleanups: Map<HTMLElement, () => void>;
  value: string | undefined;
}

interface TabsEventDetail {
  panel: HTMLElement;
  previousValue: string | undefined;
  tabs: HTMLElement;
  trigger: HTMLElement;
  value: string;
}

interface TabsCollection {
  api: StarTabsStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, TabsRecord>();
let tabsId = 0;

function tabRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="tabs"]') ? value : undefined;
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === part,
  );
}

function tabTriggers(list: HTMLElement): HTMLElement[] {
  return Array.from(list.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === "trigger",
  );
}

function tabPanels(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === "panel",
  );
}

function tabValue(element: HTMLElement): string {
  const value = element.getAttribute("data-value")?.trim();
  if (!value) throw new Error("Each Tabs trigger and panel needs a non-empty data-value.");
  return value;
}

function isDisabled(trigger: HTMLElement): boolean {
  return (
    trigger.hasAttribute("disabled") ||
    trigger.getAttribute("aria-disabled") === "true" ||
    trigger.dataset.disabled !== undefined
  );
}

function focusableContent(panel: HTMLElement): boolean {
  return Boolean(
    panel.querySelector(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function parts(root: HTMLElement): TabParts[] {
  const list = directPart(root, "list");
  if (!list) throw new Error(`Tabs #${root.id} needs a direct data-part="list" child.`);

  const panelsByValue = new Map(tabPanels(root).map((panel) => [tabValue(panel), panel]));
  const result = tabTriggers(list).map((trigger) => {
    const value = tabValue(trigger);
    const panel = panelsByValue.get(value);
    if (!panel) throw new Error(`Tabs #${root.id} has no panel for data-value="${value}".`);
    panelsByValue.delete(value);
    return { panel, trigger, value };
  });

  if (result.length === 0)
    throw new Error(`Tabs #${root.id} needs at least one trigger and panel.`);
  if (panelsByValue.size > 0) {
    throw new Error(`Tabs #${root.id} has a panel without a matching trigger.`);
  }
  return result;
}

function orientation(root: HTMLElement): Orientation {
  return root.getAttribute("data-orientation") === "vertical" ? "vertical" : "horizontal";
}

function eventDetail(
  root: HTMLElement,
  item: TabParts,
  previousValue: string | undefined,
): TabsEventDetail {
  return {
    panel: item.panel,
    previousValue,
    tabs: root,
    trigger: item.trigger,
    value: item.value,
  };
}

function emit(
  root: HTMLElement,
  name: "before-change" | "change",
  detail: TabsEventDetail,
  cancelable = false,
): boolean {
  return root.dispatchEvent(
    new CustomEvent(`jquery-star:tabs:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function applyValue(root: HTMLElement, value: string, emitChange = true): HTMLElement {
  const record = records.get(root);
  if (!record) throw new Error("Tabs must be enhanced before activation.");
  const allParts = parts(root);
  const active = allParts.find((item) => item.value === value && !isDisabled(item.trigger));
  if (!active)
    throw new Error(`Tabs #${root.id} has no enabled trigger for data-value="${value}".`);

  const previousValue = record.value;
  record.value = value;
  if (root.dataset.value !== value) root.dataset.value = value;
  for (const item of allParts) {
    const selected = item.value === value;
    item.trigger.dataset.state = selected ? "active" : "inactive";
    item.trigger.setAttribute("aria-selected", String(selected));
    item.trigger.tabIndex = selected ? 0 : -1;
    item.panel.dataset.state = selected ? "active" : "inactive";
    item.panel.hidden = !selected;
  }

  if (emitChange && previousValue !== value) {
    emit(root, "change", eventDetail(root, active, previousValue));
  }
  return root;
}

function requestValue(root: HTMLElement, value: string): HTMLElement {
  const record = records.get(root) ?? enhanceTabs(root);
  if (record.value === value) return root;
  const item = parts(root).find((candidate) => candidate.value === value);
  if (!item || isDisabled(item.trigger)) return root;
  const detail = eventDetail(root, item, record.value);
  if (!emit(root, "before-change", detail, true)) return root;
  return applyValue(root, value);
}

function enabledTriggers(root: HTMLElement): HTMLElement[] {
  const list = directPart(root, "list");
  return list ? tabTriggers(list).filter((trigger) => !isDisabled(trigger)) : [];
}

function moveFocus(root: HTMLElement, trigger: HTMLElement, event: KeyboardEvent): void {
  const currentOrientation = orientation(root);
  const previousKey = currentOrientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const nextKey = currentOrientation === "vertical" ? "ArrowDown" : "ArrowRight";
  if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;

  const triggers = enabledTriggers(root);
  const current = triggers.indexOf(trigger);
  if (current < 0 || triggers.length === 0) return;
  let next = current;
  if (event.key === previousKey) next = (current - 1 + triggers.length) % triggers.length;
  else if (event.key === nextKey) next = (current + 1) % triggers.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = triggers.length - 1;

  event.preventDefault();
  triggers[next]?.focus();
}

function wireTrigger(root: HTMLElement, item: TabParts, record: TabsRecord): void {
  const click = (): void => {
    requestValue(root, item.value);
  };
  const focus = (): void => {
    if (root.getAttribute("data-activation") !== "manual") requestValue(root, item.value);
  };
  const keydown = (event: KeyboardEvent): void => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      requestValue(root, item.value);
      return;
    }
    moveFocus(root, item.trigger, event);
  };
  item.trigger.addEventListener("click", click);
  item.trigger.addEventListener("focus", focus);
  item.trigger.addEventListener("keydown", keydown);
  record.cleanups.set(item.trigger, () => {
    item.trigger.removeEventListener("click", click);
    item.trigger.removeEventListener("focus", focus);
    item.trigger.removeEventListener("keydown", keydown);
  });
}

function enhanceTabs(root: HTMLElement): TabsRecord {
  root.id ||= `jqs-tabs-${++tabsId}`;
  const list = directPart(root, "list");
  if (!list) throw new Error(`Tabs #${root.id} needs a direct data-part="list" child.`);

  const currentOrientation = orientation(root);
  if (root.dataset.orientation !== currentOrientation)
    root.dataset.orientation = currentOrientation;
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-orientation", currentOrientation);

  let record = records.get(root);
  if (!record) {
    record = { cleanups: new Map(), value: undefined };
    records.set(root, record);
  }

  const allParts = parts(root);
  const currentTriggers = new Set(allParts.map((item) => item.trigger));
  for (const [trigger, cleanup] of record.cleanups) {
    if (currentTriggers.has(trigger)) continue;
    cleanup();
    record.cleanups.delete(trigger);
  }

  for (const item of allParts) {
    item.trigger.id ||= `${root.id}-tab-${item.value}`;
    item.panel.id ||= `${root.id}-panel-${item.value}`;
    item.trigger.setAttribute("role", "tab");
    item.trigger.setAttribute("aria-controls", item.panel.id);
    if (item.trigger.dataset.orientation !== currentOrientation) {
      item.trigger.dataset.orientation = currentOrientation;
    }
    item.panel.setAttribute("role", "tabpanel");
    item.panel.setAttribute("aria-labelledby", item.trigger.id);
    if (item.panel.dataset.orientation !== currentOrientation) {
      item.panel.dataset.orientation = currentOrientation;
    }
    if (!focusableContent(item.panel) && !item.panel.hasAttribute("tabindex")) {
      item.panel.tabIndex = 0;
      item.panel.dataset.generatedTabindex = "";
    } else if (focusableContent(item.panel) && item.panel.dataset.generatedTabindex !== undefined) {
      item.panel.removeAttribute("tabindex");
      delete item.panel.dataset.generatedTabindex;
    }
    if (!record.cleanups.has(item.trigger)) wireTrigger(root, item, record);
  }

  const requested = root.getAttribute("data-value")?.trim();
  const stateMarked = allParts.find(
    (item) =>
      item.trigger.dataset.state === "active" ||
      item.trigger.getAttribute("aria-selected") === "true",
  )?.value;
  const fallback = allParts.find((item) => !isDisabled(item.trigger))?.value;
  const next = requested || record.value || stateMarked || fallback;
  if (!next) throw new Error(`Tabs #${root.id} needs at least one enabled trigger.`);
  applyValue(root, next, record.value !== undefined);
  return record;
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="tabs"]')));
  for (const element of elements) {
    const tabs = tabRoot(element);
    if (tabs) enhanceTabs(tabs);
  }
}

function resolveRoot(target: TabsTarget, root: ParentNode = document): HTMLElement {
  if (typeof target !== "string") {
    const resolved = tabRoot(target);
    if (resolved) return resolved;
  } else {
    const resolved = tabRoot(root.querySelector(target));
    if (resolved) return resolved;
  }
  throw new Error(`Tabs target did not match a data-jqs="tabs" element: ${String(target)}`);
}

function resolveValue(root: HTMLElement, target: TabTarget): string {
  if (typeof target === "string") return target;
  const value = target.getAttribute("data-value")?.trim();
  if (!value) throw new Error("A Tabs trigger target needs a non-empty data-value.");
  return value;
}

function controlledTabs(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="tabs"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
  }
  const root = context.element?.closest('[data-jqs="tabs"]') ?? null;
  const resolved = tabRoot(root);
  if (resolved) return resolved;
  throw new Error('Tabs action needs a root selector or an element inside data-jqs="tabs".');
}

function registerActions(api: StarTabsStatic, registerAction: ActionRegistrar): void {
  registerAction("ui.tabs.activate", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicitRoot =
      second !== undefined || (typeof first === "string" && first.startsWith("#"));
    const root = controlledTabs(context, explicitRoot ? first : undefined);
    const tab = explicitRoot ? second : first;
    if (typeof tab !== "string" && !(tab instanceof HTMLElement)) {
      throw new Error("ui.tabs.activate needs a tab value or trigger element.");
    }
    return api.activate(root, tab);
  });
}

export function createTabs(registerAction: ActionRegistrar): TabsCollection {
  const api: StarTabsStatic = {
    activate: (target, tab) => {
      const root = resolveRoot(target);
      enhanceTabs(root);
      return requestValue(root, resolveValue(root, tab));
    },
    value: (target) => {
      const root = resolveRoot(target);
      return (records.get(root) ?? enhanceTabs(root)).value;
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}
