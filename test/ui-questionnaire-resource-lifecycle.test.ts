import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { withStarDOMRealm } from "../src/testing";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;

beforeEach(() => {
  document.body.replaceChildren();
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});
afterEach(() => {
  star.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function questionnaire(owner = document) {
  const form = owner.createElement("form");
  const root = owner.createElement("section");
  root.dataset.jqs = "questionnaire";
  root.dataset.value = "first";
  root.innerHTML = `<fieldset data-part="item" data-value="first" data-name="choices" data-multiple data-skippable>
    <legend>Choices</legend><label data-part="choice" data-shortcut="1"><input data-part="control" type="checkbox" name="choices" value="alpha">Alpha</label>
    <label data-part="choice" data-shortcut="2"><input data-part="control" type="checkbox" name="choices" value="beta">Beta</label>
    <input data-part="freeform"><p data-part="error"></p></fieldset>
    <fieldset data-part="item" data-value="second" data-name="second"><legend>Second</legend></fieldset>
    <fieldset data-part="item" data-value="third" data-name="third"><legend>Third</legend></fieldset>
    <button data-part="previous">Previous</button><button data-part="next">Next</button>
    <button data-part="skip">Skip</button><button data-part="reset">Reset</button>
    <button data-part="submit">Submit</button><p data-part="status"></p>`;
  form.append(root);
  owner.body.append(form);
  const realm = owner.defaultView as Window & typeof globalThis;
  function part<T extends Element>(selector: string, type: new () => T): T {
    const found = root.querySelector(selector);
    if (!(found instanceof type)) throw new Error(`Missing questionnaire fixture: ${selector}`);
    return found;
  }
  return {
    form,
    root,
    first: part("fieldset", realm.HTMLFieldSetElement),
    next: part('[data-part="next"]', realm.HTMLButtonElement),
    alpha: part('[value="alpha"]', realm.HTMLInputElement),
    beta: part('[value="beta"]', realm.HTMLInputElement),
    freeform: part('[data-part="freeform"]', realm.HTMLInputElement),
  };
}
function observe(root: HTMLElement, name: string, listener: EventListener, once = false) {
  root.addEventListener(`jquery-star:questionnaire:${name}`, listener, { once });
}

it.each(["render", "native", "dispose", "preserve"] as const)(
  "Questionnaire releases native bindings and pending resets across %s",
  async (mode) => {
    vi.useFakeTimers();
    const { root, form, next, alpha } = questionnaire();
    ui.enhance(root);
    await star.whenEnhanced();
    const removedRoot = vi.spyOn(root, "removeEventListener");
    const removedForm = vi.spyOn(form, "removeEventListener");
    const removedNext = vi.spyOn(next, "removeEventListener");
    const clearTimer = vi.spyOn(window, "clearTimeout");
    const changed = vi.fn();
    const reset = vi.fn();
    observe(root, "change", changed);
    observe(root, "reset", reset);
    form.reset();
    let operation: ReturnType<ReturnType<typeof createRenderAdapter>["begin"]> | undefined;
    if (mode === "dispose") star.dispose();
    else if (mode === "native") {
      root.remove();
      await star.whenEnhanced();
    } else {
      operation = createRenderAdapter(installed).begin(
        document.body,
        mode === "preserve" ? { preserveRoots: [root] } : {},
      );
      operation.beforeRemove(root);
      ui.enhance(document);
    }
    next.click();
    if (mode === "preserve") expect(changed).toHaveBeenCalledOnce();
    else {
      expect(changed).not.toHaveBeenCalled();
      expect(root.dataset.value).toBe("first");
      expect(removedRoot).toHaveBeenCalledWith("input", expect.any(Function));
      expect(removedNext).toHaveBeenCalledWith("click", expect.any(Function));
      expect(removedForm).toHaveBeenCalledWith("submit", expect.any(Function), true);
      expect(removedForm).toHaveBeenCalledWith("reset", expect.any(Function));
      expect(clearTimer).toHaveBeenCalled();
    }
    vi.runOnlyPendingTimers();
    // The preserved Next activation is newer than the queued native reset.
    expect(reset).not.toHaveBeenCalled();
    if (mode === "preserve") expect(root.dataset.value).toBe("second");
    // Exercise the preserved input listener on an active, non-inert question.
    if (mode === "preserve") ui.questionnaire.previous(root);
    const input = vi.fn();
    observe(root, "answer-change", input);
    alpha.dispatchEvent(new Event("change", { bubbles: true }));
    expect(input).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
    if (mode === "render") root.remove();
    await operation?.commit();
  },
);

it("Questionnaire retains a pending reset through unchanged enhancement", () => {
  vi.useFakeTimers();
  const { root, form } = questionnaire();
  ui.enhance(root);
  ui.questionnaire.next(root);
  const reset = vi.fn();
  observe(root, "reset", reset);
  form.reset();
  ui.enhance(root);
  ui.enhance(root);
  vi.runOnlyPendingTimers();
  expect(root.dataset.value).toBe("first");
  expect(reset).toHaveBeenCalledOnce();
});

it("Questionnaire honors canceled form resets", () => {
  vi.useFakeTimers();
  const { root, form, alpha } = questionnaire();
  ui.enhance(root);
  ui.questionnaire.answer(root, "choices", "alpha");
  ui.questionnaire.next(root);
  form.addEventListener("reset", (event) => event.preventDefault());
  form.reset();
  vi.runOnlyPendingTimers();
  expect(root.dataset.value).toBe("second");
  expect(alpha.checked).toBe(true);
});

it("Questionnaire rebinds a replaced button and reassociated form exactly once", () => {
  vi.useFakeTimers();
  const { root, form, next } = questionnaire();
  ui.enhance(root);
  form.reset();
  const other = document.createElement("form");
  document.body.append(other);
  other.append(root);
  const replacement = next.cloneNode(true) as HTMLButtonElement;
  next.replaceWith(replacement);
  const removedForm = vi.spyOn(form, "removeEventListener");
  ui.enhance(root);
  ui.enhance(root);
  const changed = vi.fn();
  observe(root, "change", changed);
  next.click();
  expect(root.dataset.value).toBe("first");
  replacement.click();
  expect(changed).toHaveBeenCalledOnce();
  expect(root.dataset.value).toBe("second");
  vi.runOnlyPendingTimers();
  expect(root.dataset.value).toBe("second");
  expect(removedForm).toHaveBeenCalledWith("reset", expect.any(Function));
  other.reset();
  vi.runOnlyPendingTimers();
  expect(root.dataset.value).toBe("first");
});

it("Questionnaire preserves default navigation, answers and submitted state after reacquisition", async () => {
  const { root, form, alpha } = questionnaire();
  ui.enhance(root);
  ui.questionnaire.answer(root, "choices", "alpha");
  ui.questionnaire.go(root, "third");
  form.dispatchEvent(new SubmitEvent("submit", { cancelable: true, bubbles: true }));
  root.remove();
  await star.whenEnhanced();
  form.append(root);
  ui.enhance(root);
  expect(root.dataset.value).toBe("third");
  expect(root.dataset.state).toBe("submitted");
  expect(alpha.checked).toBe(true);
  const reset = vi.fn();
  observe(root, "reset", reset);
  ui.questionnaire.reset(root);
  expect(root.dataset.value).toBe("first");
  expect(alpha.checked).toBe(false);
  expect(reset).toHaveBeenCalledOnce();
});

it.each([false, true])("Questionnaire stops before-change disposal, canceled %s", (cancel) => {
  const { root } = questionnaire();
  ui.enhance(root);
  const changed = vi.fn();
  observe(root, "change", changed);
  observe(
    root,
    "before-change",
    (event) => {
      if (cancel) event.preventDefault();
      star.dispose();
      root.dataset.value = "retired";
    },
    true,
  );
  ui.questionnaire.next(root);
  expect(root.dataset.value).toBe("retired");
  expect(changed).not.toHaveBeenCalled();
});

it.each([false, true])("Questionnaire keeps a newer navigation, canceled outer %s", (cancel) => {
  const { root } = questionnaire();
  ui.enhance(root);
  const changed = vi.fn();
  observe(root, "change", changed);
  observe(
    root,
    "before-change",
    (event) => {
      if (cancel) event.preventDefault();
      ui.questionnaire.go(root, "third");
    },
    true,
  );
  ui.questionnaire.next(root);
  expect(ui.questionnaire.value(root)).toBe("third");
  expect(root.dataset.value).toBe("third");
  expect(changed).toHaveBeenCalledOnce();
});

it.each(["before-skip", "skip"])("Questionnaire stops %s continuation after disposal", (name) => {
  const { root, first } = questionnaire();
  ui.enhance(root);
  const changed = vi.fn();
  observe(root, "change", changed);
  observe(
    root,
    name,
    () => {
      star.dispose();
      root.dataset.value = "retired";
    },
    true,
  );
  ui.questionnaire.skip(root);
  expect(root.dataset.value).toBe("retired");
  expect(changed).not.toHaveBeenCalled();
  expect(first.querySelector('[data-part="skip-value"]') !== null).toBe(name === "skip");
});

it.each(["input", "change"])(
  "Questionnaire stops the native answer sequence after %s disposal",
  (name) => {
    const { root, alpha, beta } = questionnaire();
    ui.enhance(root);
    const betaInput = vi.fn();
    const answered = vi.fn();
    beta.addEventListener("input", betaInput);
    observe(root, "answer-change", answered);
    alpha.addEventListener(
      name,
      () => {
        star.dispose();
        root.dataset.state = "retired";
      },
      { once: true },
    );
    ui.questionnaire.answer(root, "choices", ["alpha", "beta"]);
    expect(betaInput).not.toHaveBeenCalled();
    expect(answered).not.toHaveBeenCalled();
    expect(root.dataset.state).toBe("retired");
  },
);

it("Questionnaire keeps a newer answer from a native input callback", () => {
  const { root, alpha, beta } = questionnaire();
  ui.enhance(root);
  const answered = vi.fn();
  const changedAlpha = vi.fn();
  const changedBeta = vi.fn();
  observe(root, "answer-change", answered);
  alpha.addEventListener("change", changedAlpha);
  beta.addEventListener("change", changedBeta);
  alpha.addEventListener("input", () => ui.questionnaire.answer(root, "choices", "beta"), {
    once: true,
  });
  ui.questionnaire.answer(root, "choices", "alpha");
  expect(ui.questionnaire.answers(root).choices).toEqual(["beta"]);
  expect(answered).toHaveBeenCalledOnce();
  expect(changedAlpha).toHaveBeenCalledOnce();
  expect(changedBeta).toHaveBeenCalledOnce();
  beta.checked = false;
  beta.dispatchEvent(new Event("change", { bubbles: true }));
  expect(answered).toHaveBeenCalledTimes(2);
});

it("Questionnaire restores native input handling after dispatch throws", () => {
  const { root, alpha, beta } = questionnaire();
  ui.enhance(root);
  vi.spyOn(alpha, "dispatchEvent").mockImplementationOnce(() => {
    throw new Error("dispatch failed");
  });
  expect(() => ui.questionnaire.answer(root, "choices", "alpha")).toThrow("dispatch failed");
  const answered = vi.fn();
  observe(root, "answer-change", answered);
  beta.checked = true;
  beta.dispatchEvent(new Event("change", { bubbles: true }));
  expect(answered).toHaveBeenCalledOnce();
});

it.each(["before-submit", "submit"])(
  "Questionnaire blocks authored submit after %s disposal",
  (name) => {
    const { root, form } = questionnaire();
    ui.enhance(root);
    const authored = vi.fn();
    form.addEventListener("submit", authored);
    observe(
      root,
      name,
      () => {
        star.dispose();
        root.dataset.state = "retired";
      },
      true,
    );
    const event = new SubmitEvent("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(authored).not.toHaveBeenCalled();
    expect(root.dataset.state).toBe("retired");
  },
);

it("Questionnaire stops scroll and change after focus disposal", () => {
  const { root } = questionnaire();
  ui.enhance(root);
  const second = root.querySelector<HTMLElement>('[data-value="second"]');
  if (!second) throw new Error("Missing second item");
  const scroll = vi.fn();
  second.scrollIntoView = scroll;
  second.addEventListener("focus", () => star.dispose(), { once: true });
  const changed = vi.fn();
  observe(root, "change", changed);
  ui.questionnaire.next(root);
  expect(scroll).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
});

it("Questionnaire releases provisional listeners after registration throws", () => {
  const { root, form, next } = questionnaire();
  const removed = vi.spyOn(root, "removeEventListener");
  vi.spyOn(next, "addEventListener").mockImplementationOnce(() => {
    throw new Error("registration failed");
  });
  expect(() => ui.enhance(root)).toThrow("registration failed");
  const answered = vi.fn();
  observe(root, "answer-change", answered);
  const before = root.outerHTML;
  root.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }));
  expect(root.outerHTML).toBe(before);
  expect(answered).not.toHaveBeenCalled();
  expect(removed).toHaveBeenCalledWith("input", expect.any(Function));
  ui.enhance(root);
  const submitted = vi.fn();
  observe(root, "submit", submitted);
  form.dispatchEvent(new SubmitEvent("submit", { cancelable: true }));
  expect(submitted).toHaveBeenCalledOnce();
});

