import { registerAction } from "../registry";
import type { PaginationTarget, StarContext, StarPaginationStatic } from "../types";

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

interface PaginationRecord {
  cleanup: () => void;
  page: number;
  pageCount: number;
  root: HTMLElement;
}

const records = new WeakMap<HTMLElement, PaginationRecord>();
let paginationId = 0;

function paginationRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="pagination"]')
    ? value
    : undefined;
}

function owned(root: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.closest('[data-jqs="pagination"]') === root,
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
    new CustomEvent(`jquery-star:pagination:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function setDisabled(element: HTMLElement, disabled: boolean): void {
  if (disabled && element.getAttribute("aria-disabled") !== "true") {
    element.setAttribute("aria-disabled", "true");
  } else if (!disabled && element.hasAttribute("aria-disabled")) {
    element.removeAttribute("aria-disabled");
  }
  if (element instanceof HTMLButtonElement && element.disabled !== disabled) {
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

function change(record: PaginationRecord, requestedPage: number): boolean {
  if (unavailable(record) || !Number.isFinite(requestedPage)) return false;
  const page = clamp(requestedPage, record.pageCount);
  const previousPage = record.page;
  if (page === previousPage) return false;
  if (!emit(record, "before-change", page, previousPage, true)) return false;
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

function wire(record: PaginationRecord): () => void {
  const cleanups: Array<() => void> = [];
  const controls = owned(
    record.root,
    '[data-part="previous"], [data-part="next"], [data-part="page"][data-page]',
  );
  for (const control of controls) {
    const click = (event: MouseEvent): void => {
      const page = requestedPage(record, control);
      const blocked = control.getAttribute("aria-disabled") === "true" || page === undefined;
      const manual =
        record.root.dataset.navigation === "manual" || control instanceof HTMLButtonElement;
      if (blocked || manual || page === record.page) event.preventDefault();
      if (!blocked) {
        const accepted = change(record, page!);
        if (!accepted && page !== record.page) event.preventDefault();
      }
    };
    control.addEventListener("click", click);
    cleanups.push(() => control.removeEventListener("click", click));
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}

function enhancePagination(root: HTMLElement): PaginationRecord {
  root.id ||= `jqs-pagination-${++paginationId}`;
  const existing = records.get(root);
  const requestedCount = positiveInteger(root.dataset.pageCount) ?? inferredPageCount(root);
  const requestedCurrent =
    positiveInteger(root.dataset.page) ?? (existing ? existing.page : inferredPage(root));
  const record: PaginationRecord = existing ?? {
    cleanup: () => undefined,
    page: requestedCurrent,
    pageCount: requestedCount,
    root,
  };
  record.cleanup();
  record.pageCount = requestedCount;
  record.page = clamp(requestedCurrent, requestedCount);
  records.set(root, record);
  render(record);
  record.cleanup = wire(record);
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
  if (target instanceof HTMLElement && target.matches('[data-jqs="pagination"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="pagination"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="pagination"]')));
  for (const element of elements) {
    const pagination = paginationRoot(element);
    if (pagination) enhancePagination(pagination);
  }
}

export function createPaginations(): PaginationCollection {
  const api: StarPaginationStatic = {
    page: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhancePagination(root)).page;
    },
    pageCount: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhancePagination(root)).pageCount;
    },
    goTo: (target, page) => {
      const root = resolve(target);
      change(records.get(root) ?? enhancePagination(root), page);
      return root;
    },
    next: (target) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhancePagination(root);
      change(record, record.page + 1);
      return root;
    },
    previous: (target) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhancePagination(root);
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
