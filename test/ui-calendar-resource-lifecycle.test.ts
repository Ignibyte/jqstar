import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import { withStarDOMRealm } from "../src/testing";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};

let failedDisposal = false;
let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;
beforeEach(() => {
  failedDisposal = false;
  document.body.replaceChildren();
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});
afterEach(() => {
  if (failedDisposal) expect(() => star.dispose()).toThrow();
  else star.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function part<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
  const found = root.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`Missing calendar fixture: ${selector}`);
  return found;
}
function fixture(range: boolean, picker = false) {
  const root = document.createElement("section");
  const kind = range ? "range-calendar" : "calendar";
  const family = picker ? (range ? "date-range-picker" : "date-picker") : kind;
  root.dataset.jqs = family;
  const markup = `<div data-part="header"><button data-part="previous">Previous</button><h2 data-part="heading"></h2><button data-part="next">Next</button></div><div data-part="grid"></div><p data-part="status"></p>`;
  if (picker) {
    root.innerHTML = `${range ? '<input data-part="start-control" value="2026-09-02"><input data-part="end-control" value="2026-09-05">' : '<input data-part="control" value="2026-09-02">'}<div data-jqs="popover" data-part="popover"><button data-part="trigger">Choose</button><div data-part="content"><section data-jqs="${kind}" data-month="2026-09">${markup}</section></div></div>`;
  } else {
    root.dataset.month = "2026-09";
    if (range) {
      root.dataset.start = "2026-09-02";
      root.dataset.end = "2026-09-05";
    } else root.dataset.value = "2026-09-02";
    root.innerHTML = markup;
  }
  document.body.append(root);
  const calendar = picker ? part(root, `[data-jqs="${kind}"]`, HTMLElement) : root;
  const select = (date = "2026-09-10") => {
    if (picker) {
      if (range) ui.dateRangePicker.select(root, date, "2026-09-22");
      else ui.datePicker.select(root, date);
    } else if (range) ui.rangeCalendar.select(root, date, "2026-09-22");
    else ui.calendar.select(root, date);
  };
  const next = () => (range ? ui.rangeCalendar.next(calendar) : ui.calendar.next(calendar));
  const open = () => (range ? ui.dateRangePicker.open(root) : ui.datePicker.open(root));
  const close = () => (range ? ui.dateRangePicker.close(root) : ui.datePicker.close(root));
  const event = (name: string) => `jquery-star:${family}:${name}`;
  const calendarEvent = (name: string) => `jquery-star:${kind}:${name}`;
  const control = () =>
    part(root, `[data-part="${range ? "start-control" : "control"}"]`, HTMLInputElement);
  const day = (value: string) =>
    part(calendar, `[data-part="day"][data-value="${value}"]`, HTMLButtonElement);
  return { root, calendar, select, next, open, close, event, calendarEvent, control, day };
}

