import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function part(root: ParentNode, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe.each(["select", "combobox"] as const)("%s native reset handoff", (kind) => {
  function fixture() {
    const form = document.createElement("form");
    const root = document.createElement("div");
    root.dataset.jqs = kind;
    root.innerHTML =
      kind === "select"
        ? '<select data-part="control"><option value="a" selected>A</option><option value="b">B</option></select>'
        : '<input data-part="control"><input data-part="value" type="hidden" value="a"><div data-part="content"><div data-part="option" data-value="a">A</div><div data-part="option" data-value="b">B</div></div>';
    form.append(root);
    $.star.ui.enhance(root);
    $.star.ui[kind].select(root, "b");
    const values = () => ({
      value: $.star.ui[kind].value(root),
      text: (part(root, "control") as HTMLInputElement | HTMLSelectElement).value,
    });
    return { form, root, values };
  }

  it("honors a native reset canceled by a later listener", () => {
    const { form, root, values } = fixture();
    const before = values();
    const input = vi.fn();
    root.addEventListener("input", input);
    form.addEventListener("reset", (event) => event.preventDefault());
    form.reset();
    expect(values()).toEqual(before);
    vi.runOnlyPendingTimers();
    expect(values()).toEqual(before);
    expect(input).not.toHaveBeenCalled();
  });

  it.each(["replacement", "movement", "removal"])(
    "ignores queued reset after control %s",
    (mode) => {
      const { form, root, values } = fixture();
      form.reset();
      const old = part(root, "control") as HTMLInputElement | HTMLSelectElement;
      if (mode === "replacement") old.replaceWith(old.cloneNode(true));
      else if (mode === "movement") document.createElement("form").append(root);
      else old.remove();
      if (mode !== "removal") {
        $.star.ui.enhance(root);
        $.star.ui[kind].select(root, "b");
      }
      const before = mode === "removal" ? undefined : values();
      const input = vi.fn();
      root.addEventListener("input", input);
      old.addEventListener("input", input);
      vi.runOnlyPendingTimers();
      if (before) expect(values()).toEqual(before);
      expect(input).not.toHaveBeenCalled();
    },
  );

  it("retains a current reset across unchanged enhancement", () => {
    const { form, root } = fixture();
    form.reset();
    $.star.ui.enhance(root);
    const input = vi.fn();
    root.addEventListener("input", input);
    vi.runOnlyPendingTimers();
    expect($.star.ui[kind].value(root)).toBe("a");
    expect(input).toHaveBeenCalledOnce();
  });
});

function questionnaire() {
  const form = document.createElement("form");
  const root = document.createElement("section");
  root.dataset.jqs = "questionnaire";
  root.innerHTML =
    '<fieldset data-part="item" data-value="a" data-name="first" data-skippable><legend>First</legend><input data-part="freeform" value="default"></fieldset><fieldset data-part="item" data-value="b" data-name="second"><legend>Second</legend><input data-part="freeform" value="second"></fieldset><button data-part="previous">Previous</button><button data-part="next">Next</button><button data-part="skip">Skip</button><button data-part="reset">Reset</button>';
  form.append(root);
  $.star.ui.enhance(root);
  $.star.ui.questionnaire.go(root, "b");
  return { form, root };
}

it.each(["previous", "next", "skip", "reset"])(
  "releases detached Questionnaire %s buttons",
  (name) => {
    const { root } = questionnaire();
    if (name === "next" || name === "skip") $.star.ui.questionnaire.go(root, "a");
    const old = part(root, name) as HTMLButtonElement;
    old.replaceWith(old.cloneNode(true));
    $.star.ui.enhance(root);
    const before = root.dataset.value;
    const event = vi.fn();
    root.addEventListener("jquery-star:questionnaire:change", event);
    root.addEventListener("jquery-star:questionnaire:reset", event);
    old.click();
    expect(event).not.toHaveBeenCalled();
    expect(root.dataset.value).toBe(before);
    (part(root, name) as HTMLButtonElement).click();
    expect(event).toHaveBeenCalledOnce();
    expect(root.dataset.value).toBe(name === "next" || name === "skip" ? "b" : "a");
  },
);

it("preserves Questionnaire submitted state after canceled navigation", () => {
  const { form, root } = questionnaire();
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  expect(root.dataset.state).toBe("submitted");
  root.addEventListener(
    "jquery-star:questionnaire:before-change",
    (event) => event.preventDefault(),
    { once: true },
  );
  $.star.ui.questionnaire.previous(root);
  $.star.ui.enhance(root);
  expect(root.dataset.value).toBe("b");
  expect(root.dataset.state).toBe("submitted");
  $.star.ui.questionnaire.previous(root);
  expect(root.dataset.state).toBe("active");
});

it.each(["canceled", "replaced", "moved"])("ignores %s Questionnaire native reset work", (mode) => {
  const { form, root } = questionnaire();
  const reset = vi.fn();
  root.addEventListener("jquery-star:questionnaire:reset", reset);
  if (mode === "canceled") form.addEventListener("reset", (event) => event.preventDefault());
  form.reset();
  if (mode === "replaced") {
    const old = part(root, "item");
    old.replaceWith(old.cloneNode(true));
    $.star.ui.enhance(root);
  } else if (mode === "moved") document.createElement("form").append(root);
  const control = part(root, "freeform") as HTMLInputElement;
  control.value = "new answer";
  vi.runOnlyPendingTimers();
  expect(reset).not.toHaveBeenCalled();
  expect(control.value).toBe("new answer");
  expect(root.dataset.value).toBe("b");
});

it("applies a current Questionnaire native reset once", () => {
  const { form, root } = questionnaire();
  const reset = vi.fn();
  root.addEventListener("jquery-star:questionnaire:reset", reset);
  form.reset();
  vi.runOnlyPendingTimers();
  expect(reset).toHaveBeenCalledOnce();
  expect(root.dataset.value).toBe("a");
});

it("resets Questionnaire to an available item after the original default is removed", () => {
  const { root } = questionnaire();
  part(root, "item").remove();
  $.star.ui.enhance(root);
  expect(() => $.star.ui.questionnaire.reset(root)).not.toThrow();
  expect(root.dataset.value).toBe("b");
});
