import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing Questionnaire fixture");
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
function fixture(owner: Window = window) {
  const form = owner.document.createElement("form");
  const root = owner.document.createElement("section");
  root.id = "questionnaire-probe";
  root.className = "questionnaire-target";
  root.dataset.jqs = "questionnaire";
  root.dataset.value = "first";
  root.innerHTML =
    '<fieldset data-part="item" data-name="one" data-value="first" data-skippable><legend>First</legend><label data-part="choice" data-shortcut="a"><input type="radio" data-part="control" name="one" value="alpha" checked>Alpha</label><label data-part="choice" data-shortcut="b"><input type="radio" data-part="control" name="one" value="beta">Beta</label><input data-part="freeform"><p data-part="description">Description</p><p data-part="error"></p></fieldset><fieldset data-part="item" data-name="two" data-value="second"><legend>Second</legend><input data-part="freeform"><p data-part="error"></p></fieldset><fieldset data-part="item" data-name="three" data-value="third"><legend>Third</legend></fieldset><button data-part="previous">Previous</button><button data-part="next">Next</button><button data-part="skip">Skip</button><button data-part="reset">Reset</button><button data-part="submit">Submit</button><progress data-part="progress"></progress><p data-part="status"></p>';
  form.append(root);
  return {
    form,
    root,
    alpha: required(root.querySelector<HTMLInputElement>('[value="alpha"]')),
    beta: required(root.querySelector<HTMLInputElement>('[value="beta"]')),
    first: required(root.querySelector("fieldset")),
    freeform: required(root.querySelector<HTMLInputElement>('[data-part="freeform"]')),
    next: required(root.querySelector<HTMLButtonElement>('[data-part="next"]')),
  };
}
function event(owner: Window, type: string) {
  return new (owner as Window & typeof globalThis).Event(type, { bubbles: true, cancelable: true });
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) star.dispose();
  document.body.replaceChildren();
});

