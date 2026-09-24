import { isHTMLElement, isHTMLTag, isElementNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DisclosureTarget, StarContext, StarDisclosureStatic } from "../types";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  uiActive,
  type UIResources,
} from "./lifecycle";

type DisclosureKind = "collapsible" | "accordion";

interface DisclosureRecord extends UIResources {
  root: HTMLDetailsElement;
  group: HTMLElement | undefined;
  content: HTMLElement;
  open: boolean;
  trigger: HTMLElement;
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
const groupRevisions = new WeakMap<HTMLElement, number>();
let disclosureId = 0;

function isDetails(value: unknown): value is HTMLDetailsElement {
  return isHTMLTag(value, "details");
}

function directSummary(details: HTMLDetailsElement): HTMLElement | undefined {
  return Array.from(details.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.tagName === "SUMMARY",
  );
}

function directContent(details: HTMLDetailsElement): HTMLElement | undefined {
  return Array.from(details.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.matches('[data-part="content"]'),
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:${component}:${phase}`,
      {
        bubbles: true,
        cancelable,
        detail: eventDetail(details, record),
      },
    ),
  );
}

function accordionItems(root: HTMLElement): HTMLDetailsElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLDetailsElement =>
      isHTMLTag(child, "details") && child.matches('[data-part="item"]') && uiActive(child),
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
  if (!record || !current(record)) return;

  const changed = record.open !== details.open;
  record.open = details.open;
  reflect(record);
  if (changed && emitChange) emit(details, record, details.open ? "open" : "close");
}

function reflect(record: DisclosureRecord): void {
  const details = record.root;
  details.dataset.state = details.open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(details.open));
  if (record.group) updateAccordionDisabled(record.group);
}

function commit(details: HTMLDetailsElement, open: boolean, emitChange = true): void {
  const record = records.get(details);
  if (!record || !current(record)) return;
  const changed = details.open !== open;
  details.open = open;
  synchronize(details, false);
  if (changed && emitChange && current(record)) emit(details, record, open ? "open" : "close");
}

function current(record: DisclosureRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    directSummary(record.root) === record.trigger &&
    directContent(record.root) === record.content &&
    accordionRoot(record.root) === record.group
  );
}

function operation(record: DisclosureRecord): () => boolean {
  const revision = ++record.revision;
  const group = record.group;
  const groupRevision = group ? (groupRevisions.get(group) ?? 0) + 1 : 0;
  if (group) groupRevisions.set(group, groupRevision);
  const mode = group?.dataset.mode;
  const collapsible = group?.dataset.collapsible;
  return () =>
    current(record, revision) &&
    (!group || groupRevisions.get(group) === groupRevision) &&
    group?.dataset.mode === mode &&
    group?.dataset.collapsible === collapsible;
}

function canClose(details: HTMLDetailsElement): boolean {
  const root = accordionRoot(details);
  if (!root || isCollapsibleAccordion(root)) return true;
  return accordionItems(root).filter((item) => item.open).length > 1;
}

function prepareSiblings(
  details: HTMLDetailsElement,
  valid: () => boolean,
  commitChanges: boolean,
): boolean {
  const root = accordionRoot(details);
  if (!root || root.getAttribute("data-mode") === "multiple") return valid();
  const siblings = accordionItems(root).filter((item) => item !== details && item.open);
  const prepared: Array<{ item: HTMLDetailsElement; record: DisclosureRecord; revision: number }> =
    [];
  for (const item of siblings) {
    const record = enhanceDetails(item);
    const revision = ++record.revision;
    if (
      !emit(item, record, "before-close", true) ||
      !valid() ||
      !current(record, revision) ||
      !item.open
    )
      return false;
    prepared.push({ item, record, revision });
  }
  const ready = (): boolean =>
    valid() &&
    prepared.every(({ record, revision, item }) => current(record, revision) && item.open);
  if (!ready()) return false;
  if (commitChanges)
    for (const { item, record, revision } of prepared) {
      if (!valid() || !current(record, revision)) return false;
      commit(item, false);
    }
  return valid();
}

function requestState(details: HTMLDetailsElement, open: boolean): HTMLDetailsElement {
  const record = enhanceDetails(details);
  const valid = operation(record);
  if (details.open === open || (!open && !canClose(details))) return details;
  if (
    !emit(details, record, open ? "before-open" : "before-close", true) ||
    !valid() ||
    details.open === open ||
    (!open && !canClose(details))
  )
    return details;
  if (open && !prepareSiblings(details, valid, true)) return details;
  if (valid()) commit(details, open);
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
  const trigger = record.trigger;
  const click = (rawEvent: Event): void => {
    const event = rawEvent as MouseEvent;
    if (event.defaultPrevented) return;
    const interactive = isElementNode(event.target)
      ? event.target.closest("a[href], button, input, select, textarea, label, [contenteditable]")
      : null;
    if (interactive && trigger.contains(interactive)) return;
    const valid = operation(record);
    const nextOpen = !details.open;
    if (
      (!nextOpen && !canClose(details)) ||
      !emit(details, record, nextOpen ? "before-open" : "before-close", true) ||
      !valid() ||
      details.open === nextOpen ||
      (!nextOpen && !canClose(details)) ||
      (nextOpen && !prepareSiblings(details, valid, false))
    )
      event.preventDefault();
  };
  listenUI(record, () => current(record), trigger, "click", click);
  listenUI(
    record,
    () => current(record),
    trigger,
    "keydown",
    (event) => moveAccordionFocus(details, event as KeyboardEvent),
  );
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

  const existing = records.get(details);
  if (existing && current(existing)) {
    reflect(existing);
    return existing;
  }
  existing?.cleanup();
  const replacement = records.get(details);
  if (replacement) return replacement;
  const record: DisclosureRecord = {
    ...uiResources(details),
    root: details,
    group: accordionRoot(details),
    content,
    open: details.open,
    trigger,
  };
  record.cleanup = ownUIRecord(records, details, record, () => releaseUIResources(record));
  try {
    listenUI(
      record,
      () => current(record),
      details,
      "toggle",
      () => synchronize(details),
    );
    wireTrigger(details, record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    reflect(record);
  } catch (error) {
    failUISetup(record, error);
  }
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
  for (const element of uiElements(root, '[data-jqs="collapsible"], [data-jqs="accordion"]')) {
    if (element.matches('[data-jqs="accordion"]') && isHTMLElement(element)) {
      enhanceAccordion(element);
    } else if (element.matches('[data-jqs="collapsible"]') && isDetails(element)) {
      enhanceDetails(element);
    }
  }
}

function resolveDetails(
  target: DisclosureTarget | HTMLElement,
  root: ParentNode = document,
): HTMLDetailsElement {
  const match = typeof target === "string" ? root.querySelector(target) : target;
  if (!isDetails(match))
    throw new Error(
      `Disclosure target did not match a <details>: ${typeof target === "string" ? target : "provided element"}`,
    );
  return match;
}

function controlledDetails(context: StarContext, target?: unknown): HTMLDetailsElement {
  if (isHTMLElement(target)) return resolveDetails(target, context.root);
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return isDetails(local) ? local : resolveDetails(target, context.root);
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

function registerActions(
  name: DisclosureKind,
  api: StarDisclosureStatic,
  registerAction: ActionRegistrar,
): void {
  for (const action of ["open", "close", "toggle"] as const) {
    registerAction(`ui.${name}.${action}`, (context) => {
      const details = controlledDetails(context, context.args?.[0]);
      return api[action](details);
    });
  }
}

export function createDisclosures(registerAction: ActionRegistrar): DisclosureCollection {
  const collapsible = createStatic();
  const accordion = createStatic();
  registerActions("collapsible", collapsible, registerAction);
  registerActions("accordion", accordion, registerAction);
  return { accordion, collapsible, enhance: enhanceTree };
}
