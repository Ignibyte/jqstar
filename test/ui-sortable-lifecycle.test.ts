import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../src/index";

beforeEach(() => document.body.replaceChildren());
afterEach(() => document.body.replaceChildren());

function list(root: HTMLElement): HTMLElement {
  const element = root.querySelector<HTMLElement>('[data-part="list"]');
  if (!element) throw new Error("Missing sortable list.");
  return element;
}
function handle(root: ParentNode): HTMLElement {
  const element = root.querySelector<HTMLElement>('[data-part="handle"]');
  if (!element) throw new Error("Missing sortable handle.");
  return element;
}
function key(target: HTMLElement, value: string): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }),
  );
}
async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}
async function fixture(values = ["a", "b"]): Promise<HTMLElement> {
  const root = document.createElement("section");
  root.dataset.jqs = "sortable";
  root.dataset.name = "order";
  root.innerHTML = '<ol data-part="list"></ol><p data-part="status"></p>';
  for (const value of values) {
    const item = document.createElement("li");
    item.dataset.part = "item";
    item.dataset.value = value;
    item.innerHTML = '<button data-part="handle">Move</button>';
    list(root).append(item);
  }
  document.body.append(root);
  await enhance(root);
  return root;
}

describe("Sortable current preview and exact values", () => {
  it.each(["public", "patch", "drop", "cancel"])(
    "preserves exact separator-containing values during %s",
    async (operation) => {
      const values = ["a", "a\u0000a"];
      const root = await fixture(values);
      const reversed = [...values].reverse();
      if (operation === "public") $.star.ui.sortable.move(root, "a", 1);
      else if (operation === "patch") {
        root.dataset.value = JSON.stringify(reversed);
        await enhance(root);
      } else {
        const target = handle(root);
        key(target, " ");
        key(target, "ArrowDown");
        key(target, operation === "cancel" ? "Escape" : " ");
      }
      const expected = operation === "cancel" ? values : reversed;
      expect($.star.ui.sortable.value(root)).toEqual(expected);
      expect(
        Array.from(list(root).children, (item) => (item as HTMLElement).dataset.value),
      ).toEqual(expected);
      expect(
        Array.from(
          root.querySelectorAll<HTMLInputElement>('input[name="order"]'),
          (input) => input.value,
        ),
      ).toEqual(expected);
    },
  );

  it.each(["list", "item"])("rebinds current %s after replacement during preview", async (part) => {
    const root = await fixture();
    const oldList = list(root);
    const oldHandle = handle(root);
    key(oldHandle, " ");
    expect(root.dataset.state).toBe("sorting");
    if (part === "list") {
      const replacement = oldList.cloneNode(true) as HTMLElement;
      const last = replacement.lastElementChild;
      if (!last) throw new Error("Missing replacement item.");
      replacement.prepend(last);
      oldList.replaceWith(replacement);
    } else {
      const first = oldList.firstElementChild;
      if (!first) throw new Error("Missing old item.");
      first.replaceWith(first.cloneNode(true));
    }
    await enhance(root);
    const expected = part === "list" ? ["b", "a"] : ["a", "b"];
    expect($.star.ui.sortable.value(root)).toEqual(expected);
    expect(root.dataset.state).toBe("idle");
    key(oldHandle, "ArrowDown");
    key(oldHandle, " ");
    expect($.star.ui.sortable.value(root)).toEqual(expected);
    const current = handle(root);
    key(current, " ");
    key(current, "ArrowDown");
    key(current, " ");
    expect($.star.ui.sortable.value(root)).toEqual([...expected].reverse());
  });

  it("keeps an unchanged reordered preview active until the reader cancels it", async () => {
    const root = await fixture();
    const target = handle(root);
    key(target, " ");
    key(target, "ArrowDown");
    await enhance(root);
    expect(root.dataset.state).toBe("sorting");
    expect($.star.ui.sortable.value(root)).toEqual(["b", "a"]);
    key(target, "Escape");
    expect(root.dataset.state).toBe("idle");
    expect($.star.ui.sortable.value(root)).toEqual(["a", "b"]);
  });
});

function nestedFixture(sameField = false): {
  form: HTMLFormElement;
  outer: HTMLElement;
  inner: HTMLElement;
} {
  const form = document.createElement("form");
  form.innerHTML = `<section data-jqs="sortable" data-name="outer">
    <ol data-part="list">
      <li data-part="item" data-value="a"><button data-part="handle">Move A</button>
        <section data-jqs="sortable" data-name="${sameField ? "outer" : "inner"}">
          <ol data-part="list">
            <li data-part="item" data-value="${sameField ? "a" : "x"}"><button data-part="handle">Move first</button></li>
            <li data-part="item" data-value="${sameField ? "b" : "y"}"><button data-part="handle">Move second</button></li>
          </ol>
        </section>
      </li>
      <li data-part="item" data-value="b"><button data-part="handle">Move B</button></li>
    </ol>
  </section>`;
  const [outer, inner] = form.querySelectorAll<HTMLElement>('[data-jqs="sortable"]');
  if (!outer || !inner) throw new Error("Missing nested Sortable roots.");
  $.star.ui.sortable.value(outer);
  $.star.ui.sortable.value(inner);
  return { form, outer, inner };
}

function generatedInputs(root: HTMLElement): HTMLInputElement[] {
  return Array.from(
    root.querySelectorAll<HTMLInputElement>('input[data-jqs-generated="sortable"]'),
  ).filter((input) => input.closest('[data-jqs="sortable"]') === root);
}

describe("Nested Sortable native form ownership", () => {
  it.each(["move", "enhance", "remove-name"])(
    "preserves child inputs when the parent performs %s",
    (operation) => {
      const { form, outer, inner } = nestedFixture();
      const childInputs = generatedInputs(inner);
      expect(new FormData(form).getAll("inner")).toEqual(["x", "y"]);
      if (operation === "move") $.star.ui.sortable.move(outer, "a", 1);
      else {
        if (operation === "remove-name") delete outer.dataset.name;
        $.star.ui.enhance(outer);
      }
      expect(new FormData(form).getAll("inner")).toEqual(["x", "y"]);
      expect(generatedInputs(inner)).toEqual(childInputs);
      expect(childInputs.every((input) => inner.contains(input))).toBe(true);
      expect(new FormData(form).getAll("outer")).toEqual(
        operation === "move" ? ["b", "a"] : operation === "remove-name" ? [] : ["a", "b"],
      );
    },
  );

  it("preserves parent inputs when the child moves", () => {
    const { form, outer, inner } = nestedFixture();
    const parentInputs = generatedInputs(outer);
    $.star.ui.sortable.move(inner, "x", 1);
    expect(new FormData(form).getAll("inner")).toEqual(["y", "x"]);
    expect(new FormData(form).getAll("outer")).toEqual(["a", "b"]);
    expect(generatedInputs(outer)).toEqual(parentInputs);
  });

  it("keeps distinct stable inputs for matching nested field names and values", () => {
    const { form, outer, inner } = nestedFixture(true);
    const parentInputs = generatedInputs(outer);
    const childInputs = generatedInputs(inner);
    $.star.ui.enhance(outer);
    expect(new FormData(form).getAll("outer")).toEqual(["a", "b", "a", "b"]);
    expect(generatedInputs(outer)).toEqual(parentInputs);
    expect(generatedInputs(inner)).toEqual(childInputs);
    expect(parentInputs.every((input) => outer.contains(input))).toBe(true);
    expect(childInputs.every((input) => inner.contains(input))).toBe(true);
  });
});
