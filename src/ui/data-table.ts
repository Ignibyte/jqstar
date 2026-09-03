import type { ActionRegistrar } from "../registry";
import type {
  DataTableSort,
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
  selectionSeeded: boolean;
  selected: Set<string>;
  sortDirection: DataTableSortDirection;
  sortKey: string | undefined;
  sorts: DataTableSort[];
  table: HTMLTableElement;
}

interface DataTableEventDetail {
  dataTable: HTMLElement;
  direction: DataTableSortDirection;
  filter: string;
  key?: string;
  page: number;
  selected: string[];
  sorts: DataTableSort[];
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
  changed?: { direction: DataTableSortDirection; key: string },
): boolean {
  const detail: DataTableEventDetail = {
    dataTable: record.root,
    direction: changed?.direction ?? record.sortDirection,
    filter: record.filter,
    page: record.page,
    selected: [...record.selected],
    sorts: record.sorts.map((sort) => ({ ...sort })),
  };
  const key = changed?.key || record.sortKey;
  if (key) detail.key = key;
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

function comparable(
  cell: HTMLTableCellElement | undefined,
  type: string | null | undefined,
): string | number {
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
  for (const body of Array.from(record.table.tBodies)) {
    const current = Array.from(body.rows);
    const desired = [...current].sort((left, right) => {
      for (const sort of record.sorts) {
        const header = headers(record).find((candidate) => candidate.dataset.key === sort.key);
        const type = header?.getAttribute("data-type");
        const result = compareValues(
          comparable(cellFor(left, sort.key), type),
          comparable(cellFor(right, sort.key), type),
        );
        if (result !== 0) return sort.direction === "descending" ? -result : result;
      }
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

function syncRootSortAttributes(record: DataTableRecord): void {
  const primary = record.sorts[0];
  if (primary) {
    record.root.dataset.sort = primary.key;
    record.root.dataset.direction = primary.direction;
    record.root.dataset.sorts = JSON.stringify(record.sorts);
  } else {
    record.root.removeAttribute("data-sort");
    record.root.removeAttribute("data-direction");
    record.root.removeAttribute("data-sorts");
  }
}

function syncSortHeaders(record: DataTableRecord): void {
  const primary = record.sorts[0];
  record.sortKey = primary?.key;
  record.sortDirection = primary?.direction ?? "none";
  for (const header of headers(record)) {
    const index = record.sorts.findIndex((sort) => sort.key === header.dataset.key);
    const active = index >= 0;
    const sort = record.sorts[index];
    if (sort && index === 0) header.setAttribute("aria-sort", sort.direction);
    else header.removeAttribute("aria-sort");
    const button = header.querySelector<HTMLElement>('[data-part="sort"]');
    const buttonDirection = sort?.direction ?? "none";
    if (button && button.dataset.direction !== buttonDirection) {
      button.dataset.direction = buttonDirection;
    }
    if (button) {
      if (active) button.dataset.sortOrder = String(index + 1);
      else button.removeAttribute("data-sort-order");
      if (!button.hasAttribute("aria-label") || button.dataset.generatedSortLabel === "true") {
        button.dataset.sortBaseLabel ??=
          button.textContent.trim() || header.dataset.key || "Column";
        if (sort) {
          button.setAttribute(
            "aria-label",
            `${button.dataset.sortBaseLabel}, sort priority ${index + 1}, ${sort.direction}`,
          );
          button.dataset.generatedSortLabel = "true";
        } else {
          button.removeAttribute("aria-label");
          button.removeAttribute("data-generated-sort-label");
        }
      }
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
  if (record.root.dataset.pageCount !== String(pageCount)) {
    record.root.dataset.pageCount = String(pageCount);
  }
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
  additive = false,
): HTMLElement {
  const record = records.get(root) ?? enhanceDataTable(root);
  if (!headers(record).some((header) => header.dataset.key === key)) {
    throw new Error(`Data Table #${root.id} has no sortable header with key "${key}".`);
  }
  const existing = record.sorts.find((sort) => sort.key === key);
  const next =
    direction ??
    (!existing ? "ascending" : existing.direction === "ascending" ? "descending" : "none");
  const previous = record.sorts.map((sort) => ({ ...sort }));
  if (!additive) {
    record.sorts = next === "none" ? [] : [{ direction: next, key }];
  } else {
    record.sorts = record.sorts.filter((sort) => sort.key !== key);
    if (next !== "none") record.sorts.push({ direction: next, key });
  }
  syncRootSortAttributes(record);
  syncSortHeaders(record);
  if (!emit(record, "before-sort", true, { direction: next, key })) {
    record.sorts = previous;
    syncRootSortAttributes(record);
    syncSortHeaders(record);
    return root;
  }
  record.page = 1;
  render(record);
  emit(record, "sort", false, { direction: next, key });
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
  const seedSelection = !record.selectionSeeded;
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
      if (seedSelection && checkbox.checked) record.selected.add(id);
      record.initializedRows.add(id);
    }
  }
  record.selectionSeeded = true;
}

function wire(record: DataTableRecord): void {
  for (const header of headers(record)) {
    const button = header.querySelector<HTMLElement>('[data-part="sort"]');
    if (!button) continue;
    const click = (event: MouseEvent): void => {
      sortTable(record.root, header.dataset.key!, undefined, event.shiftKey);
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

  const selectionChange = (event: Event): void => {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement)) return;
    if (checkbox.closest('[data-jqs="data-table"]') !== record.root) return;
    if (checkbox.matches('input[data-part="row-select"]')) {
      const row = checkbox.closest<HTMLTableRowElement>("tr[data-row-id]");
      if (!row) return;
      const id = rowId(row)!;
      if (checkbox.checked) {
        if (record.root.getAttribute("data-selection") === "single") record.selected.clear();
        record.selected.add(id);
      } else {
        record.selected.delete(id);
      }
      syncSelection(record);
      emit(record, "selection-change");
      return;
    }
    if (checkbox.matches('input[data-part="select-all"]')) {
      for (const row of visibleSelectableRows(record)) {
        const id = rowId(row)!;
        if (checkbox.checked) record.selected.add(id);
        else record.selected.delete(id);
      }
      syncSelection(record);
      emit(record, "selection-change");
    }
  };
  record.root.addEventListener("change", selectionChange);
  record.cleanups.push(() => record.root.removeEventListener("change", selectionChange));
}

function authoredSorts(root: HTMLElement): DataTableSort[] {
  const source = root.getAttribute("data-sorts");
  if (source) {
    try {
      const value = JSON.parse(source) as unknown;
      if (Array.isArray(value)) {
        const result: DataTableSort[] = [];
        const seen = new Set<string>();
        for (const candidate of value) {
          const item = Object(candidate) as Record<string, unknown>;
          const key = item.key;
          const direction = item.direction;
          if (
            typeof key !== "string" ||
            !key ||
            seen.has(key) ||
            (direction !== "ascending" && direction !== "descending")
          ) {
            continue;
          }
          seen.add(key);
          result.push({ direction, key });
        }
        return result;
      }
    } catch {
      // Fall through to the legacy primary-sort attributes.
    }
  }
  const key = root.getAttribute("data-sort")?.trim();
  const direction = root.getAttribute("data-direction");
  return key && (direction === "ascending" || direction === "descending")
    ? [{ direction, key }]
    : [];
}

function enhanceDataTable(root: HTMLElement): DataTableRecord {
  root.id ||= `jqs-data-table-${++dataTableId}`;
  const table = tablePart(root);
  let record = records.get(root);
  if (!record) {
    const sorts = authoredSorts(root);
    const primary = sorts[0];
    record = {
      cleanups: [],
      filter: "",
      initializedRows: new Set(),
      nextOrder: 0,
      order: new WeakMap(),
      page: Math.max(1, Number(root.getAttribute("data-page") ?? 1) || 1),
      root,
      selectionSeeded: false,
      selected: new Set(),
      sortDirection: primary?.direction ?? "none",
      sortKey: primary?.key,
      sorts,
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
    record.sorts = authoredSorts(root);
    record.sortKey = record.sorts[0]?.key;
    record.sortDirection = record.sorts[0]?.direction ?? "none";
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

function registerActions(api: StarDataTableStatic, registerAction: ActionRegistrar): void {
  registerAction("ui.dataTable.sort", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const third = context.args?.[2];
    const fourth = context.args?.[3];
    const explicitRoot =
      first instanceof HTMLElement || (typeof first === "string" && first.startsWith("#"));
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
      Boolean(explicitRoot ? fourth : third),
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

export function createDataTables(registerAction: ActionRegistrar): DataTableCollection {
  const api: StarDataTableStatic = {
    sort: (target, key, direction, additive) =>
      sortTable(resolveRoot(target), key, direction, additive),
    sorts: (target) => {
      const root = resolveRoot(target);
      return (records.get(root) ?? enhanceDataTable(root)).sorts.map((sort) => ({ ...sort }));
    },
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
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}
