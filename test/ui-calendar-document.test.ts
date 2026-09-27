import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import type { StarUIStatic } from "../src/types";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
type Kind = "calendar" | "range-calendar" | "date-picker" | "date-range-picker";
const kinds: Kind[] = ["calendar", "range-calendar", "date-picker", "date-range-picker"];
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing Calendar fixture part");
  return value;
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  return required(frame.contentWindow);
}
function install(owner: Window = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  const star = jquery.star;
  stars.push(star);
  return { owner, jquery, star, ui: star.use(uiPlugin) };
}
function fixture(kind: Kind, owner: Window = window): HTMLElement {
  const root = owner.document.createElement("section");
  root.id = "calendar-probe";
  root.className = "calendar-target";
  root.dataset.jqs = kind;
  const markup =
    '<div data-part="header"><button data-part="previous">Previous</button><h2 data-part="heading"></h2><button data-part="next">Next</button></div><div data-part="grid"></div><p data-part="status"></p>';
  const range = kind.includes("range");
  if (kind.includes("picker")) {
    root.innerHTML =
      (range
        ? '<input name="start" data-part="start-control" value="2026-09-02"><input name="end" data-part="end-control" value="2026-09-05">'
        : '<input name="date" data-part="control" value="2026-09-02">') +
      `<div data-jqs="popover" data-part="popover"><button data-part="trigger"><span data-part="value">Choose</span></button><div data-part="content"><section data-jqs="${range ? "range-calendar" : "calendar"}" data-month="2026-09">${markup}</section></div></div>`;
  } else {
    root.dataset.month = "2026-09";
    if (range) {
      root.dataset.start = "2026-09-02";
      root.dataset.end = "2026-09-05";
    } else root.dataset.value = "2026-09-02";
    root.innerHTML = markup;
  }
  return root;
}
function part(root: Element, name: string): HTMLElement {
  return required(root.querySelector<HTMLElement>(`[data-part="${name}"]`));
}
function calendarRoot(root: HTMLElement): HTMLElement {
  return root.dataset.jqs?.includes("picker")
    ? required(
        root.querySelector<HTMLElement>('[data-jqs="calendar"], [data-jqs="range-calendar"]'),
      )
    : root;
}
function api(ui: StarUIStatic, kind: Kind) {
  if (kind === "calendar") return ui.calendar;
  if (kind === "range-calendar") return ui.rangeCalendar;
  if (kind === "date-picker") return ui.datePicker;
  return ui.dateRangePicker;
}
function select(
  ui: StarUIStatic,
  kind: Kind,
  root: HTMLElement,
  start: string | Date = "2026-09-10",
  end?: string | Date,
): void {
  if (kind === "range-calendar") ui.rangeCalendar.select(root, start, end);
  else if (kind === "date-range-picker") ui.dateRangePicker.select(root, start, end);
  else if (kind === "calendar") ui.calendar.select(root, start);
  else ui.datePicker.select(root, start);
}
function selected(root: HTMLElement): string | undefined {
  if (root.dataset.jqs?.includes("picker")) return required(root.querySelector("input")).value;
  return root.dataset[root.dataset.jqs === "calendar" ? "value" : "start"];
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
});

