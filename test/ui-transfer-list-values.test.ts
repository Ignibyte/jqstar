import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index";

afterEach(() => document.body.replaceChildren());

async function fixture(values: string[]): Promise<HTMLElement> {
  const root = document.createElement("section");
  root.dataset.jqs = "transfer-list";
  root.dataset.name = "assigned";
  root.dataset.value = JSON.stringify(values);
  root.innerHTML =
    '<select data-part="available" multiple></select><select data-part="selected" multiple></select>';
  const available = root.querySelector("select");
  if (!available) throw new Error("Missing native select.");
  for (const value of ["a", "b", "a\u0000b"]) {
    const option = document.createElement("option");
    option.value = value;
    available.append(option);
  }
  document.body.append(root);
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
  return root;
}

describe("Transfer List distinct values", () => {
  it.each(["set", "patch"])(
    "distinguishes separator-containing arrays through %s",
    async (operation) => {
      const root = await fixture(["a\u0000b"]);
      for (const values of [["a", "b"], ["a\u0000b"]]) {
        if (operation === "set") $.star.ui.transferList.set(root, values);
        else {
          root.dataset.value = JSON.stringify(values);
          $.star.ui.enhance(root);
          await $.star.whenEnhanced();
        }
        expect($.star.ui.transferList.value(root)).toEqual(values);
        expect(
          Array.from(
            root.querySelectorAll<HTMLInputElement>('input[name="assigned"]'),
            (input) => input.value,
          ),
        ).toEqual(values);
      }
    },
  );

  it("keeps unchanged arrays singular and preserves cancellation of a distinct change", async () => {
    const root = await fixture(["a\u0000b"]);
    const before = vi.fn((event: Event) => event.preventDefault());
    root.addEventListener("jquery-star:transfer-list:before-change", before);
    $.star.ui.transferList.set(root, ["a\u0000b"]);
    expect(before).not.toHaveBeenCalled();
    $.star.ui.transferList.set(root, ["a", "b"]);
    expect(before).toHaveBeenCalledOnce();
    expect($.star.ui.transferList.value(root)).toEqual(["a\u0000b"]);
  });
});
