import $ from "jquery";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers();
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});

afterEach(() => {
  star.dispose();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const fields = {
  "password-field":
    '<input data-part="control" type="password" value="secret"><button data-part="toggle">Show</button>',
  "number-field":
    '<button data-part="decrement">Less</button><input data-part="control" type="number" value="1"><button data-part="increment">More</button>',
  "search-field":
    '<input data-part="control" type="search" value="query"><button data-part="clear">Clear</button>',
  rating:
    '<input data-part="control" type="radio" name="score" value="one" checked><input data-part="control" type="radio" name="score" value="two"><button data-part="clear">Clear</button><span data-part="status"></span>',
};

function fixture(kind: string, content: string) {
  const form = document.createElement("form");
  const root = document.createElement("section");
  root.dataset.jqs = kind;
  root.innerHTML = content;
  form.append(root);
  document.body.append(form);
  return { form, root };
}

function button(root: HTMLElement, kind: keyof typeof fields): HTMLButtonElement {
  const part =
    kind === "password-field" ? "toggle" : kind === "number-field" ? "increment" : "clear";
  const control = root.querySelector<HTMLButtonElement>(`button[data-part="${part}"]`);
  if (!control) throw new Error("Missing field fixture button.");
  return control;
}

for (const kind of Object.keys(fields) as Array<keyof typeof fields>) {
  it.each(["render", "native", "dispose", "preserve"])(
    `${kind} respects %s lifetime`,
    async (mode) => {
      const { form, root } = fixture(kind, fields[kind]);
      ui.enhance(root);
      await star.whenEnhanced();
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${kind}:change`, changed);
      const render =
        mode === "render" || mode === "preserve"
          ? createRenderAdapter(installed).begin(
              form,
              mode === "preserve" ? { preserveRoots: [root] } : {},
            )
          : undefined;
      if (render) {
        render.beforeRemove(root);
        // Exercise descendant enumeration while the outgoing root is still connected.
        ui.enhance(document);
      } else if (mode === "dispose") star.dispose();
      else {
        root.remove();
        await star.whenEnhanced();
      }
      button(root, kind).click();
      expect(changed).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
      if (render) {
        if (mode === "render") root.remove();
        await render.commit();
      }
    },
  );

  it(`${kind} reacquires one listener set after native removal`, async () => {
    const { form, root } = fixture(kind, fields[kind]);
    ui.enhance(root);
    await star.whenEnhanced();
    root.remove();
    await star.whenEnhanced();
    form.append(root);
    ui.enhance(root);
    ui.enhance(root);
    await star.whenEnhanced();
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    button(root, kind).click();
    expect(changed).toHaveBeenCalledOnce();
  });

  it(`${kind} stops after disposal from a before-change callback`, () => {
    const { root } = fixture(kind, fields[kind]);
    ui.enhance(root);
    const prior = root.innerHTML;
    const changed = vi.fn();
    root.addEventListener(`jquery-star:${kind}:before-change`, () => star.dispose());
    root.addEventListener(`jquery-star:${kind}:change`, changed);
    button(root, kind).click();
    expect(changed).not.toHaveBeenCalled();
    expect(root.innerHTML).toBe(prior);
  });
}

it("clears Rating's pending native reset and its captured form listener", async () => {
  const { form, root } = fixture("rating", fields.rating);
  ui.enhance(root);
  ui.rating.set(root, "two");
  await star.whenEnhanced();
  form.reset();
  expect(vi.getTimerCount()).toBe(1);
  const render = createRenderAdapter(installed).begin(form);
  render.beforeRemove(root);
  expect(vi.getTimerCount()).toBe(0);
  root.remove();
  await render.commit();
  form.reset();
  expect(vi.getTimerCount()).toBe(0);
});

for (const kind of ["clipboard", "code-block"] as const) {
  const content =
    kind === "clipboard"
      ? '<code data-part="value">copy me</code><button data-part="trigger">Copy</button><p data-part="status"></p>'
      : '<code data-part="code">copy me</code><button data-part="copy">Copy</button><p data-part="status"></p>';
  it.each(["render", "native", "dispose", "preserve"])(
    `${kind} settles a pending copy after %s`,
    async (mode) => {
      const { form, root } = fixture(kind, content);
      let finish: (() => void) | undefined;
      const writeText = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      const copied = vi.fn();
      root.addEventListener(`jquery-star:${kind}:copy`, copied);
      const pending = kind === "clipboard" ? ui.clipboard.copy(root) : ui.codeBlock.copy(root);
      await star.whenEnhanced();
      if (!finish) throw new Error("Copy did not start.");
      if (mode === "dispose") star.dispose();
      else if (mode === "native") {
        root.remove();
        await star.whenEnhanced();
      } else {
        const render = createRenderAdapter(installed).begin(
          form,
          mode === "preserve" ? { preserveRoots: [root] } : {},
        );
        render.beforeRemove(root);
        if (mode === "render") root.remove();
        await render.commit();
      }
      const state = root.dataset.state;
      const status = root.querySelector('[data-part="status"]');
      const prior = status?.textContent;
      finish();
      await expect(pending).resolves.toBe("copy me");
      expect(copied).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
      if (mode !== "preserve") {
        expect(status?.textContent).toBe(prior);
        expect(root.dataset.state).toBe(state);
        expect(vi.getTimerCount()).toBe(0);
      }
      vi.unstubAllGlobals();
    },
  );

  it(`${kind} preserves copy failure without reporting to a retired controller`, async () => {
    const { root } = fixture(kind, content);
    let reject: ((error: Error) => void) | undefined;
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: () =>
          new Promise<void>((_resolve, fail) => {
            reject = fail;
          }),
      },
    });
    const error = new Error("clipboard denied");
    const reported = vi.fn();
    root.addEventListener(`jquery-star:${kind}:error`, reported);
    const pending = (
      kind === "clipboard" ? ui.clipboard.copy(root) : ui.codeBlock.copy(root)
    ).catch((failure: unknown) => failure);
    if (!reject) throw new Error("Copy did not start.");
    star.dispose();
    reject(error);
    expect(await pending).toBe(error);
    expect(reported).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    vi.unstubAllGlobals();
  });

  it(`${kind} refuses clipboard work when before-copy disposes its owner`, async () => {
    const { root } = fixture(kind, content);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    root.addEventListener(`jquery-star:${kind}:before-copy`, () => star.dispose());
    const pending = kind === "clipboard" ? ui.clipboard.copy(root) : ui.codeBlock.copy(root);
    await expect(pending).resolves.toBe("copy me");
    expect(writeText).not.toHaveBeenCalled();
  });
}

it("releases Clipboard's temporary button state before an older copy settles", async () => {
  const { form, root } = fixture(
    "clipboard",
    '<code data-part="value">old</code><button data-part="trigger">Copy</button><p data-part="status"></p>',
  );
  const finishes: Array<() => void> = [];
  vi.stubGlobal("navigator", {
    clipboard: { writeText: () => new Promise<void>((resolve) => finishes.push(resolve)) },
  });
  const trigger = root.querySelector("button");
  if (!trigger) throw new Error("Missing clipboard trigger.");
  const first = ui.clipboard.copy(root);
  expect(trigger.disabled).toBe(true);
  root.remove();
  await star.whenEnhanced();
  expect(trigger.disabled).toBe(false);
  form.append(root);
  const second = ui.clipboard.copy(root, "new");
  expect(trigger.disabled).toBe(true);
  finishes[0]?.();
  await expect(first).resolves.toBe("old");
  expect(trigger.disabled).toBe(true);
  expect(root.dataset.state).toBe("copying");
  finishes[1]?.();
  await expect(second).resolves.toBe("new");
  expect(trigger.disabled).toBe(false);
  expect(vi.getTimerCount()).toBe(1);
  star.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

const navigation = {
  tabs: '<div data-jqs="tabs"><div data-part="list"><button data-part="trigger" data-value="a">A</button><button data-part="trigger" data-value="b">B</button></div><div data-part="panel" data-value="a">A panel</div><div data-part="panel" data-value="b">B panel</div></div>',
  collapsible:
    '<details data-jqs="collapsible"><summary data-part="trigger">Open</summary><div data-part="content">Contents</div></details>',
  accordion:
    '<div data-jqs="accordion"><details data-part="item"><summary data-part="trigger">Open</summary><div data-part="content">Contents</div></details></div>',
  dialog: '<dialog data-jqs="dialog"><h2 data-part="title">Title</h2></dialog>',
};

for (const kind of Object.keys(navigation) as Array<keyof typeof navigation>) {
  it.each(["render", "native", "dispose", "preserve"])(
    `${kind} releases its events at %s`,
    async (mode) => {
      const main = document.createElement("main");
      main.innerHTML = navigation[kind];
      document.body.append(main);
      const root = main.firstElementChild;
      if (!(root instanceof HTMLElement)) throw new Error("Missing navigation root.");
      ui.enhance(root);
      await star.whenEnhanced();
      const eventName = kind === "tabs" ? "change" : kind === "dialog" ? "close" : "before-open";
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${kind}:${eventName}`, changed);
      const render =
        mode === "render" || mode === "preserve"
          ? createRenderAdapter(installed).begin(
              main,
              mode === "preserve" ? { preserveRoots: [root] } : {},
            )
          : undefined;
      if (render) {
        render.beforeRemove(root);
        ui.enhance(document);
      } else if (mode === "dispose") star.dispose();
      else {
        root.remove();
        await star.whenEnhanced();
      }
      if (kind === "dialog") root.dispatchEvent(new Event("close"));
      else if (kind === "tabs") root.querySelector<HTMLElement>('[data-value="b"]')?.click();
      else root.querySelector<HTMLElement>("summary")?.click();
      expect(changed).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
      if (render) {
        if (mode === "render") root.remove();
        await render.commit();
      }
    },
  );
}

const controls = {
  "log-viewer":
    '<div data-jqs="log-viewer"><select data-part="filter"><option value="all">All</option><option value="error">Error</option></select><div data-part="viewport"><ol data-part="entries"><li data-part="entry" data-level="info">Ready</li></ol></div><p data-part="status"></p></div>',
  stepper:
    '<div data-jqs="stepper"><ol data-part="list"><li data-part="step" data-value="a"><button data-part="trigger">A</button></li><li data-part="step" data-value="b"><button data-part="trigger">B</button></li></ol><section data-part="panel" data-value="a">A panel</section><section data-part="panel" data-value="b">B panel</section><button data-part="next">Next</button></div>',
  editable:
    '<div data-jqs="editable" data-state="editing" data-value="Old"><div data-part="display"><span data-part="preview">Old</span><button data-part="edit">Edit</button></div><div data-part="editor"><input data-part="control" value="Old"></div><span data-part="status"></span></div>',
  toolbar:
    '<div data-jqs="toolbar"><button data-part="item" data-value="a">A</button><button data-part="item" data-value="b">B</button></div>',
  pagination:
    '<nav data-jqs="pagination" data-page-count="3"><button data-part="next">Next</button></nav>',
  sidebar:
    '<aside data-jqs="sidebar"><button data-part="trigger">Toggle</button><div data-part="panel">Panel</div></aside>',
  toggle: '<button data-jqs="toggle">Toggle</button>',
  "toggle-group":
    '<div data-jqs="toggle-group"><button data-part="item" data-value="a">A</button><button data-part="item" data-value="b">B</button></div>',
};

function controlFixture(kind: keyof typeof controls) {
  const main = document.createElement("main");
  main.innerHTML = controls[kind];
  document.body.append(main);
  const root = main.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error("Missing control root.");
  return { main, root };
}

function activateControl(root: HTMLElement, kind: keyof typeof controls): void {
  if (kind === "log-viewer") {
    const filter = root.querySelector("select");
    if (!filter) throw new Error("Missing viewer filter.");
    filter.value = "error";
    filter.dispatchEvent(new Event("change"));
  } else if (kind === "editable") {
    const control = root.querySelector("input");
    if (!control) throw new Error("Missing editable control.");
    control.value = "New";
    control.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  } else if (kind === "stepper")
    root.querySelector<HTMLButtonElement>('[data-part="next"]')?.click();
  else if (kind === "toolbar") {
    root
      .querySelector("button")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
      );
  } else if (kind === "toggle") root.click();
  else root.querySelector("button")?.click();
}

