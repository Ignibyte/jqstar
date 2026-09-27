import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { PaginationTarget, StarContext, StarPaginationStatic } from "../types";
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

interface PaginationCollection {
  api: StarPaginationStatic;
  enhance(root: ParentNode): void;
}

interface PaginationEventDetail {
  page: number;
  pageCount: number;
  pagination: HTMLElement;
  previousPage: number;
}

interface PaginationRecord extends UIResources {
  parts: HTMLElement[];
  page: number;
  pageCount: number;
}

const records = new WeakMap<HTMLElement, PaginationRecord>();
let paginationId = 0;

function paginationRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="pagination"]') ? value : undefined;
}

function owned(root: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => isHTMLElement(element) && element.closest('[data-jqs="pagination"]') === root,
  );
}

function positiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function pageControls(root: HTMLElement): HTMLElement[] {
  return owned(root, '[data-part="page"][data-page]');
}

function inferredPageCount(root: HTMLElement): number {
  return Math.max(
    1,
    ...pageControls(root).map((control) => positiveInteger(control.dataset.page) ?? 1),
  );
}

function inferredPage(root: HTMLElement): number {
  const current = pageControls(root).find(
    (control) => control.getAttribute("aria-current") === "page",
  );
  return positiveInteger(current?.dataset.page) ?? 1;
}

function clamp(page: number, pageCount: number): number {
  return Math.min(Math.max(Math.floor(page), 1), pageCount);
}

function unavailable(record: PaginationRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    record.root.dataset.disabled === "true"
  );
}

function emit(
  record: PaginationRecord,
  name: "before-change" | "change",
  page: number,
  previousPage: number,
  cancelable = false,
): boolean {
  const detail: PaginationEventDetail = {
    page,
    pageCount: record.pageCount,
    pagination: record.root,
    previousPage,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:pagination:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
  );
}

function setDisabled(element: HTMLElement, disabled: boolean): void {
  if (disabled && element.getAttribute("aria-disabled") !== "true") {
    element.setAttribute("aria-disabled", "true");
  } else if (!disabled && element.hasAttribute("aria-disabled")) {
    element.removeAttribute("aria-disabled");
  }
  if (isHTMLTag(element, "button") && element.disabled !== disabled) {
    element.disabled = disabled;
  }
}

function render(record: PaginationRecord): void {
  record.page = clamp(record.page, record.pageCount);
  if (record.root.dataset.page !== String(record.page)) {
    record.root.dataset.page = String(record.page);
  }
  if (record.root.dataset.pageCount !== String(record.pageCount)) {
    record.root.dataset.pageCount = String(record.pageCount);
  }
  const state =
    record.pageCount === 1
      ? "single"
      : record.page === 1
        ? "first"
        : record.page === record.pageCount
          ? "last"
          : "middle";
  if (record.root.dataset.state !== state) {
    record.root.dataset.state = state;
  }

  for (const control of pageControls(record.root)) {
    const page = positiveInteger(control.dataset.page);
    if (!page) {
      throw new Error(`Pagination #${record.root.id} page controls need a positive data-page.`);
    }
    if (page === record.page && control.getAttribute("aria-current") !== "page") {
      control.setAttribute("aria-current", "page");
    } else if (page !== record.page && control.hasAttribute("aria-current")) {
      control.removeAttribute("aria-current");
    }
  }

  const disabled = unavailable(record);
  for (const previous of owned(record.root, '[data-part="previous"]')) {
    setDisabled(previous, disabled || record.page <= 1);
  }
  for (const next of owned(record.root, '[data-part="next"]')) {
    setDisabled(next, disabled || record.page >= record.pageCount);
  }
  for (const status of owned(record.root, '[data-part="status"]')) {
    const text = `Page ${record.page} of ${record.pageCount}`;
    if (status.textContent !== text) status.textContent = text;
  }
}

function currentParts(root: HTMLElement): HTMLElement[] {
  return owned(
    root,
    '[data-part="previous"], [data-part="next"], [data-part="page"], [data-part="status"]',
  );
}

function current(record: PaginationRecord, revision = record.revision): boolean {
  const parts = currentParts(record.root);
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    parts.length === record.parts.length &&
    parts.every((part, index) => part === record.parts[index])
  );
}

function signature(record: PaginationRecord): string {
  return JSON.stringify([
    record.root.dataset.page,
    record.root.dataset.pageCount,
    record.root.dataset.navigation,
    ...record.parts.map((part) => part.dataset.page),
  ]);
}

function recordFor(root: HTMLElement): PaginationRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhancePagination(root);
}

