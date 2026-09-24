import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
const failedDisposals = new Set<ReturnType<typeof installStarCore>["star"]>();
function install(owner: Window = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  const star = jquery.star;
  stars.push(star);
  return { jquery, star, ui: star.use(uiPlugin), owner };
}
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  if (!frame.contentWindow) throw new Error("Missing fixture frame");
  return frame.contentWindow;
}
function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing fixture part");
  return value;
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) {
    if (failedDisposals.delete(star)) expect(() => star.dispose()).toThrow();
    else star.dispose();
  }
  document.body.replaceChildren();
  vi.useRealTimers();
});
type Kind = "select" | "combobox" | "multi-select" | "time-picker";
type UI = ReturnType<typeof uiPlugin.install>;
function fixture(kind: Kind, owner: Window = window): HTMLElement {
  const root = owner.document.createElement("section");
  root.dataset.jqs = kind;
  root.id = "sample";
  root.innerHTML =
    kind === "select" || kind === "multi-select"
      ? `<select data-part="control" ${kind === "multi-select" ? "multiple" : ""}><option value="a" selected>A</option><option value="b">B</option></select><span data-part="status"></span>`
      : kind === "combobox"
        ? '<input data-part="control"><input data-part="value" type="hidden"><div data-part="content"><div data-part="option" data-value="a">A</div><div data-part="option" data-value="b">B</div></div>'
        : '<button type="button" data-part="decrement">Earlier</button><input data-part="control" type="time" name="time" value="09:00" step="900"><button type="button" data-part="increment">Later</button><button type="button" data-part="preset" data-value="13:30">Afternoon</button><span data-part="status"></span>';
  owner.document.body.append(root);
  return root;
}
function read(ui: UI, kind: Kind, root: HTMLElement | string) {
  if (kind === "multi-select") return ui.multiSelect.value(root);
  if (kind === "time-picker") return ui.timePicker.value(root);
  return ui[kind].value(root);
}
function part(root: HTMLElement, name: string): HTMLElement {
  return required(root.querySelector<HTMLElement>(`[data-part="${name}"]`));
}
function timeFixture(owner: Window = window) {
  const root = fixture("time-picker", owner);
  const form = owner.document.createElement("form");
  root.before(form);
  form.append(root);
  return { root, form, control: required(root.querySelector("input")) };
}

describe.each(["select", "combobox", "multi-select", "time-picker"] as const)(
  "%s document ownership",
  (kind) => {
    it.each(["element", "selector"] as const)("accepts its own foreign %s target", (mode) => {
      const { ui, owner } = install(realm());
      const root = fixture(kind, owner);
      ui.enhance(root);
      expect(() => read(ui, kind, mode === "element" ? root : "#sample")).not.toThrow();
    });
    it.each(["enhance", "facade"] as const)(
      "keeps native interaction after adopted %s and source disposal",
      (mode) => {
        const source = install();
        const destination = install(realm());
        const root = fixture(kind);
        source.ui.enhance(root);
        if (kind === "combobox") source.ui.combobox.select(root, "a");
        destination.owner.document.body.append(destination.owner.document.adoptNode(root));
        expect(() => read(source.ui, kind, root)).toThrow("unavailable");
        if (mode === "enhance") destination.ui.enhance(root);
        else read(destination.ui, kind, root);
        source.star.dispose();
        const constructors = destination.owner as Window & typeof globalThis;
        if (kind === "time-picker") {
          part(root, "increment").click();
          expect(required(root.querySelector("input")).value).toBe("09:15");
        } else if (kind === "combobox") {
          const control = required(root.querySelector("input"));
          control.value = "B";
          control.dispatchEvent(new constructors.Event("input", { bubbles: true }));
          expect(root.dataset.value).toBe("");
        } else {
          const control = required(root.querySelector("select"));
          if (kind === "select") control.value = "b";
          else required(control.options[1]).selected = true;
          control.dispatchEvent(new constructors.Event("change", { bubbles: true }));
          expect(root.dataset.value).toBe(kind === "select" ? "b" : '["a","b"]');
        }
      },
    );
  },
);

describe("Time Picker document lifetime", () => {
  it("automatically enhances a foreign document", async () => {
    const { ui, star, owner } = install(realm());
    await star.whenEnhanced();
    const { root } = timeFixture(owner);
    await star.whenEnhanced();
    part(root, "increment").click();
    expect(root.dataset.value).toBe("09:15");
    expect(ui.timePicker.value(root)).toBe("09:15");
  });

  it.each(["implicit", "explicit"] as const)("runs a foreign %s private action", (mode) => {
    const { ui, jquery, owner } = install(realm());
    const { root } = timeFixture(owner);
    const button = owner.document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "data-on:click",
      mode === "implicit"
        ? "@ui.time-picker.set('10:30')"
        : "@ui.time-picker.set('#sample', '10:30')",
    );
    root.append(button);
    jquery(root).star();
    button.click();
    expect(ui.timePicker.value(root)).toBe("10:30");
  });

  it("constructs adopted native and component events in the destination window", () => {
    const source = install();
    const destination = install(realm());
    const { root } = timeFixture();
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const native: Event[] = [];
    const component: Event[] = [];
    root.addEventListener("input", (event) => native.push(event));
    root.addEventListener("change", (event) => native.push(event));
    root.addEventListener("jquery-star:time-picker:change", (event) => component.push(event));
    destination.ui.timePicker.set(root, "10:00");
    const constructors = destination.owner as Window & typeof globalThis;
    expect(native).toHaveLength(2);
    expect(native.every((event) => event instanceof constructors.Event)).toBe(true);
    expect(component).toHaveLength(1);
    expect(component[0]).toBeInstanceOf(constructors.CustomEvent);
  });

  it.each(["before", "after"] as const)(
    "preserves native edits when source disposal occurs %s destination acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control } = timeFixture();
      source.ui.enhance(root);
      control.value = "11:00";
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(control.value).toBe("11:00");
      part(root, "increment").click();
      expect(root.dataset.value).toBe("11:15");
    },
  );

  it("accepts initial and subsequently patched root values", () => {
    const { ui } = install();
    const { root, control } = timeFixture();
    root.dataset.value = "10:00";
    ui.enhance(root);
    expect(control.value).toBe("10:00");
    root.dataset.value = "11:00";
    ui.enhance(root);
    expect(control.value).toBe("11:00");
  });

  it("retains exact listeners through unchanged enhancement", () => {
    const { ui } = install();
    const { root, control, form } = timeFixture();
    ui.enhance(root);
    const targets = [root, control, form, part(root, "decrement"), part(root, "increment")];
    const adds = targets.map((target) => vi.spyOn(target, "addEventListener"));
    const removes = targets.map((target) => vi.spyOn(target, "removeEventListener"));
    ui.enhance(root);
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
  });

  it.each(["before-change", "input", "change"] as const)(
    "stops an older transition after %s starts newer work",
    (phase) => {
      const { ui } = install();
      const { root, control } = timeFixture();
      ui.enhance(root);
      const changes: string[] = [];
      root.addEventListener("jquery-star:time-picker:change", (event) =>
        changes.push((event as CustomEvent<{ value: string }>).detail.value),
      );
      const target = phase === "before-change" ? root : control;
      target.addEventListener(
        phase === "before-change" ? "jquery-star:time-picker:before-change" : phase,
        () => ui.timePicker.set(root, "11:00"),
        { once: true },
      );
      ui.timePicker.set(root, "10:00");
      expect(control.value).toBe("11:00");
      expect(changes).toEqual(["11:00"]);
    },
  );

  it("lets a newer no-op supersede an older before-change request", () => {
    const { ui } = install();
    const { root, control } = timeFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:time-picker:before-change",
      () => ui.timePicker.set(root, "09:00"),
      { once: true },
    );
    ui.timePicker.set(root, "10:00");
    expect(control.value).toBe("09:00");
  });

  it.each(["disabled", "readonly", "min", "max", "step", "native-value"] as const)(
    "honors %s changes made during before-change",
    (mode) => {
      const { ui } = install();
      const { root, control } = timeFixture();
      ui.enhance(root);
      root.addEventListener(
        "jquery-star:time-picker:before-change",
        () => {
          if (mode === "disabled") control.disabled = true;
          else if (mode === "readonly") control.readOnly = true;
          else if (mode === "min") control.min = "11:00";
          else if (mode === "max") control.max = "09:00";
          else if (mode === "step") control.step = "10800";
          else control.value = "12:00";
        },
        { once: true },
      );
      ui.timePicker.set(root, "10:00");
      expect(control.value).toBe(mode === "native-value" ? "12:00" : "09:00");
    },
  );

  it.each(["adopt", "replace", "reassociate"] as const)(
    "stops a transition after before-change callbacks %s the native control",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control } = timeFixture();
      source.ui.enhance(root);
      const changes = vi.fn();
      root.addEventListener("jquery-star:time-picker:change", changes);
      root.addEventListener(
        "jquery-star:time-picker:before-change",
        () => {
          if (mode === "adopt")
            destination.owner.document.body.append(destination.owner.document.adoptNode(root));
          else if (mode === "replace") control.replaceWith(control.cloneNode(true));
          else {
            const form = document.createElement("form");
            document.body.append(form);
            form.append(root);
          }
        },
        { once: true },
      );
      source.ui.timePicker.set(root, "10:00");
      expect(control.value).toBe("09:00");
      expect(changes).not.toHaveBeenCalled();
    },
  );

  it("reacquires replaced controls on a facade call and ignores detached controls", () => {
    const { ui } = install();
    const { root, control } = timeFixture();
    ui.enhance(root);
    const replacement = control.cloneNode(true) as HTMLInputElement;
    replacement.value = "11:00";
    control.replaceWith(replacement);
    control.value = "14:00";
    control.dispatchEvent(new Event("input"));
    expect(root.dataset.value).toBe("09:00");
    ui.timePicker.increment(root);
    expect(replacement.value).toBe("11:15");
    expect(control.value).toBe("14:00");
  });

  it("keeps nested presets within their own Time Picker", () => {
    const { ui } = install();
    const outer = fixture("time-picker");
    const inner = fixture("time-picker");
    outer.append(inner);
    ui.enhance(outer);
    part(inner, "preset").click();
    expect(ui.timePicker.value(inner)).toBe("13:30");
    expect(ui.timePicker.value(outer)).toBe("09:00");
    ui.enhance(outer);
    expect(part(inner, "preset").getAttribute("aria-pressed")).toBe("true");
  });

  it("honors a disabled fieldset for facade changes", () => {
    const { ui } = install();
    const { root, control, form } = timeFixture();
    const fieldset = document.createElement("fieldset");
    fieldset.disabled = true;
    form.append(fieldset);
    fieldset.append(root);
    ui.timePicker.set(root, "10:00");
    expect(control.value).toBe("09:00");
  });

  it("probes stepping without temporarily editing the live native control", () => {
    const { ui } = install();
    const { root, control } = timeFixture();
    const step = vi.spyOn(control, "stepUp");
    ui.enhance(root);
    ui.timePicker.increment(root);
    expect(control.value).toBe("09:15");
    expect(step).not.toHaveBeenCalled();
  });

  it.each(["increment", "control", "form"] as const)(
    "releases earlier and partially registered listeners when %s setup throws",
    (targetName) => {
      const { ui } = install();
      const { root, control, form } = timeFixture();
      const targets = [part(root, "decrement"), part(root, "increment"), control, root, form];
      const target = targetName === "control" ? control : targetName === "form" ? form : targets[1];
      const actual = required(target);
      const add = actual.addEventListener.bind(actual);
      const removes = targets.map((entry) => vi.spyOn(entry, "removeEventListener"));
      vi.spyOn(actual, "addEventListener").mockImplementationOnce((...args) => {
        add(...args);
        throw new Error("registration failed after native setup");
      });
      expect(() => ui.enhance(root)).toThrow("registration failed");
      const index = targets.indexOf(actual);
      expect(removes.slice(0, index + 1).every((spy) => spy.mock.calls.length > 0)).toBe(true);
      vi.restoreAllMocks();
      ui.enhance(root);
      const changes = vi.fn();
      root.addEventListener("jquery-star:time-picker:change", changes);
      part(root, "increment").click();
      expect(changes).toHaveBeenCalledOnce();
    },
  );

  it("releases a listener returned after disposal during registration", () => {
    const { ui, star } = install();
    const { root } = timeFixture();
    const target = part(root, "increment");
    const add = target.addEventListener.bind(target);
    const remove = vi.spyOn(target, "removeEventListener");
    vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
      star.dispose();
      add(...args);
    });
    expect(() => ui.enhance(root)).toThrow();
    expect(remove).toHaveBeenCalled();
  });

  it("sweeps all resources after an earlier native cleanup throws", () => {
    const { ui, star } = install();
    const { root, control, form } = timeFixture();
    ui.enhance(root);
    const first = part(root, "decrement");
    const remove = first.removeEventListener.bind(first);
    const later = [part(root, "increment"), control, root, form].map((target) =>
      vi.spyOn(target, "removeEventListener"),
    );
    vi.spyOn(first, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("native cleanup failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(later.every((spy) => spy.mock.calls.length > 0)).toBe(true);
  });

  it("preserves destination ownership created during source cleanup", () => {
    const source = install();
    const destination = install(realm());
    const { root } = timeFixture();
    source.ui.enhance(root);
    const target = part(root, "decrement");
    const remove = target.removeEventListener.bind(target);
    vi.spyOn(target, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      destination.ui.enhance(root);
    });
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    part(root, "increment").click();
    expect(root.dataset.value).toBe("09:15");
  });

  it("honors late reset cancellation and preserves pending resets through enhancement", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, control, form } = timeFixture();
    ui.timePicker.set(root, "10:00");
    const changes = vi.fn();
    root.addEventListener("jquery-star:time-picker:change", changes);
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(control.value).toBe("10:00");
    expect(changes).not.toHaveBeenCalled();
    form.reset();
    ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(root.dataset.value).toBe("09:00");
    expect(changes).toHaveBeenCalledOnce();
  });

  it("does not emit stale reset notifications after a newer no-op request", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, form } = timeFixture();
    ui.timePicker.set(root, "10:00");
    form.reset();
    ui.timePicker.set(root, "09:00");
    const changes = vi.fn();
    root.addEventListener("jquery-star:time-picker:change", changes);
    vi.runOnlyPendingTimers();
    expect(changes).not.toHaveBeenCalled();
  });

  it("cancels a reset handle returned after disposal", () => {
    vi.useFakeTimers();
    const { ui, star } = install();
    const { root, form } = timeFixture();
    ui.enhance(root);
    const scheduler: Window = window;
    const schedule = scheduler.setTimeout.bind(scheduler);
    const clear = vi.spyOn(scheduler, "clearTimeout");
    let handle: number | undefined;
    vi.spyOn(scheduler, "setTimeout").mockImplementationOnce((callback, delay, ...args) => {
      star.dispose();
      handle = schedule(callback, delay, ...args);
      return handle;
    });
    form.reset();
    expect(handle).toBeDefined();
    expect(clear).toHaveBeenCalledWith(handle);
  });

  it("moves form reset ownership to the destination window", () => {
    vi.useFakeTimers();
    const source = install();
    const destination = install(realm());
    const { root, form, control } = timeFixture();
    source.ui.timePicker.set(root, "10:00");
    form.reset();
    destination.owner.document.body.append(destination.owner.document.adoptNode(form));
    destination.ui.enhance(root);
    source.star.dispose();
    destination.ui.timePicker.set(root, "11:00");
    vi.runOnlyPendingTimers();
    expect(control.value).toBe("11:00");
    const schedule = vi.spyOn(destination.owner, "setTimeout");
    form.reset();
    destination.ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(schedule).toHaveBeenCalled();
    expect(root.dataset.value).toBe("09:00");
  });
});