for (const kind of Object.keys(controls) as Array<keyof typeof controls>) {
  it.each(["render", "native", "dispose", "preserve"])(
    `${kind} owns native controls across %s`,
    async (mode) => {
      const { main, root } = controlFixture(kind);
      ui.enhance(root);
      await star.whenEnhanced();
      const prior = root.outerHTML;
      const render =
        mode === "render" || mode === "preserve"
          ? createRenderAdapter(installed).begin(
              main,
              mode === "preserve" ? { preserveRoots: [root] } : {},
            )
          : undefined;
      if (render) {
        render.beforeRemove(root);
        ui.enhance(document);
      } else if (mode === "dispose") star.dispose();
      else {
        root.remove();
        await star.whenEnhanced();
      }
      activateControl(root, kind);
      if (mode === "preserve") expect(root.outerHTML).not.toBe(prior);
      else expect(root.outerHTML).toBe(prior);
      if (render) {
        if (mode === "render") root.remove();
        await render.commit();
      }
    },
  );

  it(`${kind} reacquires current native controls after removal`, async () => {
    const { main, root } = controlFixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    root.remove();
    await star.whenEnhanced();
    main.append(root);
    ui.enhance(root);
    ui.enhance(root);
    await star.whenEnhanced();
    const prior = root.outerHTML;
    const changed = vi.fn();
    root.addEventListener(
      `jquery-star:${kind}:${kind === "log-viewer" ? "filter" : "change"}`,
      changed,
    );
    activateControl(root, kind);
    expect(root.outerHTML).not.toBe(prior);
    if (kind !== "toolbar") expect(changed).toHaveBeenCalledOnce();
  });

  if (kind !== "toolbar" && kind !== "log-viewer") {
    it(`${kind} stops when before-change disposes the installation`, () => {
      const { root } = controlFixture(kind);
      ui.enhance(root);
      const prior = root.outerHTML;
      const changed = vi.fn();
      root.addEventListener(`jquery-star:${kind}:before-change`, () => star.dispose());
      root.addEventListener(`jquery-star:${kind}:change`, changed);
      activateControl(root, kind);
      expect(changed).not.toHaveBeenCalled();
      expect(root.outerHTML).toBe(prior);
    });
  }
}