it("Questionnaire stops acquisition after disposal inside registration", () => {
  const { root, next, form } = questionnaire();
  const add = next.addEventListener.bind(next);
  vi.spyOn(next, "addEventListener").mockImplementationOnce((...args) => {
    star.dispose();
    add(...args);
  });
  const removed = vi.spyOn(next, "removeEventListener");
  const formAdd = vi.spyOn(form, "addEventListener");
  ui.enhance(root);
  next.click();
  expect(root.dataset.value).toBe("first");
  expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
  expect(formAdd).not.toHaveBeenCalled();
});

it("Questionnaire uses its document's fieldsets and reset timers", async () => {
  vi.useFakeTimers();
  const local = questionnaire();
  ui.enhance(local.root);
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const foreign = iframe.contentWindow;
  if (!foreign) throw new Error("Missing foreign window");
  const realm = foreign as Window & typeof globalThis;
  await withStarDOMRealm({ window: realm, document: foreign.document }, async () => {
    const other = installStarCore(jQueryFactory(foreign), { document: foreign.document });
    const otherStar = other.star;
    try {
      const otherUI = otherStar.use(uiPlugin);
      const fixture = questionnaire(foreign.document);
      otherUI.enhance(fixture.root);
      const scheduling = vi.spyOn(foreign, "setTimeout");
      const clearing = vi.spyOn(foreign, "clearTimeout");
      fixture.form.dispatchEvent(new realm.Event("reset"));
      expect(scheduling).toHaveBeenCalledWith(expect.any(Function), 0);
      otherUI.questionnaire.skip(fixture.root);
      expect(fixture.first.querySelector('[data-part="skip-value"]')?.ownerDocument).toBe(
        foreign.document,
      );
      otherStar.dispose();
      expect(clearing).toHaveBeenCalled();
    } finally {
      otherStar.dispose();
    }
  });
  local.next.click();
  expect(local.root.dataset.value).toBe("second");
});

