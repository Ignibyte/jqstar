import $ from "jquery";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "../src/index";

function part(root: HTMLElement, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name} fixture part.`);
  return value;
}

async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

function upload(withList = true): HTMLElement {
  const root = document.createElement("div");
  root.dataset.jqs = "file-upload";
  root.innerHTML =
    '<input data-part="control" type="file" multiple>' +
    (withList ? '<ul data-part="list"></ul>' : "");
  Object.defineProperty(part(root, "control"), "files", {
    configurable: true,
    value: [new File(["data"], "sample.txt", { type: "text/plain" })],
  });
  document.body.append(root);
  $.star.ui.enhance(root);
  return root;
}

function multi(): HTMLElement {
  const root = document.createElement("div");
  root.dataset.jqs = "multi-select";
  root.innerHTML =
    '<select data-part="control" multiple><option value="one" selected>One</option><option value="two">Two</option></select>';
  document.body.append(root);
  $.star.ui.enhance(root);
  return root;
}

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  document.body.replaceChildren();
  window.dispatchEvent(new Event("resize"));
  vi.restoreAllMocks();
});

it.each([true, false])(
  "renders a replaced or newly added upload list (initial list: %s)",
  async (initialList) => {
    const root = upload(initialList);
    const next = document.createElement("ul");
    next.dataset.part = "list";
    if (initialList) part(root, "list").replaceWith(next);
    else root.append(next);
    await enhance(root);
    expect(next.children).toHaveLength(1);
    expect(next.textContent).toContain("sample.txt");
    expect($.star.ui.fileUpload.files(root).map((file) => file.name)).toEqual(["sample.txt"]);
    const item = next.firstElementChild;
    await enhance(root);
    expect(next.firstElementChild).toBe(item);
  },
);

it("renders replacement tags without changing selected values", async () => {
  const root = multi();
  const old = part(root, "tags");
  const next = document.createElement("div");
  next.dataset.part = "tags";
  old.replaceWith(next);
  await enhance(root);
  expect(next.textContent).toContain("One");
  expect($.star.ui.multiSelect.value(root)).toEqual(["one"]);
  const tag = next.firstElementChild;
  await enhance(root);
  expect(next.firstElementChild).toBe(tag);
});

it("refreshes selected tag labels and native disabled state", async () => {
  const root = multi();
  const control = part(root, "control");
  if (!(control instanceof HTMLSelectElement)) throw new Error("Missing native select.");
  const option = control.options.item(0);
  if (!option) throw new Error("Missing selected option.");
  option.label = "First choice";
  control.disabled = true;
  await enhance(root);
  const remove = part(root, "remove");
  expect(part(root, "tags").textContent).toContain("First choice");
  expect(remove).toHaveProperty("disabled", true);
  expect(remove.getAttribute("aria-label")).toBe("Remove First choice");
  control.disabled = false;
  await enhance(root);
  expect(part(root, "remove")).toHaveProperty("disabled", false);
});

it.each(["content", "control"])(
  "releases the former active controller when its %s is replaced",
  async (name) => {
    const root = multi();
    $.star.ui.multiSelect.open(root);
    const oldContent = part(root, "content");
    const clear = vi.spyOn(window, "clearTimeout");
    const schedule = vi.spyOn(window, "setTimeout");
    oldContent.dispatchEvent(new KeyboardEvent("keydown", { key: "t", bubbles: true }));
    const timerIndex = schedule.mock.calls.findIndex((call) => call[1] === 500);
    expect(timerIndex).toBeGreaterThanOrEqual(0);
    const timer = schedule.mock.results.at(timerIndex)?.value as number;
    root.addEventListener("jquery-star:multi-select:before-close", (event) =>
      event.preventDefault(),
    );
    const original = part(root, name);
    original.replaceWith(original.cloneNode(true));
    await enhance(root);
    expect(clear).toHaveBeenCalledWith(timer);
    expect(oldContent.hidden).toBe(true);
    oldContent.style.left = "77px";
    window.dispatchEvent(new Event("resize"));
    expect(oldContent.style.left).toBe("77px");
    expect(part(root, "trigger").getAttribute("aria-expanded")).toBe("false");
  },
);

it("hides native floating content during controller replacement", async () => {
  const root = multi();
  const oldContent = part(root, "content");
  const show = vi.fn();
  const hide = vi.fn();
  Object.defineProperties(oldContent, {
    showPopover: { configurable: true, value: show },
    hidePopover: { configurable: true, value: hide },
  });
  $.star.ui.multiSelect.open(root);
  expect(show).toHaveBeenCalledOnce();
  const next = document.createElement("div");
  next.dataset.part = "content";
  oldContent.replaceWith(next);
  await enhance(root);
  expect(hide).toHaveBeenCalledOnce();
});

const resetComponents = [
  { name: "rating", initial: "1", next: "2" },
  { name: "color-picker", initial: "#112233", next: "#445566" },
  { name: "time-picker", initial: "12:00", next: "14:00" },
];

function resetParts(name: string, value: string): string {
  if (name === "rating")
    return (
      ["1", "2"]
        .map(
          (item) =>
            `<label><input data-part="control" type="radio" name="rating" value="${item}" ${item === value ? "checked" : ""}>${item}</label>`,
        )
        .join("") + '<output data-part="status"></output>'
    );
  return (
    `<input data-part="control" type="${name === "color-picker" ? "color" : "time"}" value="${value}">` +
    (name === "time-picker"
      ? '<button data-part="decrement">Earlier</button><button data-part="increment">Later</button>'
      : "") +
    '<output data-part="status"></output>'
  );
}

async function settleReset(): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  await $.star.whenEnhanced();
}

function resetFixture(component: (typeof resetComponents)[number]) {
  const form = document.createElement("form");
  const root = document.createElement("div");
  root.dataset.jqs = component.name;
  root.innerHTML = resetParts(component.name, component.initial);
  form.append(root);
  document.body.append(form);
  $.star.ui.enhance(root);
  return { form, root };
}

it.each(resetComponents)(
  "$name ignores queued reset work from replaced controls",
  async (component) => {
    const { form, root } = resetFixture(component);
    await enhance(root);
    form.reset();
    root.innerHTML = resetParts(component.name, component.next);
    delete root.dataset.value;
    await enhance(root);
    expect(root.dataset.value).toBe(component.next);
    await settleReset();
    expect(root.dataset.value).toBe(component.next);
    const selected = root.querySelector<HTMLInputElement>(
      component.name === "rating" ? "input:checked" : "input",
    );
    expect(selected?.value).toBe(component.next);
  },
);

it.each(resetComponents)(
  "$name keeps native reset behavior for its current controller",
  async (component) => {
    const { form, root } = resetFixture(component);
    const control = root.querySelector<HTMLInputElement>(
      component.name === "rating" ? `input[value="${component.next}"]` : "input",
    );
    if (!control) throw new Error("Missing native reset fixture control.");
    if (component.name === "rating") control.checked = true;
    else control.value = component.next;
    control.dispatchEvent(
      new Event(component.name === "rating" ? "change" : "input", { bubbles: true }),
    );
    expect(root.dataset.value).toBe(component.next);
    form.reset();
    await enhance(root);
    await settleReset();
    expect(root.dataset.value).toBe(component.initial);
  },
);