function selectFixture(owner: Window = window) {
  const root = fixture("select", owner);
  const form = owner.document.createElement("form");
  const label = owner.document.createElement("label");
  const control = required(root.querySelector("select"));
  control.id = `${root.id}-control`;
  control.name = "choice";
  control.innerHTML =
    '<option value="a" selected>Alpha</option><option value="b">Beta</option><option value="c">Charlie</option><option value="d">Bravo</option>';
  label.htmlFor = control.id;
  label.textContent = "Choice";
  root.before(form);
  form.append(label, root);
  return { root, form, label, control };
}
function selectKey(root: HTMLElement, key: string, options: KeyboardEventInit = {}): void {
  const owner = required(root.ownerDocument.defaultView);
  part(root, "trigger").dispatchEvent(
    new owner.KeyboardEvent("keydown", { key, bubbles: true, ...options }),
  );
}
function selectOption(root: HTMLElement, value: string): HTMLElement {
  return required(
    part(root, "content").querySelector<HTMLElement>(`[data-part="option"][data-value="${value}"]`),
  );
}
function nativePopup(root: HTMLElement) {
  const content = part(root, "content") as HTMLElement & {
    showPopover(): void;
    hidePopover(): void;
  };
  content.showPopover = () => {
    content.hidden = false;
  };
  content.hidePopover = () => {
    content.hidden = true;
  };
  return content;
}

