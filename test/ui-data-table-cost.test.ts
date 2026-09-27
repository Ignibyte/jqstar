import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import { createDataTables } from "../src/ui/data-table";

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Missing Data Table cost fixture part.");
  return value;
}

function fixture(size: number): HTMLElement {
  document.body.innerHTML = `
    <div data-jqs="data-table" data-page-size="4">
      <table data-part="table">
        <thead><tr><th data-key="name"><button data-part="sort">Name</button></th></tr></thead>
        <tbody>${Array.from(
          { length: size },
          (_, index) =>
            `<tr data-row-id="row-${index}"><td data-key="name">Row ${index}<input data-part="row-select" type="checkbox"></td></tr>`,
        ).join("")}</tbody>
      </table>
      <button data-part="previous">Previous</button>
      <button data-part="next">Next</button>
      <span data-part="page-status"></span>
      <span data-part="selection-status"></span>
    </div>
  `;
  return document.body.firstElementChild as HTMLElement;
}

function countRowTextReads(run: () => void): number {
  const prototype = HTMLTableRowElement.prototype;
  const original = Object.getOwnPropertyDescriptor(prototype, "textContent");
  const native = Object.getOwnPropertyDescriptor(Node.prototype, "textContent")?.get;
  if (!native) throw new Error("Missing native textContent getter.");
  let reads = 0;
  Object.defineProperty(prototype, "textContent", {
    configurable: true,
    get(this: HTMLTableRowElement) {
      reads++;
      return Reflect.apply(native, this, []);
    },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(prototype, "textContent", original);
    else Reflect.deleteProperty(prototype, "textContent");
  }
  return reads;
}

function measure(size: number): { initial: number; page: number; repeated: number } {
  const root = fixture(size);
  const initial = countRowTextReads(() => $.star.ui.enhance(root));
  const page = countRowTextReads(() => $.star.ui.dataTable.page(root, 2));
  const repeated = countRowTextReads(() => $.star.ui.enhance(root));
  expect(root.dataset.page).toBe("2");
  expect(root.querySelector('[data-part="page-status"]')?.textContent).toBe(`5–8 of ${size}`);
  return { initial, page, repeated };
}

describe("Data Table row cost", () => {
  afterEach(() => document.body.replaceChildren());

  it("keeps the native page and visible row contract in the measured fixture", () => {
    const root = fixture(12);
    $.star.ui.enhance(root);
    $.star.ui.dataTable.page(root, 2);
    const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>("tbody tr"));
    expect(rows.filter((row) => !row.hidden).map((row) => row.dataset.rowId)).toEqual([
      "row-4",
      "row-5",
      "row-6",
      "row-7",
    ]);
  });

  it.each(["initial", "page", "repeated"] as const)(
    "%s row reads grow with rows rather than their square",
    (operation) => {
      const small = measure(12)[operation];
      const medium = measure(24)[operation];
      const large = measure(48)[operation];
      expect(medium).toBeLessThanOrEqual(Math.ceil(small * 2.75));
      expect(large).toBeLessThanOrEqual(Math.ceil(medium * 2.75));
    },
  );

  it("does not query the whole root once per row during a page action", () => {
    const root = fixture(24);
    $.star.ui.enhance(root);
    const query = vi.spyOn(root, "querySelectorAll");
    try {
      $.star.ui.dataTable.page(root, 2);
      expect(query.mock.calls.length).toBeLessThanOrEqual(60);
    } finally {
      query.mockRestore();
    }
  });

  it.each(["row text", "row replacement"] as const)(
    "stops a page notification after synchronous %s during a native output write",
    (change) => {
      const root = fixture(12);
      $.star.ui.enhance(root);
      const status = required(root.querySelector<HTMLElement>('[data-part="page-status"]'));
      const body = required(root.querySelector<HTMLTableSectionElement>("tbody"));
      const original = required(Object.getOwnPropertyDescriptor(Node.prototype, "textContent"));
      const notified = vi.fn();
      let mutated = 0;
      root.addEventListener("jquery-star:data-table:page", notified);
      Object.defineProperty(status, "textContent", {
        configurable: true,
        get() {
          return Reflect.apply(required(original.get), status, []);
        },
        set(value: string) {
          mutated++;
          Reflect.apply(required(original.set), status, [value]);
          const row = required(body.rows[0]);
          if (change === "row text") required(row.cells[0]).textContent = "Changed";
          else body.replaceChild(row.cloneNode(true), row);
        },
      });
      $.star.ui.dataTable.page(root, 2);
      expect(mutated).toBe(1);
      expect(notified).not.toHaveBeenCalled();
    },
  );

  it.each(["success", "setup error"] as const)(
    "disconnects transaction observers after %s",
    (outcome) => {
      const native = window.MutationObserver;
      let created = 0;
      let disconnected = 0;
      class TrackedObserver extends native {
        constructor(callback: MutationCallback) {
          super(callback);
          created++;
        }

        disconnect() {
          disconnected++;
          super.disconnect();
        }
      }
      Object.defineProperty(window, "MutationObserver", {
        configurable: true,
        value: TrackedObserver,
      });
      try {
        const root = fixture(12);
        if (outcome === "setup error") {
          const duplicate = required(root.querySelectorAll<HTMLTableRowElement>("tbody tr")[1]);
          duplicate.dataset.rowId = "row-0";
          expect(() => $.star.ui.enhance(root)).toThrow("duplicate row id");
          duplicate.dataset.rowId = "row-1";
        } else {
          $.star.ui.enhance(root);
          $.star.ui.dataTable.page(root, 2);
        }
        expect(created).toBeGreaterThan(0);
        expect(disconnected).toBe(created);
      } finally {
        Object.defineProperty(window, "MutationObserver", { configurable: true, value: native });
      }
    },
  );

  it("disconnects an observer whose native setup registers and then throws", () => {
    const native = window.MutationObserver;
    const setupError = new Error("observer setup failed");
    const root = fixture(12);
    const observed = new Set<MutationObserver>();
    const disconnected = new Set<MutationObserver>();
    class InterruptedObserver extends native {
      observe(...args: Parameters<MutationObserver["observe"]>) {
        super.observe(...args);
        if (args[0] === root) {
          observed.add(this);
          throw setupError;
        }
      }

      disconnect() {
        if (observed.has(this)) disconnected.add(this);
        super.disconnect();
      }
    }
    Object.defineProperty(window, "MutationObserver", {
      configurable: true,
      value: InterruptedObserver,
    });
    try {
      expect(() => createDataTables(() => undefined, document).enhance(root)).toThrow(setupError);
      expect(observed.size).toBeGreaterThan(0);
      expect(disconnected).toEqual(observed);
    } finally {
      Object.defineProperty(window, "MutationObserver", { configurable: true, value: native });
    }
  });

  it("preserves a setup error before observer cleanup failure", () => {
    const native = window.MutationObserver;
    const cleanupError = new Error("observer cleanup failed");
    const root = fixture(12);
    const duplicate = required(root.querySelectorAll<HTMLTableRowElement>("tbody tr")[1]);
    duplicate.dataset.rowId = "row-0";
    let disconnected = 0;
    class FailingCleanupObserver extends native {
      private guarded = false;

      observe(...args: Parameters<MutationObserver["observe"]>) {
        super.observe(...args);
        if (args[0] === root) this.guarded = true;
      }

      disconnect() {
        super.disconnect();
        if (this.guarded) {
          disconnected++;
          throw cleanupError;
        }
      }
    }
    Object.defineProperty(window, "MutationObserver", {
      configurable: true,
      value: FailingCleanupObserver,
    });
    try {
      let failure: unknown;
      try {
        createDataTables(() => undefined, document).enhance(root);
      } catch (error) {
        failure = error;
      }
      duplicate.dataset.rowId = "row-1";
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error("Missing setup error group.");
      expect(failure.errors).toHaveLength(2);
      const primary = failure.errors[0];
      if (!(primary instanceof Error)) throw new Error("Missing primary setup error.");
      expect(primary.message).toContain("duplicate row id");
      expect(failure.errors[1]).toBe(cleanupError);
      expect(disconnected).toBe(1);
    } finally {
      Object.defineProperty(window, "MutationObserver", { configurable: true, value: native });
    }
  });
});
