import { registerAction } from "../registry";
import { createDisclosures } from "./disclosure";
import { createForms } from "./form";
import { createHoverCards } from "./hover-card";
import { createMenus } from "./menu";
import { createPopovers } from "./popover";
import { createSelects } from "./select";
import { createComboboxes } from "./combobox";
import { createCalendars } from "./calendar";
import { createDataTables } from "./data-table";
import { createTabs } from "./tabs";
import { createToasts } from "./toast";
import { createTooltips } from "./tooltip";
import { createToggles } from "./toggle";
import type {
  DialogOpenOptions,
  DialogTarget,
  StarContext,
  StarDialogStatic,
  StarUIStatic,
} from "../types";

interface DialogRecord {
  trigger: Element | undefined;
}

interface DialogEventDetail {
  dialog: HTMLDialogElement;
  returnValue?: string;
  trigger?: Element | undefined;
}

const records = new WeakMap<HTMLDialogElement, DialogRecord>();
const enhanced = new WeakSet<HTMLDialogElement>();
let dialogId = 0;

function isDialog(value: Element | null): value is HTMLDialogElement {
  return value instanceof HTMLDialogElement;
}

function queryDialog(selector: string, root: ParentNode = document): HTMLDialogElement {
  const match = root.querySelector(selector);
  if (!isDialog(match)) throw new Error(`Dialog target did not match a <dialog>: ${selector}`);
  return match;
}

function resolveDialog(target: DialogTarget, root: ParentNode = document): HTMLDialogElement {
  return typeof target === "string" ? queryDialog(target, root) : target;
}

function controlledDialog(context: StarContext, target?: unknown): HTMLDialogElement {
  if (target instanceof HTMLDialogElement) return target;

  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return isDialog(local) ? local : queryDialog(target);
  }

  const element = context.element;
  const controls = element?.getAttribute("aria-controls");
  if (controls) return queryDialog(`#${CSS.escape(controls)}`);

  const closest = element?.closest("dialog[data-jqs='dialog']") ?? null;
  if (isDialog(closest)) return closest;

  throw new Error(
    "Dialog action needs a target selector, an aria-controls value, or a containing data-jqs dialog.",
  );
}

function identifyPart(
  dialog: HTMLDialogElement,
  part: "title" | "description",
): string | undefined {
  const element = dialog.querySelector<HTMLElement>(`[data-part='${part}']`);
  if (!element) return undefined;
  element.id ||= `${dialog.id}-${part}`;
  return element.id;
}