describe("Select document lifetime", () => {
  it("automatically enhances a foreign native select", async () => {
    const { ui, star, owner } = install(realm());
    await star.whenEnhanced();
    const { root } = selectFixture(owner);
    await star.whenEnhanced();
    part(root, "trigger").click();
    selectOption(root, "b").click();
    expect(ui.select.value(root)).toBe("b");
  });
  it.each(["implicit", "explicit"] as const)("runs a foreign %s private action", (mode) => {
    const { ui, jquery, owner } = install(realm());
    const { root } = selectFixture(owner);
    const button = owner.document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "data-on:click",
      mode === "implicit" ? "@ui.select.select('b')" : "@ui.select.select('#sample', 'b')",
    );
    root.append(button);
    jquery(root).star();
    button.click();
    expect(ui.select.value(root)).toBe("b");
  });
  it("constructs adopted native and component events in the destination window", () => {
    const source = install();
    const destination = install(realm());
    const { root } = selectFixture();
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const native: Event[] = [];
    const component: Event[] = [];
    root.addEventListener("input", (event) => native.push(event));
    root.addEventListener("change", (event) => native.push(event));
    root.addEventListener("jquery-star:select:change", (event) => component.push(event));
    destination.ui.select.select(root, "b");
    const constructors = destination.owner as Window & typeof globalThis;
    expect(native).toHaveLength(2);
    expect(native.every((event) => event instanceof constructors.Event)).toBe(true);
    expect(component).toHaveLength(1);
    expect(component[0]).toBeInstanceOf(constructors.CustomEvent);
  });
  it.each(["before", "after"] as const)(
    "preserves silent selection with source disposal %s destination acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control } = selectFixture();
      source.ui.enhance(root);
      control.value = "c";
      const option = selectOption(root, "c");
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(control.value).toBe("c");
      expect(selectOption(root, "c")).toBe(option);
      expect(destination.ui.select.value(root)).toBe("c");
    },
  );
  it("retains exact generated nodes, listeners and active exploration through unchanged enhancement", () => {
    const { ui } = install();
    const { root, control, form, label } = selectFixture();
    ui.select.open(root);
    selectKey(root, "ArrowDown");
    const options = Array.from(
      part(root, "content").querySelectorAll<HTMLElement>('[data-part="option"]'),
    );
    const targets = [part(root, "trigger"), control, form, label, ...options];
    const adds = targets.map((target) => vi.spyOn(target, "addEventListener"));
    const removes = targets.map((target) => vi.spyOn(target, "removeEventListener"));
    ui.enhance(root);
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(selectOption(root, "b")).toBe(options[1]);
    expect(part(root, "trigger").getAttribute("aria-activedescendant")).toBe(
      selectOption(root, "b").id,
    );
    expect(control.value).toBe("a");
  });
  it.each(["before", "after"] as const)(
    "retains open exploration on adoption with source disposal %s acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control } = selectFixture();
      source.ui.select.open(root);
      selectKey(root, "ArrowDown");
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(root.dataset.state).toBe("open");
      expect(part(root, "trigger").getAttribute("aria-activedescendant")).toBe(
        selectOption(root, "b").id,
      );
      selectKey(root, "Enter");
      expect(control.value).toBe("b");
    },
  );
  it.each(["before-change", "input", "change"] as const)(
    "keeps newer selection started by %s",
    (phase) => {
      const { ui } = install();
      const { root, control } = selectFixture();
      ui.enhance(root);
      const changes: string[] = [];
      root.addEventListener("jquery-star:select:change", (event) =>
        changes.push((event as CustomEvent<{ value: string }>).detail.value),
      );
      const target = phase === "before-change" ? root : control;
      target.addEventListener(
        phase === "before-change" ? "jquery-star:select:before-change" : phase,
        () => ui.select.select(root, "c"),
        { once: true },
      );
      ui.select.select(root, "b");
      expect(control.value).toBe("c");
      expect(changes).toEqual(["c"]);
    },
  );
  it("lets a newer same-value request supersede before-change", () => {
    const { ui } = install();
    const { root, control } = selectFixture();
    ui.enhance(root);
    root.addEventListener("jquery-star:select:before-change", () => ui.select.select(root, "a"), {
      once: true,
    });
    ui.select.select(root, "b");
    expect(control.value).toBe("a");
  });
  it.each(["before-open", "before-close", "selection"] as const)(
    "keeps a newer popup request made during %s",
    (phase) => {
      const { ui } = install();
      const { root } = selectFixture();
      ui.enhance(root);
      if (phase !== "before-open") ui.select.open(root);
      const event = phase === "selection" ? "change" : phase;
      root.addEventListener(
        `jquery-star:select:${event}`,
        () => (phase === "before-open" ? ui.select.close(root) : ui.select.open(root)),
        { once: true },
      );
      if (phase === "before-open") ui.select.open(root);
      else if (phase === "before-close") ui.select.close(root);
      else ui.select.select(root, "b");
      expect(root.dataset.state).toBe(phase === "before-open" ? "closed" : "open");
    },
  );
  it.each(["disabled", "group", "remove", "replace", "native-value", "fieldset"] as const)(
    "honors %s changes during before-change",
    (mode) => {
      const { ui } = install();
      const { root, control, form } = selectFixture();
      ui.enhance(root);
      root.addEventListener(
        "jquery-star:select:before-change",
        () => {
          const option = required(control.options[1]);
          if (mode === "disabled") option.disabled = true;
          else if (mode === "group") {
            const group = document.createElement("optgroup");
            group.disabled = true;
            control.append(group);
            group.append(option);
          } else if (mode === "remove") option.remove();
          else if (mode === "replace") control.replaceWith(control.cloneNode(true));
          else if (mode === "native-value") control.value = "c";
          else {
            const fieldset = document.createElement("fieldset");
            fieldset.disabled = true;
            form.append(fieldset);
            fieldset.append(root);
          }
        },
        { once: true },
      );
      ui.select.select(root, "b");
      expect(control.value).toBe(mode === "native-value" ? "c" : "a");
    },
  );
  it("reflects a newer native change dispatched during synthetic input", () => {
    const { ui } = install();
    const { root, control } = selectFixture();
    ui.enhance(root);
    const changes: string[] = [];
    root.addEventListener("jquery-star:select:change", (event) =>
      changes.push((event as CustomEvent<{ value: string }>).detail.value),
    );
    control.addEventListener(
      "input",
      () => {
        control.value = "c";
        control.dispatchEvent(new Event("change", { bubbles: true }));
      },
      { once: true },
    );
    ui.select.select(root, "b");
    expect(root.dataset.value).toBe("c");
    expect(changes).toEqual(["c"]);
  });
  it.each(["cancel", "newer"] as const)(
    "respects a sibling close callback that chooses %s work",
    (mode) => {
      const { ui } = install();
      const first = selectFixture();
      first.root.id = "first";
      const second = selectFixture();
      second.root.id = "second";
      const third = selectFixture();
      third.root.id = "third";
      ui.select.open(first.root);
      first.root.addEventListener(
        "jquery-star:select:before-close",
        (event) => {
          if (mode === "cancel") event.preventDefault();
          else ui.select.open(third.root);
        },
        { once: true },
      );
      ui.select.open(second.root);
      expect(second.root.dataset.state).toBe("closed");
      expect((mode === "cancel" ? first : third).root.dataset.state).toBe("open");
      expect(part(second.root, "content").hidden).toBe(true);
    },
  );
  it.each(["show", "hide"] as const)(
    "reconciles native %s completion after a newer popup request",
    (mode) => {
      const { ui } = install();
      const { root } = selectFixture();
      ui.enhance(root);
      const content = nativePopup(root);
      if (mode === "hide") ui.select.open(root);
      if (mode === "show")
        content.showPopover = () => {
          ui.select.close(root);
          content.hidden = false;
        };
      else
        content.hidePopover = () => {
          ui.select.open(root);
          content.hidden = true;
        };
      if (mode === "show") ui.select.open(root);
      else ui.select.close(root);
      expect(root.dataset.state).toBe(mode === "show" ? "closed" : "open");
      expect(content.hidden).toBe(mode === "show");
      content.showPopover = () => {
        content.hidden = false;
      };
      content.hidePopover = () => {
        content.hidden = true;
      };
    },
  );
  it("stops geometry writes when content measurement disposes the owner", () => {
    const { ui, star } = install();
    const { root } = selectFixture();
    ui.enhance(root);
    const content = part(root, "content");
    vi.spyOn(content, "getBoundingClientRect").mockImplementation(() => {
      star.dispose();
      return new DOMRect(0, 0, 100, 100);
    });
    ui.select.open(root);
    expect(content.style.left).toBe("");
    expect(content.style.top).toBe("");
  });
  it.each(["show", "scroll", "focus"] as const)(
    "stops an open notification after %s starts a close",
    (mode) => {
      const { ui } = install();
      const { root } = selectFixture();
      ui.enhance(root);
      if (mode === "show") {
        const content = nativePopup(root);
        content.showPopover = () => {
          ui.select.close(root);
          content.hidden = false;
        };
      } else if (mode === "scroll")
        selectOption(root, "a").scrollIntoView = () => {
          ui.select.close(root);
        };
      else
        part(root, "trigger").addEventListener("focus", () => ui.select.close(root), {
          once: true,
        });
      const opened = vi.fn();
      root.addEventListener("jquery-star:select:open", opened);
      ui.select.open(root);
      expect(root.dataset.state).toBe("closed");
      expect(opened).not.toHaveBeenCalled();
    },
  );
  it("ignores composing and modified typeahead keys", () => {
    const { ui } = install();
    const { root } = selectFixture();
    ui.enhance(root);
    selectKey(root, "b", { isComposing: true });
    selectKey(root, "b", { ctrlKey: true });
    expect(root.dataset.state).toBe("closed");
  });
  it("preserves the typeahead buffer through unchanged enhancement", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root } = selectFixture();
    ui.select.open(root);
    selectKey(root, "b");
    ui.enhance(root);
    selectKey(root, "r");
    expect(part(root, "trigger").getAttribute("aria-activedescendant")).toBe(
      selectOption(root, "d").id,
    );
  });
  it("cancels a typeahead timer returned after disposal", () => {
    vi.useFakeTimers();
    const { ui, star } = install();
    const { root } = selectFixture();
    ui.select.open(root);
    const scheduler: Window = window;
    const schedule = scheduler.setTimeout.bind(scheduler);
    const clear = vi.spyOn(scheduler, "clearTimeout");
    let timer: number | undefined;
    vi.spyOn(scheduler, "setTimeout").mockImplementationOnce((callback, delay, ...args) => {
      star.dispose();
      timer = schedule(callback, delay, ...args);
      return timer;
    });
    selectKey(root, "b");
    expect(timer).toBeDefined();
    expect(clear).toHaveBeenCalledWith(timer);
  });
  it.each(["control", "option", "form"] as const)(
    "releases all acquired bindings when %s registration fails",
    (name) => {
      const { ui } = install();
      const { root, control, form, label } = selectFixture();
      ui.enhance(root);
      const trigger = part(root, "trigger");
      const target =
        name === "control" ? control : name === "form" ? form : selectOption(root, "b");
      const source = install(realm());
      source.owner.document.body.append(source.owner.document.adoptNode(form));
      const targets = [
        trigger,
        control,
        label,
        form,
        selectOption(root, "a"),
        selectOption(root, "b"),
      ];
      const removes = targets.map((entry) => vi.spyOn(entry, "removeEventListener"));
      const add = target.addEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
        add(...args);
        throw new Error("partial native registration");
      });
      try {
        expect(() => source.ui.enhance(root)).toThrow("partial native registration");
        expect(removes.every((spy) => spy.mock.calls.length > 0)).toBe(true);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );
  it("removes a listener returned after disposal during acquisition", () => {
    const { ui, star } = install();
    const { root, control } = selectFixture();
    const add = control.addEventListener.bind(control);
    const remove = vi.spyOn(control, "removeEventListener");
    vi.spyOn(control, "addEventListener").mockImplementationOnce((...args) => {
      star.dispose();
      add(...args);
    });
    expect(() => ui.enhance(root)).toThrow();
    expect(remove).toHaveBeenCalled();
  });
  it("sweeps reset, typeahead, option and popup resources after a native removal throws", () => {
    vi.useFakeTimers();
    const { ui, star } = install();
    const { root, form } = selectFixture();
    ui.select.open(root);
    const scheduled = vi.spyOn(window as Window, "setTimeout");
    const cleared = vi.spyOn(window as Window, "clearTimeout");
    selectKey(root, "b");
    form.reset();
    const timers = scheduled.mock.calls.flatMap(([, delay], index) =>
      delay === 0 || delay === 500 ? [scheduled.mock.results[index]?.value] : [],
    );
    expect(timers).toHaveLength(2);
    const trigger = part(root, "trigger");
    const remove = trigger.removeEventListener.bind(trigger);
    const optionRemoved = vi.spyOn(selectOption(root, "b"), "removeEventListener");
    const formRemoved = vi.spyOn(form, "removeEventListener");
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("native removal failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(optionRemoved).toHaveBeenCalled();
    expect(formRemoved).toHaveBeenCalled();
    expect(part(root, "content").hidden).toBe(true);
    for (const timer of timers) expect(cleared).toHaveBeenCalledWith(timer);
  });
  it("preserves destination bindings acquired during source cleanup", () => {
    const source = install();
    const destination = install(realm());
    const { root } = selectFixture();
    source.ui.select.open(root);
    const trigger = part(root, "trigger");
    const remove = trigger.removeEventListener.bind(trigger);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      destination.ui.enhance(root);
    });
    destination.ui.enhance(root);
    source.star.dispose();
    selectOption(root, "b").click();
    expect(destination.ui.select.value(root)).toBe("b");
  });
  it("uses only destination outside-click and viewport handlers after adoption", () => {
    const source = install();
    const destination = install(realm());
    const { root } = selectFixture();
    source.ui.select.open(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    const trigger = part(root, "trigger");
    const measured = vi.spyOn(trigger, "getBoundingClientRect");
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    window.dispatchEvent(new Event("resize"));
    expect(root.dataset.state).toBe("open");
    expect(measured).not.toHaveBeenCalled();
    const constructors = destination.owner as Window & typeof globalThis;
    destination.owner.dispatchEvent(new constructors.Event("resize"));
    expect(measured).toHaveBeenCalled();
    destination.owner.document.body.dispatchEvent(
      new constructors.Event("pointerdown", { bubbles: true }),
    );
    expect(root.dataset.state).toBe("closed");
  });
  it("does not emit stale reset input after a newer no-op selection", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, form } = selectFixture();
    ui.select.select(root, "b");
    form.reset();
    ui.select.select(root, "a");
    const input = vi.fn();
    root.addEventListener("input", input);
    vi.runOnlyPendingTimers();
    expect(input).not.toHaveBeenCalled();
  });
  it("cancels a reset handle returned after disposal", () => {
    vi.useFakeTimers();
    const { ui, star } = install();
    const { root, form } = selectFixture();
    ui.enhance(root);
    const scheduler: Window = window;
    const schedule = scheduler.setTimeout.bind(scheduler);
    const clear = vi.spyOn(scheduler, "clearTimeout");
    let timer: number | undefined;
    vi.spyOn(scheduler, "setTimeout").mockImplementationOnce((callback, delay, ...args) => {
      star.dispose();
      timer = schedule(callback, delay, ...args);
      return timer;
    });
    form.reset();
    expect(timer).toBeDefined();
    expect(clear).toHaveBeenCalledWith(timer);
  });
  it("reacquires replaced native controls before facade selection", () => {
    const { ui } = install();
    const { root, control } = selectFixture();
    ui.enhance(root);
    const replacement = control.cloneNode(true) as HTMLSelectElement;
    control.replaceWith(replacement);
    ui.select.select(root, "b");
    expect(replacement.value).toBe("b");
    expect(control.value).toBe("a");
  });
});

