import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";
import type {
  DataTableSort,
  DataTableSortDirection,
  DataTableTarget,
  StarContext,
  StarDataTableStatic,
} from "../types";

interface DataTableRecord extends UIResources {
  controls: HTMLElement[];
  constraints: WeakMap<HTMLElement, { authored: boolean; reflected: boolean }>;
  busy: boolean;
  filter: string;
  nextOrder: number;
  order: WeakMap<HTMLTableRowElement, number>;
  page: number;
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
const intents = new WeakMap<HTMLElement, number>();
const retainedState = new WeakMap<
  HTMLElement,
  Pick<
    DataTableRecord,
    "filter" | "nextOrder" | "order" | "selectionSeeded" | "selected" | "constraints"
  >
>();
let dataTableId = 0;

function dataTableRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="data-table"]') ? value : undefined;
}

function owned(root: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll(selector)).filter(
    (element): element is HTMLElement =>
      isHTMLElement(element) &&
      element.closest('[data-jqs]:not(button[data-jqs="button"])') === root,
  );
}

function tablePart(root: HTMLElement): HTMLTableElement | undefined {
  const table = Array.from(root.children).find(
    (child): child is HTMLTableElement =>
      isHTMLTag(child, "table") && child.getAttribute("data-part") === "table",
  );
  if (table) return table;
  const viewport = Array.from(root.children).find(
    (child): child is HTMLElement =>
      isHTMLElement(child) &&
      child.getAttribute("data-part") === "viewport" &&
      !child.hasAttribute("data-jqs"),
  );
  const nested = viewport?.querySelector<HTMLTableElement>(':scope > table[data-part="table"]');
  return nested ?? undefined;
}

function controls(root: HTMLElement): HTMLElement[] {
  return owned(
    root,
    '[data-part="sort"],input[data-part="filter"],[data-part="previous"],[data-part="next"],input[data-part="select-all"],[data-part="page-status"],[data-part="selection-status"]',
  );
}

function current(record: DataTableRecord, revision = record.revision): boolean {
  if (
    !uiCurrent(record, revision) ||
    records.get(record.root) !== record ||
    record.root.dataset.jqs !== "data-table" ||
    tablePart(record.root) !== record.table
  )
    return false;
  const elements = controls(record.root);
  return (
    elements.length === record.controls.length &&
    elements.every((element, index) => element === record.controls[index])
  );
}

function disabled(element: Element): boolean {
  return Boolean(
    element.closest(
      ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]',
    ),
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
        input.closest('[data-jqs]:not(button[data-jqs="button"])') ===
          row.closest('[data-jqs="data-table"]') && input.closest("tr") === row,
    ) ?? undefined
  );
}

function selectableRows(record: DataTableRecord): HTMLTableRowElement[] {
  return rows(record).filter((row) => rowCheckbox(row) && rowId(row));
}

function visibleSelectableRows(record: DataTableRecord): HTMLTableRowElement[] {
  return selectableRows(record).filter((row) => !row.hidden && !disabled(rowCheckbox(row)!));
}

function filterControl(record: DataTableRecord): HTMLInputElement | undefined {
  return owned(record.root, 'input[data-part="filter"]')[0] as HTMLInputElement | undefined;
}

