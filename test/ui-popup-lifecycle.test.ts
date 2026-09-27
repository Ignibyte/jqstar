import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { withStarDOMRealm } from "../src/testing";
import { uiPlugin } from "../src/ui";
import type { StarUIStatic } from "../src/types";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};

describe.each(["menu", "select", "combobox"] as const)("%s owning document", (kind) => {
  it("closes a sibling in its own document while preserving the other document", async () => {
    const frames = [document.createElement("iframe"), document.createElement("iframe")];
    document.body.append(...frames);
    const stars: Array<ReturnType<typeof installStarCore>["star"]> = [];
    const roots: HTMLElement[] = [];
    const jquery: JQueryStatic[] = [];
    try {
      for (const frame of frames) {
        const owner = frame.contentWindow as (Window & typeof globalThis) | null;
        if (!owner) throw new Error("Missing popup realm.");
        const $ = jQueryFactory(owner);
        jquery.push($);
        await withStarDOMRealm({ window: owner, jQuery: $ }, () => {
          const star = installStarCore($, { document: owner.document }).star;
          stars.push(star);
          const ui = star.use(uiPlugin);
          const make = () => {
            const root = owner.document.createElement("div");
            root.dataset.jqs = kind;
            root.innerHTML =
              kind === "menu"
                ? '<button data-part="trigger">Menu</button><div data-part="content"><button data-part="item">A</button></div>'
                : kind === "select"
                  ? '<select data-part="control"><option value="a">A</option></select>'
                  : '<input data-part="control"><div data-part="content"><div data-part="option" data-value="a">A</div></div>';
            owner.document.body.append(root);
            ui.enhance(root);
            return root;
          };
          const first = make();
          ui[kind].open(first);
          const second = make();
          ui[kind].open(second);
          expect(first.dataset.state).toBe("closed");
          expect(second.dataset.state).toBe("open");
          const preventClose = (event: Event) => event.preventDefault();
          second.addEventListener(`jquery-star:${kind}:before-close`, preventClose);
          ui[kind].open(first);
          expect(second.dataset.state).toBe("open");
          ui[kind].close(first);
          second.removeEventListener(`jquery-star:${kind}:before-close`, preventClose);
          roots.push(second);
        });
      }
      expect(roots.map((root) => root.dataset.state)).toEqual(["open", "open"]);
    } finally {
      for (const [index, frame] of frames.entries()) {
        const owner = frame.contentWindow as (Window & typeof globalThis) | null;
        const $ = jquery[index];
        if (owner && $)
          await withStarDOMRealm({ window: owner, jQuery: $ }, () => stars[index]?.dispose());
        frame.remove();
      }
    }
  });
});