it("Select starts exploration at the first enabled option when native selection is empty", () => {
  const { ui } = install();
  const { root, control } = selectFixture();
  control.selectedIndex = -1;
  ui.select.open(root);
  expect(part(root, "trigger").getAttribute("aria-activedescendant")).toBe(
    selectOption(root, "a").id,
  );
  expect(control.selectedIndex).toBe(-1);
});
it.each(["preserved", "canceled"] as const)("Select reconciles a %s native popover", (mode) => {
  const { ui } = install();
  const { root } = selectFixture();
  ui.enhance(root);
  const content = nativePopup(root);
  let visible = false;
  const matches = content.matches.bind(content);
  vi.spyOn(content, "matches").mockImplementation((selector) =>
    selector === ":popover-open" ? visible : matches(selector),
  );
  content.showPopover = () => {
    if (mode !== "canceled") visible = true;
  };
  content.hidePopover = () => {
    visible = false;
  };
  const opened = vi.fn();
  root.addEventListener("jquery-star:select:open", opened);
  ui.select.open(root);
  if (mode === "preserved") {
    selectKey(root, "ArrowDown");
    visible = false;
    ui.enhance(root);
    expect(visible).toBe(true);
    expect(part(root, "trigger").getAttribute("aria-activedescendant")).toBe(
      selectOption(root, "b").id,
    );
    expect(opened).toHaveBeenCalledOnce();
  } else {
    expect(root.dataset.state).toBe("closed");
    expect(opened).not.toHaveBeenCalled();
  }
});

it.each(["open", "toggle"] as const)(
  "Select stops %s when replacement cleanup disposes its owner",
  (operation) => {
    const { ui, star } = install();
    const { root, control } = selectFixture();
    ui.enhance(root);
    const content = nativePopup(root);
    ui.select.open(root);
    content.hidePopover = () => star.dispose();
    control.replaceWith(control.cloneNode(true));
    const beforeOpen = vi.fn();
    root.addEventListener("jquery-star:select:before-open", beforeOpen);
    expect(() => ui.select[operation](root)).not.toThrow();
    expect(beforeOpen).not.toHaveBeenCalled();
  },
);

function comboFixture(owner: Window = window, initial = "") {
  const root = fixture("combobox", owner);
  const form = owner.document.createElement("form");
  const control = required(root.querySelector<HTMLInputElement>('input[data-part="control"]'));
  const hidden = required(root.querySelector<HTMLInputElement>('input[data-part="value"]'));
  control.name = "query";
  hidden.name = "choice";
  hidden.value = initial;
  if (initial) root.dataset.filter = "manual";
  part(root, "content").innerHTML =
    '<div data-part="option" data-value="a">Alpha</div><div data-part="option" data-value="b">Beta</div><div data-part="option" data-value="c">Charlie</div><div data-part="empty">No choices</div><div data-part="loading">Loading</div>';
  root.before(form);
  form.append(root);
  return { root, form, control, hidden };
}
function comboKey(root: HTMLElement, key: string, options: KeyboardEventInit = {}): void {
  const owner = required(root.ownerDocument.defaultView);
  part(root, "control").dispatchEvent(
    new owner.KeyboardEvent("keydown", { key, bubbles: true, ...options }),
  );
}
function comboQuery(root: HTMLElement, query: string): void {
  const control = required(root.querySelector<HTMLInputElement>('input[data-part="control"]'));
  control.value = query;
  const owner = required(root.ownerDocument.defaultView);
  control.dispatchEvent(new owner.Event("input", { bubbles: true }));
}

