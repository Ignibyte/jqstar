import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(owner: Window): JQueryStatic;
};
const kinds = [
  "calendar",
  "range-calendar",
  "date-picker",
  "date-range-picker",
  "carousel",
  "chart",
  "color-picker",
  "combobox",
  "clipboard",
  "code-block",
  "data-table",
  "collapsible",
  "accordion",
  "editable",
  "feed",
  "file-upload",
  "form",
  "hover-card",
  "dialog",
  "input-otp",
  "json-viewer",
  "log-viewer",
  "menu",
  "context-menu",
  "menubar",
  "message-scroller",
  "multi-select",
  "number-field",
  "pagination",
  "password-field",
  "popover",
  "questionnaire",
  "rating",
  "resizable",
  "search-field",
  "select",
  "sidebar",
  "sortable",
  "stepper",
  "tabs",
  "tags-input",
  "time-picker",
  "toast",
  "toggle",
  "toggle-group",
  "toolbar",
  "tooltip",
  "transfer-list",
  "tree",
] as const;
function replacement(kind: (typeof kinds)[number], wholeRoot = false) {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const $ = installStarCore(jQueryFactory(owner), { document: owner.document });
  const ui = $.star.use(uiPlugin);
  try {
    owner.document.body.innerHTML =
      kind === "toast"
        ? '<div data-jqs="toast-viewport"><div data-jqs="toast" data-duration="0"><p data-part="title">Saved</p><button data-part="close">Close</button></div></div>'
        : readFileSync(
            "registry/components/" + (kind === "menu" ? "dropdown-menu" : kind) + ".html",
            "utf8",
          );
    const root = owner.document.querySelector<HTMLElement>('[data-jqs="' + kind + '"]');
    if (!root) throw new Error("Missing registry root " + kind);
    const wrapper = owner.document.createElement("section");
    root.replaceWith(wrapper);
    wrapper.append(root);
    const old = wholeRoot ? [root] : Array.from(root.children);
    const native = owner.MutationObserver.prototype.observe;
    let entered = false;
    let snapshots: string[] = [];
    let completed = false;
    vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
      this: MutationObserver,
      ...args
    ) {
      entered = true;
      if (wholeRoot) root.replaceWith(root.cloneNode(true));
      else root.replaceChildren(...Array.from(root.children, (part) => part.cloneNode(true)));
      ui.enhance(wholeRoot ? wrapper : root);
      snapshots = old.map((part) => part.outerHTML);
      completed = true;
      native.apply(this, args);
    });
    let error: unknown;
    try {
      ui.enhance(root);
    } catch (caught) {
      error = caught;
    }
    expect(entered, "acquired native observer").toBe(true);
    expect(completed, "replacement enhancement completed").toBe(true);
    expect(
      old.map((part) => part.outerHTML),
      "retired parts",
    ).toEqual(snapshots);
    // An interrupted old acquisition may reject after replacement completed.
    if (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("cannot acquire resources");
    }
  } finally {
    vi.restoreAllMocks();
    $.star.dispose();
    frame.remove();
  }
}
it.each(kinds)("%s retires replaced children during first observer acquisition", (kind) =>
  replacement(kind),
);
it.each(["popover", "tooltip", "hover-card", "menu", "context-menu"] as const)(
  "%s leaves uninitialized removed root untouched",
  (kind) => replacement(kind, true),
);