it("Sidebar releases its media listener and refuses shortcut reacquisition during removal", async () => {
  const media = new EventTarget();
  const remove = vi.spyOn(media, "removeEventListener");
  vi.stubGlobal("matchMedia", () => media);
  const { main, root } = controlFixture("sidebar");
  ui.enhance(root);
  await star.whenEnhanced();
  remove.mockClear();
  const render = createRenderAdapter(installed).begin(main);
  render.beforeRemove(root);
  expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
  const prior = root.outerHTML;
  const event = new Event("change");
  Object.defineProperty(event, "matches", { value: true });
  media.dispatchEvent(event);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }));
  expect(root.outerHTML).toBe(prior);
  root.remove();
  await render.commit();
});

function dialogFixture() {
  const main = document.createElement("main");
  main.innerHTML = '<button>Open</button><dialog data-jqs="dialog"><input autofocus></dialog>';
  document.body.append(main);
  const dialog = main.querySelector("dialog");
  const trigger = main.querySelector("button");
  if (!dialog || !trigger) throw new Error("Missing modal fixture.");
  const show = vi.fn(() => {
    dialog.open = true;
  });
  const close = vi.fn(() => {
    dialog.open = false;
    dialog.dispatchEvent(new Event("close"));
  });
  Object.defineProperties(dialog, { showModal: { value: show }, close: { value: close } });
  return { main, dialog, trigger, show, close };
}