describe("Combobox document lifetime", () => {
  it("automatically enhances a foreign query and options", async () => {
    const { ui, star, owner } = install(realm());
    await star.whenEnhanced();
    const { root, control } = comboFixture(owner);
    await star.whenEnhanced();
    comboKey(root, "ArrowDown");
    comboKey(root, "ArrowDown");
    comboKey(root, "Enter");
    expect(ui.combobox.value(root)).toBe("b");
    expect(control.value).toBe("Beta");
  });
  it.each(["implicit", "explicit"] as const)("runs a foreign %s private action", (mode) => {
    const { ui, jquery, owner } = install(realm());
    const { root } = comboFixture(owner);
    const button = owner.document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "data-on:click",
      mode === "implicit" ? "@ui.combobox.select('b')" : "@ui.combobox.select('#sample', 'b')",
    );
    root.append(button);
    jquery(root).star();
    button.click();
    expect(ui.combobox.value(root)).toBe("b");
  });
  it("constructs adopted native and component events in the destination window", () => {
    const source = install();
    const destination = install(realm());
    const { root } = comboFixture();
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const native: Event[] = [];
    const component: Event[] = [];
    root.addEventListener("input", (event) => native.push(event));
    root.addEventListener("change", (event) => native.push(event));
    root.addEventListener("jquery-star:combobox:select", (event) => component.push(event));
    destination.ui.combobox.select(root, "b");
    const constructors = destination.owner as Window & typeof globalThis;
    expect(native).toHaveLength(3);
    expect(native.every((event) => event instanceof constructors.Event)).toBe(true);
    expect(component).toHaveLength(1);
    expect(component[0]).toBeInstanceOf(constructors.CustomEvent);
  });
  it.each(["before", "after"] as const)(
    "retains original reset defaults with source disposal %s destination acquisition",
    (mode) => {
      vi.useFakeTimers();
      const source = install();
      const destination = install(realm());
      const { root, form, hidden, control } = comboFixture(window, "a");
      source.ui.enhance(root);
      source.ui.combobox.select(root, "b");
      destination.owner.document.body.append(destination.owner.document.adoptNode(form));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(hidden.value).toBe("b");
      form.reset();
      destination.ui.enhance(root);
      vi.runOnlyPendingTimers();
      expect(hidden.value).toBe("a");
      expect(control.value).toBe("Alpha");
      expect(root.dataset.value).toBe("a");
    },
  );
  it.each(["before", "after"] as const)(
    "retains query draft, selection and exploration with source disposal %s acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control, hidden } = comboFixture();
      source.ui.enhance(root);
      comboQuery(root, "a");
      comboKey(root, "ArrowDown");
      control.setSelectionRange(0, 1);
      const active = control.getAttribute("aria-activedescendant");
      const option = selectOption(root, "b");
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(control.value).toBe("a");
      expect(control.selectionStart).toBe(0);
      expect(control.selectionEnd).toBe(1);
      expect(hidden.value).toBe("");
      expect(root.dataset.state).toBe("open");
      expect(control.getAttribute("aria-activedescendant")).toBe(active);
      expect(selectOption(root, "b")).toBe(option);
      comboKey(root, "Enter");
      expect(hidden.value).toBe("b");
    },
  );
  it("retains exact listeners and active exploration through unchanged enhancement", () => {
    const { ui } = install();
    const { root, form, control, hidden } = comboFixture();
    ui.combobox.open(root);
    comboKey(root, "ArrowDown");
    const option = selectOption(root, "b");
    const targets = [control, hidden, form, option];
    const adds = targets.map((target) => vi.spyOn(target, "addEventListener"));
    const removes = targets.map((target) => vi.spyOn(target, "removeEventListener"));
    control.setSelectionRange(0, 0);
    ui.enhance(root);
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(control.getAttribute("aria-activedescendant")).toBe(option.id);
  });
  it.each(["before-select", "input", "change", "query-change"] as const)(
    "preserves newer selection started during %s",
    (phase) => {
      const { ui } = install();
      const { root, hidden, control } = comboFixture();
      ui.enhance(root);
      const selected: string[] = [];
      root.addEventListener("jquery-star:combobox:select", (event) =>
        selected.push((event as CustomEvent<{ value: string }>).detail.value),
      );
      const target = phase === "before-select" ? root : phase === "query-change" ? control : hidden;
      target.addEventListener(
        phase === "before-select"
          ? "jquery-star:combobox:before-select"
          : phase === "query-change"
            ? "change"
            : phase,
        () => ui.combobox.select(root, "c"),
        { once: true },
      );
      ui.combobox.select(root, "b");
      expect(hidden.value).toBe("c");
      expect(control.value).toBe("Charlie");
      expect(selected).toEqual(["c"]);
    },
  );
  it("lets a newer no-op clear supersede before-select", () => {
    const { ui } = install();
    const { root, hidden } = comboFixture();
    ui.enhance(root);
    root.addEventListener("jquery-star:combobox:before-select", () => ui.combobox.clear(root), {
      once: true,
    });
    ui.combobox.select(root, "b");
    expect(hidden.value).toBe("");
  });
  it.each([
    "disabled",
    "readonly",
    "fieldset",
    "hidden",
    "label",
    "value",
    "remove",
    "control",
    "hidden-control",
    "native-query",
    "native-value",
  ] as const)("honors %s changes during before-select", (mode) => {
    const { ui } = install();
    const { root, control, hidden, form } = comboFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:combobox:before-select",
      () => {
        const option = selectOption(root, "b");
        if (mode === "disabled") option.dataset.disabled = "";
        else if (mode === "readonly") control.readOnly = true;
        else if (mode === "fieldset") {
          const fieldset = document.createElement("fieldset");
          fieldset.disabled = true;
          form.append(fieldset);
          fieldset.append(root);
        } else if (mode === "hidden") option.hidden = true;
        else if (mode === "label") option.dataset.label = "Changed label";
        else if (mode === "value") option.dataset.value = "other";
        else if (mode === "remove") option.remove();
        else if (mode === "control") control.replaceWith(control.cloneNode(true));
        else if (mode === "hidden-control") hidden.replaceWith(hidden.cloneNode(true));
        else if (mode === "native-query") control.value = "native draft";
        else hidden.value = "c";
      },
      { once: true },
    );
    ui.combobox.select(root, "b");
    expect(hidden.value).toBe(mode === "native-value" ? "c" : "");
    expect(control.value).toBe(mode === "native-query" ? "native draft" : "");
  });
  it.each(["query", "value"] as const)(
    "reflects a newer native %s during synthetic input",
    (mode) => {
      const { ui } = install();
      const { root, hidden, control } = comboFixture();
      ui.enhance(root);
      const selected = vi.fn();
      root.addEventListener("jquery-star:combobox:select", selected);
      hidden.addEventListener(
        "input",
        () => {
          if (mode === "query") comboQuery(root, "draft");
          else {
            hidden.value = "c";
            hidden.dispatchEvent(new Event("change", { bubbles: true }));
          }
        },
        { once: true },
      );
      ui.combobox.select(root, "b");
      expect(hidden.value).toBe(mode === "query" ? "" : "c");
      expect(control.value).toBe(mode === "query" ? "draft" : "Charlie");
      expect(root.dataset.value).toBe(hidden.value);
      expect(selected).not.toHaveBeenCalled();
    },
  );
  it.each(["input", "change", "query-change"] as const)(
    "stops stale clear notifications after %s selects a newer value",
    (phase) => {
      const { ui } = install();
      const { root, hidden, control } = comboFixture();
      ui.combobox.select(root, "a");
      const cleared = vi.fn();
      root.addEventListener("jquery-star:combobox:clear", cleared);
      (phase === "query-change" ? control : hidden).addEventListener(
        phase === "query-change" ? "change" : phase,
        () => ui.combobox.select(root, "c"),
        { once: true },
      );
      ui.combobox.clear(root);
      expect(hidden.value).toBe("c");
      expect(control.value).toBe("Charlie");
      expect(cleared).not.toHaveBeenCalled();
    },
  );
  it.each(["query", "clear"] as const)(
    "keeps selection started by a native-query %s callback",
    (phase) => {
      const { ui } = install();
      const { root, hidden, control } = comboFixture();
      ui.combobox.select(root, "a");
      root.addEventListener(`jquery-star:combobox:${phase}`, () => ui.combobox.select(root, "c"), {
        once: true,
      });
      comboQuery(root, "a");
      expect(hidden.value).toBe("c");
      expect(control.value).toBe("Charlie");
      expect(root.dataset.state).toBe("closed");
    },
  );
  it.each(["before-open", "before-close", "select"] as const)(
    "keeps newer popup intent during %s",
    (phase) => {
      const { ui } = install();
      const { root } = comboFixture();
      ui.enhance(root);
      if (phase !== "before-open") ui.combobox.open(root);
      root.addEventListener(
        `jquery-star:combobox:${phase}`,
        () => (phase === "before-open" ? ui.combobox.close(root) : ui.combobox.open(root)),
        { once: true },
      );
      if (phase === "before-open") ui.combobox.open(root);
      else if (phase === "before-close") ui.combobox.close(root);
      else ui.combobox.select(root, "b");
      expect(root.dataset.state).toBe(phase === "before-open" ? "closed" : "open");
    },
  );
  it.each(["cancel", "newer"] as const)(
    "honors a sibling close callback choosing %s intent",
    (mode) => {
      const { ui } = install();
      const first = comboFixture();
      const second = comboFixture();
      const third = comboFixture();
      first.root.id = "first";
      second.root.id = "second";
      third.root.id = "third";
      ui.combobox.open(first.root);
      first.root.addEventListener(
        "jquery-star:combobox:before-close",
        (event) => {
          if (mode === "cancel") event.preventDefault();
          else ui.combobox.open(third.root);
        },
        { once: true },
      );
      ui.combobox.open(second.root);
      expect(second.root.dataset.state).toBe("closed");
      expect((mode === "cancel" ? first : third).root.dataset.state).toBe("open");
    },
  );
  it.each(["show", "hide"] as const)(
    "reconciles native %s completion with newer popup intent",
    (mode) => {
      const { ui } = install();
      const { root } = comboFixture();
      ui.enhance(root);
      const content = nativePopup(root);
      if (mode === "hide") ui.combobox.open(root);
      if (mode === "show")
        content.showPopover = () => {
          ui.combobox.close(root);
          content.hidden = false;
        };
      else
        content.hidePopover = () => {
          ui.combobox.open(root);
          content.hidden = true;
        };
      if (mode === "show") ui.combobox.open(root);
      else ui.combobox.close(root);
      expect(root.dataset.state).toBe(mode === "show" ? "closed" : "open");
      expect(content.hidden).toBe(mode === "show");
      content.showPopover = () => {
        content.hidden = false;
      };
      content.hidePopover = () => {
        content.hidden = true;
      };
    },
  );
  it.each(["preserved", "canceled"] as const)("reconciles a %s native popover", (mode) => {
    const { ui } = install();
    const { root, control } = comboFixture();
    ui.enhance(root);
    const content = nativePopup(root);
    let visible = false;
    const matches = content.matches.bind(content);
    vi.spyOn(content, "matches").mockImplementation((selector) =>
      selector === ":popover-open" ? visible : matches(selector),
    );
    content.showPopover = () => {
      if (mode !== "canceled") visible = true;
    };
    content.hidePopover = () => {
      visible = false;
    };
    const opened = vi.fn();
    root.addEventListener("jquery-star:combobox:open", opened);
    ui.combobox.open(root);
    if (mode === "preserved") {
      comboKey(root, "ArrowDown");
      visible = false;
      ui.enhance(root);
      expect(visible).toBe(true);
      expect(control.getAttribute("aria-activedescendant")).toBe(selectOption(root, "b").id);
      expect(opened).toHaveBeenCalledOnce();
    } else {
      expect(root.dataset.state).toBe("closed");
      expect(opened).not.toHaveBeenCalled();
    }
  });
  it("retires a native popup using its captured mode when switching to inline", () => {
    const { ui } = install();
    const { root } = comboFixture();
    ui.enhance(root);
    const content = nativePopup(root);
    const hide = vi.fn(() => {
      content.hidden = true;
    });
    content.hidePopover = hide;
    ui.combobox.open(root);
    root.dataset.inline = "";
    ui.enhance(root);
    expect(hide).toHaveBeenCalledOnce();
    expect(content.hasAttribute("popover")).toBe(false);
    expect(content.hidden).toBe(false);
  });
  it("stops geometry writes after measurement disposal", () => {
    const { ui, star } = install();
    const { root } = comboFixture();
    ui.enhance(root);
    const content = part(root, "content");
    vi.spyOn(content, "getBoundingClientRect").mockImplementation(() => {
      star.dispose();
      return new DOMRect(0, 0, 100, 100);
    });
    ui.combobox.open(root);
    expect(content.style.left).toBe("");
    expect(content.style.top).toBe("");
  });
  it.each(["composing", "modified"] as const)("keeps %s Enter native", (mode) => {
    const { ui } = install();
    const { root, hidden } = comboFixture();
    ui.combobox.open(root);
    comboKey(root, "ArrowDown");
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      ...(mode === "composing" ? { isComposing: true } : { ctrlKey: true }),
    });
    part(root, "control").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(hidden.value).toBe("");
  });
  it("retains composition across unchanged enhancement", () => {
    const { ui } = install();
    const { root, control, hidden } = comboFixture();
    ui.combobox.open(root);
    comboKey(root, "ArrowDown");
    control.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    ui.enhance(root);
    comboKey(root, "Enter");
    expect(hidden.value).toBe("");
    control.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    comboKey(root, "Enter");
    expect(hidden.value).toBe("b");
  });
  it("preserves manual server filtering and handles current loading/minimum length", () => {
    const { ui } = install();
    const { root } = comboFixture();
    root.dataset.filter = "manual";
    root.dataset.minLength = "3";
    selectOption(root, "a").hidden = true;
    ui.enhance(root);
    comboQuery(root, "ab");
    expect(root.dataset.state).toBe("closed");
    expect(selectOption(root, "a").hidden).toBe(true);
    comboQuery(root, "abc");
    expect(root.dataset.state).toBe("open");
    expect(selectOption(root, "b").hidden).toBe(false);
    root.dataset.loading = "true";
    ui.enhance(root);
    expect(part(root, "loading").hidden).toBe(false);
    expect(part(root, "empty").hidden).toBe(true);
  });
  it("keeps generated hidden identity through adoption and explicit root patches", () => {
    const source = install();
    const destination = install(realm());
    const { root, hidden } = comboFixture();
    hidden.remove();
    root.dataset.name = "choice";
    source.ui.enhance(root);
    const generated = required(root.querySelector<HTMLInputElement>('input[data-part="value"]'));
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    expect(root.querySelector('[data-part="value"]')).toBe(generated);
    expect(generated.name).toBe("choice");
    root.dataset.value = "c";
    destination.ui.enhance(root);
    expect(generated.value).toBe("c");
    expect(destination.ui.combobox.query(root)).toBe("Charlie");
  });
  it.each(["hidden", "option", "form"] as const)(
    "sweeps partially acquired listeners when %s registration throws",
    (name) => {
      const { ui } = install();
      const { root, control, hidden, form } = comboFixture();
      const option = selectOption(root, "b");
      const target = name === "hidden" ? hidden : name === "option" ? option : form;
      const firstRemoved = vi.spyOn(control, "removeEventListener");
      const removed = vi.spyOn(target, "removeEventListener");
      const add = target.addEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
        add(...args);
        throw new Error("partial native registration");
      });
      try {
        expect(() => ui.enhance(root)).toThrow("partial native registration");
        expect(firstRemoved).toHaveBeenCalled();
        expect(removed).toHaveBeenCalled();
      } finally {
        vi.restoreAllMocks();
      }
      ui.enhance(root);
      const selected = vi.fn();
      root.addEventListener("jquery-star:combobox:select", selected);
      option.click();
      expect(selected).toHaveBeenCalledOnce();
    },
  );
  it("releases a listener returned after disposal during acquisition", () => {
    const { ui, star } = install();
    const { root, hidden } = comboFixture();
    const add = hidden.addEventListener.bind(hidden);
    const remove = vi.spyOn(hidden, "removeEventListener");
    vi.spyOn(hidden, "addEventListener").mockImplementationOnce((...args) => {
      star.dispose();
      add(...args);
    });
    expect(() => ui.enhance(root)).toThrow();
    expect(remove).toHaveBeenCalled();
  });
  it("sweeps later resources after an earlier removal throws", () => {
    const { ui, star } = install();
    const { root, control, hidden, form } = comboFixture();
    ui.combobox.open(root);
    const remove = control.removeEventListener.bind(control);
    const later = [hidden, form, selectOption(root, "b")].map((target) =>
      vi.spyOn(target, "removeEventListener"),
    );
    vi.spyOn(control, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("native release failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(later.every((spy) => spy.mock.calls.length > 0)).toBe(true);
    expect(part(root, "content").hidden).toBe(true);
  });
  it("preserves destination ownership created during source cleanup", () => {
    const source = install();
    const destination = install(realm());
    const { root, control, hidden } = comboFixture();
    source.ui.combobox.open(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const remove = control.removeEventListener.bind(control);
    vi.spyOn(control, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      destination.ui.enhance(root);
    });
    destination.ui.enhance(root);
    source.star.dispose();
    selectOption(root, "b").click();
    expect(hidden.value).toBe("b");
  });
  it.each(["open", "toggle", "clear"] as const)(
    "stops %s after replacement cleanup disposes the owner",
    (operation) => {
      const { ui, star } = install();
      const { root, control, hidden } = comboFixture();
      ui.enhance(root);
      const content = nativePopup(root);
      ui.combobox.open(root);
      content.hidePopover = () => star.dispose();
      control.replaceWith(control.cloneNode(true));
      const emitted = vi.fn();
      root.addEventListener("jquery-star:combobox:before-open", emitted);
      root.addEventListener("jquery-star:combobox:clear", emitted);
      expect(() => ui.combobox[operation](root)).not.toThrow();
      expect(emitted).not.toHaveBeenCalled();
      expect(hidden.value).toBe("");
    },
  );
  it("keeps source focus/outside-click/viewport handlers off an adopted popup", () => {
    const source = install();
    const destination = install(realm());
    const { root, control } = comboFixture();
    source.ui.combobox.open(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    const measured = vi.spyOn(control, "getBoundingClientRect");
    document.body.dispatchEvent(new Event("focusin", { bubbles: true }));
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    window.dispatchEvent(new Event("resize"));
    expect(root.dataset.state).toBe("open");
    expect(measured).not.toHaveBeenCalled();
    const constructors = destination.owner as Window & typeof globalThis;
    destination.owner.dispatchEvent(new constructors.Event("resize"));
    expect(measured).toHaveBeenCalled();
    destination.owner.document.body.dispatchEvent(
      new constructors.Event("focusin", { bubbles: true }),
    );
    expect(root.dataset.state).toBe("closed");
  });
  it("honors late reset cancellation and pending reset through enhancement", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, form, control, hidden } = comboFixture(window, "a");
    ui.enhance(root);
    ui.combobox.select(root, "b");
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(hidden.value).toBe("b");
    expect(control.value).toBe("Beta");
    form.reset();
    ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(hidden.value).toBe("a");
    expect(control.value).toBe("Alpha");
  });
  it("ignores queued reset after a newer clear", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, form, hidden, control } = comboFixture(window, "a");
    ui.enhance(root);
    ui.combobox.select(root, "b");
    form.reset();
    ui.combobox.clear(root);
    vi.runOnlyPendingTimers();
    expect(hidden.value).toBe("");
    expect(control.value).toBe("");
  });
  it("cancels a reset handle returned after disposal", () => {
    vi.useFakeTimers();
    const { ui, star } = install();
    const { root, form } = comboFixture();
    ui.enhance(root);
    const scheduler: Window = window;
    const schedule = scheduler.setTimeout.bind(scheduler);
    const clear = vi.spyOn(scheduler, "clearTimeout");
    let timer: number | undefined;
    vi.spyOn(scheduler, "setTimeout").mockImplementationOnce((callback, delay, ...args) => {
      star.dispose();
      timer = schedule(callback, delay, ...args);
      return timer;
    });
    form.reset();
    expect(timer).toBeDefined();
    expect(clear).toHaveBeenCalledWith(timer);
  });
});

