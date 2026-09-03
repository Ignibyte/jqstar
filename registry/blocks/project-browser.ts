import $ from "jquery";
import "jquery-star";
import type { DataTableSort, StarContext, StateRecord } from "jquery-star";

type ColumnKey = "name" | "owner" | "status" | "updated";
type ProjectGroupKey = "none" | "owner" | "status";
type ProjectMode = "page" | "virtual";

interface ProjectBrowserState extends StateRecord {
  projectBrowserActiveFilters: number;
  projectBrowserCount: number;
  projectBrowserDirection: "ascending" | "descending" | "none";
  projectBrowserError: string | null;
  projectBrowserGroupBy: ProjectGroupKey;
  projectBrowserLoading: boolean;
  projectBrowserMessage: string;
  projectBrowserMode: ProjectMode;
  projectBrowserOwner: string;
  projectBrowserPage: number;
  projectBrowserPageSize: number;
  projectBrowserQuery: string;
  projectBrowserRangeEnd: number;
  projectBrowserRangeStart: number;
  projectBrowserRequestId: number;
  projectBrowserSort: string;
  projectBrowserSorts: DataTableSort[];
  projectBrowserStatus: string;
  projectBrowserWindowSize: number;
  projectBrowserWindowStart: number;
}

interface ColumnLayout {
  hidden: ColumnKey[];
  order: ColumnKey[];
  pinned: ColumnKey[];
  version: 1;
}

interface PaginationDetail {
  page: number;
}

interface SortDetail {
  direction: "ascending" | "descending" | "none";
  key?: string;
  sorts?: DataTableSort[];
}

interface EditResponse {
  error?: string;
  message?: string;
  project?: { name: string; version: number };
  status?: "conflict" | "updated";
}

const blockSelector = '[data-block="project-browser"]';
const columnKeys: readonly ColumnKey[] = ["name", "owner", "status", "updated"];
const optionalColumns: readonly ColumnKey[] = ["owner", "status", "updated"];
const layoutStorageKey = "jquery-star:project-browser:columns:v1";
const layouts = new WeakMap<HTMLElement, ColumnLayout>();
const expandedRows = new WeakMap<HTMLElement, Set<string>>();
const collapsedGroups = new WeakMap<HTMLElement, Set<string>>();
const virtualTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
let draggedColumn: ColumnKey | undefined;

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

function endpoint(root: HTMLElement, id?: string): string {
  const value = root.dataset.projectsUrl;
  if (!value) throw new Error("Project Browser needs data-projects-url.");
  return id ? `${value}/${encodeURIComponent(id)}` : value;
}

function control(root: HTMLElement, name: string): HTMLSelectElement {
  const element = root.querySelector<HTMLSelectElement>(`[data-project-browser-control="${name}"]`);
  if (!element) throw new Error(`Project Browser needs the ${name} control.`);
  return element;
}

function knownColumn(value: unknown): value is ColumnKey {
  return typeof value === "string" && columnKeys.includes(value as ColumnKey);
}

function normalizeLayout(value: unknown): ColumnLayout {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<ColumnLayout>)
      : {};
  const order = Array.isArray(source.order)
    ? source.order.filter(
        (column, index, values) => knownColumn(column) && values.indexOf(column) === index,
      )
    : [];
  for (const column of columnKeys) if (!order.includes(column)) order.push(column);
  const hidden = Array.isArray(source.hidden)
    ? source.hidden.filter(
        (column, index, values): column is ColumnKey =>
          knownColumn(column) &&
          optionalColumns.includes(column) &&
          values.indexOf(column) === index,
      )
    : [];
  const pinned: ColumnKey[] = Array.isArray(source.pinned)
    ? source.pinned.filter(
        (column, index, values): column is ColumnKey =>
          knownColumn(column) && values.indexOf(column) === index,
      )
    : ["name"];
  pinned.sort((left, right) => order.indexOf(left) - order.indexOf(right));
  return { hidden, order, pinned, version: 1 };
}

function layoutFor(root: HTMLElement): ColumnLayout {
  const existing = layouts.get(root);
  if (existing) return existing;
  let value: unknown;
  try {
    value = JSON.parse(localStorage.getItem(layoutStorageKey) ?? "null") as unknown;
  } catch {
    value = undefined;
  }
  const layout = normalizeLayout(value);
  layouts.set(root, layout);
  return layout;
}