describe.each([false, true])("Calendar range=%s scope", (range) => {
  describe.each([false, true])("picker=%s", (picker) => {
    it.each(["render", "native", "dispose", "preserve"] as const)(
      "retires exact native listeners across %s",
      async (mode) => {
        const f = fixture(range, picker);
        ui.enhance(f.root);
        await star.whenEnhanced();
        const removed = vi.spyOn(f.calendar, "removeEventListener");
        const changed = vi.fn();
        f.calendar.addEventListener(f.calendarEvent("view-change"), changed);
        const button = part(f.calendar, '[data-part="next"]', HTMLButtonElement);
        const removedControl = picker ? vi.spyOn(f.control(), "removeEventListener") : undefined;
        let operation: ReturnType<ReturnType<typeof createRenderAdapter>["begin"]> | undefined;
        if (mode === "dispose") star.dispose();
        else if (mode === "native") {
          f.root.remove();
          await star.whenEnhanced();
        } else {
          operation = createRenderAdapter(installed).begin(
            document.body,
            mode === "preserve" ? { preserveRoots: [f.root] } : {},
          );
          operation.beforeRemove(f.root);
          ui.enhance(document);
        }
        button.click();
        expect(changed).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
        if (mode !== "preserve") {
          expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
          expect(removed).toHaveBeenCalledWith("keydown", expect.any(Function));
          if (picker) {
            expect(removed).toHaveBeenCalledWith(f.calendarEvent("change"), expect.any(Function));
            expect(removedControl).toHaveBeenCalledWith("click", expect.any(Function));
          }
        }
        if (mode === "render") f.root.remove();
        await operation?.commit();
      },
    );
  });

  it("keeps the newer selection made by a before-change callback", () => {
    const f = fixture(range);
    ui.enhance(f.root);
    const changed = vi.fn();
    f.root.addEventListener(f.event("change"), changed);
    f.root.addEventListener(f.event("before-change"), () => f.select("2026-09-15"), { once: true });
    f.select();
    expect(range ? f.root.dataset.start : f.root.dataset.value).toBe("2026-09-15");
    expect(changed).toHaveBeenCalledOnce();
  });

  it("stops selection after disposal in before-change", () => {
    const f = fixture(range);
    ui.enhance(f.root);
    const changed = vi.fn();
    f.root.addEventListener(f.event("change"), changed);
    f.root.addEventListener(f.event("before-change"), () => star.dispose());
    f.select();
    expect(range ? f.root.dataset.start : f.root.dataset.value).toBe("2026-09-02");
    expect(changed).not.toHaveBeenCalled();
  });

  it("stops keyboard focus after view-change disposes the controller", () => {
    const f = fixture(range);
    ui.enhance(f.root);
    const focused = vi.spyOn(HTMLElement.prototype, "focus");
    f.root.addEventListener(f.event("view-change"), () => star.dispose());
    f.day("2026-09-02").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "PageDown" }),
    );
    expect(focused).not.toHaveBeenCalled();
  });

  it("retains month, values and roving focus after removal and reacquisition", async () => {
    const f = fixture(range);
    ui.enhance(f.root);
    f.day("2026-09-02").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    const focusDate = part(f.root, '[data-part="day"][tabindex="0"]', HTMLButtonElement).dataset
      .value;
    f.root.remove();
    await star.whenEnhanced();
    document.body.append(f.root);
    ui.enhance(f.root);
    ui.enhance(f.root);
    expect(f.root.dataset.month).toBe("2026-09");
    expect(range ? f.root.dataset.start : f.root.dataset.value).toBe("2026-09-02");
    expect(part(f.root, '[data-part="day"][tabindex="0"]', HTMLButtonElement).dataset.value).toBe(
      focusDate,
    );
    const changed = vi.fn();
    f.root.addEventListener(f.event("view-change"), changed);
    part(f.root, '[data-part="next"]', HTMLButtonElement).click();
    expect(changed).toHaveBeenCalledOnce();
  });

  it("rolls back native listeners if a later registration throws", () => {
    const f = fixture(range);
    f.root.remove();
    const add = f.root.addEventListener.bind(f.root);
    vi.spyOn(f.root, "addEventListener").mockImplementation((name, listener, options) => {
      add(name, listener, options);
      if (name === "keydown") throw new Error("registration failed");
    });
    const removed = vi.spyOn(f.root, "removeEventListener");
    expect(() => ui.enhance(f.root)).toThrow("registration failed");
    expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    expect(removed).toHaveBeenCalledWith("keydown", expect.any(Function));
    part(f.root, '[data-part="next"]', HTMLButtonElement).click();
    expect(f.root.dataset.month).toBe("2026-09");
  });

  it("stops acquisition when native registration disposes the installation", () => {
    const f = fixture(range);
    const add = f.root.addEventListener.bind(f.root);
    const added = vi
      .spyOn(f.root, "addEventListener")
      .mockImplementation((name, listener, options) => {
        if (name === "click") star.dispose();
        add(name, listener, options);
      });
    const removed = vi.spyOn(f.root, "removeEventListener");
    ui.enhance(f.root);
    expect(added.mock.calls.map(([name]) => name)).toEqual(["click"]);
    expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    part(f.root, '[data-part="next"]', HTMLButtonElement).click();
    expect(f.root.dataset.month).toBe("2026-09");
  });

  it("stops selection when before-change replaces the grid", () => {
    const f = fixture(range);
    ui.enhance(f.root);
    f.root.addEventListener(f.event("before-change"), () => {
      const grid = part(f.root, '[data-part="grid"]', HTMLElement);
      grid.replaceWith(grid.cloneNode(false));
      ui.enhance(f.root);
    });
    const changed = vi.fn();
    f.root.addEventListener(f.event("change"), changed);
    f.select();
    expect(changed).not.toHaveBeenCalled();
    expect(range ? f.root.dataset.start : f.root.dataset.value).toBe("2026-09-02");
  });

  it("stops selection when before-change patches constraints and enhances", () => {
    const f = fixture(range);
    ui.enhance(f.root);
    f.root.addEventListener(f.event("before-change"), () => {
      f.root.dataset.max = "2026-09-05";
      ui.enhance(f.root);
    });
    f.select();
    expect(range ? f.root.dataset.start : f.root.dataset.value).toBe("2026-09-02");
  });

  it("stops notification if focusing the selected day disposes the installation", () => {
    const f = fixture(range);
    ui.enhance(f.root);
    f.day("2026-09-02").focus();
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(() => star.dispose());
    const changed = vi.fn();
    f.root.addEventListener(f.event("change"), changed);
    f.select();
    expect(changed).not.toHaveBeenCalled();
  });
});