describe.each(["local", "foreign"])("Questionnaire %s document", (scope) => {
  function setup() {
    const installed = install(scope === "local" ? window : realm());
    return { ...installed, ...fixture(installed.owner) };
  }
  it("uses native controls and events from the owning window", () => {
    const { ui, root, owner, beta, form } = setup();
    const emitted: Event[] = [];
    root.addEventListener("jquery-star:questionnaire:answer-change", (e) => emitted.push(e));
    expect(ui.questionnaire.value(root)).toBe("first");
    ui.questionnaire.answer(root, "one", "beta");
    expect(beta.checked).toBe(true);
    expect(new (owner as Window & typeof globalThis).FormData(form).get("one")).toBe("beta");
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toBeInstanceOf((owner as Window & typeof globalThis).CustomEvent);
  });
  it.each(["implicit", "id", "class", "element"])(
    "resolves %s actions on the application root",
    async (mode) => {
      const { jquery, root, ui } = setup();
      const app = required(jquery(root).star().star("instance"));
      const target =
        mode === "id" ? "#questionnaire-probe" : mode === "class" ? ".questionnaire-target" : root;
      await app.run("ui.questionnaire.answer", {
        args: mode === "implicit" ? ["one", "beta"] : [target, "one", "beta"],
      });
      expect(ui.questionnaire.answers(root).one).toBe("beta");
      await app.run("ui.questionnaire.go", {
        args: mode === "implicit" ? ["second"] : [target, "second"],
      });
      expect(root.dataset.value).toBe("second");
    },
  );
  it("keeps canceled native navigation at the current item", () => {
    const { ui, root, next, owner } = setup();
    next.addEventListener("click", (e) => e.preventDefault());
    ui.enhance(root);
    next.dispatchEvent(event(owner, "click"));
    expect(root.dataset.value).toBe("first");
  });
  it.each(["inert", "data-disabled", "aria-disabled"])(
    "honors %s in native and named navigation",
    async (constraint) => {
      const { ui, root, next, jquery, owner } = setup();
      const app = required(jquery(root).star().star("instance"));
      root.setAttribute(constraint, "true");
      next.dispatchEvent(event(owner, "click"));
      await app.run("ui.questionnaire.next");
      expect(root.dataset.value).toBe("first");
      ui.questionnaire.next(root);
      expect(root.dataset.value).toBe("second");
    },
  );
  it("excludes navigation supplied by a different nested controller", () => {
    const { ui, root, owner } = setup();
    const nested = owner.document.createElement("div");
    nested.dataset.jqs = "custom";
    nested.innerHTML = '<button data-part="next">Nested</button>';
    root.prepend(nested);
    ui.enhance(root);
    required(nested.querySelector("button")).click();
    expect(root.dataset.value).toBe("first");
  });
  it("excludes choices supplied by a different nested controller", () => {
    const { ui, root, first, owner } = setup();
    const nested = owner.document.createElement("div");
    nested.dataset.jqs = "custom";
    nested.innerHTML =
      '<input type="checkbox" data-part="control" name="nested" value="nested" checked>';
    first.append(nested);
    expect(ui.questionnaire.answers(root).one).toBe("alpha");
  });
  it("reads replacement fieldsets through its facade", () => {
    const { ui, root, first } = setup();
    ui.enhance(root);
    const replacement = first.cloneNode(true) as HTMLFieldSetElement;
    required(replacement.querySelector<HTMLInputElement>('[value="beta"]')).checked = true;
    first.replaceWith(replacement);
    expect(ui.questionnaire.answers(root).one).toBe("beta");
  });
  it("reads a directly patched active value", () => {
    const { ui, root } = setup();
    ui.enhance(root);
    root.dataset.value = "second";
    expect(ui.questionnaire.value(root)).toBe("second");
  });
  it.each(["disabled", "replace"])(
    "stops navigation when before-change changes the destination through %s",
    (mode) => {
      const { ui, root } = setup();
      ui.enhance(root);
      const second = required(root.querySelector<HTMLElement>('[data-value="second"]'));
      root.addEventListener(
        "jquery-star:questionnaire:before-change",
        () => {
          if (mode === "disabled") second.dataset.disabled = "true";
          else second.replaceWith(second.cloneNode(true));
        },
        { once: true },
      );
      const changed = vi.fn();
      root.addEventListener("jquery-star:questionnaire:change", changed);
      ui.questionnaire.next(root);
      expect(root.dataset.value).toBe("first");
      expect(changed).not.toHaveBeenCalled();
    },
  );
  it("keeps read-only proposed inspection from committing DOM", () => {
    const { ui, root, first } = setup();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:questionnaire:before-change",
      (e) => {
        expect(ui.questionnaire.value(root)).toBe("second");
        expect(root.dataset.value).toBe("first");
        expect(first.hidden).toBe(false);
        e.preventDefault();
      },
      { once: true },
    );
    ui.questionnaire.next(root);
    expect(ui.questionnaire.value(root)).toBe("first");
  });
  it("does not mark a canceled native submission submitted", () => {
    const { ui, root, form, owner } = setup();
    form.addEventListener("submit", (e) => e.preventDefault(), true);
    ui.enhance(root);
    form.dispatchEvent(event(owner, "submit"));
    expect(root.dataset.state).toBe("active");
  });
  it.each(["answer", "navigation"])(
    "keeps a newer %s instead of an older queued reset",
    async (kind) => {
      const { ui, root, form, owner } = setup();
      ui.enhance(root);
      form.reset();
      if (kind === "answer") ui.questionnaire.answer(root, "one", "beta");
      else ui.questionnaire.go(root, "second");
      await new Promise<void>((resolve) => owner.setTimeout(resolve, 5));
      if (kind === "answer") expect(ui.questionnaire.answers(root).one).toBe("beta");
      else expect(root.dataset.value).toBe("second");
    },
  );
  it("retains a current reset through unchanged enhancement", async () => {
    const { ui, root, form, owner } = setup();
    ui.questionnaire.answer(root, "one", "beta");
    ui.questionnaire.go(root, "third");
    form.reset();
    ui.enhance(root);
    await new Promise<void>((resolve) => owner.setTimeout(resolve, 5));
    expect(ui.questionnaire.value(root)).toBe("first");
    expect(ui.questionnaire.answers(root).one).toBe("alpha");
  });
  it("establishes intent before answer iteration", () => {
    const { ui, root } = setup();
    const answer = ["alpha"];
    answer[Symbol.iterator] = function* () {
      ui.questionnaire.answer(root, "one", "beta");
      yield "alpha";
      return undefined;
    };
    ui.questionnaire.answer(root, "one", answer);
    expect(ui.questionnaire.answers(root).one).toBe("beta");
  });
  it.each(["newer", "dispose", "replace"])("stops checked writes after %s", (mode) => {
    const { ui, root, alpha, beta, freeform, star, owner } = setup();
    ui.enhance(root);
    const descriptor = required(
      Object.getOwnPropertyDescriptor(
        (owner as Window & typeof globalThis).HTMLInputElement.prototype,
        "checked",
      ),
    );
    let entered = false;
    Object.defineProperty(alpha, "checked", {
      configurable: true,
      get() {
        return descriptor.get?.call(this);
      },
      set(value: boolean) {
        descriptor.set?.call(this, value);
        if (entered) return;
        entered = true;
        if (mode === "newer") ui.questionnaire.answer(root, "one", "beta");
        if (mode === "dispose") star.dispose();
        if (mode === "replace") freeform.replaceWith(freeform.cloneNode(true));
      },
    });
    ui.questionnaire.answer(
      root,
      "one",
      mode === "replace" ? "custom" : mode === "dispose" ? "beta" : "alpha",
    );
    if (mode === "newer") expect(ui.questionnaire.answers(root).one).toBe("beta");
    if (mode === "dispose") expect(beta.checked).toBe(false);
    if (mode === "replace") expect(freeform.value).toBe("");
  });
  it("stops old notifications after a direct native field patch", () => {
    const { ui, root, alpha, beta } = setup();
    ui.questionnaire.answer(root, "one", "beta");
    const input = vi.fn(),
      change = vi.fn(),
      answer = vi.fn();
    root.addEventListener("input", input);
    root.addEventListener("change", change);
    root.addEventListener("jquery-star:questionnaire:answer-change", answer);
    alpha.addEventListener(
      "input",
      () => {
        beta.checked = true;
      },
      { once: true },
    );
    ui.questionnaire.answer(root, "one", "alpha");
    expect(beta.checked).toBe(true);
    expect(input).toHaveBeenCalledTimes(1);
    expect(change).not.toHaveBeenCalled();
    expect(answer).not.toHaveBeenCalled();
  });
  it("retains an authored disabled previous button", () => {
    const { ui, root } = setup();
    root.dataset.value = "second";
    const previous = required(root.querySelector<HTMLButtonElement>('[data-part="previous"]'));
    previous.disabled = true;
    ui.enhance(root);
    expect(previous.disabled).toBe(true);
    ui.questionnaire.go(root, "third");
    expect(previous.disabled).toBe(true);
  });
  it("ignores canceled keyboard shortcuts", () => {
    const { ui, root, owner } = setup();
    ui.enhance(root);
    const key = new (owner as Window & typeof globalThis).KeyboardEvent("keydown", {
      key: "b",
      bubbles: true,
      cancelable: true,
    });
    key.preventDefault();
    root.dispatchEvent(key);
    expect(ui.questionnaire.answers(root).one).toBe("alpha");
  });
  it("uses native submission when requestSubmit is shadowed", () => {
    const { ui, root, form, owner } = setup();
    const field = owner.document.createElement("input");
    field.name = "requestSubmit";
    form.append(field);
    Object.defineProperty(form, "requestSubmit", { value: field, configurable: true });
    ui.enhance(root);
    form.addEventListener("submit", (e) => e.preventDefault());
    ui.questionnaire.submit(root);
    expect(root.dataset.state).toBe("submitted");
  });

  it("rechecks an internal disabled ancestor after before-change", () => {
    const { ui, root, next, owner } = setup();
    const wrapper = owner.document.createElement("fieldset");
    root.append(wrapper);
    wrapper.append(next);
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:questionnaire:before-change",
      () => {
        wrapper.disabled = true;
      },
      { once: true },
    );
    const changed = vi.fn();
    root.addEventListener("jquery-star:questionnaire:change", changed);
    next.click();
    expect(root.dataset.value).toBe("first");
    expect(changed).not.toHaveBeenCalled();
  });

  it("ignores native changes dispatched inside an inactive question", () => {
    const { ui, root, alpha, first, owner } = setup();
    ui.questionnaire.next(root);
    expect(first.hasAttribute("inert")).toBe(true);
    const changed = vi.fn();
    root.addEventListener("jquery-star:questionnaire:answer-change", changed);
    alpha.dispatchEvent(event(owner, "change"));
    expect(changed).not.toHaveBeenCalled();
  });

  it("stops reset continuation after a native setter changes authored defaults", () => {
    const { ui, root, alpha, beta, owner } = setup();
    ui.questionnaire.answer(root, "one", "beta");
    const descriptor = required(
      Object.getOwnPropertyDescriptor(
        (owner as Window & typeof globalThis).HTMLInputElement.prototype,
        "checked",
      ),
    );
    Object.defineProperty(alpha, "checked", {
      configurable: true,
      get() {
        return descriptor.get?.call(this);
      },
      set(value: boolean) {
        descriptor.set?.call(this, value);
        beta.defaultChecked = true;
      },
    });
    const reset = vi.fn();
    root.addEventListener("jquery-star:questionnaire:reset", reset);
    ui.questionnaire.reset(root);
    expect(beta.checked).toBe(false);
    expect(reset).not.toHaveBeenCalled();
  });
});

