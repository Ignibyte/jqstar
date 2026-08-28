import { registerAction } from "../registry";
import type {
  DataTableSortDirection,
  DataTableTarget,
  StarContext,
  StarDataTableStatic,
} from "../types";

interface DataTableRecord {
  cleanups: Array<() => void>;
  filter: string;
  initializedRows: Set<string>;
  nextOrder: number;
  order: WeakMap<HTMLTableRowElement, number>;
  page: number;
  root: HTMLElement;
  selected: Set<string>;
  sortDirection: DataTableSortDirection;
  sortKey: string | undefined;
  table: HTMLTableElement;
}

interface DataTableEventDetail {
  dataTable: HTMLElement;
  direction: DataTableSortDirection;
  filter: string;
  key?: string;
  page: number;
  selected: string[];
}

interface DataTableCollection {
  api: StarDataTableStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, DataTableRecord>();
let dataTableId = 0;

function dataTableRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="data-table"]')
    ? value
    : undefined;
}

function owned(record: DataTableRecord, selector: string): HTMLElement[] {
  return Array.from(record.root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.closest('[data-jqs="data-table"]') === record.root,
  );
}

function tablePart(root: HTMLElement): HTMLTableElement {
  const table = Array.from(root.children).find(
    (child): child is HTMLTableElement =>
      child instanceof HTMLTableElement && child.getAttribute("data-part") === "table",
  );
  if (table) return table;
  const viewport = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === "viewport",
  );
  const nested = viewport?.querySelector<HTMLTableElement>(':scope > table[data-part="table"]');
  if (nested) return nested;
  throw new Error(
    `Data Table #${root.id} needs a direct table or viewport table data-part="table".`,
  );
}

function rows(record: DataTableRecord): HTMLTableRowElement[] {
  return Array.from(record.table.tBodies).flatMap((body) => Array.from(body.rows));
}

function rowId(row: HTMLTableRowElement): string | undefined {
  return row.getAttribute("data-row-id")?.trim() || undefined;
}

function rowCheckbox(row: HTMLTableRowElement): HTMLInputElement | undefined {
  return (
    Array.from(row.querySelectorAll<HTMLInputElement>('input[data-part="row-select"]')).find(
      (input) =>
        input.closest('[data-jqs="data-table"]') === row.closest('[data-jqs="data-table"]'),
    ) ?? undefined
  );
}

function selectableRows(record: DataTableRecord): HTMLTableRowElement[] {
  return rows(record).filter((row) => rowCheckbox(row) && rowId(row));
}

function visibleSelectableRows(record: DataTableRecord): HTMLTableRowElement[] {
  return selectableRows(record).filter((row) => !row.hidden);
}

function filterControl(record: DataTableRecord): HTMLInputElement | undefined {
  return owned(record, 'input[data-part="filter"]')[0] as HTMLInputElement | undefined;
}

function headers(record: DataTableRecord): HTMLTableCellElement[] {
  return Array.from(
    record.table.tHead?.querySelectorAll<HTMLTableCellElement>("th[data-key]") ?? [],
  );
}

