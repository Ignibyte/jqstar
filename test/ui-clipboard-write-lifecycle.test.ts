import { afterEach, expect, it, vi } from "vitest";
import { writeClipboard } from "../src/ui/clipboard-write";

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const originalExecCommand = Object.getOwnPropertyDescriptor(document, "execCommand");

afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
  if (originalExecCommand) Object.defineProperty(document, "execCommand", originalExecCommand);
  else Reflect.deleteProperty(document, "execCommand");
  vi.restoreAllMocks();
});

it("does not read the clipboard host after its owner has ended", async () => {
  const read = vi.fn(() => ({ writeText: vi.fn() }));
  Object.defineProperty(navigator, "clipboard", { configurable: true, get: read });

  await expect(writeClipboard(window, "private text", () => false)).resolves.toBe(false);
  expect(read).not.toHaveBeenCalled();
});

it("does not write when reading the clipboard host ends the owner", async () => {
  let active = true;
  const write = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    get() {
      active = false;
      return { writeText: write };
    },
  });

  await expect(writeClipboard(window, "private text", () => active)).resolves.toBe(false);
  expect(write).not.toHaveBeenCalled();
});

it("does not append a fallback control when creating it ends the owner", async () => {
  let active = true;
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  const createElement = Reflect.get(document, "createElement");
  vi.spyOn(document, "createElement").mockImplementation((tagName) => {
    const element = createElement.call(document, tagName);
    if (tagName === "textarea") active = false;
    return element;
  });
  const append = vi.spyOn(document.body, "append");

  await expect(writeClipboard(window, "private text", () => active)).resolves.toBe(false);
  expect(append).not.toHaveBeenCalled();
  expect(document.body.querySelector("textarea")).toBeNull();
});

it.each(["append", "selection", "legacy-command"] as const)(
  "removes the fallback control when %s ends the owner",
  async (boundary) => {
    let active = true;
    const copied = vi.fn(() => true);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      get() {
        if (boundary === "legacy-command") active = false;
        return copied;
      },
    });
    const nativeAppend = document.body.append.bind(document.body);
    vi.spyOn(document.body, "append").mockImplementation((...nodes) => {
      nativeAppend(...nodes);
      if (boundary === "append") active = false;
    });
    const nativeSelect = HTMLTextAreaElement.prototype.select;
    const select = vi.spyOn(HTMLTextAreaElement.prototype, "select").mockImplementation(function (
      this: HTMLTextAreaElement,
    ) {
      nativeSelect.call(this);
      if (boundary === "selection") active = false;
    });

    await expect(writeClipboard(window, "private text", () => active)).resolves.toBe(false);
    expect(copied).not.toHaveBeenCalled();
    expect(document.body.querySelector("textarea")).toBeNull();
    expect(select).toHaveBeenCalledTimes(boundary === "append" ? 0 : 1);
  },
);
