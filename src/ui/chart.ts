import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import {
  failUISetup,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";
import type {
  ChartData,
  ChartSeries,
  ChartTarget,
  ChartType,
  StarChartStatic,
  StarContext,
} from "../types";

interface ChartState {
  legend: HTMLElement | undefined;
  plot: SVGSVGElement;
  signature: string | undefined;
  status: HTMLElement | undefined;
  table: HTMLTableElement;
  type: ChartType;
  content: Element | null;
}

interface ChartRecord extends ChartState, UIResources {
  rendering: { signature: string } | undefined;
}

interface ChartCollection {
  api: StarChartStatic;
  enhance(root: ParentNode): void;
}

interface ChartEventDetail {
  chart: HTMLElement;
  data: ChartData;
  type: ChartType;
}

const records = new WeakMap<HTMLElement, ChartRecord>();
const retained = new WeakMap<HTMLElement, ChartState>();
const intents = new WeakMap<HTMLElement, number>();
let chartId = 0;

function chartRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="chart"]') ? value : undefined;
}

function owned(root: HTMLElement, selector: string): Element | undefined {
  return Array.from(root.querySelectorAll(selector)).find(
    (element) => element.closest('[data-jqs]:not(button[data-jqs="button"])') === root,
  );
}

function current(record: ChartRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.dataset.jqs === "chart" &&
    owned(record.root, 'table[data-part="data"]') === record.table &&
    owned(record.root, 'svg[data-part="plot"]') === record.plot &&
    owned(record.root, '[data-part="legend"]') === record.legend &&
    owned(record.root, '[data-part="status"]') === record.status
  );
}

function snapshot(record: ChartRecord): ChartState {
  const { legend, plot, signature, status, table, type, content } = record;
  return { legend, plot, signature, status, table, type, content };
}

function chartType(root: HTMLElement): ChartType {
  return root.dataset.type === "line" ? "line" : "bar";
}

function keyFor(header: HTMLTableCellElement, index: number): string {
  const authored = header.dataset.series?.trim();
  if (authored) return authored;
  const generated = header.textContent
    ?.trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return generated || `series-${index + 1}`;
}

function valueFor(cell: HTMLTableCellElement): number {
  const source = (cell.dataset.value ?? cell.textContent ?? "").trim().replaceAll(",", "");
  const value = Number(source);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Chart cell "${source}" needs a finite, non-negative numeric value.`);
  }
  return value;
}

function parseData(table: HTMLTableElement): ChartData {
  const headerRow = table.tHead?.rows[0];
  if (!headerRow) throw new Error(`Chart table #${table.id} needs one thead row.`);
  const headers = Array.from(headerRow.cells);
  if (headers.length < 2) {
    throw new Error(`Chart table #${table.id} needs a category column and at least one series.`);
  }
  const keys = new Set<string>();
  const series: ChartSeries[] = headers.slice(1).map((header, index) => {
    const key = keyFor(header, index);
    if (keys.has(key)) throw new Error(`Chart table #${table.id} series keys must be unique.`);
    keys.add(key);
    return {
      color: header.dataset.color?.trim() || `var(--jqs-chart-${index + 1})`,
      key,
      label: header.textContent?.trim() || key,
      values: [],
    };
  });
  const labels: string[] = [];
  for (const row of Array.from(table.tBodies).flatMap((body) => Array.from(body.rows))) {
    const cells = Array.from(row.cells);
    if (cells.length !== headers.length) {
      throw new Error(
        `Chart table #${table.id} row ${labels.length + 1} needs ${headers.length} cells.`,
      );
    }
    const label = cells[0]?.textContent?.trim();
    if (!label) throw new Error(`Chart table #${table.id} row ${labels.length + 1} needs a label.`);
    labels.push(label);
    series.forEach((item, index) => item.values.push(valueFor(cells[index + 1]!)));
  }
  if (!labels.length) throw new Error(`Chart table #${table.id} needs at least one body row.`);
  return { labels, series };
}

function cloneData(data: ChartData): ChartData {
  return {
    labels: [...data.labels],
    series: data.series.map((series) => ({ ...series, values: [...series.values] })),
  };
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  parent: Element,
  name: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const element = parent.ownerDocument.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value));
  }
  return element;
}

