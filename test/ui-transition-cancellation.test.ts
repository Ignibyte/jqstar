import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

beforeEach(() => document.body.replaceChildren());
afterEach(() => document.body.replaceChildren());

function part(root: HTMLElement, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!element) throw new Error(`Missing ${name} fixture part.`);
  return element;
}
async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}
async function stepper(): Promise<HTMLElement> {
  const root = document.createElement("section");
  root.dataset.jqs = "stepper";
  root.innerHTML =
    '<ol data-part="list"><li data-part="step" data-value="a"><button data-part="trigger">A</button></li><li data-part="step" data-value="b"><button data-part="trigger">B</button></li></ol><section data-part="panel" data-value="a"></section><section data-part="panel" data-value="b"></section><button data-part="previous">Back</button><button data-part="next">Next</button>';
  document.body.append(root);
  await enhance(root);
  $.star.ui.stepper.next(root);
  $.star.ui.stepper.next(root);
  expect(root.dataset.state).toBe("complete");
  return root;
}

describe("Canceled UI transitions", () => {
  it.each(["public", "previous", "trigger"])(
    "preserves Stepper completion after a canceled %s move",
    async (operation) => {
      const root = await stepper();
      const cancel = (event: Event): void => event.preventDefault();
      const changed = vi.fn();
      root.addEventListener("jquery-star:stepper:before-change", cancel);
      root.addEventListener("jquery-star:stepper:change", changed);
      if (operation === "public") $.star.ui.stepper.go(root, "a");
      else part(root, operation).click();
      await enhance(root);
      expect($.star.ui.stepper.value(root)).toBe("b");
      expect(root.dataset.state).toBe("complete");
      expect(part(root, "next").hasAttribute("disabled")).toBe(true);
      expect(changed).not.toHaveBeenCalled();
      root.removeEventListener("jquery-star:stepper:before-change", cancel);
      $.star.ui.stepper.go(root, "a");
      expect(root.dataset.state).toBe("active");
      expect($.star.ui.stepper.value(root)).toBe("a");
      expect(changed).toHaveBeenCalledOnce();
    },
  );

  it("keeps the final Stepper active when completion itself is canceled", async () => {
    const root = await stepper();
    $.star.ui.stepper.go(root, "a");
    $.star.ui.stepper.go(root, "b");
    root.addEventListener("jquery-star:stepper:before-complete", (event) => event.preventDefault());
    $.star.ui.stepper.next(root);
    await enhance(root);
    expect(root.dataset.state).toBe("active");
    expect($.star.ui.stepper.value(root)).toBe("b");
  });

  it.each(["public", "Escape", "Tab"])(
    "keeps Menubar consistent with a canceled child close through %s",
    async (operation) => {
      const root = document.createElement("section");
      root.dataset.jqs = "menubar";
      root.innerHTML =
        '<section data-part="menu" data-jqs="menu" data-value="file"><button data-part="trigger">File</button><div data-part="content"><button data-part="item" data-value="open">Open</button></div></section>';
      document.body.append(root);
      await enhance(root);
      $.star.ui.menubar.open(root, "file");
      const menu = part(root, "menu");
      const cancel = (event: Event): void => event.preventDefault();
      menu.addEventListener("jquery-star:menu:before-close", cancel);
      if (operation === "public") $.star.ui.menubar.close(root);
      else
        part(menu, "trigger").dispatchEvent(
          new KeyboardEvent("keydown", { key: operation, bubbles: true, cancelable: true }),
        );
      expect(menu.dataset.state).toBe("open");
      expect(root.dataset.state).toBe("open");
      expect($.star.ui.menubar.value(root)).toBe("file");
      await enhance(root);
      expect(root.dataset.state).toBe("open");
      expect($.star.ui.menubar.value(root)).toBe("file");
      menu.removeEventListener("jquery-star:menu:before-close", cancel);
      $.star.ui.menubar.close(root);
      expect(menu.dataset.state).toBe("closed");
      expect(root.dataset.state).toBe("closed");
      expect($.star.ui.menubar.value(root)).toBeUndefined();
    },
  );
});
