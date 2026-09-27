import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

beforeEach(() => document.body.replaceChildren());
afterEach(() => document.body.replaceChildren());

describe.each(["popover", "hover-card"])("%s generated title ownership", (kind) => {
  function fixture(attributes = ""): {
    root: HTMLElement;
    content: HTMLElement;
    title: HTMLElement;
  } {
    const root = document.createElement("section");
    root.dataset.jqs = kind;
    root.innerHTML = `<button data-part="trigger">Open</button><section data-part="content" ${attributes}><h2 data-part="title">Original</h2></section>`;
    document.body.append(root);
    $.star.ui.enhance(root);
    const content = root.querySelector<HTMLElement>('[data-part="content"]');
    const title = root.querySelector<HTMLElement>('[data-part="title"]');
    if (!content || !title) throw new Error("Missing floating fixture parts.");
    return {
      root,
      content,
      title,
    };
  }

  async function enhance(root: HTMLElement): Promise<void> {
    $.star.ui.enhance(root);
    await $.star.whenEnhanced();
  }

  it("refreshes a replaced title and keeps current open events singular", async () => {
    const { root, content, title } = fixture();
    const next = document.createElement("h2");
    next.dataset.part = "title";
    next.id = "current-title";
    next.textContent = "Current";
    title.replaceWith(next);
    await enhance(root);
    await enhance(root);
    expect(content.getAttribute("aria-labelledby")).toBe(next.id);
    expect(document.getElementById(content.getAttribute("aria-labelledby") ?? "")).toBe(next);
    const opened = vi.fn();
    root.addEventListener(`jquery-star:${kind}:open`, opened);
    const api = kind === "popover" ? $.star.ui.popover : $.star.ui.hoverCard;
    api.open(root);
    expect(opened).toHaveBeenCalledOnce();
    expect(opened.mock.calls[0]?.[0].detail.content).toBe(content);
    api.close(root);
  });

  it("removes its reference when the title disappears and labels a later title", async () => {
    const { root, content, title } = fixture();
    title.remove();
    await enhance(root);
    expect(content.hasAttribute("aria-labelledby")).toBe(false);
    const next = document.createElement("h2");
    next.dataset.part = "title";
    content.append(next);
    await enhance(root);
    expect(next.id).not.toBe("");
    expect(content.getAttribute("aria-labelledby")).toBe(next.id);
  });

  it("updates a copied generated reference in replacement content", async () => {
    const { root, content } = fixture();
    const replacement = content.cloneNode(true) as HTMLElement;
    const title = replacement.querySelector<HTMLElement>('[data-part="title"]');
    if (!title) throw new Error("Missing replacement title.");
    title.id = "replacement-title";
    content.replaceWith(replacement);
    await enhance(root);
    expect(replacement.getAttribute("aria-labelledby")).toBe("replacement-title");
  });

  it.each(["before", "after"])(
    "preserves authored title references supplied %s enhancement",
    async (when) => {
      const { root, content, title } = fixture(
        when === "before" ? 'aria-labelledby="authored-title"' : "",
      );
      content.setAttribute("aria-labelledby", "authored-title");
      title.remove();
      await enhance(root);
      expect(content.getAttribute("aria-labelledby")).toBe("authored-title");
    },
  );

  it.each(["before", "after"])(
    "honors an authored aria-label supplied %s enhancement",
    async (when) => {
      const { root, content } = fixture(when === "before" ? 'aria-label="Summary"' : "");
      content.setAttribute("aria-label", "Summary");
      await enhance(root);
      expect(content.hasAttribute("aria-labelledby")).toBe(false);
      expect(content.getAttribute("aria-label")).toBe("Summary");
    },
  );
});
