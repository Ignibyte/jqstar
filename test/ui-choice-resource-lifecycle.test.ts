import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { withStarDOMRealm } from "../src/testing";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const modes = ["render", "native", "dispose", "preserve"] as const;
const kinds = ["colorPicker", "timePicker"] as const;
type Kind = (typeof kinds)[number];
let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});

afterEach(() => {
  star.dispose();
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function fixture(kind: Kind, owner = document) {
  const form = owner.createElement("form");
  const root = owner.createElement("div");
  const name = kind === "colorPicker" ? "color-picker" : "time-picker";
  const initial = kind === "colorPicker" ? "#112233" : "09:00";
  const next = kind === "colorPicker" ? "#445566" : "10:00";
  root.dataset.jqs = name;
  root.innerHTML =
    kind === "colorPicker"
      ? `<input data-part="control" type="color" value="${initial}"><input data-part="value"><button data-part="swatch" data-value="${next}">Next</button><p data-part="status"></p>`
      : `<input data-part="control" type="time" value="${initial}"><button data-part="decrement">Earlier</button><button data-part="increment">Later</button><button data-part="preset" data-value="${next}">Next</button><p data-part="status"></p>`;
  form.append(root);
  owner.body.append(form);
  const control = root.querySelector<HTMLInputElement>('[data-part="control"]');
  const button = root.querySelector<HTMLButtonElement>(
    '[data-part="swatch"], [data-part="preset"]',
  );
  if (!control || !button) throw new Error("Missing picker fixture.");
  return { root, form, control, button, name, initial, next };
}

async function boundary(root: HTMLElement, mode: (typeof modes)[number]) {
  if (mode === "dispose") star.dispose();
  else if (mode === "native") {
    root.remove();
    await star.whenEnhanced();
  } else {
    const render = createRenderAdapter(installed).begin(
      document.body,
      mode === "preserve" ? { preserveRoots: [root] } : {},
    );
    render.beforeRemove(root);
    ui.enhance(document);
    return async () => {
      if (mode === "render") root.remove();
      await render.commit();
    };
  }
  return undefined;
}

for (const kind of kinds) {
  it.each(modes)(`${kind} releases native bindings across %s`, async (mode) => {
    const { root, button, control, initial, next, name } = fixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${name}:change`, changed);
    const finish = await boundary(root, mode);
    button.click();
    expect(changed).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
    expect(control.value).toBe(mode === "preserve" ? next : initial);
    control.value = next;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.dataset.value).toBe(mode === "preserve" ? next : initial);
    await finish?.();
  });

  it.each(modes)(`${kind} cancels pending native reset work across %s`, async (mode) => {
    const { root, form, next, name } = fixture(kind);
    ui[kind].set(root, next);
    await star.whenEnhanced();
    const scheduled = vi.spyOn(window as Window, "setTimeout");
    const cleared = vi.spyOn(window as Window, "clearTimeout");
    form.reset();
    const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 0);
    expect(index).toBeGreaterThanOrEqual(0);
    const timer = scheduled.mock.results[index]?.value;
    const callback = scheduled.mock.calls[index]?.[0];
    const finish = await boundary(root, mode);
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${name}:change`, changed);
    const prior = root.outerHTML;
    if (mode !== "preserve") {
      expect(cleared).toHaveBeenCalledWith(timer);
      if (typeof callback === "function") callback();
      vi.runOnlyPendingTimers();
      expect(root.outerHTML).toBe(prior);
      expect(changed).not.toHaveBeenCalled();
    }
    await finish?.();
  });

  it(`${kind} reacquires one native binding after removal`, async () => {
    const { root, form, button, name } = fixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    root.remove();
    await star.whenEnhanced();
    form.append(root);
    ui.enhance(root);
    ui.enhance(root);
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${name}:change`, changed);
    button.click();
    expect(changed).toHaveBeenCalledOnce();
  });

  it.each(["before-change", "input", "change"] as const)(
    `${kind} stops after disposal from %s`,
    (phase) => {
      const { root, control, initial, next, name } = fixture(kind);
      ui.enhance(root);
      const component = vi.fn();
      const nativeChange = vi.fn();
      root.addEventListener(`jquery-star:${name}:change`, component);
      control.addEventListener("change", nativeChange);
      const target = phase === "before-change" ? root : control;
      target.addEventListener(
        phase === "before-change" ? `jquery-star:${name}:before-change` : phase,
        () => star.dispose(),
      );
      ui[kind].set(root, next);
      expect(component).not.toHaveBeenCalled();
      expect(nativeChange).toHaveBeenCalledTimes(phase === "change" ? 1 : 0);
      expect(control.value).toBe(phase === "before-change" ? initial : next);
    },
  );

  it.each(["replacement", "reassociation", "removal", "canceled"] as const)(
    `${kind} ignores reset after %s`,
    async (mode) => {
      const { root, form, control, next, name } = fixture(kind);
      ui[kind].set(root, next);
      await star.whenEnhanced();
      if (mode === "canceled") form.addEventListener("reset", (event) => event.preventDefault());
      form.reset();
      if (mode === "replacement") {
        control.replaceWith(control.cloneNode(true));
        ui.enhance(root);
        ui[kind].set(root, next);
      } else if (mode === "reassociation") {
        const current = document.createElement("form");
        document.body.append(current);
        current.append(root);
        ui.enhance(root);
        ui[kind].set(root, next);
      } else if (mode === "removal") control.remove();
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${name}:change`, changed);
      const prior = root.outerHTML;
      vi.runOnlyPendingTimers();
      expect(root.outerHTML).toBe(prior);
      expect(changed).not.toHaveBeenCalled();
    },
  );

  it(`${kind} preserves a pending current reset through unchanged enhancement`, async () => {
    const { root, form, control, next, initial } = fixture(kind);
    ui[kind].set(root, next);
    await star.whenEnhanced();
    form.reset();
    ui.enhance(root);
    vi.runOnlyPendingTimers();
    expect(control.value).toBe(initial);
    expect(root.dataset.value).toBe(initial);
  });

  it(`${kind} cancels reset timers in the original document`, async () => {
    const frames = [document.createElement("iframe"), document.createElement("iframe")];
    document.body.append(...frames);
    const owners: Array<ReturnType<typeof installStarCore>["star"]> = [];
    const pending: Array<Map<number, () => void>> = [];
    try {
      for (const frame of frames) {
        const owner = frame.contentWindow as Window & typeof globalThis;
        const jquery = jQueryFactory(owner);
        const timers = new Map<number, () => void>();
        pending.push(timers);
        await withStarDOMRealm({ window: owner, jQuery: jquery }, () => {
          const local = installStarCore(jquery, { document: owner.document }).star;
          owners.push(local);
          const localUI = local.use(uiPlugin);
          const { root, form, next } = fixture(kind, owner.document);
          localUI[kind].set(root, next);
          vi.spyOn(owner as Window, "setTimeout").mockImplementation((callback) => {
            timers.set(100, callback as () => void);
            return 100;
          });
          vi.spyOn(owner as Window, "clearTimeout").mockImplementation((id) => {
            if (id !== undefined) timers.delete(id);
          });
          form.reset();
        });
        expect(timers.size).toBe(1);
      }
      owners[0]?.dispose();
      expect(pending.map((timers) => timers.size)).toEqual([0, 1]);
      owners[1]?.dispose();
      expect(pending.map((timers) => timers.size)).toEqual([0, 0]);
    } finally {
      owners.forEach((owner) => owner.dispose());
      frames.forEach((frame) => frame.remove());
    }
  });
}