function saveLayout(root: HTMLElement, layout: ColumnLayout): void {
  layouts.set(root, layout);
  try {
    localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
  } catch {
    // Storage can be unavailable in privacy modes; the in-memory layout still works.
  }
}

function orderedColumns(layout: ColumnLayout): ColumnKey[] {
  const pinned = layout.order.filter((column) => layout.pinned.includes(column));
  return [...pinned, ...layout.order.filter((column) => !layout.pinned.includes(column))];
}

function applyColumnLayout(root: HTMLElement): void {
  const layout = layoutFor(root);
  const order = orderedColumns(layout);
  const table = root.querySelector<HTMLTableElement>('[data-part="table"]');
  if (!table) return;

  for (const row of table.rows) {
    const cells = Array.from(row.cells).filter((cell) => knownColumn(cell.dataset.column));
    if (cells.length === 0) continue;
    const byColumn = new Map(cells.map((cell) => [cell.dataset.column as ColumnKey, cell]));
    for (const column of order) {
      const cell = byColumn.get(column);
      if (cell) row.append(cell);
    }
  }

  let pinnedLeft = table.tHead?.rows[0]?.cells[0]?.getBoundingClientRect().width || 44;
  const pinnedOffsets = new Map<ColumnKey, number>();
  for (const column of order.filter((candidate) => layout.pinned.includes(candidate))) {
    pinnedOffsets.set(column, pinnedLeft);
    const header = table.tHead?.querySelector<HTMLElement>(`[data-column="${column}"]`);
    pinnedLeft += header?.getBoundingClientRect().width || 176;
  }

  for (const column of columnKeys) {
    const hidden = layout.hidden.includes(column);
    for (const cell of root.querySelectorAll<HTMLElement>(`[data-column="${column}"]`)) {
      cell.hidden = hidden;
      if (layout.pinned.includes(column)) {
        cell.dataset.pinned = "left";
        cell.style.setProperty("--project-column-left", `${pinnedOffsets.get(column) ?? 44}px`);
      } else {
        cell.removeAttribute("data-pinned");
        cell.style.removeProperty("--project-column-left");
      }
    }
    const toggle = root.querySelector<HTMLInputElement>(`[data-column-toggle="${column}"]`);
    if (toggle) toggle.checked = !hidden;
    const pin = root.querySelector<HTMLButtonElement>(`[data-column-pin="${column}"]`);
    if (pin) {
      const pressed = layout.pinned.includes(column);
      pin.setAttribute("aria-pressed", String(pressed));
      pin.textContent = pressed ? "Unpin" : "Pin left";
    }
  }

  const list = root.querySelector<HTMLElement>('[data-project-browser-part="column-list"]');
  if (list) {
    for (const column of order) {
      const item = list.querySelector<HTMLElement>(`[data-column-item="${column}"]`);
      if (item) list.append(item);
    }
    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-column-item]"));
    for (const [index, item] of items.entries()) {
      const previous = item.querySelector<HTMLButtonElement>('[data-column-move="previous"]');
      const next = item.querySelector<HTMLButtonElement>('[data-column-move="next"]');
      if (previous) previous.disabled = index === 0;
      if (next) next.disabled = index === items.length - 1;
    }
  }
}

function readFilterControls(root: HTMLElement, state: ProjectBrowserState): void {
  state.projectBrowserOwner = control(root, "owner").value;
  state.projectBrowserStatus = control(root, "status").value;
}

function applyExpansion(root: HTMLElement): void {
  const expanded = expandedRows.get(root) ?? new Set<string>();
  expandedRows.set(root, expanded);
  for (const details of root.querySelectorAll<HTMLElement>("[data-project-browser-details]")) {
    const id = details.dataset.projectBrowserDetails!;
    details.hidden = !expanded.has(id);
  }
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-project-browser-expand]")) {
    const open = expanded.has(button.dataset.projectId ?? "");
    button.setAttribute("aria-expanded", String(open));
  }
}

