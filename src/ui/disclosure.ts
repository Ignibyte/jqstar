import { registerAction } from "../registry";
import type { DisclosureTarget, StarContext, StarDisclosureStatic } from "../types";

type DisclosureKind = "collapsible" | "accordion";

interface DisclosureRecord {
  content: HTMLElement;
  open: boolean;
  trigger: HTMLElement;
  triggerCleanup?: (() => void) | undefined;
}

interface DisclosureEventDetail {
  component: DisclosureKind;
  item: HTMLDetailsElement;
  root: HTMLElement;
  trigger: HTMLElement;
}

interface DisclosureCollection {
  accordion: StarDisclosureStatic;
  collapsible: StarDisclosureStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLDetailsElement, DisclosureRecord>();
let disclosureId = 0;

function isDetails(value: Element | null): value is HTMLDetailsElement {
  return value instanceof HTMLDetailsElement;
}

function directSummary(details: HTMLDetailsElement): HTMLElement | undefined {
  return Array.from(details.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "SUMMARY",
  );
}

function directContent(details: HTMLDetailsElement): HTMLElement | undefined {
  return Array.from(details.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.matches('[data-part="content"]'),
  );
}

function accordionRoot(details: HTMLDetailsElement): HTMLElement | undefined {
  const root = details.parentElement?.closest<HTMLElement>('[data-jqs="accordion"]');
  return root && Array.from(root.children).includes(details) ? root : undefined;
}

function disclosureKind(details: HTMLDetailsElement): DisclosureKind {
  return accordionRoot(details) ? "accordion" : "collapsible";
}

function disclosureRoot(details: HTMLDetailsElement): HTMLElement {
  return accordionRoot(details) ?? details;
}

function eventDetail(details: HTMLDetailsElement, record: DisclosureRecord): DisclosureEventDetail {
  return {
    component: disclosureKind(details),
    item: details,
    root: disclosureRoot(details),
    trigger: record.trigger,
  };
}

function emit(
  details: HTMLDetailsElement,
  record: DisclosureRecord,
  phase: "before-open" | "open" | "before-close" | "close",
  cancelable = false,
): boolean {
  const component = disclosureKind(details);
  return details.dispatchEvent(
    new CustomEvent(`jquery-star:${component}:${phase}`, {
      bubbles: true,
      cancelable,
      detail: eventDetail(details, record),
    }),
  );
}

function accordionItems(root: HTMLElement): HTMLDetailsElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLDetailsElement =>
      child instanceof HTMLDetailsElement && child.matches('[data-part="item"]'),
  );
}

function accordionTriggers(root: HTMLElement): HTMLElement[] {
  return accordionItems(root)
    .map(directSummary)
    .filter((trigger): trigger is HTMLElement => trigger !== undefined);
}

function isCollapsibleAccordion(root: HTMLElement): boolean {
  return root.getAttribute("data-collapsible") !== "false";
}

function updateAccordionDisabled(root: HTMLElement): void {
  const items = accordionItems(root);
  const openItems = items.filter((item) => item.open);
  for (const item of items) {
    const trigger = directSummary(item);
    if (!trigger) continue;
    const requiredOpen = !isCollapsibleAccordion(root) && item.open && openItems.length === 1;
    if (requiredOpen) trigger.setAttribute("aria-disabled", "true");
    else trigger.removeAttribute("aria-disabled");
  }
}

function synchronize(details: HTMLDetailsElement, emitChange = true): void {
  const record = records.get(details);
  if (!record) return;

  const changed = record.open !== details.open;
  record.open = details.open;
  details.dataset.state = details.open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(details.open));
  const root = accordionRoot(details);
  if (root) updateAccordionDisabled(root);

  if (changed && emitChange) emit(details, record, details.open ? "open" : "close");
}

function commit(details: HTMLDetailsElement, open: boolean, emitChange = true): void {
  details.open = open;
  synchronize(details, emitChange);
}

function canClose(details: HTMLDetailsElement): boolean {
  const root = accordionRoot(details);
  if (!root || isCollapsibleAccordion(root)) return true;
  return accordionItems(root).filter((item) => item.open).length > 1;
}

function prepareSiblings(details: HTMLDetailsElement): boolean {
  const root = accordionRoot(details);
  if (!root || root.getAttribute("data-mode") === "multiple") return true;

  const siblings = accordionItems(root).filter((item) => item !== details && item.open);
  const prepared: Array<{ item: HTMLDetailsElement; record: DisclosureRecord }> = [];
  for (const item of siblings) {
    const record = enhanceDetails(item);
    if (!emit(item, record, "before-close", true)) return false;
    prepared.push({ item, record });
  }
  for (const { item } of prepared) commit(item, false);
  return true;
}

function requestState(details: HTMLDetailsElement, open: boolean): HTMLDetailsElement {
  const record = enhanceDetails(details);
  if (details.open === open) return details;
  if (!open && !canClose(details)) return details;

  if (!emit(details, record, open ? "before-open" : "before-close", true)) return details;
  if (open && !prepareSiblings(details)) return details;
  commit(details, open);
  return details;
}