function multiFixture(owner = document) {
  const form = owner.createElement("form");
  form.innerHTML =
    '<label for="owned-multi">Choices</label><div data-jqs="multi-select"><select id="owned-multi" data-part="control" multiple name="choice"><option value="a" selected>Alpha</option><option value="b">Beta</option></select></div>';
  owner.body.append(form);
  const root = form.querySelector<HTMLElement>('[data-jqs="multi-select"]');
  const control = form.querySelector("select");
  const label = form.querySelector("label");
  if (!root || !control || !label) throw new Error("Missing Multi Select fixture.");
  return { root, form, control, label };
}

function part(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!found) throw new Error(`Missing choice part: ${name}`);
  return found;
}

it.each(modes)("Multi Select owns native, label and panel work across %s", async (mode) => {
  const { root, control, label } = multiFixture();
  ui.multiSelect.open(root);
  await star.whenEnhanced();
  const trigger = part(root, "trigger");
  const content = part(root, "content");
  const focused = vi.spyOn(trigger, "focus");
  const changed = vi.fn();
  root.addEventListener("jquery-star:multi-select:change", changed);
  const finish = await boundary(root, mode);
  expect(content.hidden).toBe(mode !== "preserve");
  expect(root.dataset.state).toBe(mode === "preserve" ? "open" : "selected");
  label.click();
  expect(focused).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
  const option = root.querySelector<HTMLElement>('[data-part="option"][data-value="b"]');
  if (!option) throw new Error("Missing choice option.");
  option.click();
  expect(changed).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
  expect([...control.selectedOptions].map((item) => item.value)).toEqual(
    mode === "preserve" ? ["a", "b"] : ["a"],
  );
  await finish?.();
});

