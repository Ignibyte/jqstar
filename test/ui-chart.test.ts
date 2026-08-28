import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#visitors-chart")!;
}

function table(): HTMLTableElement {
  return root().querySelector<HTMLTableElement>('table[data-part="data"]')!;
}

function plot(): SVGSVGElement {
  return root().querySelector<SVGSVGElement>('svg[data-part="plot"]')!;
}

describe("jQuery Star Chart", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <figure id="visitors-chart" data-jqs="chart" data-type="bar" aria-labelledby="visitors-title">
          <figcaption id="visitors-title">Visitors by device</figcaption>
          <svg data-part="plot"></svg>
          <div data-part="legend"></div>
          <p data-part="status"></p>
          <table data-part="data">
            <caption>Monthly visitors by device</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" data-series="desktop" data-color="#2563eb">Desktop</th>
                <th scope="col" data-series="mobile" data-color="#0f766e">Mobile</th>
              </tr>
            </thead>
            <tbody>
              <tr><th scope="row">Jan</th><td>186</td><td>80</td></tr>
              <tr><th scope="row">Feb</th><td>305</td><td>200</td></tr>
              <tr><th scope="row">Mar</th><td>237</td><td>120</td></tr>
            </tbody>
          </table>
        </figure>
        <button id="line-chart" data-on:click="@ui.chart.type('#visitors-chart', 'line')">
          Line chart
        </button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("renders a responsive SVG from one accessible native table", () => {
    expect(table().caption?.textContent).toBe("Monthly visitors by device");
    expect(plot().getAttribute("viewBox")).toBe("0 0 640 300");
    expect(plot().getAttribute("aria-hidden")).toBe("true");
    expect(plot().querySelectorAll('[data-part="bar"]')).toHaveLength(6);
    expect(plot().querySelector('[data-part="bar"] title')?.textContent).toBe("Jan, Desktop: 186");
    expect(root().querySelector('[data-part="legend"]')?.textContent).toBe("DesktopMobile");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe(
      "3 categories and 2 series rendered as a bar chart.",
    );
  });

  it("returns cloned labels, series, colors, and values", () => {
    const data = $.star.ui.chart.data(root());
    expect(data).toEqual({
      labels: ["Jan", "Feb", "Mar"],
      series: [
        { color: "#2563eb", key: "desktop", label: "Desktop", values: [186, 305, 237] },
        { color: "#0f766e", key: "mobile", label: "Mobile", values: [80, 200, 120] },
      ],
    });
    data.labels[0] = "Changed";
    expect($.star.ui.chart.data(root()).labels[0]).toBe("Jan");
  });

  it("switches to line mode through the API and named action", () => {
    const render = vi.fn();
    root().addEventListener("jquery-star:chart:render", render);
    $.star.ui.chart.setType(root(), "line");
    expect($.star.ui.chart.type(root())).toBe("line");
    expect(plot().querySelectorAll('[data-part="line"]')).toHaveLength(2);
    expect(plot().querySelectorAll('[data-part="point"]')).toHaveLength(6);
    expect(render).toHaveBeenCalledOnce();

    $.star.ui.chart.setType(root(), "bar");
    $("#line-chart").trigger("click");
    expect(root().dataset.type).toBe("line");
    expect(plot().querySelectorAll('[data-part="line"]')).toHaveLength(2);
  });

  it("refreshes after backend-owned table cells change", () => {
    const cell = table().tBodies[0]!.rows[0]!.cells[1]!;
    cell.textContent = "420";
    $.star.ui.chart.refresh(root());
    expect($.star.ui.chart.data(root()).series[0]?.values[0]).toBe(420);
    expect(plot().querySelector('[data-part="bar"] title')?.textContent).toBe("Jan, Desktop: 420");

    root().dataset.type = "line";
    $.star.ui.enhance(root());
    expect($.star.ui.chart.type(root())).toBe("line");
    expect(plot().querySelector('[data-part="line"]')).not.toBeNull();
  });

  it("honors a canceled render without replacing the current plot", () => {
    const before = plot().innerHTML;
    const cancel = (event: Event): void => event.preventDefault();
    root().addEventListener("jquery-star:chart:before-render", cancel);
    table().tBodies[0]!.rows[0]!.cells[1]!.textContent = "999";
    $.star.ui.chart.refresh(root());
    expect(plot().innerHTML).toBe(before);

    root().removeEventListener("jquery-star:chart:before-render", cancel);
    $.star.ui.chart.refresh(root());
    expect(plot().innerHTML).not.toBe(before);
  });

  it("rejects malformed and negative table data", () => {
    const fixture = document.createElement("div");
    fixture.innerHTML = `<figure id="invalid-chart" data-jqs="chart">
        <svg data-part="plot"></svg>
        <table data-part="data">
          <caption>Invalid chart</caption>
          <thead><tr><th>Label</th><th>Value</th></tr></thead>
          <tbody><tr><th>First</th><td>-1</td></tr></tbody>
        </table>
      </figure>`;
    expect(() => $.star.ui.enhance(fixture.querySelector("#invalid-chart")!)).toThrow(
      "finite, non-negative numeric value",
    );
  });
});