it.each(["render", "native", "dispose", "preserve"])(
  "Dialog releases its runtime modal state at %s",
  async (mode) => {
    const { main, dialog, trigger, close } = dialogFixture();
    const closed = vi.fn();
    dialog.addEventListener("jquery-star:dialog:close", closed);
    ui.dialog.open(dialog, { trigger });
    await star.whenEnhanced();
    if (mode === "dispose") star.dispose();
    else if (mode === "native") {
      dialog.remove();
      await star.whenEnhanced();
    } else {
      const render = createRenderAdapter(installed).begin(
        main,
        mode === "preserve" ? { preserveRoots: [dialog] } : {},
      );
      render.beforeRemove(dialog);
      if (mode === "render") dialog.remove();
      await render.commit();
    }
    expect(dialog.open).toBe(mode === "preserve");
    expect(trigger.getAttribute("aria-expanded")).toBe(String(mode === "preserve"));
    expect(close).toHaveBeenCalledTimes(mode === "preserve" ? 0 : 1);
    expect(closed).not.toHaveBeenCalled();
    expect(dialog.dataset.state).toBe(mode === "preserve" ? "open" : "closed");
  },
);

it("Dialog leaves an authored open state outside runtime modal ownership", () => {
  const { dialog, close } = dialogFixture();
  dialog.open = true;
  ui.enhance(dialog);
  star.dispose();
  expect(dialog.open).toBe(true);
  expect(close).not.toHaveBeenCalled();
});