it.each(modes)("Multi Select owns pending reset across %s", async (mode) => {
  const { root, form } = multiFixture();
  ui.multiSelect.set(root, ["b"]);
  await star.whenEnhanced();
  const scheduled = vi.spyOn(window as Window, "setTimeout");
  const cleared = vi.spyOn(window as Window, "clearTimeout");
  form.reset();
  const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 0);
  expect(index).toBeGreaterThanOrEqual(0);
  const timer = scheduled.mock.results[index]?.value;
  const callback = scheduled.mock.calls[index]?.[0];
  const finish = await boundary(root, mode);
  const changed = vi.fn();
  root.addEventListener("jquery-star:multi-select:change", changed);
  const prior = root.outerHTML;
  if (mode !== "preserve") {
    expect(cleared).toHaveBeenCalledWith(timer);
    if (typeof callback === "function") callback();
    vi.runOnlyPendingTimers();
    expect(root.outerHTML).toBe(prior);
    expect(changed).not.toHaveBeenCalled();
  }
  await finish?.();
});

it("Multi Select retains pending reset through unchanged enhancement and acquires one binding", async () => {
  const { root, form } = multiFixture();
  ui.multiSelect.set(root, ["b"]);
  await star.whenEnhanced();
  const scheduled = vi.spyOn(window as Window, "setTimeout");
  const cleared = vi.spyOn(window as Window, "clearTimeout");
  form.reset();
  const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 0);
  const timer = scheduled.mock.results[index]?.value;
  ui.enhance(root);
  expect(cleared).not.toHaveBeenCalledWith(timer);
  vi.runOnlyPendingTimers();
  expect(ui.multiSelect.value(root)).toEqual(["a"]);
  root.remove();
  await star.whenEnhanced();
  form.append(root);
  ui.enhance(root);
  ui.enhance(root);
  const opened = vi.fn();
  root.addEventListener("jquery-star:multi-select:open", opened);
  part(root, "trigger").click();
  expect(opened).toHaveBeenCalledOnce();
  expect(root.dataset.state).toBe("open");
});

it.each(["before-change", "input", "change"] as const)(
  "Multi Select stops after disposal from %s",
  (phase) => {
    const { root, control } = multiFixture();
    ui.enhance(root);
    const component = vi.fn();
    const nativeChange = vi.fn();
    root.addEventListener("jquery-star:multi-select:change", component);
    control.addEventListener("change", nativeChange);
    const target = phase === "before-change" ? root : control;
    target.addEventListener(
      phase === "before-change" ? "jquery-star:multi-select:before-change" : phase,
      () => star.dispose(),
    );
    ui.multiSelect.set(root, ["b"]);
    expect(component).not.toHaveBeenCalled();
    expect(nativeChange).toHaveBeenCalledTimes(phase === "change" ? 1 : 0);
    expect([...control.selectedOptions].map((option) => option.value)).toEqual(
      phase === "before-change" ? ["a"] : ["b"],
    );
  },
);