it("Combobox preserves exploration started by an open callback during ArrowUp", () => {
  const { ui } = install();
  const { root, control } = comboFixture();
  ui.enhance(root);
  root.addEventListener("jquery-star:combobox:open", () => comboKey(root, "ArrowDown"), {
    once: true,
  });
  comboKey(root, "ArrowUp");
  expect(control.getAttribute("aria-activedescendant")).toBe(selectOption(root, "b").id);
});
it.each(["readonly", "fieldset"] as const)(
  "Combobox reflects native query writes when %s",
  (mode) => {
    const { ui } = install();
    const { root, hidden, control, form } = comboFixture();
    ui.combobox.select(root, "a");
    if (mode === "readonly") control.readOnly = true;
    else {
      const fieldset = document.createElement("fieldset");
      fieldset.disabled = true;
      form.append(fieldset);
      fieldset.append(root);
    }
    control.value = "draft";
    control.dispatchEvent(new Event("jquery-star:model-write", { bubbles: true }));
    expect(hidden.value).toBe("");
    expect(control.value).toBe("draft");
    expect(root.dataset.state).toBe("closed");
  },
);
it.each(["before", "after"] as const)(
  "Combobox retains composition with disposal %s adoption acquisition",
  (mode) => {
    const source = install();
    const destination = install(realm());
    const { root, control, hidden } = comboFixture();
    source.ui.combobox.open(root);
    comboKey(root, "ArrowDown");
    control.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (mode === "before") source.star.dispose();
    destination.ui.enhance(root);
    if (mode === "after") source.star.dispose();
    comboKey(root, "Enter");
    expect(hidden.value).toBe("");
    const constructors = destination.owner as Window & typeof globalThis;
    control.dispatchEvent(new constructors.CompositionEvent("compositionend", { bubbles: true }));
    comboKey(root, "Enter");
    expect(hidden.value).toBe("b");
  },
);

function multiDocumentFixture(owner: Window = window) {
  const root = fixture("multi-select", owner);
  const form = owner.document.createElement("form");
  const control = required(root.querySelector("select"));
  control.id = "multi-control";
  control.name = "choices";
  control.required = true;
  control.innerHTML =
    '<option value="a" selected>Alpha</option><option value="b">Beta</option><optgroup label="More"><option value="c">Charlie</option></optgroup>';
  const label = owner.document.createElement("label");
  label.htmlFor = control.id;
  label.textContent = "Choices";
  root.before(form);
  form.append(label, root);
  return { root, form, control, label };
}
function multiKey(root: HTMLElement, key: string, extra: KeyboardEventInit = {}): void {
  const owner = required(root.ownerDocument.defaultView);
  part(root, "content").dispatchEvent(
    new owner.KeyboardEvent("keydown", { key, bubbles: true, ...extra }),
  );
}
function multiValues(control: HTMLSelectElement): string[] {
  return Array.from(control.selectedOptions, (option) => option.value);
}