async function withUI(run: (ui: StarUIStatic) => void) {
  const jquery = jQueryFactory(window);
  await withStarDOMRealm({ window, jQuery: jquery }, () => {
    const star = installStarCore(jquery, { document }).star;
    vi.useFakeTimers();
    try {
      run(star.use(uiPlugin));
    } finally {
      star.dispose();
      document.body.replaceChildren();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
}

function part(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!found) throw new Error(`Missing label fixture ${name}.`);
  return found;
}

it("refreshes Menu generated labels while preserving a later authored label", async () => {
  await withUI((ui) => {
    const root = document.createElement("div");
    root.dataset.jqs = "menu";
    root.innerHTML =
      '<button data-part="trigger">Open</button><div data-part="content"><button data-part="item">A</button></div>';
    ui.enhance(root);
    const content = part(root, "content");
    const trigger = part(root, "trigger").cloneNode(true) as HTMLElement;
    trigger.id = "current-menu-trigger";
    part(root, "trigger").replaceWith(trigger);
    ui.enhance(root);
    expect(content.getAttribute("aria-labelledby")).toBe(trigger.id);
    content.setAttribute("aria-label", "Authored menu");
    ui.enhance(root);
    expect(content.getAttribute("aria-label")).toBe("Authored menu");
    expect(content.hasAttribute("aria-labelledby")).toBe(false);
    content.removeAttribute("aria-label");
    content.setAttribute("aria-labelledby", "authored-menu-title");
    trigger.id = "new-trigger";
    ui.enhance(root);
    expect(content.getAttribute("aria-labelledby")).toBe("authored-menu-title");
  });
});

it("refreshes Toast parts and fallback labels without overwriting authored ARIA", async () => {
  await withUI((ui) => {
    const root = ui.toast.show({ title: "First", description: "Details", duration: false });
    for (const name of ["title", "description"]) {
      const current = document.createElement("p");
      current.dataset.part = name;
      current.id = `current-toast-${name}`;
      current.textContent = `Current ${name}`;
      part(root, name).replaceWith(current);
    }
    ui.enhance(root);
    expect(root.getAttribute("aria-labelledby")).toBe("current-toast-title");
    expect(root.getAttribute("aria-describedby")).toBe("current-toast-description");
    part(root, "title").remove();
    ui.enhance(root);
    expect(root.getAttribute("aria-labelledby")).toBe("current-toast-description");
    expect(root.hasAttribute("aria-describedby")).toBe(false);
    part(root, "description").remove();
    root.textContent = "Plain notification";
    ui.enhance(root);
    expect(root.hasAttribute("aria-labelledby")).toBe(false);
    expect(root.getAttribute("aria-label")).toBe("Plain notification");
    root.innerHTML = '<p data-part="title" id="restored-title">Restored</p>';
    ui.enhance(root);
    expect(root.getAttribute("aria-labelledby")).toBe("restored-title");
    expect(root.hasAttribute("aria-label")).toBe(false);
    root.setAttribute("aria-label", "Authored notification");
    root.setAttribute("aria-describedby", "authored-detail");
    ui.enhance(root);
    expect(root.hasAttribute("aria-labelledby")).toBe(false);
    expect(root.getAttribute("aria-label")).toBe("Authored notification");
    expect(root.getAttribute("aria-describedby")).toBe("authored-detail");
  });
});

describe.each(["select", "combobox"] as const)("%s current accessible label", (kind) => {
  function fixture(ui: StarUIStatic) {
    const form = document.createElement("form");
    form.innerHTML = `<label for="native-label-control">Original</label><div data-jqs="${kind}" id="label-${kind}">${kind === "select" ? '<select data-part="control" id="native-label-control"><option value="a">A</option></select>' : '<input data-part="control" id="native-label-control"><div data-part="content"><div data-part="option" data-value="a">A</div></div>'}</div>`;
    document.body.append(form);
    const root = form.querySelector<HTMLElement>("[data-jqs]");
    if (!root) throw new Error("Missing labelled component.");
    ui.enhance(root);
    return {
      form,
      root,
      control: part(root, "control") as HTMLInputElement | HTMLSelectElement,
      content: part(root, "content"),
    };
  }

  it("replaces generated label references with the current native name", async () => {
    await withUI((ui) => {
      const { form, root, control, content } = fixture(ui);
      form.querySelector("label")?.remove();
      control.setAttribute("aria-label", "Current native name");
      ui.enhance(root);
      expect(content.hasAttribute("aria-labelledby")).toBe(false);
      expect(content.getAttribute("aria-label")).toBe("Current native name");
      if (kind === "select")
        expect(part(root, "trigger").hasAttribute("aria-labelledby")).toBe(false);
      control.removeAttribute("aria-label");
      control.setAttribute("aria-labelledby", "current-external-label");
      ui.enhance(root);
      expect(content.getAttribute("aria-labelledby")).toBe("current-external-label");
      expect(content.hasAttribute("aria-label")).toBe(false);
    });
  });

  it("preserves authored popup labels as native labels change", async () => {
    await withUI((ui) => {
      const { root, content } = fixture(ui);
      content.setAttribute("aria-label", "Authored choices");
      ui.enhance(root);
      expect(content.hasAttribute("aria-labelledby")).toBe(false);
      expect(content.getAttribute("aria-label")).toBe("Authored choices");
      content.removeAttribute("aria-label");
      content.setAttribute("aria-labelledby", "authored-listbox-title");
      ui.enhance(root);
      expect(content.getAttribute("aria-labelledby")).toBe("authored-listbox-title");
    });
  });

  it("refreshes generated fallback names from current root labels", async () => {
    await withUI((ui) => {
      const { form, root, control, content } = fixture(ui);
      form.querySelector("label")?.remove();
      root.setAttribute("aria-label", "First fallback");
      ui.enhance(root);
      root.setAttribute("aria-label", "Current fallback");
      ui.enhance(root);
      expect(content.getAttribute("aria-label")).toBe("Current fallback");
      expect(content.hasAttribute("aria-labelledby")).toBe(false);
      if (kind === "combobox") expect(control.getAttribute("aria-label")).toBe("Current fallback");
    });
  });
});

it("removes obsolete Questionnaire descriptions and preserves authored references", async () => {
  await withUI((ui) => {
    const form = document.createElement("form");
    form.innerHTML =
      '<section data-jqs="questionnaire"><fieldset data-part="item" data-name="answer" data-value="a"><legend>Answer</legend><input data-part="freeform"><p data-part="description">Hint</p><p data-part="error">Error</p></fieldset></section>';
    const root = form.firstElementChild as HTMLElement;
    ui.enhance(root);
    const item = part(root, "item");
    part(item, "description").remove();
    part(item, "error").remove();
    ui.enhance(root);
    expect(item.hasAttribute("aria-describedby")).toBe(false);
    item.setAttribute("aria-describedby", "authored-help");
    item.insertAdjacentHTML("beforeend", '<p data-part="description">New hint</p>');
    ui.enhance(root);
    expect(item.getAttribute("aria-describedby")).toBe("authored-help");
  });
});