it.each(["before-open", "before-close", "focus-open", "focus-close"] as const)(
  "Multi Select stops after %s disposal",
  (phase) => {
    const { root } = multiFixture();
    ui.enhance(root);
    const open = phase.endsWith("open");
    if (!open) ui.multiSelect.open(root);
    const content = part(root, "content");
    const trigger = part(root, "trigger");
    if (phase.startsWith("focus"))
      (open ? content : trigger).addEventListener("focus", () => star.dispose());
    else root.addEventListener(`jquery-star:multi-select:${phase}`, () => star.dispose());
    const emitted = vi.fn();
    root.addEventListener(`jquery-star:multi-select:${open ? "open" : "close"}`, emitted);
    ui.multiSelect[open ? "open" : "close"](root);
    expect(emitted).not.toHaveBeenCalled();
    expect(content.hidden).toBe(true);
  },
);

it.each(["showPopover", "hidePopover"] as const)(
  "Multi Select stops after native %s disposal",
  (operation) => {
    const { root } = multiFixture();
    ui.enhance(root);
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
    if (operation === "hidePopover") ui.multiSelect.open(root);
    content[operation] = () => {
      star.dispose();
      content.hidden = operation !== "showPopover";
    };
    const emitted = vi.fn();
    root.addEventListener(
      `jquery-star:multi-select:${operation === "showPopover" ? "open" : "close"}`,
      emitted,
    );
    ui.multiSelect[operation === "showPopover" ? "open" : "close"](root);
    expect(emitted).not.toHaveBeenCalled();
    expect(content.hidden).toBe(true);
  },
);

it("Multi Select releases typeahead timers and stops opening after scroll disposal", () => {
  const { root } = multiFixture();
  ui.multiSelect.open(root);
  const content = part(root, "content");
  const scheduled = vi.spyOn(window as Window, "setTimeout");
  const cleared = vi.spyOn(window as Window, "clearTimeout");
  content.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
  const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 500);
  expect(index).toBeGreaterThanOrEqual(0);
  const timer = scheduled.mock.results[index]?.value;
  star.dispose();
  expect(cleared).toHaveBeenCalledWith(timer);
});

it("Multi Select stops a click continuation after scrolling disposes its owner", () => {
  const { root, control } = multiFixture();
  ui.multiSelect.open(root);
  const option = root.querySelector<HTMLElement>('[data-part="option"][data-value="b"]');
  if (!option) throw new Error("Missing Beta.");
  option.scrollIntoView = () => star.dispose();
  const changed = vi.fn();
  root.addEventListener("jquery-star:multi-select:change", changed);
  option.click();
  expect(changed).not.toHaveBeenCalled();
  expect([...control.selectedOptions].map((item) => item.value)).toEqual(["a"]);
});

it("Multi Select keeps open siblings and reset timers isolated between documents", async () => {
  const frames = [document.createElement("iframe"), document.createElement("iframe")];
  document.body.append(...frames);
  const owners: Array<ReturnType<typeof installStarCore>["star"]> = [];
  const roots: HTMLElement[] = [];
  const pending: Array<Map<number, () => void>> = [];
  try {
    for (const frame of frames) {
      const owner = frame.contentWindow as Window & typeof globalThis;
      const jquery = jQueryFactory(owner);
      const timers = new Map<number, () => void>();
      pending.push(timers);
      await withStarDOMRealm({ window: owner, jQuery: jquery }, () => {
        const local = installStarCore(jquery, { document: owner.document }).star;
        owners.push(local);
        const localUI = local.use(uiPlugin);
        const { root, form } = multiFixture(owner.document);
        roots.push(root);
        localUI.multiSelect.open(root);
        vi.spyOn(owner as Window, "setTimeout").mockImplementation((callback) => {
          timers.set(100, callback as () => void);
          return 100;
        });
        vi.spyOn(owner as Window, "clearTimeout").mockImplementation((id) => {
          if (id !== undefined) timers.delete(id);
        });
        form.reset();
      });
    }
    expect(roots.map((root) => root.dataset.state)).toEqual(["open", "open"]);
    owners[0]?.dispose();
    expect(pending.map((timers) => timers.size)).toEqual([0, 1]);
    expect(roots[1]?.dataset.state).toBe("open");
  } finally {
    owners.forEach((owner) => owner.dispose());
    frames.forEach((frame) => frame.remove());
  }
});