function emit(
  record: DataTableRecord,
  name: "before-sort" | "sort" | "filter" | "page" | "selection-change",
  cancelable = false,
): boolean {
  const detail: DataTableEventDetail = {
    dataTable: record.root,
    direction: record.sortDirection,
    filter: record.filter,
    page: record.page,
    selected: [...record.selected],
    ...(record.sortKey ? { key: record.sortKey } : {}),
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:data-table:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function pageSize(record: DataTableRecord): number {
  const value = Number(record.root.getAttribute("data-page-size") ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : Number.POSITIVE_INFINITY;
}

function manual(record: DataTableRecord): boolean {
  return record.root.getAttribute("data-processing") === "manual";
}

function cellFor(row: HTMLTableRowElement, key: string): HTMLTableCellElement | undefined {
  return Array.from(row.cells).find((cell) => cell.getAttribute("data-key") === key);
}

function comparable(cell: HTMLTableCellElement | undefined, type: string): string | number {
  const source = cell?.getAttribute("data-value") ?? cell?.textContent?.trim() ?? "";
  if (type === "number") {
    const value = Number(source.replaceAll(",", ""));
    return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
  }
  if (type === "date") {
    const value = Date.parse(source);
    return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
  }
  return source;
}

function compareValues(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function reorder(record: DataTableRecord): void {
  if (manual(record)) return;
  const header = headers(record).find((candidate) => candidate.dataset.key === record.sortKey);
  const type = header?.getAttribute("data-type") ?? "string";
  for (const body of Array.from(record.table.tBodies)) {
    const current = Array.from(body.rows);
    const desired = [...current].sort((left, right) => {
      if (!record.sortKey || record.sortDirection === "none") {
        return (record.order.get(left) ?? 0) - (record.order.get(right) ?? 0);
      }
      const result = compareValues(
        comparable(cellFor(left, record.sortKey), type),
        comparable(cellFor(right, record.sortKey), type),
      );
      if (result !== 0) return record.sortDirection === "descending" ? -result : result;
      return (record.order.get(left) ?? 0) - (record.order.get(right) ?? 0);
    });
    if (desired.some((row, index) => row !== current[index])) body.append(...desired);
  }
}

function matchingRows(record: DataTableRecord): HTMLTableRowElement[] {
  const query = record.filter.trim().toLocaleLowerCase();
  return rows(record).filter(
    (row) => !query || (row.textContent?.toLocaleLowerCase().includes(query) ?? false),
  );
}

function setText(record: DataTableRecord, part: string, value: string): void {
  for (const element of owned(record, `[data-part="${part}"]`)) {
    if (element.textContent !== value) element.textContent = value;
  }
}

function syncSortHeaders(record: DataTableRecord): void {
  if (record.sortKey && record.sortDirection !== "none") {
    if (record.root.dataset.sort !== record.sortKey) record.root.dataset.sort = record.sortKey;
    if (record.root.dataset.direction !== record.sortDirection) {
      record.root.dataset.direction = record.sortDirection;
    }
  } else {
    if (record.root.hasAttribute("data-sort")) record.root.removeAttribute("data-sort");
    if (record.root.hasAttribute("data-direction")) record.root.removeAttribute("data-direction");
  }
  for (const header of headers(record)) {
    const active = header.dataset.key === record.sortKey && record.sortDirection !== "none";
    if (active) header.setAttribute("aria-sort", record.sortDirection);
    else header.removeAttribute("aria-sort");
    const button = header.querySelector<HTMLElement>('[data-part="sort"]');
    const buttonDirection = active ? record.sortDirection : "none";
    if (button && button.dataset.direction !== buttonDirection) {
      button.dataset.direction = buttonDirection;
    }
  }
}

function syncSelection(record: DataTableRecord): void {
  for (const row of selectableRows(record)) {
    const id = rowId(row)!;
    const checked = record.selected.has(id);
    const checkbox = rowCheckbox(row)!;
    checkbox.checked = checked;
    row.dataset.selected = String(checked);
  }
  const visible = visibleSelectableRows(record);
  const selectedVisible = visible.filter((row) => record.selected.has(rowId(row)!)).length;
  for (const checkbox of owned(record, 'input[data-part="select-all"]')) {
    if (!(checkbox instanceof HTMLInputElement)) continue;
    checkbox.checked = visible.length > 0 && selectedVisible === visible.length;
    checkbox.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
    if (checkbox.disabled !== (visible.length === 0)) checkbox.disabled = visible.length === 0;
  }
  record.root.dataset.selectionCount = String(record.selected.size);
  setText(record, "selection-status", `${record.selected.size} selected`);
}

function render(record: DataTableRecord): void {
  reorder(record);
  syncSortHeaders(record);
  if (manual(record)) {
    if (record.root.dataset.page !== String(record.page)) {
      record.root.dataset.page = String(record.page);
    }
    syncSelection(record);
    return;
  }

  const matching = matchingRows(record);
  const size = pageSize(record);
  const pageCount = Number.isFinite(size) ? Math.max(1, Math.ceil(matching.length / size)) : 1;
  record.page = Math.min(Math.max(record.page, 1), pageCount);
  const start = Number.isFinite(size) ? (record.page - 1) * size : 0;
  const end = Number.isFinite(size) ? Math.min(start + size, matching.length) : matching.length;
  const visible = new Set(matching.slice(start, end));
  for (const row of rows(record)) row.hidden = !visible.has(row);

  if (record.root.dataset.page !== String(record.page)) {
    record.root.dataset.page = String(record.page);
  }
  record.root.dataset.pageCount = String(pageCount);
  record.root.dataset.rowCount = String(matching.length);
  setText(
    record,
    "page-status",
    matching.length === 0 ? "0 of 0" : `${start + 1}–${end} of ${matching.length}`,
  );
  for (const button of owned(record, '[data-part="previous"]')) {
    if (button instanceof HTMLButtonElement && button.disabled !== record.page <= 1) {
      button.disabled = record.page <= 1;
    }
  }
  for (const button of owned(record, '[data-part="next"]')) {
    if (button instanceof HTMLButtonElement && button.disabled !== record.page >= pageCount) {
      button.disabled = record.page >= pageCount;
    }
  }
  syncSelection(record);
}

function sortTable(
  root: HTMLElement,
  key: string,
  direction?: DataTableSortDirection,
): HTMLElement {
  const record = records.get(root) ?? enhanceDataTable(root);
  if (!headers(record).some((header) => header.dataset.key === key)) {
    throw new Error(`Data Table #${root.id} has no sortable header with key "${key}".`);
  }
  const next =
    direction ??
    (record.sortKey !== key || record.sortDirection === "none"
      ? "ascending"
      : record.sortDirection === "ascending"
        ? "descending"
        : "none");
  const previousKey = record.sortKey;
  const previousDirection = record.sortDirection;
  record.sortKey = next === "none" ? undefined : key;
  record.sortDirection = next;
  if (!emit(record, "before-sort", true)) {
    record.sortKey = previousKey;
    record.sortDirection = previousDirection;
    return root;
  }
  record.page = 1;
  render(record);
  emit(record, "sort");
  return root;
}

function filterTable(root: HTMLElement, query: string): HTMLElement {
  const record = records.get(root) ?? enhanceDataTable(root);
  record.filter = query;
  record.page = 1;
  const input = filterControl(record);
  if (input && input.value !== query) input.value = query;
  render(record);
  emit(record, "filter");
  return root;
}

function pageTable(root: HTMLElement, page: number): HTMLElement {
  const record = records.get(root) ?? enhanceDataTable(root);
  if (!Number.isFinite(page)) return root;
  record.page = Math.max(1, Math.floor(page));
  render(record);
  emit(record, "page");
  return root;
}

function configureRows(record: DataTableRecord): void {
  const currentIds = new Set<string>();
  for (const row of rows(record)) {
    if (!record.order.has(row)) record.order.set(row, record.nextOrder++);
    const checkbox = rowCheckbox(row);
    if (!checkbox) continue;
    const id = rowId(row);
    if (!id) throw new Error(`Selectable rows in Data Table #${record.root.id} need data-row-id.`);
    if (currentIds.has(id))
      throw new Error(`Data Table #${record.root.id} has duplicate row id "${id}".`);
    currentIds.add(id);
    checkbox.value ||= id;
    if (!record.initializedRows.has(id)) {
      if (checkbox.checked) record.selected.add(id);
      record.initializedRows.add(id);
    }
  }
}

function wire(record: DataTableRecord): void {
  for (const header of headers(record)) {
    const button = header.querySelector<HTMLElement>('[data-part="sort"]');
    if (!button) continue;
    const click = (): void => {
      sortTable(record.root, header.dataset.key!);
    };
    button.addEventListener("click", click);
    record.cleanups.push(() => button.removeEventListener("click", click));
  }

  const filter = filterControl(record);
  if (filter) {
    const input = (): void => {
      filterTable(record.root, filter.value);
    };
    filter.addEventListener("input", input);
    record.cleanups.push(() => filter.removeEventListener("input", input));
  }

  for (const button of owned(record, '[data-part="previous"]')) {
    const click = (): void => {
      pageTable(record.root, record.page - 1);
    };
    button.addEventListener("click", click);
    record.cleanups.push(() => button.removeEventListener("click", click));
  }
  for (const button of owned(record, '[data-part="next"]')) {
    const click = (): void => {
      pageTable(record.root, record.page + 1);
    };
    button.addEventListener("click", click);
    record.cleanups.push(() => button.removeEventListener("click", click));
  }

  for (const row of selectableRows(record)) {
    const checkbox = rowCheckbox(row)!;
    const change = (): void => {
      const id = rowId(row)!;
      if (checkbox.checked) {
        if (record.root.getAttribute("data-selection") === "single") record.selected.clear();
        record.selected.add(id);
      } else {
        record.selected.delete(id);
      }
      syncSelection(record);
      emit(record, "selection-change");
    };
    checkbox.addEventListener("change", change);
    record.cleanups.push(() => checkbox.removeEventListener("change", change));
  }

  for (const checkbox of owned(record, 'input[data-part="select-all"]')) {
    if (!(checkbox instanceof HTMLInputElement)) continue;
    const change = (): void => {
      for (const row of visibleSelectableRows(record)) {
        const id = rowId(row)!;
        if (checkbox.checked) record.selected.add(id);
        else record.selected.delete(id);
      }
      syncSelection(record);
      emit(record, "selection-change");
    };
    checkbox.addEventListener("change", change);
    record.cleanups.push(() => checkbox.removeEventListener("change", change));
  }
}

function enhanceDataTable(root: HTMLElement): DataTableRecord {
  root.id ||= `jqs-data-table-${++dataTableId}`;
  const table = tablePart(root);
  let record = records.get(root);
  if (!record) {
    const direction = root.getAttribute("data-direction");
    record = {
      cleanups: [],
      filter: "",
      initializedRows: new Set(),
      nextOrder: 0,
      order: new WeakMap(),
      page: Math.max(1, Number(root.getAttribute("data-page") ?? 1) || 1),
      root,
      selected: new Set(),
      sortDirection: direction === "ascending" || direction === "descending" ? direction : "none",
      sortKey: root.getAttribute("data-sort") ?? undefined,
      table,
    };
    records.set(root, record);
  } else {
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.table = table;
    const requestedPage = Number(root.getAttribute("data-page"));
    if (Number.isFinite(requestedPage) && requestedPage > 0)
      record.page = Math.floor(requestedPage);
    const requestedSort = root.getAttribute("data-sort");
    const requestedDirection = root.getAttribute("data-direction");
    record.sortKey = requestedSort || undefined;
    if (
      requestedDirection === "ascending" ||
      requestedDirection === "descending" ||
      requestedDirection === "none"
    ) {
      record.sortDirection = requestedDirection;
    } else if (!record.sortKey) {
      record.sortDirection = "none";
    }
  }

  const filter = filterControl(record);
  if (filter) record.filter = filter.value;
  configureRows(record);
  render(record);
  wire(record);
  return record;
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="data-table"]')));
  for (const element of elements) {
    const dataTable = dataTableRoot(element);
    if (dataTable) enhanceDataTable(dataTable);
  }
}

function resolveRoot(target: DataTableTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? dataTableRoot(root.querySelector(target)) : dataTableRoot(target);
  if (resolved) return resolved;
  throw new Error(`Data Table target did not match data-jqs="data-table": ${String(target)}`);
}

function controlledDataTable(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="data-table"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
  }
  const root = context.element?.closest('[data-jqs="data-table"]') ?? null;
  const resolved = dataTableRoot(root);
  if (resolved) return resolved;
  throw new Error('Data Table action needs a selector or an element inside data-jqs="data-table".');
}

function registerActions(api: StarDataTableStatic): void {
  registerAction("ui.dataTable.sort", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const third = context.args?.[2];
    const explicitRoot =
      second !== undefined || (typeof first === "string" && first.startsWith("#"));
    const root = controlledDataTable(context, explicitRoot ? first : undefined);
    const key = explicitRoot ? second : first;
    const direction = explicitRoot ? third : second;
    if (typeof key !== "string") throw new Error("ui.dataTable.sort needs a column key.");
    return api.sort(
      root,
      key,
      direction === "ascending" || direction === "descending" || direction === "none"
        ? direction
        : undefined,
    );
  });
  registerAction("ui.dataTable.filter", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicitRoot =
      second !== undefined || (typeof first === "string" && first.startsWith("#"));
    const root = controlledDataTable(context, explicitRoot ? first : undefined);
    return api.filter(root, String(explicitRoot ? (second ?? "") : (first ?? "")));
  });
  for (const operation of ["next", "previous"] as const) {
    registerAction(`ui.dataTable.${operation}`, (context) =>
      api[operation](controlledDataTable(context, context.args?.[0])),
    );
  }
  registerAction("ui.dataTable.page", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicitRoot = second !== undefined || typeof first === "string";
    const root = controlledDataTable(context, explicitRoot ? first : undefined);
    return api.page(root, Number(explicitRoot ? second : first));
  });
}

export function createDataTables(): DataTableCollection {
  const api: StarDataTableStatic = {
    sort: (target, key, direction) => sortTable(resolveRoot(target), key, direction),
    filter: (target, query) => filterTable(resolveRoot(target), query),
    page: (target, page) => pageTable(resolveRoot(target), page),
    next: (target) => {
      const root = resolveRoot(target);
      const record = records.get(root) ?? enhanceDataTable(root);
      return pageTable(root, record.page + 1);
    },
    previous: (target) => {
      const root = resolveRoot(target);
      const record = records.get(root) ?? enhanceDataTable(root);
      return pageTable(root, record.page - 1);
    },
    selected: (target) => {
      const root = resolveRoot(target);
      return [...(records.get(root) ?? enhanceDataTable(root)).selected];
    },
  };
  registerActions(api);
  return { api, enhance: enhanceTree };
}