function applyCollapsedGroups(root: HTMLElement): void {
  const collapsed = collapsedGroups.get(root) ?? new Set<string>();
  collapsedGroups.set(root, collapsed);
  for (const groupRow of root.querySelectorAll<HTMLTableRowElement>(
    "[data-project-browser-group]",
  )) {
    const key = groupRow.dataset.projectBrowserGroup!;
    const button = groupRow.querySelector<HTMLButtonElement>("[data-project-browser-group-toggle]");
    const hidden = collapsed.has(key);
    button?.setAttribute("aria-expanded", String(!hidden));
    let row = groupRow.nextElementSibling;
    while (row instanceof HTMLTableRowElement && !row.hasAttribute("data-project-browser-group")) {
      if (row.hasAttribute("data-row-id") || row.hasAttribute("data-project-browser-details")) {
        row.hidden =
          hidden ||
          (row.hasAttribute("data-project-browser-details") &&
            !expandedRows.get(root)?.has(row.dataset.projectBrowserDetails ?? ""));
      }
      row = row.nextElementSibling;
    }
  }
}

function synchronizeComponents(root: HTMLElement, state: ProjectBrowserState): void {
  const table = root.querySelector<HTMLElement>('[data-jqs="data-table"]');
  const pagination = root.querySelector<HTMLElement>('[data-jqs="pagination"]');
  const viewport = root.querySelector<HTMLElement>('[data-part="viewport"]');
  if (!table || !pagination || !viewport) {
    throw new Error("Project Browser needs Data Table, viewport, and Pagination.");
  }
  const page = String(state.projectBrowserPage);
  table.dataset.page = page;
  table.dataset.sorts = JSON.stringify(state.projectBrowserSorts);
  pagination.dataset.page = page;
  pagination.hidden = state.projectBrowserMode === "virtual";
  viewport.dataset.mode = state.projectBrowserMode;
  control(root, "page-size").value = String(state.projectBrowserPageSize);
  control(root, "group").value = state.projectBrowserGroupBy;
  control(root, "group").disabled = state.projectBrowserMode === "virtual";
  control(root, "mode").value = state.projectBrowserMode;
  $.star.ui.enhance(table);
  $.star.ui.enhance(pagination);
  applyColumnLayout(root);
  applyExpansion(root);
  applyCollapsedGroups(root);
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-project-browser-expand]")) {
    button.disabled = state.projectBrowserMode === "virtual";
    button.title =
      state.projectBrowserMode === "virtual"
        ? "Switch to Pages to expand and edit this project."
        : "Show project details";
  }
}

async function load(context: StarContext<ProjectBrowserState>, root: HTMLElement): Promise<void> {
  context.state.projectBrowserError = null;
  context.state.projectBrowserRequestId += 1;
  const requestId = context.state.projectBrowserRequestId;
  synchronizeComponents(root, context.state);
  await $.star.get<ProjectBrowserState>(endpoint(root), {
    error: "projectBrowserError",
    pending: "projectBrowserLoading",
    payload: {
      projectBrowserGroupBy: context.state.projectBrowserGroupBy,
      projectBrowserMode: context.state.projectBrowserMode,
      projectBrowserOwner: context.state.projectBrowserOwner,
      projectBrowserPage: context.state.projectBrowserPage,
      projectBrowserPageSize: context.state.projectBrowserPageSize,
      projectBrowserQuery: context.state.projectBrowserQuery,
      projectBrowserRequestId: requestId,
      projectBrowserSorts: context.state.projectBrowserSorts,
      projectBrowserStatus: context.state.projectBrowserStatus,
      projectBrowserWindowSize: context.state.projectBrowserWindowSize,
      projectBrowserWindowStart: context.state.projectBrowserWindowStart,
    },
    requestCancellation: "auto",
    retry: "never",
  })(context);
  synchronizeComponents(root, context.state);
}

function resetPosition(state: ProjectBrowserState): void {
  state.projectBrowserPage = 1;
  state.projectBrowserWindowStart = 0;
}

function actionElement(context: StarContext<ProjectBrowserState>): HTMLElement | undefined {
  if (context.element instanceof HTMLElement) return context.element;
  const target = (context.event as globalThis.Event | undefined)?.target;
  return target instanceof HTMLElement ? target : undefined;
}

function columnFromAction(context: StarContext<ProjectBrowserState>): ColumnKey | undefined {
  const element = actionElement(context)?.closest<HTMLElement>("[data-column-item]");
  return knownColumn(element?.dataset.columnItem) ? element.dataset.columnItem : undefined;
}