function popupFixture(kind: "select" | "combobox") {
  const form = document.createElement("form");
  form.innerHTML = `<label for="owned-${kind}">Choices</label><div data-jqs="${kind}">${
    kind === "select"
      ? '<select data-part="control"><option value="a" selected>Alpha</option><option value="b">Beta</option></select>'
      : '<input data-part="control"><input data-part="value" type="hidden" value="a"><div data-part="content"><div data-part="option" data-value="a">Alpha</div><div data-part="option" data-value="b">Beta</div></div>'
  }</div>`;
  document.body.append(form);
  const root = form.querySelector<HTMLElement>("[data-jqs]");
  if (!root) throw new Error("Missing popup root.");
  const control = part(root, "control") as HTMLInputElement | HTMLSelectElement;
  control.id = `owned-${kind}`;
  ui.enhance(root);
  return {
    root,
    form,
    control,
    valueControl: kind === "select" ? control : (part(root, "value") as HTMLInputElement),
  };
}

for (const kind of ["select", "combobox"] as const) {
  it.each(modes)(`${kind} owns option listeners and panel state across %s`, async (mode) => {
    const { root, control } = popupFixture(kind);
    if (kind === "combobox") control.value = "";
    ui[kind].open(root);
    await star.whenEnhanced();
    const content = part(root, "content");
    const option = content.querySelector<HTMLElement>('[data-value="b"]');
    if (!option) throw new Error("Missing Beta option.");
    const selected = vi.fn();
    root.addEventListener(
      `jquery-star:${kind}:${kind === "select" ? "change" : "select"}`,
      selected,
    );
    const finish = await boundary(root, mode);
    expect(content.hidden).toBe(mode !== "preserve");
    option.click();
    expect(selected).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
    await finish?.();
  });

  it.each(modes)(`${kind} owns pending reset across %s`, async (mode) => {
    const { root, form } = popupFixture(kind);
    ui[kind].select(root, "b");
    await star.whenEnhanced();
    const scheduled = vi.spyOn(window as Window, "setTimeout");
    const cleared = vi.spyOn(window as Window, "clearTimeout");
    form.reset();
    const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 0);
    expect(index).toBeGreaterThanOrEqual(0);
    const timer = scheduled.mock.results[index]?.value;
    const callback = scheduled.mock.calls[index]?.[0];
    const finish = await boundary(root, mode);
    const input = vi.fn();
    root.addEventListener("input", input);
    const prior = root.outerHTML;
    if (mode !== "preserve") {
      expect(cleared).toHaveBeenCalledWith(timer);
      if (typeof callback === "function") callback();
      vi.runOnlyPendingTimers();
      expect(root.outerHTML).toBe(prior);
      expect(input).not.toHaveBeenCalled();
    }
    await finish?.();
  });

  it.each(["before", "input", "change", "selected"] as const)(
    `${kind} stops selection continuations after %s disposal`,
    (phase) => {
      const { root, valueControl, control } = popupFixture(kind);
      if (kind === "combobox") control.value = "";
      ui[kind].open(root);
      const selectedName = kind === "select" ? "change" : "select";
      const beforeName = kind === "select" ? "before-change" : "before-select";
      const selected = vi.fn();
      const closed = vi.fn();
      const nativeChange = vi.fn();
      root.addEventListener(`jquery-star:${kind}:${selectedName}`, selected);
      root.addEventListener(`jquery-star:${kind}:close`, closed);
      valueControl.addEventListener("change", nativeChange);
      const target = phase === "before" || phase === "selected" ? root : valueControl;
      target.addEventListener(
        phase === "before"
          ? `jquery-star:${kind}:${beforeName}`
          : phase === "selected"
            ? `jquery-star:${kind}:${selectedName}`
            : phase,
        () => star.dispose(),
      );
      ui[kind].select(root, "b");
      expect(() => ui[kind].value(root)).toThrow(/disposed/);
      expect(selected).toHaveBeenCalledTimes(phase === "selected" ? 1 : 0);
      expect(nativeChange).toHaveBeenCalledTimes(
        phase === "change" || phase === "selected" ? 1 : 0,
      );
      expect(closed).not.toHaveBeenCalled();
    },
  );

  it.each(["before-open", "before-close"] as const)(`${kind} stops after %s disposal`, (phase) => {
    const { root } = popupFixture(kind);
    const open = phase === "before-open";
    if (!open) ui[kind].open(root);
    const emitted = vi.fn();
    root.addEventListener(`jquery-star:${kind}:${open ? "open" : "close"}`, emitted);
    root.addEventListener(`jquery-star:${kind}:${phase}`, () => star.dispose());
    ui[kind][open ? "open" : "close"](root);
    expect(emitted).not.toHaveBeenCalled();
    expect(part(root, "content").hidden).toBe(true);
  });

  it.each(["showPopover", "hidePopover"] as const)(
    `${kind} stops after native %s disposal`,
    (operation) => {
      const { root } = popupFixture(kind);
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
      if (operation === "hidePopover") ui[kind].open(root);
      content[operation] = () => {
        star.dispose();
        content.hidden = operation !== "showPopover";
      };
      const emitted = vi.fn();
      root.addEventListener(
        `jquery-star:${kind}:${operation === "showPopover" ? "open" : "close"}`,
        emitted,
      );
      ui[kind][operation === "showPopover" ? "open" : "close"](root);
      expect(content.hidden).toBe(true);
      expect(emitted).not.toHaveBeenCalled();
    },
  );

  it(`${kind} retains current resets across option rewiring`, async () => {
    const { root, form } = popupFixture(kind);
    ui[kind].select(root, "b");
    await star.whenEnhanced();
    const scheduled = vi.spyOn(window as Window, "setTimeout");
    const cleared = vi.spyOn(window as Window, "clearTimeout");
    form.reset();
    const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 0);
    const timer = scheduled.mock.results[index]?.value;
    ui.enhance(root);
    expect(cleared).not.toHaveBeenCalledWith(timer);
    vi.runOnlyPendingTimers();
    expect(ui[kind].value(root)).toBe("a");
  });

  it(`${kind} stops sibling opening after another close callback disposes`, () => {
    const first = popupFixture(kind);
    const second = popupFixture(kind);
    ui[kind].open(first.root);
    first.root.addEventListener(`jquery-star:${kind}:before-close`, () => star.dispose());
    const opened = vi.fn();
    second.root.addEventListener(`jquery-star:${kind}:open`, opened);
    ui[kind].open(second.root);
    expect(opened).not.toHaveBeenCalled();
    expect(part(second.root, "content").hidden).toBe(true);
  });
}