describe("Multi Select document lifetime", () => {
  it("automatically enhances a foreign listbox", async () => {
    const { ui, star, owner } = install(realm());
    await star.whenEnhanced();
    const { root, control } = multiDocumentFixture(owner);
    await star.whenEnhanced();
    part(root, "trigger").click();
    multiKey(root, "ArrowDown");
    multiKey(root, " ");
    expect(ui.multiSelect.value(root)).toEqual(["a", "b"]);
    expect(multiValues(control)).toEqual(["a", "b"]);
  });
  it.each(["implicit", "explicit"] as const)("runs a foreign %s private action", (mode) => {
    const { ui, jquery, owner } = install(realm());
    const { root } = multiDocumentFixture(owner);
    const button = owner.document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "data-on:click",
      mode === "implicit"
        ? "@ui.multi-select.set(['b'])"
        : "@ui.multi-select.set('#sample', ['b'])",
    );
    root.append(button);
    jquery(root).star();
    button.click();
    expect(ui.multiSelect.value(root)).toEqual(["b"]);
  });
  it.each(["before", "after"] as const)(
    "retains values, defaults and exploration with source disposal %s acquisition",
    (mode) => {
      vi.useFakeTimers();
      const source = install();
      const destination = install(realm());
      const { root, form, control } = multiDocumentFixture();
      source.ui.multiSelect.open(root);
      source.ui.multiSelect.select(root, "b");
      multiKey(root, "ArrowDown");
      const beta = selectOption(root, "b");
      const tag = part(root, "tag");
      const active = part(root, "content").getAttribute("aria-activedescendant");
      destination.owner.document.body.append(destination.owner.document.adoptNode(form));
      if (mode === "before") source.star.dispose();
      destination.ui.enhance(root);
      if (mode === "after") source.star.dispose();
      expect(destination.ui.multiSelect.value(root)).toEqual(["a", "b"]);
      expect(selectOption(root, "b")).toBe(beta);
      expect(part(root, "tag")).toBe(tag);
      expect(root.dataset.state).toBe("open");
      expect(part(root, "content").getAttribute("aria-activedescendant")).toBe(active);
      form.reset();
      destination.ui.enhance(root);
      vi.runOnlyPendingTimers();
      expect(multiValues(control)).toEqual(["a"]);
      expect(destination.ui.multiSelect.value(root)).toEqual(["a"]);
    },
  );
  it.each(["before", "after"] as const)(
    "keeps silent native selection with disposal %s facade acquisition",
    (mode) => {
      const source = install();
      const destination = install(realm());
      const { root, control } = multiDocumentFixture();
      source.ui.enhance(root);
      for (const option of control.options) option.selected = option.value === "c";
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      if (mode === "before") source.star.dispose();
      expect(destination.ui.multiSelect.value(root)).toEqual(["c"]);
      if (mode === "after") source.star.dispose();
      expect(multiValues(control)).toEqual(["c"]);
    },
  );
  it("constructs native and component events in the destination window", () => {
    const source = install();
    const destination = install(realm());
    const { root, control } = multiDocumentFixture();
    source.ui.enhance(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    const native: Event[] = [];
    const component: Event[] = [];
    control.addEventListener("input", (event) => native.push(event));
    control.addEventListener("change", (event) => native.push(event));
    root.addEventListener("jquery-star:multi-select:change", (event) => component.push(event));
    destination.ui.multiSelect.set(root, ["b"]);
    const constructors = destination.owner as Window & typeof globalThis;
    expect(native).toHaveLength(2);
    expect(native.every((event) => event instanceof constructors.Event)).toBe(true);
    expect(component).toHaveLength(1);
    expect(component[0]).toBeInstanceOf(constructors.CustomEvent);
  });
  it("retains exact bindings, generated nodes, exploration and typeahead through enhancement", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, form, control, label } = multiDocumentFixture();
    ui.multiSelect.open(root);
    const option = selectOption(root, "b");
    const tag = part(root, "tag");
    const targets = [
      control,
      form,
      label,
      part(root, "content"),
      part(root, "trigger"),
      part(root, "tags"),
    ];
    const adds = targets.map((target) => vi.spyOn(target, "addEventListener"));
    const removes = targets.map((target) => vi.spyOn(target, "removeEventListener"));
    multiKey(root, "c");
    multiKey(root, "ArrowUp");
    ui.enhance(root);
    expect(part(root, "content").getAttribute("aria-activedescendant")).toBe(option.id);
    multiKey(root, "h");
    expect(part(root, "content").getAttribute("aria-activedescendant")).toBe(
      selectOption(root, "c").id,
    );
    expect(adds.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(removes.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(selectOption(root, "b")).toBe(option);
    expect(part(root, "tag")).toBe(tag);
  });
  it.each(["before-change", "input", "change"] as const)(
    "preserves newer selection during %s",
    (phase) => {
      const { ui } = install();
      const { root, control } = multiDocumentFixture();
      ui.enhance(root);
      const changed: string[][] = [];
      root.addEventListener("jquery-star:multi-select:change", (event) =>
        changed.push((event as CustomEvent<{ value: string[] }>).detail.value),
      );
      (phase === "before-change" ? root : control).addEventListener(
        phase === "before-change" ? "jquery-star:multi-select:before-change" : phase,
        () => ui.multiSelect.set(root, ["c"]),
        { once: true },
      );
      ui.multiSelect.set(root, ["b"]);
      expect(multiValues(control)).toEqual(["c"]);
      expect(changed).toEqual([["c"]]);
      expect(part(root, "status").textContent).toContain("1 option selected");
    },
  );
  it("honors a newer no-op selection during before-change", () => {
    const { ui } = install();
    const { root, control } = multiDocumentFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:multi-select:before-change",
      () => ui.multiSelect.set(root, ["a"]),
      { once: true },
    );
    ui.multiSelect.set(root, ["b"]);
    expect(multiValues(control)).toEqual(["a"]);
  });
  it("reflects a distinct native change during synthetic input", () => {
    const { ui } = install();
    const { root, control } = multiDocumentFixture();
    ui.enhance(root);
    const changed: string[][] = [];
    root.addEventListener("jquery-star:multi-select:change", (event) =>
      changed.push((event as CustomEvent<{ value: string[] }>).detail.value),
    );
    control.addEventListener(
      "input",
      () => {
        for (const option of control.options) option.selected = option.value === "c";
        control.dispatchEvent(new Event("change", { bubbles: true }));
      },
      { once: true },
    );
    ui.multiSelect.set(root, ["b"]);
    expect(ui.multiSelect.value(root)).toEqual(["c"]);
    expect(changed).toEqual([["c"]]);
  });
  it.each([
    "disabled",
    "fieldset",
    "option",
    "group",
    "max",
    "label",
    "value",
    "remove",
    "control",
    "content",
    "native",
  ] as const)("stops selection after %s changes in before-change", (mode) => {
    const { ui } = install();
    const { root, control, form } = multiDocumentFixture();
    ui.enhance(root);
    root.addEventListener(
      "jquery-star:multi-select:before-change",
      () => {
        if (mode === "disabled") control.disabled = true;
        else if (mode === "fieldset") {
          const fieldset = document.createElement("fieldset");
          fieldset.disabled = true;
          form.append(fieldset);
          fieldset.append(root);
        } else if (mode === "option") required(control.options[1]).disabled = true;
        else if (mode === "group") required(control.querySelector("optgroup")).disabled = true;
        else if (mode === "max") root.dataset.max = "1";
        else if (mode === "label") required(control.options[1]).label = "Changed";
        else if (mode === "value") required(control.options[1]).value = "changed";
        else if (mode === "remove") required(control.options[1]).remove();
        else if (mode === "control") control.replaceWith(control.cloneNode(true));
        else if (mode === "content")
          part(root, "content").replaceWith(part(root, "content").cloneNode(true));
        else for (const option of control.options) option.selected = option.value === "c";
      },
      { once: true },
    );
    ui.multiSelect.set(root, ["b", "c"]);
    expect(multiValues(control)).toEqual(mode === "native" ? ["c"] : ["a"]);
  });
  it.each(["set", "select", "clear"] as const)(
    "prevents %s through a disabled fieldset",
    (operation) => {
      const { ui } = install();
      const { root, control, form } = multiDocumentFixture();
      const fieldset = document.createElement("fieldset");
      fieldset.disabled = true;
      form.append(fieldset);
      fieldset.append(root);
      ui.enhance(root);
      if (operation === "set") ui.multiSelect.set(root, ["b"]);
      else if (operation === "select") ui.multiSelect.select(root, "b");
      else ui.multiSelect.clear(root);
      expect(multiValues(control)).toEqual(["a"]);
      expect((part(root, "trigger") as HTMLButtonElement).disabled).toBe(true);
      expect((part(root, "remove") as HTMLButtonElement).disabled).toBe(true);
    },
  );
  it.each(["select", "clear", "set", "tag", "all"] as const)(
    "retains a disabled preselected option during %s",
    (operation) => {
      const { ui } = install();
      const { root, control, form } = multiDocumentFixture();
      required(control.options[0]).disabled = true;
      root.dataset.max = "2";
      ui.multiSelect.open(root);
      if (operation === "select") ui.multiSelect.select(root, "b");
      else if (operation === "clear") ui.multiSelect.clear(root);
      else if (operation === "set") ui.multiSelect.set(root, ["b"]);
      else if (operation === "tag") part(root, "remove").click();
      else multiKey(root, "a", { ctrlKey: true });
      const expected = ["select", "set", "all"].includes(operation) ? ["a", "b"] : ["a"];
      expect(multiValues(control)).toEqual(expected);
      expect(control.form).toBe(form);
      expect((part(root, "remove") as HTMLButtonElement).disabled).toBe(true);
      if (operation === "all") {
        multiKey(root, "a", { metaKey: true });
        expect(multiValues(control)).toEqual(["a"]);
      }
    },
  );
  it("lets a required native selection clear and report native invalidity", () => {
    const { ui } = install();
    const { root, control, form } = multiDocumentFixture();
    ui.multiSelect.clear(root);
    expect(multiValues(control)).toEqual([]);
    expect(control.validity.valueMissing).toBe(true);
    expect(new FormData(form).getAll("choices")).toEqual([]);
  });
  it("accepts authoritative native and JSON changes to disabled selected values", () => {
    const { ui } = install();
    const { root, control } = multiDocumentFixture();
    required(control.options[0]).disabled = true;
    ui.enhance(root);
    root.dataset.value = '["b"]';
    ui.enhance(root);
    expect(multiValues(control)).toEqual(["b"]);
    required(control.options[0]).selected = true;
    control.dispatchEvent(new Event("jquery-star:model-write", { bubbles: true }));
    expect(ui.multiSelect.value(root)).toEqual(["a", "b"]);
  });
  it.each(["before-open", "before-close", "change"] as const)(
    "honors newer popup intent in %s",
    (phase) => {
      const { ui } = install();
      const { root } = multiDocumentFixture();
      ui.enhance(root);
      if (phase !== "before-open") ui.multiSelect.open(root);
      root.addEventListener(
        `jquery-star:multi-select:${phase}`,
        () => (phase === "before-open" ? ui.multiSelect.close(root) : ui.multiSelect.open(root)),
        { once: true },
      );
      if (phase === "before-open") ui.multiSelect.open(root);
      else if (phase === "before-close") ui.multiSelect.close(root);
      else ui.multiSelect.set(root, ["b"]);
      expect(root.dataset.state).toBe(phase === "before-open" ? "selected" : "open");
    },
  );
  it.each(["cancel", "newer"] as const)("honors %s sibling popup intent", (mode) => {
    const { ui } = install();
    const first = multiDocumentFixture();
    const second = multiDocumentFixture();
    const third = multiDocumentFixture();
    ui.multiSelect.open(first.root);
    first.root.addEventListener(
      "jquery-star:multi-select:before-close",
      (event) => {
        if (mode === "cancel") event.preventDefault();
        else ui.multiSelect.open(third.root);
      },
      { once: true },
    );
    ui.multiSelect.open(second.root);
    expect(second.root.dataset.state).toBe("selected");
    expect((mode === "cancel" ? first : third).root.dataset.state).toBe("open");
  });
  it.each(["show", "hide"] as const)("reconciles native %s completion", (mode) => {
    const { ui } = install();
    const { root } = multiDocumentFixture();
    ui.enhance(root);
    const content = nativePopup(root);
    if (mode === "hide") ui.multiSelect.open(root);
    if (mode === "show")
      content.showPopover = () => {
        ui.multiSelect.close(root);
        content.hidden = false;
      };
    else
      content.hidePopover = () => {
        ui.multiSelect.open(root);
        content.hidden = true;
      };
    if (mode === "show") ui.multiSelect.open(root);
    else ui.multiSelect.close(root);
    expect(root.dataset.state).toBe(mode === "show" ? "selected" : "open");
    expect(content.hidden).toBe(mode === "show");
    content.showPopover = () => {
      content.hidden = false;
    };
    content.hidePopover = () => {
      content.hidden = true;
    };
  });
  it.each(["preserved", "canceled"] as const)("reconciles a %s native popup", (mode) => {
    const { ui } = install();
    const { root } = multiDocumentFixture();
    ui.enhance(root);
    const content = nativePopup(root);
    let visible = false;
    const matches = content.matches.bind(content);
    vi.spyOn(content, "matches").mockImplementation((selector) =>
      selector === ":popover-open" ? visible : matches(selector),
    );
    content.showPopover = () => {
      if (mode === "preserved") visible = true;
    };
    content.hidePopover = () => {
      visible = false;
    };
    const opened = vi.fn();
    root.addEventListener("jquery-star:multi-select:open", opened);
    ui.multiSelect.open(root);
    if (mode === "preserved") {
      multiKey(root, "ArrowDown");
      visible = false;
      ui.enhance(root);
      expect(visible).toBe(true);
      expect(content.getAttribute("aria-activedescendant")).toBe(selectOption(root, "b").id);
      expect(opened).toHaveBeenCalledOnce();
    } else {
      expect(root.dataset.state).toBe("selected");
      expect(opened).not.toHaveBeenCalled();
    }
  });
  it("stops geometry after measurement disposes the owner", () => {
    const { ui, star } = install();
    const { root } = multiDocumentFixture();
    ui.enhance(root);
    const content = part(root, "content");
    vi.spyOn(content, "getBoundingClientRect").mockImplementation(() => {
      star.dispose();
      return new DOMRect(0, 0, 100, 100);
    });
    ui.multiSelect.open(root);
    expect(content.style.left).toBe("");
    expect(content.style.top).toBe("");
  });
  it.each(["composing", "modified", "input", "nested"] as const)(
    "keeps %s keyboard work native",
    (mode) => {
      const { ui } = install();
      const { root, control } = multiDocumentFixture();
      ui.multiSelect.open(root);
      multiKey(root, "ArrowDown");
      let target = part(root, "content");
      if (mode === "input") {
        target = document.createElement("input");
        part(root, "content").append(target);
      }
      if (mode === "nested") {
        target = document.createElement("div");
        target.dataset.jqs = "multi-select";
        target.innerHTML = '<select multiple data-part="control"></select>';
        part(root, "content").append(target);
      }
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
        isComposing: mode === "composing",
        ctrlKey: mode === "modified",
      });
      target.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(multiValues(control)).toEqual(["a"]);
    },
  );
  it.each(["option", "remove"] as const)("ignores a nested controller's delegated %s", (mode) => {
    const { ui } = install();
    const { root, control } = multiDocumentFixture();
    ui.multiSelect.open(root);
    const nested = document.createElement("section");
    nested.dataset.jqs = "multi-select";
    nested.innerHTML = `<select multiple data-part="control"></select><button type="button" data-part="${mode}" data-value="${mode === "option" ? "b" : "a"}">Nested</button>`;
    part(root, mode === "option" ? "content" : "tags").append(nested);
    required(nested.querySelector("button")).click();
    expect(multiValues(control)).toEqual(["a"]);
    nested.remove();
  });
  it("refreshes generated labels and preserves authored accessible names", () => {
    const { ui } = install();
    const { root, control, label } = multiDocumentFixture();
    ui.enhance(root);
    label.remove();
    control.setAttribute("aria-label", "Current fallback");
    ui.enhance(root);
    expect(part(root, "trigger").hasAttribute("aria-labelledby")).toBe(false);
    expect(part(root, "trigger").getAttribute("aria-label")).toBe("Current fallback");
    part(root, "trigger").setAttribute("aria-label", "Authored trigger");
    control.setAttribute("aria-label", "New fallback");
    ui.enhance(root);
    expect(part(root, "trigger").getAttribute("aria-label")).toBe("Authored trigger");
    expect(part(root, "content").getAttribute("aria-label")).toBe("New fallback");
  });
  it("renders empty and renamed native optgroups", () => {
    const { ui } = install();
    const { root, control } = multiDocumentFixture();
    ui.enhance(root);
    const group = document.createElement("optgroup");
    group.label = "Empty group";
    control.append(group);
    ui.enhance(root);
    expect(part(root, "content").textContent).toContain("Empty group");
    group.label = "Renamed empty";
    ui.enhance(root);
    expect(part(root, "content").textContent).toContain("Renamed empty");
  });
  it.each(["content", "control", "form", "label"] as const)(
    "sweeps partial %s acquisition",
    (name) => {
      const { ui } = install();
      const { root, control, form, label } = multiDocumentFixture();
      const content = document.createElement("div");
      content.dataset.part = "content";
      root.append(content);
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.dataset.part = "trigger";
      root.append(trigger);
      const target =
        name === "content"
          ? content
          : name === "control"
            ? control
            : name === "form"
              ? form
              : label;
      const firstRemoved = vi.spyOn(trigger, "removeEventListener");
      const removed = vi.spyOn(target, "removeEventListener");
      const add = target.addEventListener.bind(target);
      vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
        add(...args);
        throw new Error("partial registration");
      });
      try {
        expect(() => ui.enhance(root)).toThrow("partial registration");
        expect(firstRemoved).toHaveBeenCalled();
        expect(removed).toHaveBeenCalled();
      } finally {
        vi.restoreAllMocks();
      }
      ui.enhance(root);
      const changed = vi.fn();
      root.addEventListener("jquery-star:multi-select:change", changed);
      selectOption(root, "b").click();
      expect(changed).toHaveBeenCalledOnce();
    },
  );
  it("releases a listener returned after acquisition disposal", () => {
    const { ui, star } = install();
    const { root, control } = multiDocumentFixture();
    const add = control.addEventListener.bind(control);
    const remove = vi.spyOn(control, "removeEventListener");
    vi.spyOn(control, "addEventListener").mockImplementationOnce((...args) => {
      star.dispose();
      add(...args);
    });
    expect(() => ui.enhance(root)).toThrow();
    expect(remove).toHaveBeenCalled();
  });
  it("sweeps later cleanup after a native removal throws", () => {
    const { ui, star } = install();
    const { root, control, form, label } = multiDocumentFixture();
    ui.multiSelect.open(root);
    const trigger = part(root, "trigger");
    const remove = trigger.removeEventListener.bind(trigger);
    const later = [control, form, label, part(root, "content")].map((target) =>
      vi.spyOn(target, "removeEventListener"),
    );
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("release failed");
    });
    failedDisposals.add(star);
    expect(() => star.dispose()).toThrow();
    expect(later.every((spy) => spy.mock.calls.length > 0)).toBe(true);
    expect(part(root, "content").hidden).toBe(true);
  });
  it("retains destination ownership acquired during source cleanup", () => {
    const source = install();
    const destination = install(realm());
    const { root, control } = multiDocumentFixture();
    source.ui.multiSelect.open(root);
    const trigger = part(root, "trigger");
    const remove = trigger.removeEventListener.bind(trigger);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    vi.spyOn(trigger, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      destination.ui.enhance(root);
    });
    destination.ui.enhance(root);
    source.star.dispose();
    selectOption(root, "b").click();
    expect(multiValues(control)).toEqual(["a", "b"]);
  });
  it.each(["open", "toggle", "clear", "set"] as const)(
    "stops %s after replacement cleanup disposes the owner",
    (operation) => {
      const { ui, star } = install();
      const { root, control } = multiDocumentFixture();
      ui.multiSelect.open(root);
      const content = nativePopup(root);
      content.hidePopover = () => star.dispose();
      control.replaceWith(control.cloneNode(true));
      const emitted = vi.fn();
      root.addEventListener("jquery-star:multi-select:before-open", emitted);
      root.addEventListener("jquery-star:multi-select:before-change", emitted);
      expect(() =>
        operation === "set" ? ui.multiSelect.set(root, ["b"]) : ui.multiSelect[operation](root),
      ).not.toThrow();
      expect(emitted).not.toHaveBeenCalled();
    },
  );
  it("isolates source outside/viewport handlers from an adopted popup", () => {
    const source = install();
    const destination = install(realm());
    const { root } = multiDocumentFixture();
    source.ui.multiSelect.open(root);
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    const measure = vi.spyOn(part(root, "trigger"), "getBoundingClientRect");
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    window.dispatchEvent(new Event("resize"));
    expect(root.dataset.state).toBe("open");
    expect(measure).not.toHaveBeenCalled();
    const constructors = destination.owner as Window & typeof globalThis;
    destination.owner.dispatchEvent(new constructors.Event("resize"));
    expect(measure).toHaveBeenCalled();
    destination.owner.document.body.dispatchEvent(
      new constructors.Event("pointerdown", { bubbles: true }),
    );
    expect(root.dataset.state).toBe("selected");
  });
  it("honors late reset cancellation and current reset through enhancement", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, control, form } = multiDocumentFixture();
    ui.multiSelect.set(root, ["b"]);
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(ui.multiSelect.value(root)).toEqual(["b"]);
    const changed = vi.fn();
    root.addEventListener("jquery-star:multi-select:change", changed);
    form.reset();
    ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(multiValues(control)).toEqual(["a"]);
    expect(ui.multiSelect.value(root)).toEqual(["a"]);
    expect(changed).toHaveBeenCalledOnce();
  });
  it("stops queued reset notifications after a newer clear", () => {
    vi.useFakeTimers();
    const { ui } = install();
    const { root, form } = multiDocumentFixture();
    ui.multiSelect.set(root, ["b"]);
    form.reset();
    ui.multiSelect.clear(root);
    const changed = vi.fn();
    root.addEventListener("jquery-star:multi-select:change", changed);
    vi.runOnlyPendingTimers();
    expect(ui.multiSelect.value(root)).toEqual([]);
    expect(changed).not.toHaveBeenCalled();
  });
  it.each(["reset", "typeahead"] as const)("cancels a %s timer returned after disposal", (mode) => {
    vi.useFakeTimers();
    const { ui, star } = install();
    const { root, form } = multiDocumentFixture();
    ui.multiSelect.open(root);
    const scheduler: Window = window;
    const schedule = scheduler.setTimeout.bind(scheduler);
    const clear = vi.spyOn(scheduler, "clearTimeout");
    let timer: number | undefined;
    vi.spyOn(scheduler, "setTimeout").mockImplementationOnce((callback, delay, ...args) => {
      star.dispose();
      timer = schedule(callback, delay, ...args);
      return timer;
    });
    if (mode === "reset") form.reset();
    else multiKey(root, "b");
    expect(timer).toBeDefined();
    expect(clear).toHaveBeenCalledWith(timer);
  });
});