it("Questionnaire initializes a replaced status while retaining current bindings", () => {
  const { root, next } = questionnaire();
  ui.enhance(root);
  const old = root.querySelector('[data-part="status"]');
  if (!old) throw new Error("Missing status");
  const status = document.createElement("p");
  status.dataset.part = "status";
  old.replaceWith(status);
  next.type = "submit";
  ui.enhance(root);
  expect(status.getAttribute("aria-live")).toBe("polite");
  expect(status.getAttribute("aria-atomic")).toBe("true");
  expect(next.type).toBe("button");
});

it("Questionnaire stops the old transition after item replacement", () => {
  const { root, first } = questionnaire();
  ui.enhance(root);
  const changed = vi.fn();
  observe(root, "change", changed);
  observe(
    root,
    "before-change",
    (event) => {
      first.replaceWith(first.cloneNode(true));
      root.dataset.value = "third";
      ui.enhance(root);
      event.preventDefault();
    },
    true,
  );
  ui.questionnaire.next(root);
  expect(ui.questionnaire.value(root)).toBe("third");
  expect(changed).not.toHaveBeenCalled();
});

it.each(["go", "submit"] as const)(
  "Questionnaire stops %s validation after native invalid disposal",
  (operation) => {
    const { root, form, first, freeform } = questionnaire();
    freeform.type = "email";
    freeform.value = "invalid";
    ui.enhance(root);
    const invalid = vi.fn();
    observe(root, "invalid", invalid);
    freeform.addEventListener(
      "invalid",
      () => {
        star.dispose();
        first.dataset.state = "retired";
      },
      { once: true },
    );
    if (operation === "go") ui.questionnaire.next(root);
    else {
      const event = new SubmitEvent("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(first.dataset.state).toBe("retired");
    expect(first.hasAttribute("aria-invalid")).toBe(false);
    expect(invalid).not.toHaveBeenCalled();
  },
);

it.each(["reset", "invalid"] as const)(
  "Questionnaire stops %s notification after focus disposal",
  (operation) => {
    const { root, first, alpha } = questionnaire();
    ui.enhance(root);
    const notification = vi.fn();
    observe(root, operation, notification);
    if (operation === "reset") {
      ui.questionnaire.next(root);
      first.addEventListener("focus", () => star.dispose(), { once: true });
      ui.questionnaire.reset(root);
    } else {
      first.dataset.required = "true";
      alpha.addEventListener("focus", () => star.dispose(), { once: true });
      ui.questionnaire.next(root);
    }
    expect(notification).not.toHaveBeenCalled();
  },
);

it("Questionnaire stops change notification after scrolling disposal", () => {
  const { root } = questionnaire();
  ui.enhance(root);
  const second = root.querySelector<HTMLElement>('[data-value="second"]');
  if (!second) throw new Error("Missing second item");
  second.scrollIntoView = () => star.dispose();
  const changed = vi.fn();
  observe(root, "change", changed);
  ui.questionnaire.next(root);
  expect(changed).not.toHaveBeenCalled();
});

it("Questionnaire sweeps cleanup failures and preserves the setup error", () => {
  const { root, next, form } = questionnaire();
  const setup = new Error("setup failed");
  const cleanup = new Error("cleanup failed");
  const removed = vi.spyOn(next, "removeEventListener");
  vi.spyOn(root, "removeEventListener").mockImplementationOnce(() => {
    throw cleanup;
  });
  vi.spyOn(form, "addEventListener").mockImplementationOnce(() => {
    throw setup;
  });
  let caught: unknown;
  try {
    ui.enhance(root);
  } catch (error) {
    caught = error;
  }
  expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
  expect(caught).toBeInstanceOf(AggregateError);
  if (!(caught instanceof AggregateError)) throw new Error("Missing aggregate failure");
  expect(caught.errors[0]).toBe(setup);
  const removal = caught.errors[1] as unknown;
  expect(removal).toBeInstanceOf(AggregateError);
  if (!(removal instanceof AggregateError)) throw new Error("Missing cleanup failure");
  expect(removal.errors).toContain(cleanup);
});

it("Questionnaire cancels a reset scheduled during disposal", () => {
  const { root, form } = questionnaire();
  ui.enhance(root);
  const owner: Window = window;
  const schedule = owner.setTimeout.bind(owner);
  let timer: number | undefined;
  vi.spyOn(owner, "setTimeout").mockImplementationOnce((...args) => {
    star.dispose();
    timer = schedule(...args);
    return timer;
  });
  const clearing = vi.spyOn(window, "clearTimeout");
  form.dispatchEvent(new Event("reset"));
  expect(clearing).toHaveBeenCalledWith(timer);
});

it("Questionnaire keeps one binding after enhancement reenters listener cleanup", () => {
  const { root, next } = questionnaire();
  ui.enhance(root);
  const replacement = next.cloneNode(true) as HTMLButtonElement;
  next.replaceWith(replacement);
  const remove = root.removeEventListener.bind(root);
  vi.spyOn(root, "removeEventListener").mockImplementationOnce((...args) => {
    ui.enhance(root);
    remove(...args);
  });
  ui.enhance(root);
  const changed = vi.fn();
  observe(root, "change", changed);
  replacement.click();
  expect(root.dataset.value).toBe("second");
  expect(changed).toHaveBeenCalledOnce();
  const removed = vi.spyOn(replacement, "removeEventListener");
  star.dispose();
  expect(removed.mock.calls.filter(([name]) => name === "click")).toHaveLength(1);
});