function change(record: PaginationRecord, requestedPage: number): boolean {
  const revision = ++record.revision;
  const authored = signature(record);
  if (!current(record) || unavailable(record) || !Number.isFinite(requestedPage)) return false;
  const page = clamp(requestedPage, record.pageCount);
  const previousPage = record.page;
  if (page === previousPage) return false;
  if (
    !emit(record, "before-change", page, previousPage, true) ||
    !current(record, revision) ||
    unavailable(record) ||
    signature(record) !== authored
  )
    return false;
  record.page = page;
  render(record);
  emit(record, "change", page, previousPage);
  return true;
}

function requestedPage(record: PaginationRecord, control: HTMLElement): number | undefined {
  if (control.matches('[data-part="previous"]')) return record.page - 1;
  if (control.matches('[data-part="next"]')) return record.page + 1;
  return positiveInteger(control.dataset.page);
}

function wire(record: PaginationRecord): void {
  const controls = owned(
    record.root,
    '[data-part="previous"], [data-part="next"], [data-part="page"][data-page]',
  );
  for (const control of controls) {
    const click = (event: MouseEvent): void => {
      if (
        event.defaultPrevented ||
        (isHTMLTag(control, "a") &&
          (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey))
      )
        return;
      const page = requestedPage(record, control);
      const blocked = control.getAttribute("aria-disabled") === "true" || page === undefined;
      const manual = record.root.dataset.navigation === "manual" || isHTMLTag(control, "button");
      if (blocked || manual || page === record.page) event.preventDefault();
      if (!blocked) {
        const accepted = change(record, page);
        if (!accepted && page !== record.page) event.preventDefault();
      }
    };
    listenUI(record, () => current(record), control, "click", click as EventListener);
  }
}

function enhancePagination(root: HTMLElement): PaginationRecord {
  root.id ||= `jqs-pagination-${++paginationId}`;
  const existing = records.get(root);
  const requestedCount = positiveInteger(root.dataset.pageCount) ?? inferredPageCount(root);
  const requestedCurrent =
    positiveInteger(root.dataset.page) ?? (existing ? existing.page : inferredPage(root));
  const reusable = existing && current(existing);
  if (!reusable) existing?.cleanup();
  const replacement = records.get(root);
  if (!reusable && replacement) return replacement;
  const record: PaginationRecord = reusable
    ? existing
    : {
        ...uiResources(root),
        parts: currentParts(root),
        page: clamp(requestedCurrent, requestedCount),
        pageCount: requestedCount,
      };
  if (!reusable)
    record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    if (!current(record)) return record;
    if (reusable) {
      if (
        record.pageCount !== requestedCount ||
        record.page !== clamp(requestedCurrent, requestedCount)
      )
        record.revision += 1;
      record.pageCount = requestedCount;
      record.page = clamp(requestedCurrent, requestedCount);
    }
    render(record);
    if (!reusable) wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function resolve(target: PaginationTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? paginationRoot(root.querySelector(target))
      : paginationRoot(target);
  if (resolved) return resolved;
  throw new Error(`Pagination target did not match data-jqs="pagination": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="pagination"]');
  return resolve(isHTMLElement(closest) ? closest : String(target), context.root);
}

function enhanceAll(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="pagination"]')) {
    const pagination = paginationRoot(element);
    if (pagination) enhancePagination(pagination);
  }
}

export function createPaginations(registerAction: ActionRegistrar): PaginationCollection {
  const api: StarPaginationStatic = {
    page: (target) => {
      const root = resolve(target);
      return recordFor(root).page;
    },
    pageCount: (target) => {
      const root = resolve(target);
      return recordFor(root).pageCount;
    },
    goTo: (target, page) => {
      const root = resolve(target);
      change(recordFor(root), page);
      return root;
    },
    next: (target) => {
      const root = resolve(target);
      const record = recordFor(root);
      change(record, record.page + 1);
      return root;
    },
    previous: (target) => {
      const root = resolve(target);
      const record = recordFor(root);
      change(record, record.page - 1);
      return root;
    },
  };
  registerAction("ui.pagination.page", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicit = second !== undefined || (typeof first === "string" && first.startsWith("#"));
    return api.goTo(
      controlled(context, explicit ? first : undefined),
      Number(explicit ? second : first),
    );
  });
  registerAction("ui.pagination.next", (context) =>
    api.next(controlled(context, context.args?.[0])),
  );
  registerAction("ui.pagination.previous", (context) =>
    api.previous(controlled(context, context.args?.[0])),
  );
  return { api, enhance: enhanceAll };
}