function moveColumn(root: HTMLElement, column: ColumnKey, targetIndex: number): void {
  const layout = layoutFor(root);
  const order = layout.order.filter((candidate) => candidate !== column);
  order.splice(Math.min(Math.max(targetIndex, 0), order.length), 0, column);
  saveLayout(root, normalizeLayout({ ...layout, order }));
  applyColumnLayout(root);
}

async function saveProject(
  context: StarContext<ProjectBrowserState>,
  root: HTMLElement,
  form: HTMLFormElement,
): Promise<void> {
  if (!form.reportValidity()) return;
  const id = form.dataset.projectBrowserEdit;
  if (!id) return;
  const body = Object.fromEntries(
    Array.from(new FormData(form), ([name, value]) => [name, String(value)]),
  );
  context.state.projectBrowserLoading = true;
  context.state.projectBrowserError = null;
  try {
    const response = await fetch(endpoint(root, id), {
      body: JSON.stringify({ ...body, version: Number(body.version) }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });
    const result = (await response.json()) as EditResponse;
    if (!response.ok) {
      if (response.status === 409) {
        await load(context, root);
        context.state.projectBrowserError =
          result.error ?? "The project changed. Reload and retry.";
        root
          .querySelector<HTMLInputElement>(`[data-project-browser-edit="${id}"] input[name="name"]`)
          ?.focus();
        return;
      }
      throw new Error(result.error ?? `Project update failed with ${response.status}.`);
    }
    await load(context, root);
    context.state.projectBrowserMessage = result.message ?? "Project saved.";
    root
      .querySelector<HTMLInputElement>(`[data-project-browser-edit="${id}"] input[name="name"]`)
      ?.focus();
  } catch (error) {
    context.state.projectBrowserError = error instanceof Error ? error.message : String(error);
  } finally {
    context.state.projectBrowserLoading = false;
  }
}

function initializeRoot(root: HTMLElement): void {
  applyColumnLayout(root);
  applyExpansion(root);
}

function initializeRoots(node: ParentNode): void {
  if (node instanceof HTMLElement && node.matches(blockSelector)) initializeRoot(node);
  for (const root of node.querySelectorAll<HTMLElement>(blockSelector)) initializeRoot(root);
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
    readFilterControls(root, context.state);
    resetPosition(context.state);
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.filter", async (context) => {
    const root = browserRoot(context);
    readFilterControls(root, context.state);
    resetPosition(context.state);
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.clearFilters", async (context) => {
    const root = browserRoot(context);
    context.state.projectBrowserQuery = "";
    context.state.projectBrowserOwner = "all";
    context.state.projectBrowserStatus = "all";
    resetPosition(context.state);
    control(root, "owner").value = "all";
    control(root, "status").value = "all";
    const search = root.querySelector<HTMLInputElement>("#project-browser-query");
    if (search) search.value = "";
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.pageSize", async (context) => {
    const root = browserRoot(context);
    context.state.projectBrowserPageSize = Number(control(root, "page-size").value);
    resetPosition(context.state);
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.group", async (context) => {
    const root = browserRoot(context);
    context.state.projectBrowserGroupBy = control(root, "group").value as ProjectGroupKey;
    collapsedGroups.get(root)?.clear();
    resetPosition(context.state);
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.mode", async (context) => {
    const root = browserRoot(context);
    context.state.projectBrowserMode = control(root, "mode").value as ProjectMode;
    if (context.state.projectBrowserMode === "virtual") {
      context.state.projectBrowserGroupBy = "none";
      expandedRows.get(root)?.clear();
      collapsedGroups.get(root)?.clear();
    }
    resetPosition(context.state);
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.columns", (context) => {
    const root = browserRoot(context);
    const layout = layoutFor(root);
    layout.hidden = optionalColumns.filter((column) => {
      const toggle = root.querySelector<HTMLInputElement>(`[data-column-toggle="${column}"]`);
      return toggle ? !toggle.checked : false;
    });
    saveLayout(root, normalizeLayout(layout));
    applyColumnLayout(root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.columnMove", (context) => {
    const root = browserRoot(context);
    const column = columnFromAction(context);
    const direction = actionElement(context)?.dataset.columnMove;
    if (!column || (direction !== "previous" && direction !== "next")) return;
    const layout = layoutFor(root);
    const index = layout.order.indexOf(column);
    moveColumn(root, column, index + (direction === "previous" ? -1 : 1));
    actionElement(context)?.focus();
  });

  $.star.action<ProjectBrowserState>("projectBrowser.columnPin", (context) => {
    const root = browserRoot(context);
    const column = columnFromAction(context);
    if (!column) return;
    const layout = layoutFor(root);
    layout.pinned = layout.pinned.includes(column)
      ? layout.pinned.filter((candidate) => candidate !== column)
      : [...layout.pinned, column];
    saveLayout(root, normalizeLayout(layout));
    applyColumnLayout(root);
    root.querySelector<HTMLButtonElement>(`[data-column-pin="${column}"]`)?.focus();
  });

  $.star.action<ProjectBrowserState>("projectBrowser.columnDragStart", (context) => {
    draggedColumn = columnFromAction(context);
    const event = context.event as DragEvent | undefined;
    if (event?.dataTransfer && draggedColumn) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedColumn);
    }
  });

  $.star.action<ProjectBrowserState>("projectBrowser.columnDragOver", (context) => {
    const event = context.event as DragEvent | undefined;
    event?.preventDefault();
    if (event?.dataTransfer) event.dataTransfer.dropEffect = "move";
  });

  $.star.action<ProjectBrowserState>("projectBrowser.columnDrop", (context) => {
    const root = browserRoot(context);
    const target = columnFromAction(context);
    const source = draggedColumn;
    draggedColumn = undefined;
    if (!source || !target || source === target) return;
    moveColumn(root, source, layoutFor(root).order.indexOf(target));
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
    context.state.projectBrowserSorts = (detail.sorts ?? []).map((sort) => ({ ...sort }));
    context.state.projectBrowserSort = context.state.projectBrowserSorts[0]?.key ?? "";
    context.state.projectBrowserDirection =
      context.state.projectBrowserSorts[0]?.direction ?? "none";
    resetPosition(context.state);
    await load(context, root);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.expand", async (context) => {
    const root = browserRoot(context);
    const id = actionElement(context)?.closest<HTMLElement>("[data-project-id]")?.dataset.projectId;
    if (!id) return;
    const expanded = expandedRows.get(root) ?? new Set<string>();
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    expandedRows.set(root, expanded);
    if (expanded.has(id) && !root.querySelector(`[data-project-browser-details="${id}"]`)) {
      await load(context, root);
    }
    applyExpansion(root);
    applyCollapsedGroups(root);
    root
      .querySelector<HTMLButtonElement>(`[data-project-browser-expand][data-project-id="${id}"]`)
      ?.focus();
  });

  $.star.action<ProjectBrowserState>("projectBrowser.groupToggle", (context) => {
    const root = browserRoot(context);
    const key = actionElement(context)?.closest<HTMLElement>("[data-project-browser-group]")
      ?.dataset.projectBrowserGroup;
    if (!key) return;
    const collapsed = collapsedGroups.get(root) ?? new Set<string>();
    if (collapsed.has(key)) collapsed.delete(key);
    else collapsed.add(key);
    collapsedGroups.set(root, collapsed);
    applyCollapsedGroups(root);
    root.querySelector<HTMLButtonElement>(`[data-project-browser-group-toggle="${key}"]`)?.focus();
  });

  $.star.action<ProjectBrowserState>("projectBrowser.save", async (context) => {
    const root = browserRoot(context);
    const form = actionElement(context)?.closest<HTMLFormElement>(
      "form[data-project-browser-edit]",
    );
    if (form) await saveProject(context, root, form);
  });

  $.star.action<ProjectBrowserState>("projectBrowser.virtualScroll", (context) => {
    const root = browserRoot(context);
    if (context.state.projectBrowserMode !== "virtual") return;
    const viewport = actionElement(context)?.closest<HTMLElement>('[data-part="viewport"]');
    if (!viewport) return;
    const existing = virtualTimers.get(root);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      const start = Math.max(Math.floor(viewport.scrollTop / 52) - 10, 0);
      if (Math.abs(start - context.state.projectBrowserWindowStart) < 10) return;
      context.state.projectBrowserWindowStart = start;
      void load(context, root);
    }, 80);
    virtualTimers.set(root, timer);
  });

  queueMicrotask(() => initializeRoots(document));
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes)
        if (node instanceof HTMLElement) initializeRoots(node);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

installProjectBrowser();
