import type { ActionRegistrar } from "../registry";
import type {
  ChartData,
  ChartSeries,
  ChartTarget,
  ChartType,
  StarChartStatic,
  StarContext,
} from "../types";

interface ChartRecord {
  legend: HTMLElement | undefined;
  plot: SVGSVGElement;
  root: HTMLElement;
  signature: string;
  table: HTMLTableElement;
  type: ChartType;
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
let chartId = 0;

function chartRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="chart"]') ? value : undefined;
}

function owned<T extends Element>(root: HTMLElement, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter(
    (element) => element.closest('[data-jqs="chart"]') === root,
  );
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
  name: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
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
  const text = svgElement("text", attributes);
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
  const title = svgElement("title");
  title.textContent = value;
  element.append(title);
}

function drawGrid(
  content: SVGGElement,
  maximum: number,
  dimensions: { bottom: number; left: number; plotHeight: number; plotWidth: number; top: number },
): void {
  const grid = svgElement("g", { "data-part": "grid" });
  for (const index of [0, 1, 2, 3, 4]) {
    const ratio = index / 4;
    const y = dimensions.bottom - dimensions.plotHeight * ratio;
    grid.append(
      svgElement("line", {
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
      const bar = svgElement("rect", {
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
      svgElement("polyline", {
        "data-part": "line",
        "data-series": series.key,
        fill: "none",
        points: points.map((point) => `${point.x},${point.y}`).join(" "),
        stroke: series.color,
      }),
    );
    points.forEach((point, index) => {
      const dot = svgElement("circle", {
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

function renderLegend(record: ChartRecord, data: ChartData): void {
  if (!record.legend) return;
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
  record.legend.replaceChildren(fragment);
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
    new CustomEvent(`jquery-star:chart:${name}`, { bubbles: true, cancelable, detail }),
  );
}

function render(record: ChartRecord, data: ChartData, type: ChartType, signature: string): void {
  if (!emit(record, "before-render", data, type, true)) return;
  record.signature = signature;
  record.type = type;
  if (record.root.dataset.state !== "ready") record.root.dataset.state = "ready";
  record.plot.setAttribute("viewBox", "0 0 640 300");
  record.plot.setAttribute("preserveAspectRatio", "xMidYMid meet");
  record.plot.setAttribute("aria-hidden", "true");
  record.plot.setAttribute("focusable", "false");

  const content = svgElement("g", { "data-part": "plot-content" });
  const dimensions = {
    bottom: 258,
    left: 52,
    plotHeight: 224,
    plotWidth: 568,
    top: 34,
  };
  const maximum = niceMaximum(data);
  drawGrid(content, maximum, dimensions);
  drawLabels(content, data, dimensions);
  if (type === "line") drawLines(content, data, maximum, dimensions);
  else drawBars(content, data, maximum, dimensions);
  record.plot.replaceChildren(content);
  renderLegend(record, data);

  const status = owned<HTMLElement>(record.root, '[data-part="status"]')[0];
  if (status) {
    const message = `${data.labels.length} categories and ${data.series.length} series rendered as a ${type} chart.`;
    if (status.textContent !== message) status.textContent = message;
  }
  emit(record, "render", data, type);
}

function enhanceChart(root: HTMLElement, force = false): ChartRecord {
  root.id ||= `jqs-chart-${++chartId}`;
  const table = owned<HTMLTableElement>(root, 'table[data-part="data"]')[0];
  const plot = owned<SVGSVGElement>(root, 'svg[data-part="plot"]')[0];
  if (!table || !plot) {
    throw new Error(`Chart #${root.id} needs a table data-part="data" and svg data-part="plot".`);
  }
  table.id ||= `${root.id}-data`;
  const caption = table.caption;
  if (!caption?.textContent?.trim()) {
    throw new Error(`Chart table #${table.id} needs a non-empty caption.`);
  }
  const type = chartType(root);
  const data = parseData(table);
  const signature = JSON.stringify({ data, type });
  let record = records.get(root);
  if (!record) {
    record = {
      legend: owned<HTMLElement>(root, '[data-part="legend"]')[0],
      plot,
      root,
      signature: "",
      table,
      type,
    };
    records.set(root, record);
  } else {
    record.legend = owned<HTMLElement>(root, '[data-part="legend"]')[0];
    record.plot = plot;
    record.table = table;
  }
  const status = owned<HTMLElement>(root, '[data-part="status"]')[0];
  if (status) {
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  }
  if (force || record.signature !== signature) render(record, data, type, signature);
  return record;
}

function resolve(target: ChartTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? chartRoot(root.querySelector(target)) : chartRoot(target);
  if (resolved) return resolved;
  throw new Error(`Chart target did not match data-jqs="chart": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="chart"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="chart"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="chart"]')));
  for (const element of elements) {
    const chart = chartRoot(element);
    if (chart) enhanceChart(chart);
  }
}

export function createCharts(registerAction: ActionRegistrar): ChartCollection {
  const api: StarChartStatic = {
    refresh: (target) => enhanceChart(resolve(target), true).root,
    setType: (target, type) => {
      if (!(["bar", "line"] as ChartType[]).includes(type)) {
        throw new Error(`Chart type must be "bar" or "line": ${String(type)}`);
      }
      const root = resolve(target);
      if (root.dataset.type !== type) root.dataset.type = type;
      enhanceChart(root);
      return root;
    },
    type: (target) => enhanceChart(resolve(target)).type,
    data: (target) => cloneData(parseData(enhanceChart(resolve(target)).table)),
  };
  registerAction("ui.chart.refresh", (context) =>
    api.refresh(controlled(context, context.args?.[0])),
  );
  registerAction("ui.chart.type", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const type = explicit ? context.args?.[1] : first;
    if (type !== "bar" && type !== "line") {
      throw new Error('ui.chart.type needs "bar" or "line".');
    }
    return api.setType(target, type);
  });
  return { api, enhance: enhanceAll };
}
