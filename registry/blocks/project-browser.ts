import $ from "jquery";
import "jquery-star";
import type { StarContext, StateRecord } from "jquery-star";

interface ProjectBrowserState extends StateRecord {
  projectBrowserCount: number;
  projectBrowserDirection: "ascending" | "descending" | "none";
  projectBrowserError: string | null;
  projectBrowserLoading: boolean;
  projectBrowserMessage: string;
  projectBrowserPage: number;
  projectBrowserQuery: string;
  projectBrowserSort: string;
}

interface PaginationDetail {
  page: number;
}

interface SortDetail {
  direction: "ascending" | "descending" | "none";
  key?: string;
}

const blockSelector = '[data-block="project-browser"]';

function browserRoot(context: StarContext<ProjectBrowserState>): HTMLElement {
  const root = context.element?.closest(blockSelector) ?? context.root.closest(blockSelector);
  if (!(root instanceof HTMLElement)) {
    throw new Error("Project Browser action must run inside its block root.");
  }
  return root;
}

function eventDetail<T>(context: StarContext<ProjectBrowserState>): T | undefined {
  const event = context.event as
    (Event & { detail?: T; originalEvent?: CustomEvent<T> }) | undefined;
  return event?.detail ?? event?.originalEvent?.detail;
}

function endpoint(root: HTMLElement): string {
  const value = root.dataset.projectsUrl;
  if (!value) throw new Error("Project Browser needs data-projects-url.");
  return value;
}

function synchronizeComponents(root: HTMLElement, state: ProjectBrowserState): void {
  const table = root.querySelector<HTMLElement>('[data-jqs="data-table"]');
  const pagination = root.querySelector<HTMLElement>('[data-jqs="pagination"]');
  if (!table || !pagination) throw new Error("Project Browser needs Data Table and Pagination.");
  const page = String(state.projectBrowserPage);
  if (table.dataset.page !== page) table.dataset.page = page;
  if (table.dataset.sort !== state.projectBrowserSort) {
    table.dataset.sort = state.projectBrowserSort;
  }
  if (table.dataset.direction !== state.projectBrowserDirection) {
    table.dataset.direction = state.projectBrowserDirection;
  }
  if (pagination.dataset.page !== page) pagination.dataset.page = page;
  $.star.ui.enhance(table);
  $.star.ui.enhance(pagination);
}

async function load(context: StarContext<ProjectBrowserState>, root: HTMLElement): Promise<void> {
  context.state.projectBrowserError = null;
  synchronizeComponents(root, context.state);
  await $.star.get<ProjectBrowserState>(endpoint(root), {
    error: "projectBrowserError",
    pending: "projectBrowserLoading",
    payload: {
      projectBrowserDirection: context.state.projectBrowserDirection,
      projectBrowserPage: context.state.projectBrowserPage,
      projectBrowserQuery: context.state.projectBrowserQuery,
      projectBrowserSort: context.state.projectBrowserSort,
    },
    requestCancellation: "auto",
    retry: "never",
  })(context);
}

let installed = false;

export function installProjectBrowser(): void {
  if (installed) return;
  installed = true;

  $.star.action<ProjectBrowserState>("projectBrowser.refresh", async (context) => {
    await load(context, browserRoot(context));
  });

  $.star.action<ProjectBrowserState>("projectBrowser.search", async (context) => {
    const root = browserRoot(context);
    context.state.projectBrowserPage = 1;
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.page", async (context) => {
    const detail = eventDetail<PaginationDetail>(context);
    if (!detail || !Number.isFinite(detail.page)) return;
    const root = browserRoot(context);
    context.state.projectBrowserPage = Math.max(1, Math.floor(detail.page));
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.sort", async (context) => {
    const detail = eventDetail<SortDetail>(context);
    if (!detail?.key) return;
    const root = browserRoot(context);
    context.state.projectBrowserSort = detail.key;
    context.state.projectBrowserDirection = detail.direction;
    context.state.projectBrowserPage = 1;
    await load(context, root);
  });
}

installProjectBrowser();