it("Multi Select stops typeahead continuation after its timer starts newer work", () => {
  vi.useFakeTimers();
  const { ui } = install();
  const { root } = multiDocumentFixture();
  ui.multiSelect.open(root);
  const scheduler: Window = window;
  const schedule = scheduler.setTimeout.bind(scheduler);
  vi.spyOn(scheduler, "setTimeout").mockImplementationOnce((callback, delay, ...args) => {
    multiKey(root, "End");
    return schedule(callback, delay, ...args);
  });
  multiKey(root, "b");
  expect(part(root, "content").getAttribute("aria-activedescendant")).toBe(
    selectOption(root, "c").id,
  );
});
it.each(["disabled", "max"] as const)(
  "Multi Select stops notifications when input changes %s",
  (mode) => {
    const { ui } = install();
    const { root, control } = multiDocumentFixture();
    ui.enhance(root);
    control.addEventListener(
      "input",
      () => {
        if (mode === "disabled") control.disabled = true;
        else root.dataset.max = "1";
      },
      { once: true },
    );
    const native = vi.fn();
    const changed = vi.fn();
    control.addEventListener("change", native);
    root.addEventListener("jquery-star:multi-select:change", changed);
    ui.multiSelect.set(root, ["b", "c"]);
    expect(multiValues(control)).toEqual(["b", "c"]);
    expect(native).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
  },
);
it.each(["before", "after"] as const)(
  "Multi Select retains typeahead with disposal %s acquisition",
  (mode) => {
    vi.useFakeTimers();
    const source = install();
    const destination = install(realm());
    const { root } = multiDocumentFixture();
    source.ui.multiSelect.open(root);
    multiKey(root, "c");
    multiKey(root, "ArrowUp");
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (mode === "before") source.star.dispose();
    destination.ui.enhance(root);
    if (mode === "after") source.star.dispose();
    multiKey(root, "h");
    expect(part(root, "content").getAttribute("aria-activedescendant")).toBe(
      selectOption(root, "c").id,
    );
  },
);
