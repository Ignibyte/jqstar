import { expect, it, vi } from "vitest";
import { hideFloating, prepareFloating, showFloating } from "../src/ui/floating";

it("uses native popovers and tolerates dismissal after detachment", () => {
  const content = Object.assign(document.createElement("div"), {
    showPopover: vi.fn(),
    hidePopover: vi.fn(),
  });
  prepareFloating(content);
  expect(content.getAttribute("popover")).toBe("manual");
  expect(content.style.margin).toBe("0px");
  showFloating(content);
  expect(content.showPopover).toHaveBeenCalledOnce();
  hideFloating(content);
  expect(content.hidePopover).toHaveBeenCalledOnce();
  content.hidePopover.mockImplementationOnce(() => {
    throw new DOMException("Detached popover", "InvalidStateError");
  });
  expect(() => hideFloating(content)).not.toThrow();
  expect(content.hidePopover).toHaveBeenCalledTimes(2);
});

it("uses native hidden state when popover methods are unavailable", () => {
  const content = document.createElement("div");
  content.hidden = true;
  showFloating(content);
  expect(content.hidden).toBe(false);
  hideFloating(content);
  expect(content.hidden).toBe(true);
});