function moveAccordionFocus(details: HTMLDetailsElement, event: KeyboardEvent): void {
  const root = accordionRoot(details);
  if (!root || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

  const triggers = accordionTriggers(root);
  const current = triggers.indexOf(event.currentTarget as HTMLElement);
  if (current < 0 || triggers.length === 0) return;

  let next = current;
  if (event.key === "ArrowDown") next = (current + 1) % triggers.length;
  else if (event.key === "ArrowUp") next = (current - 1 + triggers.length) % triggers.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = triggers.length - 1;

  event.preventDefault();
  triggers[next]?.focus();
}

function wireTrigger(details: HTMLDetailsElement, record: DisclosureRecord): void {
  record.triggerCleanup?.();

  const click = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    const nextOpen = !details.open;
    if (!nextOpen && !canClose(details)) {
      event.preventDefault();
      return;
    }
    if (!emit(details, record, nextOpen ? "before-open" : "before-close", true)) {
      event.preventDefault();
      return;
    }
    if (nextOpen && !prepareSiblings(details)) event.preventDefault();
  };
  const keydown = (event: KeyboardEvent): void => moveAccordionFocus(details, event);
  record.trigger.addEventListener("click", click);
  record.trigger.addEventListener("keydown", keydown);
  record.triggerCleanup = () => {
    record.trigger.removeEventListener("click", click);
    record.trigger.removeEventListener("keydown", keydown);
  };
}

function enhanceDetails(details: HTMLDetailsElement): DisclosureRecord {
  details.id ||= `jqs-disclosure-${++disclosureId}`;
  const trigger = directSummary(details);
  const content = directContent(details);
  if (!trigger || !content) {
    throw new Error(
      `Disclosure #${details.id} needs direct data-part="trigger" and data-part="content" children.`,
    );
  }

  trigger.dataset.part ||= "trigger";
  trigger.id ||= `${details.id}-trigger`;
  content.id ||= `${details.id}-content`;
  trigger.setAttribute("aria-controls", content.id);
  content.setAttribute("role", "region");
  content.setAttribute("aria-labelledby", trigger.id);

  let record = records.get(details);
  if (!record) {
    record = { content, open: details.open, trigger };
    records.set(details, record);
    details.addEventListener("toggle", () => synchronize(details));
    wireTrigger(details, record);
  } else if (record.trigger !== trigger || record.content !== content) {
    record.trigger = trigger;
    record.content = content;
    wireTrigger(details, record);
  }

  synchronize(details, false);
  return record;
}

function enhanceAccordion(root: HTMLElement): void {
  root.id ||= `jqs-accordion-${++disclosureId}`;
  const items = accordionItems(root);
  const multiple = root.getAttribute("data-mode") === "multiple";
  const groupName = `${root.id}-group`;

  for (const item of items) {
    if (multiple) item.removeAttribute("name");
    else item.setAttribute("name", groupName);
    enhanceDetails(item);
  }

  if (!isCollapsibleAccordion(root) && !items.some((item) => item.open) && items[0]) {
    commit(items[0], true, false);
  }
  updateAccordionDisabled(root);
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(
    ...Array.from(root.querySelectorAll('[data-jqs="collapsible"], [data-jqs="accordion"]')),
  );

  for (const element of elements) {
    if (element.matches('[data-jqs="accordion"]') && element instanceof HTMLElement) {
      enhanceAccordion(element);
    } else if (element.matches('[data-jqs="collapsible"]') && isDetails(element)) {
      enhanceDetails(element);
    }
  }
}

function resolveDetails(target: DisclosureTarget, root: ParentNode = document): HTMLDetailsElement {
  if (typeof target !== "string") return target;
  const match = root.querySelector(target);
  if (!isDetails(match)) throw new Error(`Disclosure target did not match a <details>: ${target}`);
  return match;
}

function controlledDetails(context: StarContext, target?: unknown): HTMLDetailsElement {
  if (target instanceof HTMLDetailsElement) return target;
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return isDetails(local) ? local : resolveDetails(target);
  }
  const closest = context.element?.closest("details") ?? null;
  if (isDetails(closest)) return closest;
  throw new Error("Disclosure action needs a target selector or a containing <details> element.");
}

function createStatic(): StarDisclosureStatic {
  return {
    open: (target) => requestState(resolveDetails(target), true),
    close: (target) => requestState(resolveDetails(target), false),
    toggle: (target) => {
      const details = resolveDetails(target);
      return requestState(details, !details.open);
    },
  };
}

function registerActions(name: DisclosureKind, api: StarDisclosureStatic): void {
  for (const action of ["open", "close", "toggle"] as const) {
    registerAction(`ui.${name}.${action}`, (context) => {
      const details = controlledDetails(context, context.args?.[0]);
      return api[action](details);
    });
  }
}

export function createDisclosures(): DisclosureCollection {
  const collapsible = createStatic();
  const accordion = createStatic();
  registerActions("collapsible", collapsible);
  registerActions("accordion", accordion);
  return { accordion, collapsible, enhance: enhanceTree };
}