function headers(record: DataTableRecord): HTMLTableCellElement[] {
  return Array.from(
    record.table.tHead?.querySelectorAll<HTMLTableCellElement>("th[data-key]") ?? [],
  ).filter(
    (header) =>
      header.closest("table") === record.table && header.closest("[data-jqs]") === record.root,
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:data-table:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
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

type Current = () => boolean;
type SourceGuard = Current & { close(): void };

function rowSource(row: HTMLTableRowElement): string {
  return JSON.stringify([
    rowId(row),
    row.textContent,
    Array.from(row.cells, (cell) => [cell.dataset.key, cell.dataset.value]),
  ]);
}

function sourceGuard(record: DataTableRecord, revision: number): SourceGuard {
  const settings = (): string =>
    JSON.stringify([
      record.root.dataset.pageSize,
      record.root.dataset.processing,
      record.root.dataset.selection,
      headers(record).map((header) => [header.dataset.key, header.dataset.type]),
    ]);
  const initial = settings();
  const sources = new Map(rows(record).map((row) => [row, rowSource(row)]));
  const observer = new (record.window as Window & typeof globalThis).MutationObserver(
    () => undefined,
  );
  try {
    observer.observe(record.root, {
      attributes: true,
      attributeFilter: [
        "data-jqs",
        "data-part",
        "data-key",
        "data-type",
        "data-row-id",
        "data-value",
      ],
      characterData: true,
      childList: true,
      subtree: true,
    });
  } catch (error) {
    try {
      observer.disconnect();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Data Table observer setup and cleanup failed.",
        {
          cause: cleanupError,
        },
      );
    }
    throw error;
  }
  const quick = (): boolean =>
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.dataset.jqs === "data-table" &&
    tablePart(record.root) === record.table &&
    settings() === initial;
  const unchanged = (): boolean => {
    if (!current(record, revision)) return false;
    const present = rows(record);
    return (
      present.length === sources.size &&
      present.every((row) => sources.has(row) && rowSource(row) === sources.get(row)) &&
      current(record, revision)
    );
  };
  let invalid = false;
  const valid = (() => {
    if (invalid) return false;
    if (!quick() || (observer.takeRecords().length && !unchanged()) || !quick()) {
      invalid = true;
      return false;
    }
    if (observer.takeRecords().length && !unchanged()) invalid = true;
    return !invalid;
  }) as SourceGuard;
  valid.close = () => observer.disconnect();
  return valid;
}

function runSourceGuard(guard: SourceGuard, run: () => void): void {
  try {
    run();
  } catch (error) {
    try {
      guard.close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Data Table work and cleanup failed.", {
        cause: cleanupError,
      });
    }
    throw error;
  }
  guard.close();
}

function proposedState(record: DataTableRecord): string {
  return JSON.stringify([
    record.root.dataset.page,
    record.root.dataset.sort,
    record.root.dataset.direction,
    record.root.dataset.sorts,
    filterControl(record)?.value,
  ]);
}

function reflectDisabled(
  record: DataTableRecord,
  control: HTMLInputElement | HTMLButtonElement,
  disabled: boolean,
  valid: Current,
): void {
  if (!valid()) return;
  const previous = record.constraints.get(control);
  const authored =
    previous && previous.reflected === control.disabled ? previous.authored : control.disabled;
  const reflected = authored || disabled;
  record.constraints.set(control, { authored, reflected });
  if (control.disabled !== reflected) control.disabled = reflected;
}