it.each(["before-open", "showModal", "focus"])(
  "Dialog stops opening when disposal happens during %s",
  (phase) => {
    const { dialog, show, close } = dialogFixture();
    const opened = vi.fn();
    dialog.addEventListener("jquery-star:dialog:open", opened);
    if (phase === "before-open") {
      dialog.addEventListener("jquery-star:dialog:before-open", () => star.dispose());
    } else if (phase === "showModal") {
      show.mockImplementation(() => {
        dialog.open = true;
        star.dispose();
      });
    } else dialog.querySelector("input")?.addEventListener("focus", () => star.dispose());
    ui.dialog.open(dialog);
    expect(dialog.open).toBe(false);
    expect(opened).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(phase === "before-open" ? 0 : 1);
  },
);

it("Stepper stops completion when before-complete disposes its owner", () => {
  const { root } = controlFixture("stepper");
  ui.stepper.go(root, "b");
  const prior = root.outerHTML;
  const complete = vi.fn();
  root.addEventListener("jquery-star:stepper:before-complete", () => star.dispose());
  root.addEventListener("jquery-star:stepper:complete", complete);
  ui.stepper.next(root);
  expect(root.outerHTML).toBe(prior);
  expect(complete).not.toHaveBeenCalled();
});

it("Stepper stops after focus disposes its owner", () => {
  const { root } = controlFixture("stepper");
  ui.enhance(root);
  const changed = vi.fn();
  root.addEventListener("jquery-star:stepper:change", changed);
  root.querySelector('[data-value="b"] button')?.addEventListener("focus", () => star.dispose());
  ui.stepper.next(root);
  expect(changed).not.toHaveBeenCalled();
});

it.each(["before-edit", "focus", "change"])(
  "Editable stops effects after disposal from %s",
  (phase) => {
    const { root } = controlFixture("editable");
    root.dataset.state = "display";
    ui.enhance(root);
    const control = root.querySelector("input");
    if (!control) throw new Error("Missing editable control.");
    const emitted = vi.fn();
    if (phase === "before-edit") {
      const prior = root.outerHTML;
      root.addEventListener("jquery-star:editable:before-edit", () => star.dispose());
      ui.editable.edit(root);
      expect(root.outerHTML).toBe(prior);
    } else if (phase === "focus") {
      control.addEventListener("focus", () => star.dispose());
      root.addEventListener("jquery-star:editable:edit", emitted);
      ui.editable.edit(root);
      expect(root.querySelector('[data-part="status"]')?.textContent).toBe("");
    } else {
      ui.editable.edit(root);
      control.addEventListener("change", () => star.dispose());
      root.addEventListener("jquery-star:editable:change", emitted);
      ui.editable.set(root, "New");
    }
    expect(emitted).not.toHaveBeenCalled();
  },
);