describe.each([false, true])("Date picker range=%s scope", (range) => {
  it("keeps an empty native reset through enhancement and reacquisition", async () => {
    vi.useFakeTimers();
    const f = fixture(range, true);
    const form = document.createElement("form");
    document.body.append(form);
    form.append(f.root);
    for (const control of f.root.querySelectorAll("input")) control.defaultValue = "";
    ui.enhance(f.root);
    f.select();
    form.reset();
    ui.enhance(f.root);
    vi.runOnlyPendingTimers();
    expect(f.control().value).toBe("");
    expect(range ? f.calendar.dataset.start : f.calendar.dataset.value).toBeFalsy();
    f.root.remove();
    await star.whenEnhanced();
    form.append(f.root);
    ui.enhance(f.root);
    expect(f.control().value).toBe("");
  });

  it("releases pending reset work and rebinds a newly associated form", () => {
    vi.useFakeTimers();
    const f = fixture(range, true);
    const first = document.createElement("form");
    const second = document.createElement("form");
    document.body.append(first, second);
    first.append(f.root);
    ui.enhance(f.root);
    f.select();
    first.reset();
    const removed = vi.spyOn(first, "removeEventListener");
    const cleared = vi.spyOn(window, "clearTimeout");
    second.append(f.root);
    ui.enhance(f.root);
    expect(removed).toHaveBeenCalledWith("reset", expect.any(Function));
    expect(cleared).toHaveBeenCalled();
    f.select();
    first.reset();
    vi.runOnlyPendingTimers();
    expect(f.control().value).toBe("2026-09-10");
    second.reset();
    vi.runOnlyPendingTimers();
    expect(f.control().value).toBe("2026-09-02");
    expect(range ? f.calendar.dataset.start : f.calendar.dataset.value).toBe("2026-09-02");
  });

  it("cancels a reset timer acquired after reentrant disposal", () => {
    const f = fixture(range, true);
    const form = document.createElement("form");
    document.body.append(form);
    form.append(f.root);
    ui.enhance(f.root);
    const windowHost: Window = window;
    const schedule = windowHost.setTimeout.bind(windowHost);
    let timer: number | undefined;
    vi.spyOn(windowHost, "setTimeout").mockImplementationOnce((...args) => {
      star.dispose();
      timer = schedule(...args);
      return timer;
    });
    const cleared = vi.spyOn(window, "clearTimeout");
    form.reset();
    expect(cleared).toHaveBeenCalledWith(timer);
  });

  it.each(["input", "change", "component"] as const)(
    "stops the selection chain after disposal from %s",
    (stage) => {
      const f = fixture(range, true);
      ui.enhance(f.root);
      f.open();
      const controlChange = vi.fn();
      const changed = vi.fn();
      const closed = vi.spyOn(ui.popover, "close");
      const focused = vi.spyOn(HTMLElement.prototype, "focus");
      const target = stage === "component" ? f.root : f.control();
      target.addEventListener(stage === "component" ? f.event("change") : stage, () =>
        star.dispose(),
      );
      f.control().addEventListener("change", controlChange);
      f.root.addEventListener(f.event("change"), changed);
      expect(() => f.select()).not.toThrow();
      expect(controlChange).toHaveBeenCalledTimes(stage === "input" ? 0 : 1);
      expect(changed).toHaveBeenCalledTimes(stage === "component" ? 1 : 0);
      expect(closed).not.toHaveBeenCalled();
      expect(focused).not.toHaveBeenCalled();
    },
  );

  it("keeps unchanged listeners and intended queued focus", async () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    const add = vi.spyOn(f.control(), "addEventListener");
    f.open();
    const focused = vi.spyOn(HTMLElement.prototype, "focus");
    ui.enhance(f.root);
    ui.enhance(f.root);
    await Promise.resolve();
    expect(add).not.toHaveBeenCalled();
    expect(focused).toHaveBeenCalledOnce();
  });

  it("invalidates queued focus when the picker is retired", async () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    f.open();
    const focused = vi.spyOn(HTMLElement.prototype, "focus");
    star.dispose();
    await Promise.resolve();
    expect(focused).not.toHaveBeenCalled();
  });

  it("stops the old native event chain when a control is replaced", () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    const old = f.control();
    old.addEventListener("input", () => {
      old.replaceWith(old.cloneNode(true));
      ui.enhance(f.root);
    });
    const changed = vi.fn();
    const component = vi.fn();
    old.addEventListener("change", changed);
    f.root.addEventListener(f.event("change"), component);
    f.select();
    expect(changed).not.toHaveBeenCalled();
    expect(component).not.toHaveBeenCalled();
  });

  it("keeps the newer selection started by native input", () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    f.control().addEventListener("input", () => f.select("2026-09-15"), { once: true });
    const changed = vi.fn();
    const native = vi.fn();
    f.root.addEventListener(f.event("change"), changed);
    f.control().addEventListener("change", native);
    f.select();
    expect(f.control().value).toBe("2026-09-15");
    expect(changed).toHaveBeenCalledOnce();
    expect(native).toHaveBeenCalledOnce();
  });

  it("only focuses the latest of two opens separated by close", async () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    f.open();
    f.close();
    f.open();
    const focused = vi.spyOn(HTMLElement.prototype, "focus");
    await Promise.resolve();
    expect(focused).toHaveBeenCalledOnce();
  });

  it("stops opening when Calendar view-change disposes the picker", () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    f.next();
    f.calendar.addEventListener(f.calendarEvent("view-change"), () => star.dispose());
    const opened = vi.spyOn(ui.popover, "open");
    expect(() => f.open()).not.toThrow();
    expect(opened).not.toHaveBeenCalled();
  });

  it("stops acquisition when a control listener disposes the picker", () => {
    const f = fixture(range, true);
    const control = f.control();
    const add = control.addEventListener.bind(control);
    const added = vi
      .spyOn(control, "addEventListener")
      .mockImplementation((name, listener, options) => {
        if (name === "click") star.dispose();
        add(name, listener, options);
      });
    const removed = vi.spyOn(control, "removeEventListener");
    expect(() => ui.enhance(f.root)).not.toThrow();
    expect(added.mock.calls.map(([name]) => name)).toEqual(["click"]);
    expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    const opened = vi.spyOn(ui.popover, "open");
    control.click();
    expect(opened).not.toHaveBeenCalled();
  });

  it("sweeps all listeners when an earlier removal throws", () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    const remove = f.calendar.removeEventListener.bind(f.calendar);
    vi.spyOn(f.calendar, "removeEventListener").mockImplementation((name, listener, options) => {
      remove(name, listener, options);
      if (name === f.calendarEvent("change")) throw new Error("removal failed");
    });
    const removed = vi.spyOn(f.control(), "removeEventListener");
    const removedRoot = vi.spyOn(f.root, "removeEventListener");
    expect(() => star.dispose()).toThrow();
    expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    expect(removed).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(removedRoot).toHaveBeenCalledWith("click", expect.any(Function), true);
    expect(() => star.dispose()).toThrow();
    // Disposal reports retained cleanup failures on later calls too.
    failedDisposal = true;
  });

  it("does not reacquire an outgoing child Calendar through its live picker", async () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    const operation = createRenderAdapter(installed).begin(document.body);
    operation.beforeRemove(f.calendar);
    const added = vi.spyOn(f.calendar, "addEventListener");
    expect(() => ui.enhance(f.root)).not.toThrow();
    expect(() => f.open()).not.toThrow();
    expect(added).not.toHaveBeenCalled();
    f.root.remove();
    await operation.commit();
  });

  it("keeps the replacement record acquired reentrantly during listener cleanup", () => {
    const f = fixture(range, true);
    ui.enhance(f.root);
    const old = f.control();
    const replacement = old.cloneNode(true) as HTMLInputElement;
    old.replaceWith(replacement);
    const remove = old.removeEventListener.bind(old);
    let reentered = false;
    vi.spyOn(old, "removeEventListener").mockImplementation((name, listener, options) => {
      remove(name, listener, options);
      if (!reentered) {
        reentered = true;
        ui.enhance(f.root);
      }
    });
    ui.enhance(f.root);
    const changed = vi.fn();
    f.root.addEventListener(f.event("change"), changed);
    f.select();
    expect(changed).toHaveBeenCalledOnce();
    expect(replacement.value).toBe("2026-09-10");
    expect(old.value).toBe("2026-09-02");
  });

  it.each(["normal", "unchanged", "canceled", "retired", "replaced", "newer-selection"] as const)(
    "synchronizes native form reset with the current Calendar: %s",
    (mode) => {
      vi.useFakeTimers();
      const f = fixture(range, true);
      const form = document.createElement("form");
      document.body.append(form);
      form.append(f.root);
      ui.enhance(f.root);
      f.select();
      if (mode === "canceled") form.addEventListener("reset", (event) => event.preventDefault());
      const changed = vi.fn();
      f.root.addEventListener(f.event("change"), changed);
      form.reset();
      if (mode === "unchanged") {
        ui.enhance(f.root);
        ui.enhance(f.root);
      }
      if (mode === "retired") star.dispose();
      if (mode === "replaced") {
        const control = f.control();
        const replacement = control.cloneNode(true) as HTMLInputElement;
        replacement.value = "2026-09-03";
        control.replaceWith(replacement);
        ui.enhance(f.root);
      }
      if (mode === "newer-selection") f.select("2026-09-15");
      vi.runOnlyPendingTimers();
      const expected =
        mode === "newer-selection"
          ? "2026-09-15"
          : mode === "replaced"
            ? "2026-09-03"
            : mode === "canceled" || mode === "retired"
              ? "2026-09-10"
              : "2026-09-02";
      expect(range ? f.calendar.dataset.start : f.calendar.dataset.value).toBe(expected);
      if (mode !== "retired") expect(f.control().value).toBe(expected);
      expect(changed).toHaveBeenCalledTimes(mode === "newer-selection" ? 1 : 0);
    },
  );
});

