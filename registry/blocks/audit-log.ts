import $ from "jquery";
import "jquery-star";
import type { StarContext, StateRecord } from "jquery-star";

interface AuditLogState extends StateRecord {
  auditLogCount: number;
  auditLogError: string | null;
  auditLogLoading: boolean;
  auditLogMember: string;
  auditLogMessage: string;
  auditLogPage: number;
  auditLogQuery: string;
}

interface PaginationDetail {
  page: number;
}

const blockSelector = '[data-block="audit-log"]';

function auditRoot(context: StarContext<AuditLogState>): HTMLElement {
  const root = context.element?.closest(blockSelector) ?? context.root.closest(blockSelector);
  if (!(root instanceof HTMLElement)) {
    throw new Error("Audit Log action must run inside its block root.");
  }
  return root;
}

function eventDetail<T>(context: StarContext<AuditLogState>): T | undefined {
  const event = context.event as
    (Event & { detail?: T; originalEvent?: CustomEvent<T> }) | undefined;
  return event?.detail ?? event?.originalEvent?.detail;
}

function endpoint(root: HTMLElement): string {
  const value = root.dataset.auditUrl;
  if (!value) throw new Error("Audit Log needs data-audit-url.");
  return value;
}

function synchronizePagination(root: HTMLElement, state: AuditLogState): void {
  const pagination = root.querySelector<HTMLElement>('[data-jqs="pagination"]');
  if (!pagination) throw new Error("Audit Log needs Pagination.");
  const page = String(state.auditLogPage);
  if (pagination.dataset.page !== page) pagination.dataset.page = page;
  $.star.ui.enhance(pagination);
}

async function load(context: StarContext<AuditLogState>, root: HTMLElement): Promise<void> {
  context.state.auditLogError = null;
  synchronizePagination(root, context.state);
  await $.star.get<AuditLogState>(endpoint(root), {
    error: "auditLogError",
    pending: "auditLogLoading",
    payload: {
      auditLogMember: context.state.auditLogMember,
      auditLogPage: context.state.auditLogPage,
      auditLogQuery: context.state.auditLogQuery,
    },
    requestCancellation: "auto",
    retry: "never",
  })(context);
  synchronizePagination(root, context.state);
}

let installed = false;

export function installAuditLog(): void {
  if (installed) return;
  installed = true;

  $.star.action<AuditLogState>("auditLog.refresh", async (context) => {
    await load(context, auditRoot(context));
  });

  $.star.action<AuditLogState>("auditLog.filter", async (context) => {
    const root = auditRoot(context);
    context.state.auditLogPage = 1;
    await load(context, root);
  });

  $.star.action<AuditLogState>("auditLog.page", async (context) => {
    const detail = eventDetail<PaginationDetail>(context);
    if (!detail || !Number.isFinite(detail.page)) return;
    const root = auditRoot(context);
    context.state.auditLogPage = Math.max(1, Math.floor(detail.page));
    await load(context, root);
  });
}

installAuditLog();
