import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

const components = [
  {
    name: "search-field",
    event: "submit",
    parts: '<input data-part="control" type="search" value="first">',
  },
  {
    name: "rating",
    event: "reset",
    parts:
      '<label><input data-part="control" type="radio" name="rating" value="1" checked>One</label><label><input data-part="control" type="radio" name="rating" value="2">Two</label><output data-part="status"></output>',
  },
  {
    name: "color-picker",
    event: "reset",
    parts:
      '<input data-part="control" type="color" value="#112233"><input data-part="value"><output data-part="status"></output>',
  },
  {
    name: "time-picker",
    event: "reset",
    parts:
      '<input data-part="control" type="time" value="12:00"><button data-part="decrement">Earlier</button><button data-part="increment">Later</button><output data-part="status"></output>',
  },
  {
    name: "file-upload",
    event: "reset",
    parts: '<input data-part="control" type="file" multiple>',
  },
  {
    name: "multi-select",
    event: "reset",
    parts:
      '<select data-part="control" multiple><option value="one" selected>One</option><option value="two">Two</option></select>',
  },
  {
    name: "select",
    event: "reset",
    parts:
      '<select data-part="control"><option value="one" selected>One</option><option value="two">Two</option></select>',
  },
  {
    name: "combobox",
    event: "reset",
    parts:
      '<input data-part="control"><input data-part="value" type="hidden" value="one"><div data-part="content"><div data-part="option" data-value="one">One</div><div data-part="option" data-value="two">Two</div></div>',
  },
];

function trackedBindings(
  form: HTMLFormElement,
  event: string,
): Set<EventListenerOrEventListenerObject> {
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const add = form.addEventListener.bind(form);
  const remove = form.removeEventListener.bind(form);
  vi.spyOn(form, "addEventListener").mockImplementation((type, listener, options) => {
    if (type === event) listeners.add(listener);
    add(type, listener, options);
  });
  vi.spyOn(form, "removeEventListener").mockImplementation((type, listener, options) => {
    if (type === event) listeners.delete(listener);
    remove(type, listener, options);
  });
  return listeners;
}

function setup(component: (typeof components)[number]) {
  const first = document.createElement("form");
  first.id = "first-form";
  const second = document.createElement("form");
  second.id = "second-form";
  const root = document.createElement("div");
  root.dataset.jqs = component.name;
  root.innerHTML = component.parts;
  first.append(root);
  document.body.append(first, second);
  const firstBindings = trackedBindings(first, component.event);
  const secondBindings = trackedBindings(second, component.event);
  $.star.ui.enhance(root);
  expect(firstBindings.size).toBe(1);
  return { first, second, root, firstBindings, secondBindings };
}

async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

function associate(root: HTMLElement, id: string | undefined): void {
  for (const control of root.querySelectorAll('[data-part="control"]')) {
    if (id === undefined) control.removeAttribute("form");
    else control.setAttribute("form", id);
  }
}

beforeEach(() => {
  document.body.replaceChildren();
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe.each(components)("$name native form ownership", (component) => {
  it("keeps one binding after repeated control replacement", async () => {
    const { root, firstBindings } = setup(component);
    for (let index = 0; index < 3; index++) {
      root.innerHTML = component.parts;
      await enhance(root);
      expect(firstBindings.size).toBe(1);
    }
  });

  it("moves its binding with the same component root", async () => {
    const { root, second, firstBindings, secondBindings } = setup(component);
    second.append(root);
    await enhance(root);
    expect(firstBindings.size).toBe(0);
    expect(secondBindings.size).toBe(1);
  });

  it("follows explicit native form reassociation", async () => {
    const { root, second, firstBindings, secondBindings } = setup(component);
    associate(root, second.id);
    await enhance(root);
    expect(firstBindings.size).toBe(0);
    expect(secondBindings.size).toBe(1);
  });

  it("releases a missing form association and can bind again", async () => {
    const { root, firstBindings, secondBindings } = setup(component);
    associate(root, "missing-form");
    await enhance(root);
    expect(firstBindings.size).toBe(0);
    expect(secondBindings.size).toBe(0);
    associate(root, undefined);
    await enhance(root);
    expect(firstBindings.size).toBe(1);
  });

  it("does not duplicate unchanged form bindings", async () => {
    const { root, firstBindings } = setup(component);
    await enhance(root);
    await enhance(root);
    expect(firstBindings.size).toBe(1);
  });
});

it("Search Field emits once from the current form and control after replacement and movement", async () => {
  const component = components.at(0);
  if (!component) throw new Error("Search Field fixture is missing.");
  const { root, first, second } = setup(component);
  const events: Array<{ control: HTMLInputElement; value: string }> = [];
  root.addEventListener("jquery-star:search-field:search", (event) => {
    events.push((event as CustomEvent<{ control: HTMLInputElement; value: string }>).detail);
  });
  root.innerHTML = component.parts;
  await enhance(root);
  const current = root.querySelector<HTMLInputElement>("input");
  if (!current) throw new Error("Current Search Field control is missing.");
  current.value = "current value";
  first.dispatchEvent(new Event("submit", { cancelable: true }));
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ control: current, value: "current value" });
  events.length = 0;
  second.append(root);
  await enhance(root);
  first.dispatchEvent(new Event("submit", { cancelable: true }));
  expect(events).toHaveLength(0);
  second.dispatchEvent(new Event("submit", { cancelable: true }));
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ control: current, value: "current value" });
});