function emit(
  dialog: HTMLDialogElement,
  name: string,
  detail: DialogEventDetail,
  cancelable = false,
): boolean {
  return dialog.dispatchEvent(
    new CustomEvent(`jquery-star:dialog:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function setTriggerState(
  trigger: Element | undefined,
  dialog: HTMLDialogElement,
  open: boolean,
): void {
  if (!trigger) return;
  trigger.setAttribute("aria-controls", dialog.id);
  trigger.setAttribute("aria-expanded", String(open));
}

function enhanceDialog(dialog: HTMLDialogElement): DialogRecord {
  let record = records.get(dialog);
  if (!record) {
    record = { trigger: undefined };
    records.set(dialog, record);
  }
  if (enhanced.has(dialog)) return record;

  dialog.id ||= `jqs-dialog-${++dialogId}`;
  dialog.dataset.state = dialog.open ? "open" : "closed";
  dialog.setAttribute("aria-modal", "true");

  if (!dialog.hasAttribute("aria-label") && !dialog.hasAttribute("aria-labelledby")) {
    const titleId = identifyPart(dialog, "title");
    if (titleId) dialog.setAttribute("aria-labelledby", titleId);
  }
  if (!dialog.hasAttribute("aria-describedby")) {
    const descriptionId = identifyPart(dialog, "description");
    if (descriptionId) dialog.setAttribute("aria-describedby", descriptionId);
  }

  dialog.addEventListener("cancel", (event) => {
    const current = records.get(dialog);
    const detail = { dialog, trigger: current?.trigger };
    if (!emit(dialog, "before-close", detail, true)) {
      event.preventDefault();
      return;
    }
    dialog.dataset.state = "closing";
  });

  dialog.addEventListener("close", () => {
    const current = records.get(dialog);
    dialog.dataset.state = "closed";
    setTriggerState(current?.trigger, dialog, false);
    if (current?.trigger instanceof HTMLElement && current.trigger.isConnected) {
      current.trigger.focus();
    }
    emit(dialog, "close", {
      dialog,
      returnValue: dialog.returnValue,
      trigger: current?.trigger,
    });
  });

  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog || !dialog.hasAttribute("data-close-on-backdrop")) return;
    closeDialog(dialog, "backdrop");
  });

  enhanced.add(dialog);
  return record;
}

function focusInitial(dialog: HTMLDialogElement, target?: string | HTMLElement): void {
  const element =
    typeof target === "string"
      ? dialog.querySelector<HTMLElement>(target)
      : (target ?? dialog.querySelector<HTMLElement>("[autofocus]"));
  element?.focus();
}

function openDialog(target: DialogTarget, options: DialogOpenOptions = {}): HTMLDialogElement {
  const dialog = resolveDialog(target);
  const record = enhanceDialog(dialog);
  if (dialog.open) return dialog;

  const detail = { dialog, trigger: options.trigger };
  if (!emit(dialog, "before-open", detail, true)) return dialog;

  record.trigger = options.trigger;
  setTriggerState(record.trigger, dialog, true);
  dialog.dataset.state = "opening";
  dialog.showModal();
  dialog.dataset.state = "open";
  focusInitial(dialog, options.initialFocus);
  emit(dialog, "open", detail);
  return dialog;
}

function closeDialog(target: DialogTarget, returnValue = ""): HTMLDialogElement {
  const dialog = resolveDialog(target);
  const record = enhanceDialog(dialog);
  if (!dialog.open) return dialog;

  const detail = { dialog, returnValue, trigger: record.trigger };
  if (!emit(dialog, "before-close", detail, true)) return dialog;

  dialog.dataset.state = "closing";
  dialog.close(returnValue);
  return dialog;
}

function registerDialogActions(dialog: StarDialogStatic): void {
  registerAction("ui.dialog.open", (context) => {
    const target = controlledDialog(context, context.args?.[0]);
    const initialFocus = context.args?.[1];
    return dialog.open(target, {
      ...(context.element ? { trigger: context.element } : {}),
      ...(typeof initialFocus === "string" || initialFocus instanceof HTMLElement
        ? { initialFocus }
        : {}),
    });
  });

  registerAction("ui.dialog.close", (context) => {
    const target = controlledDialog(context);
    const returnValue = context.args?.[0];
    return dialog.close(target, typeof returnValue === "string" ? returnValue : "");
  });
}

const documentObservers = new WeakMap<Document, MutationObserver>();

function dialogElements(root: ParentNode): HTMLDialogElement[] {
  const dialogs = Array.from(root.querySelectorAll<HTMLDialogElement>('dialog[data-jqs="dialog"]'));
  if (root instanceof HTMLDialogElement && root.matches('[data-jqs="dialog"]')) {
    dialogs.unshift(root);
  }
  return dialogs;
}

function installAutoEnhancement(enhance: (root?: ParentNode) => void): void {
  if (typeof document === "undefined" || documentObservers.has(document)) return;

  const run = (): void => enhance(document);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    queueMicrotask(run);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        enhance(mutation.target as Element);
        const owner = (mutation.target as Element).closest<HTMLElement>(
          '[data-jqs="accordion"], [data-jqs="collapsible"], [data-jqs="tabs"], [data-jqs="popover"], [data-jqs="tooltip"], [data-jqs="hover-card"], [data-jqs="menu"], [data-jqs="toast"], [data-jqs="toast-viewport"], [data-jqs="select"], [data-jqs="combobox"], [data-jqs="data-table"], [data-jqs="toggle"], [data-jqs="toggle-group"], [data-jqs="calendar"], [data-jqs="date-picker"], form[data-jqs="form"], dialog[data-jqs="dialog"]',
        );
        if (owner && owner !== mutation.target) enhance(owner);
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        enhance(node);
        const owner = node.parentElement?.closest<HTMLElement>(
          '[data-jqs="accordion"], [data-jqs="collapsible"], [data-jqs="tabs"], [data-jqs="popover"], [data-jqs="tooltip"], [data-jqs="hover-card"], [data-jqs="menu"], [data-jqs="toast"], [data-jqs="toast-viewport"], [data-jqs="select"], [data-jqs="combobox"], [data-jqs="data-table"], [data-jqs="toggle"], [data-jqs="toggle-group"], [data-jqs="calendar"], [data-jqs="date-picker"], form[data-jqs="form"], dialog[data-jqs="dialog"]',
        );
        if (owner) enhance(owner);
      }
    }
  });
  observer.observe(document, {
    attributes: true,
    attributeFilter: [
      "data-jqs",
      "data-mode",
      "data-collapsible",
      "data-value",
      "data-activation",
      "data-orientation",
      "data-filter",
      "data-inline",
      "data-min-length",
      "data-loading",
      "disabled",
      "label",
      "selected",
      "data-page",
      "data-page-size",
      "data-sort",
      "data-direction",
      "data-processing",
      "data-type",
      "data-name",
      "data-required",
      "data-month",
      "data-min",
      "data-max",
      "data-disabled-dates",
      "data-week-start",
      "data-disable-weekends",
    ],
    childList: true,
    subtree: true,
  });
  documentObservers.set(document, observer);
}

export function createUI(): StarUIStatic {
  const dialog: StarDialogStatic = {
    open: openDialog,
    close: closeDialog,
  };
  const disclosures = createDisclosures();
  const menus = createMenus();
  const tabs = createTabs();
  const selects = createSelects();
  const comboboxes = createComboboxes();
  const dataTables = createDataTables();
  const popovers = createPopovers();
  const calendars = createCalendars(popovers.api);
  const forms = createForms();
  const hoverCards = createHoverCards();
  const tooltips = createTooltips();
  const toasts = createToasts();
  const toggles = createToggles();
  const enhance = (root: ParentNode = document): void => {
    for (const element of dialogElements(root)) enhanceDialog(element);
    disclosures.enhance(root);
    tabs.enhance(root);
    popovers.enhance(root);
    hoverCards.enhance(root);
    tooltips.enhance(root);
    menus.enhance(root);
    toasts.enhance(root);
    selects.enhance(root);
    comboboxes.enhance(root);
    dataTables.enhance(root);
    toggles.enhance(root);
    calendars.enhance(root);
    forms.enhance(root);
  };
  const ui: StarUIStatic = {
    dialog,
    collapsible: disclosures.collapsible,
    accordion: disclosures.accordion,
    tabs: tabs.api,
    popover: popovers.api,
    tooltip: tooltips.api,
    hoverCard: hoverCards.api,
    menu: menus.api,
    toast: toasts.api,
    select: selects.api,
    combobox: comboboxes.api,
    dataTable: dataTables.api,
    toggle: toggles.toggle,
    toggleGroup: toggles.toggleGroup,
    calendar: calendars.calendar,
    datePicker: calendars.datePicker,
    form: forms.api,
    enhance,
  };
  registerDialogActions(dialog);
  installAutoEnhancement(enhance);
  return ui;
}