it.each(["input", "change"] as const)(
  "Combobox stops clear notifications after native %s disposal",
  (phase) => {
    const { root, valueControl, control } = popupFixture("combobox");
    const cleared = vi.fn();
    const query = vi.fn();
    root.addEventListener("jquery-star:combobox:clear", cleared);
    control.addEventListener("change", query);
    valueControl.addEventListener(phase, () => star.dispose());
    ui.combobox.clear(root);
    expect(cleared).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  },
);

it("Combobox stops filtering and opening after a query callback disposes", () => {
  const { root, control } = popupFixture("combobox");
  const opened = vi.fn();
  root.addEventListener("jquery-star:combobox:open", opened);
  root.addEventListener("jquery-star:combobox:query", () => star.dispose());
  control.value = "Beta";
  control.dispatchEvent(new Event("input", { bubbles: true }));
  expect(opened).not.toHaveBeenCalled();
  expect(part(root, "content").hidden).toBe(true);
});

it.each(["select", "combobox"] as const)(
  "%s reacquires one current native binding",
  async (kind) => {
    const { root, form, control } = popupFixture(kind);
    await star.whenEnhanced();
    root.remove();
    await star.whenEnhanced();
    form.append(root);
    ui.enhance(root);
    ui.enhance(root);
    if (kind === "combobox") control.value = "";
    const opened = vi.fn();
    root.addEventListener(`jquery-star:${kind}:open`, opened);
    part(root, kind === "select" ? "trigger" : "control").click();
    expect(opened).toHaveBeenCalledOnce();
    expect(root.dataset.state).toBe("open");
  },
);