it.each([false, true])(
  "Questionnaire adoption retains state with source disposed first=%s",
  async (disposeFirst) => {
    const source = install();
    const destination = install(realm());
    const { root, form, beta, next } = fixture();
    source.ui.questionnaire.answer(root, "one", "beta");
    source.ui.questionnaire.go(root, "second");
    destination.owner.document.adoptNode(form);
    if (disposeFirst) source.star.dispose();
    destination.ui.enhance(root);
    if (!disposeFirst) source.star.dispose();
    expect(destination.ui.questionnaire.value(root)).toBe("second");
    expect(beta.checked).toBe(true);
    next.click();
    expect(root.dataset.value).toBe("third");
    destination.ui.questionnaire.reset(root);
    expect(root.dataset.value).toBe("first");
    expect(() => source.ui.questionnaire.value(root)).toThrow();
  },
);
it("Questionnaire keeps a newer answer during listener acquisition", () => {
  const { ui } = install();
  const { root } = fixture();
  const add = root.addEventListener.bind(root);
  vi.spyOn(root, "addEventListener").mockImplementationOnce((...args) => {
    add(...args);
    ui.questionnaire.answer(root, "one", "beta");
  });
  ui.questionnaire.answer(root, "one", "alpha");
  expect(ui.questionnaire.answers(root).one).toBe("beta");
});