function svgText(
  parent: SVGElement,
  value: string,
  attributes: Record<string, string | number>,
): SVGTextElement {
  const text = svgElement(parent, "text", attributes);
  text.textContent = value;
  parent.append(text);
  return text;
}

function niceMaximum(data: ChartData): number {
  const maximum = Math.max(1, ...data.series.flatMap((series) => series.values));
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  return Math.ceil(maximum / magnitude) * magnitude;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function addTitle(element: SVGElement, value: string): void {
  const title = svgElement(element, "title");
  title.textContent = value;
  element.append(title);
}

function drawGrid(
  content: SVGGElement,
  maximum: number,
  dimensions: { bottom: number; left: number; plotHeight: number; plotWidth: number; top: number },
): void {
  const grid = svgElement(content, "g", { "data-part": "grid" });
  for (const index of [0, 1, 2, 3, 4]) {
    const ratio = index / 4;
    const y = dimensions.bottom - dimensions.plotHeight * ratio;
    grid.append(
      svgElement(content, "line", {
        "data-part": "grid-line",
        x1: dimensions.left,
        x2: dimensions.left + dimensions.plotWidth,
        y1: y,
        y2: y,
      }),
    );
    svgText(grid, formatNumber(maximum * ratio), {
      "data-part": "axis-label",
      x: dimensions.left - 10,
      y: y + 4,
      "text-anchor": "end",
    });
  }
  content.append(grid);
}

function drawLabels(
  content: SVGGElement,
  data: ChartData,
  dimensions: { bottom: number; left: number; plotWidth: number },
): void {
  const width = dimensions.plotWidth / data.labels.length;
  const stride = Math.max(1, Math.ceil(data.labels.length / 10));
  data.labels.forEach((label, index) => {
    if (index % stride !== 0 && index !== data.labels.length - 1) return;
    svgText(content, label, {
      "data-part": "axis-label",
      x: dimensions.left + width * (index + 0.5),
      y: dimensions.bottom + 24,
      "text-anchor": "middle",
    });
  });
}

function drawBars(
  content: SVGGElement,
  data: ChartData,
  maximum: number,
  dimensions: { bottom: number; left: number; plotHeight: number; plotWidth: number },
): void {
  const groupWidth = dimensions.plotWidth / data.labels.length;
  const available = groupWidth * 0.72;
  const barWidth = available / data.series.length;
  data.labels.forEach((label, labelIndex) => {
    data.series.forEach((series, seriesIndex) => {
      const value = series.values[labelIndex]!;
      const height = (value / maximum) * dimensions.plotHeight;
      const bar = svgElement(content, "rect", {
        "data-part": "bar",
        "data-series": series.key,
        fill: series.color,
        height,
        rx: Math.min(4, barWidth / 4),
        width: Math.max(1, barWidth - 2),
        x:
          dimensions.left +
          labelIndex * groupWidth +
          (groupWidth - available) / 2 +
          seriesIndex * barWidth +
          1,
        y: dimensions.bottom - height,
      });
      addTitle(bar, `${label}, ${series.label}: ${formatNumber(value)}`);
      content.append(bar);
    });
  });
}

function drawLines(
  content: SVGGElement,
  data: ChartData,
  maximum: number,
  dimensions: { bottom: number; left: number; plotHeight: number; plotWidth: number },
): void {
  const step = dimensions.plotWidth / data.labels.length;
  data.series.forEach((series) => {
    const points = series.values.map((value, index) => ({
      value,
      x: dimensions.left + step * (index + 0.5),
      y: dimensions.bottom - (value / maximum) * dimensions.plotHeight,
    }));
    content.append(
      svgElement(content, "polyline", {
        "data-part": "line",
        "data-series": series.key,
        fill: "none",
        points: points.map((point) => `${point.x},${point.y}`).join(" "),
        stroke: series.color,
      }),
    );
    points.forEach((point, index) => {
      const dot = svgElement(content, "circle", {
        "data-part": "point",
        "data-series": series.key,
        cx: point.x,
        cy: point.y,
        fill: series.color,
        r: 4,
      });
      addTitle(dot, `${data.labels[index]}, ${series.label}: ${formatNumber(point.value)}`);
      content.append(dot);
    });
  });
}

function legendContent(record: ChartRecord, data: ChartData): DocumentFragment {
  const document = record.document;
  const fragment = document.createDocumentFragment();
  for (const series of data.series) {
    const item = document.createElement("span");
    item.dataset.part = "legend-item";
    item.dataset.series = series.key;
    const swatch = document.createElement("span");
    swatch.dataset.part = "swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.backgroundColor = series.color;
    item.append(swatch, document.createTextNode(series.label));
    fragment.append(item);
  }
  return fragment;
}

function emit(
  record: ChartRecord,
  name: "before-render" | "render",
  data: ChartData,
  type: ChartType,
  cancelable = false,
): boolean {
  const detail: ChartEventDetail = { chart: record.root, data: cloneData(data), type };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:chart:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function configuration(record: ChartRecord) {
  if (!record.table.caption?.textContent?.trim()) {
    throw new Error(`Chart table #${record.table.id} needs a non-empty caption.`);
  }
  const data = parseData(record.table);
  const type = chartType(record.root);
  return { data, type, signature: JSON.stringify({ data, type }) };
}

function setAttribute(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function render(record: ChartRecord, force = false, allowed: () => boolean = () => true): void {
  const initialRevision = record.revision;
  if (!current(record, initialRevision)) return;
  const config = configuration(record);
  if (!current(record, initialRevision)) return;
  if (
    !force &&
    (record.rendering?.signature === config.signature ||
      (record.signature === config.signature &&
        record.content !== null &&
        record.plot.firstElementChild === record.content))
  )
    return;
  const revision = ++record.revision;
  const rendering = { signature: config.signature };
  record.rendering = rendering;
  const valid = (): boolean =>
    current(record, revision) &&
    configuration(record).signature === config.signature &&
    current(record, revision) &&
    allowed();
  let committed = false;
  try {
    const { data, type } = config;
    if (!emit(record, "before-render", data, type, true) || !valid()) return;
    const content = svgElement(record.plot, "g", { "data-part": "plot-content" });
    const dimensions = { bottom: 258, left: 52, plotHeight: 224, plotWidth: 568, top: 34 };
    const maximum = niceMaximum(data);
    drawGrid(content, maximum, dimensions);
    drawLabels(content, data, dimensions);
    if (type === "line") drawLines(content, data, maximum, dimensions);
    else drawBars(content, data, maximum, dimensions);
    const legend = record.legend ? legendContent(record, data) : undefined;
    if (!valid()) return;
    setAttribute(record.root, "data-state", "ready");
    for (const [name, value] of Object.entries({
      viewBox: "0 0 640 300",
      preserveAspectRatio: "xMidYMid meet",
      "aria-hidden": "true",
      focusable: "false",
    })) {
      if (!valid()) return;
      setAttribute(record.plot, name, value);
    }
    if (!valid()) return;
    record.plot.replaceChildren(content);
    if (!valid()) return;
    if (record.legend && legend) record.legend.replaceChildren(legend);
    if (!valid()) return;
    const status = record.status;
    if (status) {
      const message = `${data.labels.length} categories and ${data.series.length} series rendered as a ${type} chart.`;
      if (status.textContent !== message) status.textContent = message;
    }
    if (!valid()) return;
    record.signature = config.signature;
    record.content = content;
    record.type = type;
    committed = true;
    emit(record, "render", data, type);
  } finally {
    if (record.rendering === rendering) record.rendering = undefined;
    if (record.revision === revision && !committed) record.signature = undefined;
  }
}

function acquireChart(root: HTMLElement): ChartRecord {
  const previous = records.get(root);
  if (previous && current(previous)) return previous;
  const saved = previous ? snapshot(previous) : retained.get(root);
  previous?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  const table = owned(root, 'table[data-part="data"]');
  const plot = owned(root, 'svg[data-part="plot"]');
  if (
    !isHTMLTag(table, "table") ||
    !isElementNode(plot) ||
    plot.namespaceURI !== "http://www.w3.org/2000/svg" ||
    plot.localName !== "svg"
  ) {
    throw new Error(`Chart #${root.id} needs a table data-part="data" and svg data-part="plot".`);
  }
  const legend = owned(root, '[data-part="legend"]');
  const status = owned(root, '[data-part="status"]');
  const same =
    saved?.table === table &&
    saved.plot === plot &&
    saved.legend === legend &&
    saved.status === status;
  const record: ChartRecord = {
    ...uiResources(root),
    table,
    plot: plot as SVGSVGElement,
    legend: isHTMLElement(legend) ? legend : undefined,
    status: isHTMLElement(status) ? status : undefined,
    signature: same ? saved.signature : undefined,
    content: same ? saved.content : null,
    type: saved?.type ?? chartType(root),
    rendering: undefined,
  };
  record.cleanups.add(() => retained.set(root, snapshot(record)));
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    root.id ||= `jqs-chart-${++chartId}`;
    if (current(record)) table.id ||= `${root.id}-data`;
    if (current(record) && record.status) setAttribute(record.status, "aria-live", "polite");
    if (current(record) && record.status) setAttribute(record.status, "aria-atomic", "true");
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function enhanceChart(root: HTMLElement): ChartRecord {
  const record = acquireChart(root);
  try {
    render(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function resolve(target: ChartTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? chartRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : chartRoot(target);
  if (resolved) return resolved;
  throw new Error(`Chart target did not match data-jqs="chart": ${String(target)}`);
}

function actionRoot(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string") return resolve(target, context.root);
  const closest =
    context.element?.closest('[data-jqs="chart"]') ??
    (isHTMLElement(context.root) ? chartRoot(context.root) : undefined);
  return resolve(isHTMLElement(closest) ? closest : String(target));
}

function controlled(context: StarContext, owner: Document, target?: unknown): HTMLElement {
  const root = actionRoot(context, target);
  if (root.ownerDocument !== owner || !uiActive(root)) {
    throw new Error("This UI target is unavailable in its owning Document.");
  }
  return root;
}

function request(
  target: ChartTarget,
  type?: ChartType,
  allowed: () => boolean = () => true,
): HTMLElement {
  const root = resolve(target);
  const requested = (intents.get(root) ?? 0) + 1;
  intents.set(root, requested);
  if (!allowed()) return root;
  const record = acquireChart(root);
  const revision = ++record.revision;
  const valid = (): boolean =>
    current(record, revision) && intents.get(root) === requested && allowed();
  if (!valid()) return root;
  if (type && root.dataset.type !== type) root.dataset.type = type;
  if (valid()) render(record, type === undefined || record.rendering !== undefined, allowed);
  return root;
}

function constrained(context: StarContext, root: HTMLElement): boolean {
  const selector =
    ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]';
  return Boolean(
    root.closest(selector) ||
    context.element?.closest(selector) ||
    (context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) ||
    (context.event && "isDefaultPrevented" in context.event && context.event.isDefaultPrevented()),
  );
}

function enhanceAll(root: ParentNode): void {
  const elements = uiElements(root, '[data-jqs="chart"]');
  for (const element of elements) {
    const chart = chartRoot(element);
    if (chart) enhanceChart(chart);
  }
}

export function createCharts(registerAction: ActionRegistrar, owner: Document): ChartCollection {
  const api: StarChartStatic = {
    refresh: (target) => request(target),
    setType: (target, type) => {
      if (!(["bar", "line"] as ChartType[]).includes(type)) {
        throw new Error(`Chart type must be "bar" or "line": ${String(type)}`);
      }
      return request(target, type);
    },
    type: (target) => enhanceChart(resolve(target)).type,
    data: (target) => cloneData(parseData(enhanceChart(resolve(target)).table)),
  };
  registerAction("ui.chart.refresh", (context) => {
    const root = controlled(context, owner, context.args?.[0]);
    return request(root, undefined, () => !constrained(context, root));
  });
  registerAction("ui.chart.type", (context) => {
    const first = context.args?.[0];
    const explicit = isHTMLElement(first) || context.args?.[1] !== undefined;
    const target = controlled(context, owner, explicit ? first : undefined);
    const type = explicit ? context.args?.[1] : first;
    if (type !== "bar" && type !== "line") {
      throw new Error('ui.chart.type needs "bar" or "line".');
    }
    return request(target, type, () => !constrained(context, target));
  });
  return { api, enhance: enhanceAll };
}