it.each(["select", "combobox"] as const)(
  "%s stops replacement enhancement after native hiding disposes",
  (kind) => {
    const { root } = popupFixture(kind);
    ui[kind].open(root);
    const content = part(root, "content") as HTMLElement & {
      hidePopover(): void;
      showPopover(): void;
    };
    content.showPopover = () => undefined;
    content.hidePopover = () => star.dispose();
    const replacement = content.cloneNode(true) as HTMLElement;
    content.replaceWith(replacement);
    const input = part(root, kind === "select" ? "trigger" : "control");
    const added = vi.spyOn(input, "addEventListener");
    ui.enhance(root);
    expect(added).not.toHaveBeenCalled();
    expect(root.dataset.state).toBe("closed");
  },
);

it("Select stops keyboard typeahead after an open callback disposes", () => {
  const { root } = popupFixture("select");
  const scheduled = vi.spyOn(window as Window, "setTimeout");
  root.addEventListener("jquery-star:select:open", () => star.dispose());
  part(root, "trigger").dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
  expect(scheduled.mock.calls.some(([, delay]) => delay === 500)).toBe(false);
});

it("Combobox inline cleanup hides its panel without invoking native popovers", () => {
  const { root } = popupFixture("combobox");
  root.dataset.inline = "";
  ui.enhance(root);
  const content = part(root, "content") as HTMLElement & {
    showPopover(): void;
    hidePopover(): void;
  };
  const show = vi.fn();
  const hide = vi.fn();
  content.showPopover = show;
  content.hidePopover = hide;
  ui.combobox.open(root);
  expect(content.hidden).toBe(false);
  star.dispose();
  expect(content.hidden).toBe(true);
  expect(show).not.toHaveBeenCalled();
  expect(hide).not.toHaveBeenCalled();
});

it.each(["select", "combobox"] as const)(
  "%s cancels pending resets in its own window",
  async (kind) => {
    const frames = [document.createElement("iframe"), document.createElement("iframe")];
    document.body.append(...frames);
    const owners: Array<ReturnType<typeof installStarCore>["star"]> = [];
    const pending: Array<Map<number, () => void>> = [];
    try {
      for (const frame of frames) {
        const owner = frame.contentWindow as Window & typeof globalThis;
        const jquery = jQueryFactory(owner);
        const timers = new Map<number, () => void>();
        pending.push(timers);
        await withStarDOMRealm({ window: owner, jQuery: jquery }, () => {
          const local = installStarCore(jquery, { document: owner.document }).star;
          owners.push(local);
          const localUI = local.use(uiPlugin);
          const form = owner.document.createElement("form");
          const root = owner.document.createElement("div");
          root.dataset.jqs = kind;
          root.innerHTML =
            kind === "select"
              ? '<select data-part="control"><option value="a">Alpha</option></select>'
              : '<input data-part="control"><div data-part="content"><div data-part="option" data-value="a">Alpha</div></div>';
          form.append(root);
          owner.document.body.append(form);
          localUI.enhance(root);
          vi.spyOn(owner as Window, "setTimeout").mockImplementation((callback) => {
            timers.set(100, callback as () => void);
            return 100;
          });
          vi.spyOn(owner as Window, "clearTimeout").mockImplementation((id) => {
            if (id !== undefined) timers.delete(id);
          });
          form.reset();
        });
        expect(timers.size).toBe(1);
      }
      owners[0]?.dispose();
      expect(pending.map((timers) => timers.size)).toEqual([0, 1]);
      owners[1]?.dispose();
      expect(pending.map((timers) => timers.size)).toEqual([0, 0]);
    } finally {
      owners.forEach((owner) => owner.dispose());
      frames.forEach((frame) => frame.remove());
    }
  },
);
