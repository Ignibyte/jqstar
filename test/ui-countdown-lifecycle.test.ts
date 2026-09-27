import $ from "jquery";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "../src/index";

function part(root: HTMLElement, name: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!value) throw new Error(`Missing ${name} fixture part.`);
  return value;
}

function countdown(): HTMLElement {
  const root = document.createElement("section");
  root.dataset.jqs = "countdown";
  root.dataset.duration = "90061";
  root.dataset.paused = "true";
  root.innerHTML =
    '<span data-part="days"></span><span data-part="hours"></span><span data-part="minutes"></span><span data-part="seconds"></span><span data-part="value"></span><p data-part="status"></p>';
  return root;
}

async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers();
});
afterEach(() => {
  document.body.replaceChildren();
  vi.advanceTimersByTime(1000);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each(["all", "days", "hours", "minutes", "seconds", "value", "status"])(
  "updates current Countdown parts after replacing %s",
  async (name) => {
    const root = countdown();
    document.body.append(root);
    await enhance(root);
    const oldParts = Array.from(root.children);
    const replacement = countdown();
    if (name === "all") root.replaceChildren(...replacement.childNodes);
    else part(root, name).replaceWith(part(replacement, name));
    await enhance(root);
    expect(part(root, "days").textContent).toBe("1");
    for (const time of ["hours", "minutes", "seconds"]) {
      expect(part(root, time).textContent).toBe("01");
    }
    expect(part(root, "value").textContent).toBe("90061");
    expect(part(root, "status").getAttribute("aria-live")).toBe("polite");
    expect(part(root, "status").getAttribute("aria-atomic")).toBe("true");
    const oldText = oldParts.map((node) => node.textContent);
    $.star.ui.countdown.start(root, 2);
    vi.advanceTimersByTime(2000);
    expect(part(root, "seconds").textContent).toBe("00");
    expect(part(root, "status").textContent).toBe("Countdown complete.");
    expect($.star.ui.countdown.state(root).complete).toBe(true);
    oldParts.forEach((node, index) => {
      if (!root.contains(node)) expect(node.textContent).toBe(oldText[index]);
    });
  },
);

it("restarts one shared clock when a running root is reinserted after a detached tick", async () => {
  const root = countdown();
  document.body.append(root);
  await enhance(root);
  const interval = vi.spyOn(window, "setInterval");
  const cleared = vi.spyOn(window, "clearInterval");
  $.star.ui.countdown.start(root, 10);
  await enhance(root);
  await enhance(root);
  expect(interval).toHaveBeenCalledTimes(1);
  root.remove();
  vi.advanceTimersByTime(1000);
  expect(cleared).toHaveBeenCalledTimes(1);
  document.body.append(root);
  await enhance(root);
  await enhance(root);
  expect(interval).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(1000);
  // Read rendered output before the public state API, which also updates elapsed time.
  expect(part(root, "seconds").textContent).toBe("08");
  expect($.star.ui.countdown.state(root)).toMatchObject({ remaining: 8, paused: false });
});

it.each(["paused", "complete"])("keeps a reinserted %s countdown off the clock", async (state) => {
  const root = countdown();
  document.body.append(root);
  await enhance(root);
  if (state === "complete") $.star.ui.countdown.start(root, 0);
  root.remove();
  vi.advanceTimersByTime(1000);
  const interval = vi.spyOn(window, "setInterval");
  document.body.append(root);
  await enhance(root);
  await enhance(root);
  expect(interval).not.toHaveBeenCalled();
  expect($.star.ui.countdown.state(root)).toMatchObject(
    state === "paused" ? { paused: true, remaining: 90061 } : { complete: true, remaining: 0 },
  );
});