function attribute(
  element: Element,
  name: string,
  value: string | undefined,
  valid: Current,
): void {
  if (!valid()) return;
  if (value === undefined) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function reorder(record: DataTableRecord, valid: Current): void {
  if (manual(record)) return;
  for (const body of Array.from(record.table.tBodies)) {
    const original = Array.from(body.rows);
    const desired = [...original].sort((left, right) => {
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
    if (!valid()) return;
    if (desired.some((row, index) => row !== original[index])) body.append(...desired);
  }
}

function matchingRows(record: DataTableRecord): HTMLTableRowElement[] {
  const query = record.filter.trim().toLocaleLowerCase();
  return rows(record).filter(
    (row) => !query || (row.textContent?.toLocaleLowerCase().includes(query) ?? false),
  );
}

function setText(record: DataTableRecord, part: string, value: string, valid: Current): void {
  for (const element of owned(record.root, `[data-part="${part}"]`)) {
    if (!valid()) return;
    if (element.textContent !== value) element.textContent = value;
  }
}

function syncRootSortAttributes(record: DataTableRecord, valid: Current): void {
  const primary = record.sorts[0];
  attribute(record.root, "data-sort", primary?.key, valid);
  attribute(record.root, "data-direction", primary?.direction, valid);
  attribute(record.root, "data-sorts", primary ? JSON.stringify(record.sorts) : undefined, valid);
}

function sortButton(
  record: DataTableRecord,
  header: HTMLTableCellElement,
): HTMLElement | undefined {
  return owned(record.root, '[data-part="sort"]').find((button) => button.closest("th") === header);
}

function syncSortButton(
  button: HTMLElement,
  key: string | undefined,
  sort: DataTableSort | undefined,
  index: number,
  valid: Current,
): void {
  attribute(button, "data-direction", sort?.direction ?? "none", valid);
  attribute(button, "data-sort-order", index >= 0 ? String(index + 1) : undefined, valid);
  if (
    !valid() ||
    (button.hasAttribute("aria-label") && button.dataset.generatedSortLabel !== "true")
  )
    return;
  attribute(
    button,
    "data-sort-base-label",
    button.dataset.sortBaseLabel ?? (button.textContent.trim() || key || "Column"),
    valid,
  );
  attribute(
    button,
    "aria-label",
    sort
      ? `${button.dataset.sortBaseLabel}, sort priority ${index + 1}, ${sort.direction}`
      : undefined,
    valid,
  );
  attribute(button, "data-generated-sort-label", sort ? "true" : undefined, valid);
}

function syncSortHeaders(record: DataTableRecord, valid: Current): void {
  if (!valid()) return;
  record.sortKey = record.sorts[0]?.key;
  record.sortDirection = record.sorts[0]?.direction ?? "none";
  for (const header of headers(record)) {
    if (!valid()) return;
    const index = record.sorts.findIndex((sort) => sort.key === header.dataset.key);
    const sort = record.sorts[index];
    attribute(header, "aria-sort", index === 0 ? sort?.direction : undefined, valid);
    const button = sortButton(record, header);
    if (button) syncSortButton(button, header.dataset.key, sort, index, valid);
  }
}

function syncSelection(record: DataTableRecord, valid: Current): void {
  for (const row of selectableRows(record)) {
    if (!valid()) return;
    const checked = record.selected.has(rowId(row)!);
    const checkbox = rowCheckbox(row)!;
    if (checkbox.checked !== checked) checkbox.checked = checked;
    attribute(row, "data-selected", String(checked), valid);
  }
  const visible = visibleSelectableRows(record);
  const selectedVisible = visible.filter((row) => record.selected.has(rowId(row)!)).length;
  for (const checkbox of owned(record.root, 'input[data-part="select-all"]')) {
    if (!isHTMLTag(checkbox, "input")) continue;
    if (!valid()) return;
    const checked = visible.length > 0 && selectedVisible === visible.length;
    if (checkbox.checked !== checked) checkbox.checked = checked;
    if (!valid()) return;
    const indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
    if (checkbox.indeterminate !== indeterminate) checkbox.indeterminate = indeterminate;
    if (!valid()) return;
    reflectDisabled(record, checkbox, visible.length === 0, valid);
  }
  attribute(record.root, "data-selection-count", String(record.selected.size), valid);
  setText(record, "selection-status", `${record.selected.size} selected`, valid);
}

function render(record: DataTableRecord, valid: Current): void {
  if (!valid()) return;
  reorder(record, valid);
  syncSortHeaders(record, valid);
  if (!valid()) return;
  if (manual(record)) {
    attribute(record.root, "data-page", String(record.page), valid);
    syncSelection(record, valid);
    return;
  }
  const matching = matchingRows(record);
  const size = pageSize(record);
  const pageCount = Number.isFinite(size) ? Math.max(1, Math.ceil(matching.length / size)) : 1;
  if (!valid()) return;
  record.page = Math.min(Math.max(record.page, 1), pageCount);
  const start = Number.isFinite(size) ? (record.page - 1) * size : 0;
  const end = Number.isFinite(size) ? Math.min(start + size, matching.length) : matching.length;
  const visible = new Set(matching.slice(start, end));
  for (const row of rows(record)) {
    if (!valid()) return;
    const hidden = !visible.has(row);
    if (row.hidden !== hidden) row.hidden = hidden;
  }
  attribute(record.root, "data-page", String(record.page), valid);
  attribute(record.root, "data-page-count", String(pageCount), valid);
  attribute(record.root, "data-row-count", String(matching.length), valid);
  setText(
    record,
    "page-status",
    matching.length === 0 ? "0 of 0" : `${start + 1}–${end} of ${matching.length}`,
    valid,
  );
  for (const name of ["previous", "next"]) {
    for (const button of owned(record.root, `[data-part="${name}"]`)) {
      if (!valid()) return;
      const disabled = name === "previous" ? record.page <= 1 : record.page >= pageCount;
      if (isHTMLTag(button, "button")) reflectDisabled(record, button, disabled, valid);
    }
  }
  syncSelection(record, valid);
}

function request(
  root: HTMLElement,
  run: (record: DataTableRecord, valid: Current, settled: Current) => void,
  allowed: Current = () => true,
): HTMLElement {
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  if (!allowed()) return root;
  const record = enhanceDataTable(root);
  const revision = ++record.revision;
  if (!current(record, revision)) return root;
  const unchanged = sourceGuard(record, revision);
  const settled = (): boolean => unchanged() && intents.get(root) === intent;
  const valid = (): boolean => settled() && allowed();
  const busy = record.busy;
  record.busy = true;
  runSourceGuard(unchanged, () => {
    try {
      if (valid()) run(record, valid, settled);
    } finally {
      record.busy = busy;
    }
  });
  return root;
}

function sortTable(
  root: HTMLElement,
  key: string,
  direction?: DataTableSortDirection,
  additive = false,
  allowed: Current = () => true,
): HTMLElement {
  return request(
    root,
    (record, valid, settled) => {
      if (!headers(record).some((header) => header.dataset.key === key)) {
        throw new Error(`Data Table #${root.id} has no sortable header with key "${key}".`);
      }
      if (!valid()) return;
      const existing = record.sorts.find((sort) => sort.key === key);
      const next =
        direction ??
        (!existing ? "ascending" : existing.direction === "ascending" ? "descending" : "none");
      const previous = record.sorts.map((sort) => ({ ...sort }));
      if (!additive) record.sorts = next === "none" ? [] : [{ direction: next, key }];
      else {
        record.sorts = record.sorts.filter((sort) => sort.key !== key);
        if (next !== "none") record.sorts.push({ direction: next, key });
      }
      const busy = record.busy;
      record.busy = true;
      try {
        syncRootSortAttributes(record, valid);
        syncSortHeaders(record, valid);
        if (!valid()) return;
        const proposal = proposedState(record);
        const accepted = emit(record, "before-sort", true, { direction: next, key });
        if (!settled() || proposedState(record) !== proposal || !settled()) return;
        if (!accepted || !allowed()) {
          record.sorts = previous;
          syncRootSortAttributes(record, settled);
          syncSortHeaders(record, settled);
          return;
        }
        record.page = 1;
        render(record, valid);
        if (valid()) emit(record, "sort", false, { direction: next, key });
      } finally {
        record.busy = busy;
      }
    },
    allowed,
  );
}

function filterTable(root: HTMLElement, query: string, allowed: Current = () => true): HTMLElement {
  return request(
    root,
    (record, valid) => {
      record.filter = query;
      record.page = 1;
      const input = filterControl(record);
      if (input && input.value !== query) input.value = query;
      render(record, valid);
      if (valid()) emit(record, "filter");
    },
    allowed,
  );
}

function pageTable(
  root: HTMLElement,
  page: number | "next" | "previous",
  allowed: Current = () => true,
): HTMLElement {
  return request(
    root,
    (record, valid) => {
      const requested = typeof page === "number" ? page : record.page + (page === "next" ? 1 : -1);
      if (!Number.isFinite(requested)) return;
      record.page = Math.max(1, Math.floor(requested));
      render(record, valid);
      if (valid()) emit(record, "page");
    },
    allowed,
  );
}

function configureRows(record: DataTableRecord, valid: Current): void {
  const currentIds = new Set<string>();
  const seedSelection = !record.selectionSeeded;
  const selected = new Set(record.selected);
  for (const row of rows(record)) {
    if (!valid()) return;
    if (!record.order.has(row)) record.order.set(row, record.nextOrder++);
    const checkbox = rowCheckbox(row);
    if (!checkbox) continue;
    const id = rowId(row);
    if (!id) throw new Error(`Selectable rows in Data Table #${record.root.id} need data-row-id.`);
    if (currentIds.has(id))
      throw new Error(`Data Table #${record.root.id} has duplicate row id "${id}".`);
    currentIds.add(id);
    checkbox.value ||= id;
    if (!valid()) return;
    if (seedSelection && checkbox.checked) selected.add(id);
  }
  if (valid()) {
    record.selected = selected;
    record.selectionSeeded = true;
  }
}

function allowedEvent(record: DataTableRecord, element: HTMLElement, event: Event): boolean {
  return (
    current(record) &&
    !event.defaultPrevented &&
    !disabled(element) &&
    (!isHTMLElement(event.target) ||
      event.target.closest('[data-jqs]:not(button[data-jqs="button"])') === record.root)
  );
}

function selectionChange(record: DataTableRecord, event: Event): void {
  const checkbox = event.target;
  if (!isHTMLTag(checkbox, "input") || !allowedEvent(record, checkbox, event)) return;
  const revision = ++record.revision;
  const valid = (): boolean => current(record, revision) && !disabled(checkbox);
  if (checkbox.matches('input[data-part="row-select"]')) {
    const row = checkbox.closest("tr");
    if (!isHTMLTag(row, "tr") || !rows(record).includes(row) || rowCheckbox(row) !== checkbox)
      return;
    const id = rowId(row);
    if (!id) return;
    if (checkbox.checked) {
      if (record.root.getAttribute("data-selection") === "single") record.selected.clear();
      record.selected.add(id);
    } else record.selected.delete(id);
  } else if (checkbox.matches('input[data-part="select-all"]')) {
    for (const row of visibleSelectableRows(record)) {
      const id = rowId(row)!;
      if (checkbox.checked) record.selected.add(id);
      else record.selected.delete(id);
    }
  } else return;
  syncSelection(record, valid);
  if (valid()) emit(record, "selection-change");
}

function wire(record: DataTableRecord): void {
  const valid = (): boolean => current(record);
  for (const header of headers(record)) {
    const button = sortButton(record, header);
    if (!button) continue;
    listenUI(record, valid, button, "click", (event) => {
      if (allowedEvent(record, button, event))
        sortTable(record.root, header.dataset.key!, undefined, (event as MouseEvent).shiftKey, () =>
          allowedEvent(record, button, event),
        );
    });
  }
  const filter = filterControl(record);
  listenUI(record, valid, filter, "input", (event) => {
    if (filter && allowedEvent(record, filter, event))
      filterTable(record.root, filter.value, () => allowedEvent(record, filter, event));
  });
  for (const name of ["previous", "next"] as const) {
    for (const button of owned(record.root, `[data-part="${name}"]`)) {
      listenUI(record, valid, button, "click", (event) => {
        if (allowedEvent(record, button, event))
          pageTable(record.root, name, () => !event.defaultPrevented && !disabled(record.root));
      });
    }
  }
  listenUI(record, valid, record.root, "change", (event) => selectionChange(record, event));
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

function snapshot(record: DataTableRecord) {
  const { filter, nextOrder, order, selectionSeeded, selected, constraints } = record;
  return { filter, nextOrder, order, selectionSeeded, selected: new Set(selected), constraints };
}

function sync(record: DataTableRecord): void {
  if (!current(record) || record.busy) return;
  const revision = ++record.revision;
  const valid = sourceGuard(record, revision);
  record.busy = true;
  runSourceGuard(valid, () => {
    try {
      const requestedPage = Number(record.root.getAttribute("data-page"));
      const sorts = authoredSorts(record.root);
      const filter = filterControl(record)?.value ?? record.filter;
      if (!valid()) return;
      if (Number.isFinite(requestedPage) && requestedPage > 0)
        record.page = Math.floor(requestedPage);
      record.sorts = sorts;
      record.filter = filter;
      configureRows(record, valid);
      render(record, valid);
    } finally {
      record.busy = false;
    }
  });
}

function enhanceDataTable(root: HTMLElement): DataTableRecord {
  const previous = records.get(root);
  if (previous && current(previous)) {
    try {
      sync(previous);
    } catch (error) {
      failUISetup(previous, error);
    }
    return previous;
  }
  const saved = previous ? snapshot(previous) : retainedState.get(root);
  previous?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  const table = tablePart(root);
  if (!table)
    throw new Error(
      `Data Table #${root.id} needs a direct table or viewport table data-part="table".`,
    );
  const sorts = authoredSorts(root);
  const record: DataTableRecord = {
    ...uiResources(root),
    controls: controls(root),
    constraints: saved?.constraints ?? new WeakMap(),
    busy: false,
    filter: saved?.filter ?? "",
    nextOrder: saved?.nextOrder ?? 0,
    order: saved?.order ?? new WeakMap(),
    page: 1,
    selectionSeeded: saved?.selectionSeeded ?? false,
    selected: new Set(saved?.selected),
    sortDirection: sorts[0]?.direction ?? "none",
    sortKey: sorts[0]?.key,
    sorts,
    table,
  };
  record.cleanups.add(() => retainedState.set(root, snapshot(record)));
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    root.id ||= `jqs-data-table-${++dataTableId}`;
    sync(record);
    wire(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function enhanceTree(root: ParentNode): void {
  const elements = uiElements(root, '[data-jqs="data-table"]');
  for (const element of elements) {
    const dataTable = dataTableRoot(element);
    if (dataTable) enhanceDataTable(dataTable);
  }
}

function resolveRoot(target: DataTableTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? dataTableRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : dataTableRoot(target);
  if (resolved) return resolved;
  throw new Error(`Data Table target did not match data-jqs="data-table": ${String(target)}`);
}

function actionRoot(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveRoot(target, context.root);
  if (typeof target === "string") return resolveRoot(target, context.root);
  const root =
    context.element?.closest('[data-jqs="data-table"]') ??
    (isHTMLElement(context.root) ? dataTableRoot(context.root) : undefined);
  if (isHTMLElement(root)) return resolveRoot(root);
  throw new Error('Data Table action needs a selector or an element inside data-jqs="data-table".');
}

function controlledDataTable(context: StarContext, owner: Document, target?: unknown): HTMLElement {
  const root = actionRoot(context, target);
  if (root.ownerDocument !== owner || !uiActive(root)) {
    throw new Error("This UI target is unavailable in its owning Document.");
  }
  return root;
}

function actionAllowed(context: StarContext, root: HTMLElement): boolean {
  const event = context.event;
  return (
    !disabled(root) &&
    (!context.element || !disabled(context.element)) &&
    !(event && "defaultPrevented" in event && event.defaultPrevented) &&
    !(event && "isDefaultPrevented" in event && event.isDefaultPrevented())
  );
}

function explicitSort(first: unknown, second: unknown): boolean {
  return (
    isHTMLElement(first) ||
    (typeof first === "string" && first.startsWith("#")) ||
    (typeof second === "string" && !["ascending", "descending", "none"].includes(second))
  );
}

function registerActions(registerAction: ActionRegistrar, owner: Document): void {
  registerAction("ui.dataTable.sort", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const third = context.args?.[2];
    const fourth = context.args?.[3];
    const explicitRoot = explicitSort(first, second);
    const root = controlledDataTable(context, owner, explicitRoot ? first : undefined);
    const key = explicitRoot ? second : first;
    const direction = explicitRoot ? third : second;
    if (typeof key !== "string") throw new Error("ui.dataTable.sort needs a column key.");
    if (!actionAllowed(context, root)) return root;
    return sortTable(
      root,
      key,
      direction === "ascending" || direction === "descending" || direction === "none"
        ? direction
        : undefined,
      Boolean(explicitRoot ? fourth : third),
      () => actionAllowed(context, root),
    );
  });
  registerAction("ui.dataTable.filter", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicitRoot =
      second !== undefined || (typeof first === "string" && first.startsWith("#"));
    const root = controlledDataTable(context, owner, explicitRoot ? first : undefined);
    if (!actionAllowed(context, root)) return root;
    return filterTable(root, String(explicitRoot ? (second ?? "") : (first ?? "")), () =>
      actionAllowed(context, root),
    );
  });
  for (const operation of ["next", "previous"] as const) {
    registerAction(`ui.dataTable.${operation}`, (context) => {
      const root = controlledDataTable(context, owner, context.args?.[0]);
      return pageTable(root, operation, () => actionAllowed(context, root));
    });
  }
  registerAction("ui.dataTable.page", (context) => {
    const first = context.args?.[0];
    const second = context.args?.[1];
    const explicitRoot = second !== undefined || typeof first === "string";
    const root = controlledDataTable(context, owner, explicitRoot ? first : undefined);
    if (!actionAllowed(context, root)) return root;
    return pageTable(root, Number(explicitRoot ? second : first), () =>
      actionAllowed(context, root),
    );
  });
}

export function createDataTables(
  registerAction: ActionRegistrar,
  owner: Document,
): DataTableCollection {
  const api: StarDataTableStatic = {
    sort: (target, key, direction, additive) =>
      sortTable(resolveRoot(target), key, direction, additive),
    sorts: (target) => {
      const root = resolveRoot(target);
      return enhanceDataTable(root).sorts.map((sort) => ({ ...sort }));
    },
    filter: (target, query) => filterTable(resolveRoot(target), query),
    page: (target, page) => pageTable(resolveRoot(target), page),
    next: (target) => pageTable(resolveRoot(target), "next"),
    previous: (target) => pageTable(resolveRoot(target), "previous"),
    selected: (target) => {
      const root = resolveRoot(target);
      return [...enhanceDataTable(root).selected];
    },
  };
  registerActions(registerAction, owner);
  return { api, enhance: enhanceTree };
}