describe.each(kinds)("%s document ownership", (kind) => {
  it("accepts a foreign facade and emits owning-window events", () => {
    const { ui, owner } = install(realm());
    const root = fixture(kind, owner);
    ui.enhance(root);
    expect(api(ui, kind).value(root)).toEqual(
      kind.includes("range") ? { start: "2026-09-02", end: "2026-09-05" } : "2026-09-02",
    );
    const events: Event[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) => events.push(event));
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-10");
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf((owner as Window & typeof globalThis).CustomEvent);
  });
  it("automatically enhances a foreign document", async () => {
    const { star, owner } = install(realm());
    await star.whenEnhanced();
    const root = fixture(kind, owner);
    owner.document.body.append(root);
    await star.whenEnhanced();
    expect(root.querySelectorAll('[data-part="day"]')).toHaveLength(42);
  });
  it.each(["implicit", "selector", "class", "element"] as const)(
    "resolves a foreign %s action on the application root",
    async (mode) => {
      const { jquery, owner } = install(realm());
      const root = fixture(kind, owner);
      const app = required(jquery(root).star().star("instance"));
      const target =
        mode === "element" ? root : mode === "class" ? ".calendar-target" : "#calendar-probe";
      await app.run(`ui.${kind}.select`, {
        args: [
          ...(mode === "implicit" ? [] : [target]),
          "2026-09-10",
          ...(kind.includes("range") ? ["2026-09-12"] : []),
        ],
      });
      expect(selected(root)).toBe("2026-09-10");
    },
  );
  it.each(["enhance", "disposed-first", "facade"] as const)(
    "retains native identity and activation after adoption via %s",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const root = fixture(kind);
      source.ui.enhance(root);
      const grid = part(root, "grid");
      const first = grid.firstElementChild;
      destination.owner.document.adoptNode(root);
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") api(destination.ui, kind).value(root);
      else destination.ui.enhance(root);
      source.star.dispose();
      expect(part(root, "grid")).toBe(grid);
      expect(grid.firstElementChild).toBe(first);
      const day = required(
        root.querySelector<HTMLButtonElement>('[data-part="day"][data-value="2026-09-10"]'),
      );
      day.dispatchEvent(
        new (destination.owner as Window & typeof globalThis).MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(selected(root)).toBe("2026-09-10");
    },
  );
  it("accepts a genuine Date from another JavaScript realm", () => {
    const { ui } = install();
    const root = fixture(kind);
    const date = runInNewContext('new Date("2026-09-10T12:00:00Z")') as Date;
    expect(date instanceof Date).toBe(false);
    select(ui, kind, root, date);
    expect(selected(root)).toBe("2026-09-10");
  });
  it("preserves ISO years below 100", () => {
    const { ui } = install();
    const root = fixture(kind);
    select(ui, kind, root, "0099-09-10");
    expect(selected(root)).toBe("0099-09-10");
    expect(calendarRoot(root).dataset.month).toBe("0099-09");
    expect(root.querySelectorAll('[data-part="day"]')).toHaveLength(42);
  });
  it("rejects invalid Date objects and impossible ISO dates", () => {
    const { ui } = install();
    const root = fixture(kind);
    for (const date of [new Date(Number.NaN), "2026-02-30", "0099-02-29"])
      expect(() => select(ui, kind, root, date)).toThrow();
    expect(selected(root)).toBe("2026-09-02");
  });
  it("does not let an adopted source application action control the destination", async () => {
    const source = install();
    const destination = install(realm());
    const root = fixture(kind);
    const app = required(source.jquery(root).star().star("instance"));
    destination.owner.document.adoptNode(root);
    destination.ui.enhance(root);
    await expect(app.run(`ui.${kind}.select`, { args: ["2026-09-10"] })).rejects.toThrow();
    expect(selected(root)).toBe("2026-09-02");
  });
  it("rechecks date constraints changed by before-change", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const calendar = calendarRoot(root);
    const name = kind.includes("range") ? "range-calendar" : "calendar";
    calendar.addEventListener(
      `jquery-star:${name}:before-change`,
      () => {
        calendar.dataset.disabledDates = "2026-09-10";
      },
      { once: true },
    );
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-02");
  });
  it("rechecks action constraints introduced in before-change", async () => {
    const { ui, jquery } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const name = kind.includes("range") ? "range-calendar" : "calendar";
    calendarRoot(root).addEventListener(
      `jquery-star:${name}:before-change`,
      () => {
        root.dataset.disabled = "true";
      },
      { once: true },
    );
    const app = required(jquery(root).star().star("instance"));
    await app.run(`ui.${kind}.select`, { args: ["2026-09-10"] });
    expect(selected(root)).toBe("2026-09-02");
  });
  it("ignores a canceled named action", async () => {
    const { jquery } = install();
    const root = fixture(kind);
    const app = required(jquery(root).star().star("instance"));
    const event = new Event("click", { cancelable: true });
    event.preventDefault();
    await app.run(`ui.${kind}.select`, { event, args: ["2026-09-10"] });
    expect(selected(root)).toBe("2026-09-02");
  });
  it.each(["native", "action"] as const)(
    "stops %s notification when a live write disables the root",
    async (mode) => {
      const { ui, jquery } = install();
      const root = fixture(kind);
      ui.enhance(root);
      const app = required(jquery(root).star().star("instance"));
      const heading = part(root, "heading");
      const set = heading.setAttribute.bind(heading);
      vi.spyOn(heading, "setAttribute").mockImplementation((...args) => {
        set(...args);
        if (calendarRoot(root).dataset[kind.includes("range") ? "start" : "value"] === "2026-09-10")
          root.dataset.disabled = "true";
      });
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${kind}:change`, changed);
      if (mode === "action") await app.run(`ui.${kind}.select`, { args: ["2026-09-10"] });
      else
        required(root.querySelector('[data-part="day"][data-value="2026-09-10"]')).dispatchEvent(
          new MouseEvent("click", { bubbles: true }),
        );
      expect(changed).not.toHaveBeenCalled();
      if (kind.includes("picker")) expect(selected(root)).toBe("2026-09-02");
    },
  );
  it("ignores canceled native day activation", () => {
    const { ui } = install();
    const root = fixture(kind);
    calendarRoot(root).addEventListener("click", (event) => event.preventDefault());
    ui.enhance(root);
    required(root.querySelector('[data-part="day"][data-value="2026-09-10"]')).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    expect(selected(root)).toBe("2026-09-02");
  });
  it.each(["disabled", "inert"])("ignores native activation under %s", (constraint) => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    root.setAttribute(constraint, "");
    required(root.querySelector('[data-part="day"][data-value="2026-09-10"]')).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(selected(root)).toBe("2026-09-02");
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-10");
  });
  it("refreshes a replaced grid before facade selection", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const old = part(root, "grid");
    old.replaceWith(old.cloneNode(false));
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-10");
    expect(root.querySelectorAll('[data-part="day"]')).toHaveLength(42);
  });
  it("ignores navigation below a different controller", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const nested = document.createElement("div");
    nested.dataset.jqs = "custom";
    nested.innerHTML = '<button data-part="next">Next</button>';
    calendarRoot(root).append(nested);
    required(nested.querySelector("button")).click();
    expect(calendarRoot(root).dataset.month).toBe("2026-09");
  });
});

describe.each(["calendar", "range-calendar"] as const)("%s rendering and callbacks", (kind) => {
  it("retries an interrupted output replacement", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    vi.spyOn(part(root, "grid"), "replaceChildren").mockImplementationOnce(() => {
      throw new Error("Interrupted grid");
    });
    expect(() => select(ui, kind, root)).toThrow("Interrupted grid");
    api(ui, kind).value(root);
    expect(
      root.querySelector('[data-part="day"][data-value="2026-09-10"]')?.getAttribute("data-state"),
    ).toBe(kind === "calendar" ? "selected" : "range-start");
  });
  it("does not continue a request after its status write disposes the installation", () => {
    const { ui, star } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const status = part(root, "status");
    const previous = status.textContent;
    const set = status.setAttribute.bind(status);
    vi.spyOn(status, "setAttribute").mockImplementation((...args) => {
      set(...args);
      star.dispose();
    });
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    select(ui, kind, root);
    if (kind === "range-calendar") {
      expect(status.textContent).toBe(previous);
      expect(changed).not.toHaveBeenCalled();
    } else expect(changed).toHaveBeenCalledOnce();
  });
  it("does not let next override a newer month requested during acquisition", () => {
    const { ui } = install();
    const root = fixture(kind);
    const calendar = kind === "calendar" ? ui.calendar : ui.rangeCalendar;
    const add = root.addEventListener.bind(root);
    let reentered = false;
    vi.spyOn(root, "addEventListener").mockImplementation((...args) => {
      add(...args);
      if (!reentered) {
        reentered = true;
        calendar.month(root, "2026-11-01");
      }
    });
    calendar.next(root);
    expect(root.dataset.month).toBe("2026-11");
  });
  it("keeps a newer selection requested during first listener acquisition", () => {
    const { ui } = install();
    const root = fixture(kind);
    const add = root.addEventListener.bind(root);
    let reentered = false;
    vi.spyOn(root, "addEventListener").mockImplementation((...args) => {
      add(...args);
      if (!reentered) {
        reentered = true;
        select(ui, kind, root, "2026-09-18");
      }
    });
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-18");
  });
  it("renders a newer request made during a live heading write", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const heading = part(root, "heading");
    const set = heading.setAttribute.bind(heading);
    let reentered = false;
    vi.spyOn(heading, "setAttribute").mockImplementation((...args) => {
      set(...args);
      if (!reentered) {
        reentered = true;
        select(ui, kind, root, "2026-11-18");
      }
    });
    (kind === "calendar" ? ui.calendar : ui.rangeCalendar).month(root, "2026-10-01");
    expect(selected(root)).toBe("2026-11-18");
    expect(part(root, "heading").textContent).toContain("November");
    expect(
      root.querySelector('[data-part="day"][data-value="2026-11-18"]')?.getAttribute("data-state"),
    ).toBe(kind === "calendar" ? "selected" : "range-start");
  });
  it("lets a direct source patch supersede before-change", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    root.addEventListener(
      `jquery-star:${kind}:before-change`,
      () => {
        root.dataset[kind === "calendar" ? "value" : "start"] = "2026-09-18";
      },
      { once: true },
    );
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-18");
  });
  it("does not recursively render when a live write reads the facade", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const heading = part(root, "heading");
    const set = heading.setAttribute.bind(heading);
    let reads = 0;
    vi.spyOn(heading, "setAttribute").mockImplementation((...args) => {
      set(...args);
      reads += 1;
      if (reads < 3) api(ui, kind).value(root);
    });
    (kind === "calendar" ? ui.calendar : ui.rangeCalendar).month(root, "2026-10-01");
    expect(reads).toBeLessThanOrEqual(2);
    expect(root.querySelectorAll('[data-part="day"]')).toHaveLength(42);
  });
  it("repairs emptied output even with the old render marker", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    part(root, "grid").replaceChildren();
    api(ui, kind).value(root);
    expect(root.querySelectorAll('[data-part="day"]')).toHaveLength(42);
  });
  it("stops live writes when heading metadata disposes the installation", () => {
    const { ui, star } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const grid = part(root, "grid");
    const previous = grid.firstElementChild;
    const write = part(root, "heading").setAttribute.bind(part(root, "heading"));
    vi.spyOn(part(root, "heading"), "setAttribute").mockImplementation((...args) => {
      write(...args);
      star.dispose();
    });
    (kind === "calendar" ? ui.calendar : ui.rangeCalendar).month(root, "2026-10-01");
    expect(grid.firstElementChild).toBe(previous);
    expect(grid.getAttribute("aria-label")).toContain("September");
  });
  it("does not reuse a mutated before-change detail for change", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    root.addEventListener(`jquery-star:${kind}:before-change`, (event) => {
      Object.assign((event as CustomEvent).detail, { value: "1999-01-01", start: "1999-01-01" });
    });
    const change = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, change);
    select(ui, kind, root);
    expect(
      (change.mock.calls[0]?.[0] as CustomEvent).detail[kind === "calendar" ? "value" : "start"],
    ).toBe("2026-09-10");
  });
});

describe.each(["date-picker", "date-range-picker"] as const)("%s current native parts", (kind) => {
  it("ignores an older Calendar change after an earlier listener starts a newer selection", () => {
    const { ui } = install();
    const root = fixture(kind);
    const calendar = calendarRoot(root);
    const name = kind.includes("range") ? "range-calendar" : "calendar";
    calendar.addEventListener(
      `jquery-star:${name}:change`,
      () => select(ui, kind, root, "2026-09-18", "2026-09-20"),
      { once: true },
    );
    ui.enhance(root);
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    select(ui, kind, root, "2026-09-10", "2026-09-12");
    expect(selected(root)).toBe("2026-09-18");
    expect(changed).toHaveBeenCalledOnce();
  });
  it("reclaims its open Popover through facade access before source disposal", () => {
    const source = install();
    const destination = install(realm());
    const root = fixture(kind);
    source.owner.document.body.append(root);
    source.ui.enhance(root);
    (kind === "date-picker" ? source.ui.datePicker : source.ui.dateRangePicker).open(root);
    expect(part(root, "popover").dataset.state).toBe("open");
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    api(destination.ui, kind).value(root);
    source.star.dispose();
    expect(part(root, "popover").dataset.state).toBe("open");
    part(root, "trigger").click();
    expect(part(root, "popover").dataset.state).toBe("closed");
  });
  it("honors disabled native fields for day activation and named actions", async () => {
    const { ui, jquery } = install();
    const root = fixture(kind);
    ui.enhance(root);
    required(root.querySelector("input")).disabled = true;
    required(root.querySelector('[data-part="day"][data-value="2026-09-10"]')).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(selected(root)).toBe("2026-09-02");
    const app = required(jquery(root).star().star("instance"));
    await app.run(`ui.${kind}.select`, { args: ["2026-09-10"] });
    expect(selected(root)).toBe("2026-09-02");
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-10");
  });
  it("keeps a newer selection requested while acquiring the input listener", () => {
    const { ui } = install();
    const root = fixture(kind);
    const control = required(root.querySelector("input"));
    const add = control.addEventListener.bind(control);
    let reentered = false;
    vi.spyOn(control, "addEventListener").mockImplementation((...args) => {
      add(...args);
      if (!reentered) {
        reentered = true;
        select(ui, kind, root, "2026-09-18", "2026-09-20");
      }
    });
    select(ui, kind, root, "2026-09-10", "2026-09-12");
    expect(selected(root)).toBe("2026-09-18");
  });
  it("stops the native event chain when input directly patches the field", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const control = required(root.querySelector("input"));
    const changed = vi.fn();
    control.addEventListener(
      "input",
      () => {
        control.value = "2026-09-18";
      },
      { once: true },
    );
    control.addEventListener("change", changed);
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    select(ui, kind, root);
    expect(control.value).toBe("2026-09-18");
    expect(changed).not.toHaveBeenCalled();
  });
  it("binds the adopted form reset in the destination document", async () => {
    const source = install();
    const destination = install(realm());
    const form = source.owner.document.createElement("form");
    const root = fixture(kind);
    form.append(root);
    source.owner.document.body.append(form);
    source.ui.enhance(root);
    select(source.ui, kind, root, "2026-09-10", "2026-09-12");
    destination.owner.document.body.append(destination.owner.document.adoptNode(form));
    destination.ui.enhance(root);
    source.star.dispose();
    form.reset();
    await new Promise<void>((resolve) => destination.owner.setTimeout(resolve, 5));
    expect(selected(root)).toBe("2026-09-02");
    expect(calendarRoot(root).dataset[kind === "date-picker" ? "value" : "start"]).toBe(
      "2026-09-02",
    );
  });
  it.each(["click", "ArrowDown"])("ignores canceled native input %s", (activation) => {
    const { ui } = install();
    const root = fixture(kind);
    const control = required(root.querySelector("input"));
    const type = activation === "click" ? "click" : "keydown";
    control.addEventListener(type, (event) => event.preventDefault());
    ui.enhance(root);
    control.dispatchEvent(
      activation === "click"
        ? new MouseEvent(type, { bubbles: true, cancelable: true })
        : new KeyboardEvent(type, { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    expect(part(root, "popover").dataset.state).not.toBe("open");
  });
  it("stops native and label writes after disposal inside the input setter", () => {
    const { ui, star } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const control = required(root.querySelector("input"));
    const descriptor = required(
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value"),
    );
    Object.defineProperty(control, "value", {
      configurable: true,
      get() {
        return descriptor.get?.call(this) as string;
      },
      set(value: string) {
        descriptor.set?.call(this, value);
        star.dispose();
      },
    });
    const label = part(root, "value").textContent;
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    select(ui, kind, root, "2026-09-10", "2026-09-12");
    expect(part(root, "value").textContent).toBe(label);
    if (kind === "date-range-picker")
      expect((part(root, "end-control") as HTMLInputElement).value).toBe("2026-09-05");
    expect(changed).not.toHaveBeenCalled();
  });
  it("keeps a newer selection requested by a native input setter", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const control = required(root.querySelector("input"));
    const descriptor = required(
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value"),
    );
    let reentered = false;
    Object.defineProperty(control, "value", {
      configurable: true,
      get() {
        return descriptor.get?.call(this) as string;
      },
      set(value: string) {
        descriptor.set?.call(this, value);
        if (!reentered) {
          reentered = true;
          select(ui, kind, root, "2026-09-18", "2026-09-20");
        }
      },
    });
    select(ui, kind, root, "2026-09-10", "2026-09-12");
    expect(selected(root)).toBe("2026-09-18");
    expect(calendarRoot(root).dataset[kind === "date-picker" ? "value" : "start"]).toBe(
      "2026-09-18",
    );
    if (kind === "date-range-picker")
      expect((part(root, "end-control") as HTMLInputElement).value).toBe("2026-09-20");
  });
  it("refreshes a replaced native control through value", () => {
    const { ui } = install();
    const root = fixture(kind);
    ui.enhance(root);
    const old = required(root.querySelector("input"));
    const replacement = old.cloneNode() as HTMLInputElement;
    old.replaceWith(replacement);
    api(ui, kind).value(root);
    replacement.click();
    expect(part(root, "popover").dataset.state).toBe("open");
  });
  it("uses accepted Calendar state when an earlier change listener edits event detail", () => {
    const { ui } = install();
    const root = fixture(kind);
    const name = kind.includes("range") ? "range-calendar" : "calendar";
    calendarRoot(root).addEventListener(`jquery-star:${name}:change`, (event) => {
      Object.assign((event as CustomEvent).detail, { value: "1999-01-01", start: "1999-01-01" });
    });
    ui.enhance(root);
    select(ui, kind, root);
    expect(selected(root)).toBe("2026-09-10");
  });
});