it("Range Calendar clear preserves a newer selection made in before-change", () => {
  const f = fixture(true);
  ui.enhance(f.root);
  f.root.addEventListener(f.event("before-change"), () => f.select(), { once: true });
  ui.rangeCalendar.clear(f.root);
  expect(f.root.dataset.start).toBe("2026-09-10");
  expect(f.root.dataset.end).toBe("2026-09-22");
});

it("Date Range Picker normalizes reversed native values together with its Calendar", () => {
  const f = fixture(true, true);
  f.control().value = "2026-09-18";
  ui.enhance(f.root);
  expect(f.control().value).toBe("2026-09-05");
  expect(part(f.root, '[data-part="end-control"]', HTMLInputElement).value).toBe("2026-09-18");
  expect(f.calendar.dataset.start).toBe("2026-09-05");
  expect(f.calendar.dataset.end).toBe("2026-09-18");
});

it.each([false, true])(
  "Calendar range=%s creates and focuses days in its captured document",
  async (range) => {
    const local = fixture(range);
    ui.enhance(local.root);
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const foreign = frame.contentWindow as (Window & typeof globalThis) | null;
    if (!foreign) throw new Error("Missing frame window");
    const root = foreign.document.createElement("section");
    root.dataset.jqs = range ? "range-calendar" : "calendar";
    root.dataset.month = "2026-09";
    root.innerHTML =
      '<div data-part="header"><button data-part="previous">Previous</button><h2 data-part="heading"></h2><button data-part="next">Next</button></div><div data-part="grid"></div>';
    foreign.document.body.append(root);
    const other = await withStarDOMRealm({ window: foreign, document: foreign.document }, () => {
      const installed = installStarCore(jQueryFactory(foreign), { document: foreign.document });
      installed.star.use(uiPlugin).enhance(root);
      return installed;
    });
    const otherStar = other.star;
    try {
      const create = vi.spyOn(document, "createElement");
      const next = part(root, '[data-part="next"]', foreign.HTMLButtonElement);
      next.click();
      expect(root.dataset.month).toBe("2026-10");
      expect(local.root.dataset.month).toBe("2026-09");
      expect(create).not.toHaveBeenCalled();
      const focused = part(root, '[data-part="day"][tabindex="0"]', foreign.HTMLButtonElement);
      focused.dispatchEvent(
        new foreign.KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
      );
      expect(foreign.document.activeElement?.getAttribute("data-part")).toBe("day");
      otherStar.dispose();
      next.click();
      expect(root.dataset.month).toBe("2026-10");
      local.next();
      expect(local.root.dataset.month).toBe("2026-10");
    } finally {
      otherStar.dispose();
    }
  },
);