it.each(["append", "clear"])("Log Viewer stops %s after callback disposal", (operation) => {
  const { root } = controlFixture("log-viewer");
  ui.enhance(root);
  const prior = root.outerHTML;
  const emitted = vi.fn();
  root.addEventListener(`jquery-star:log-viewer:before-${operation}`, () => star.dispose());
  root.addEventListener(`jquery-star:log-viewer:${operation}`, emitted);
  if (operation === "append") ui.logViewer.append(root, { message: "new" });
  else ui.logViewer.clear(root);
  expect(root.outerHTML).toBe(prior);
  expect(emitted).not.toHaveBeenCalled();
});

it("Log Viewer invalidates a queued scroll even if the root stays connected", () => {
  const pending: VoidFunction[] = [];
  vi.stubGlobal("queueMicrotask", (callback: VoidFunction) => pending.push(callback));
  const { root } = controlFixture("log-viewer");
  const view = root.querySelector<HTMLElement>('[data-part="viewport"]');
  if (!view) throw new Error("Missing viewer viewport.");
  Object.defineProperty(view, "scrollHeight", { value: 300 });
  ui.enhance(root);
  expect(pending.length).toBeGreaterThan(0);
  star.dispose();
  for (const callback of pending) callback();
  expect(view.scrollTop).toBe(0);
});

function jsonFixture() {
  return fixture(
    "json-viewer",
    '<script data-part="source" type="application/json">{"old":true}</script><div data-part="tree"></div><p data-part="status"></p>',
  );
}

it.each(["render", "preserve"])("JSON Viewer filters enhancement during %s", async (mode) => {
  const { form, root } = jsonFixture();
  ui.enhance(root);
  await star.whenEnhanced();
  const source = root.querySelector("script");
  const tree = root.querySelector('[data-part="tree"]');
  if (!source || !tree) throw new Error("Missing JSON parts.");
  const prior = tree.innerHTML;
  const render = createRenderAdapter(installed).begin(
    form,
    mode === "preserve" ? { preserveRoots: [root] } : {},
  );
  render.beforeRemove(root);
  source.textContent = '{"new":true}';
  ui.enhance(document);
  if (mode === "preserve") expect(tree.innerHTML).not.toBe(prior);
  else expect(tree.innerHTML).toBe(prior);
  if (mode === "render") root.remove();
  await render.commit();
});

it.each(["return", "throw"])(
  "JSON Viewer stops after a serializer disposes and chooses to %s",
  (outcome) => {
    const { root } = jsonFixture();
    ui.enhance(root);
    const prior = root.outerHTML;
    const emitted = vi.fn();
    root.addEventListener("jquery-star:json-viewer:update", emitted);
    root.addEventListener("jquery-star:json-viewer:error", emitted);
    const error = new Error("serializer failed");
    const value = {
      toJSON() {
        star.dispose();
        if (outcome === "throw") throw error;
        return { new: true };
      },
    };
    if (outcome === "throw") expect(() => ui.jsonViewer.set(root, value)).toThrow(error);
    else ui.jsonViewer.set(root, value);
    expect(root.outerHTML).toBe(prior);
    expect(emitted).not.toHaveBeenCalled();
  },
);

it("JSON Viewer stops an initial setter when enhancement dispatch disposes the owner", () => {
  const { root } = jsonFixture();
  const serialize = vi.fn(() => "new");
  root.addEventListener("jquery-star:json-viewer:update", () => star.dispose());
  ui.jsonViewer.set(root, { toJSON: serialize });
  expect(serialize).not.toHaveBeenCalled();
});

it("releases provisional UI listeners when acquisition is interrupted", () => {
  const { root } = fixture("password-field", fields["password-field"]);
  const trigger = button(root, "password-field");
  const add = trigger.addEventListener.bind(trigger);
  const remove = vi.spyOn(trigger, "removeEventListener");
  vi.spyOn(trigger, "addEventListener").mockImplementation((type, listener, options) => {
    add(type, listener, options);
    star.dispose();
  });
  expect(() => ui.enhance(root)).toThrow("cannot acquire resources");
  expect(remove).toHaveBeenCalledWith("click", expect.any(Function));
});