it.each([false, true])("Date picker range=%s owns reset timers in its document", async (range) => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const foreign = frame.contentWindow as (Window & typeof globalThis) | null;
  if (!foreign) throw new Error("Missing frame window");
  const owned = await withStarDOMRealm({ window: foreign, document: foreign.document }, () => {
    const other = installStarCore(jQueryFactory(foreign), { document: foreign.document });
    const otherStar = other.star;
    const otherUI = otherStar.use(uiPlugin);
    const f = fixture(range, true);
    const form = foreign.document.createElement("form");
    foreign.document.body.append(form);
    form.append(f.root);
    otherUI.enhance(f.root);
    if (range) otherUI.dateRangePicker.select(f.root, "2026-09-10", "2026-09-12");
    else otherUI.datePicker.select(f.root, "2026-09-10");
    return { otherStar, form, calendar: f.calendar };
  });
  const callbacks: (() => void)[] = [];
  const windowHost: Window = foreign;
  vi.spyOn(windowHost, "setTimeout").mockImplementation((callback) => {
    if (typeof callback !== "function") throw new Error("Expected a reset function");
    callbacks.push(callback as () => void);
    return callbacks.length;
  });
  const cleared = vi.spyOn(foreign, "clearTimeout");
  try {
    owned.form.reset();
    expect(callbacks).toHaveLength(1);
    callbacks[0]?.();
    expect(range ? owned.calendar.dataset.start : owned.calendar.dataset.value).toBe("2026-09-02");
    owned.form.reset();
    expect(callbacks).toHaveLength(2);
    owned.otherStar.dispose();
    expect(cleared).toHaveBeenCalledWith(2);
    owned.calendar.dataset.month = "2026-07";
    callbacks[1]?.();
    expect(owned.calendar.dataset.month).toBe("2026-07");
  } finally {
    owned.otherStar.dispose();
  }
});
