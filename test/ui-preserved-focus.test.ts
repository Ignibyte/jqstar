import { createRequire } from "node:module";
import { afterEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const stars: ReturnType<typeof installStarCore>["star"][] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0)) star.dispose();
  document.body.replaceChildren();
});
function fixture() {
  const installed = installStarCore(jQueryFactory(window), { document });
  stars.push(installed.star);
  const app = document.createElement("main");
  const root = document.createElement("section");
  const target = document.createElement("button");
  const outside = document.createElement("button");
  root.append(target);
  app.append(root, outside);
  document.body.append(app);
  target.focus();
  const adapter = createRenderAdapter(installed);
  const transaction = adapter.begin(app, { preserveRoots: [root] });
  transaction.beforeRemove(root);
  root.remove();
  app.prepend(root);
  const focus = target.focus.bind(target);
  let ready = false;
  vi.spyOn(target, "focus").mockImplementation((options) => {
    if (ready) focus(options);
  });
  return {
    installed,
    adapter,
    transaction,
    app,
    target,
    outside,
    ready: () => {
      ready = true;
    },
  };
}
it("restores preserved focus once enhancement makes the target focusable", async () => {
  const value = fixture();
  queueMicrotask(value.ready);
  await value.transaction.commit();
  expect(document.activeElement).toBe(value.target);
});
it("keeps newer focus while a preserved target becomes focusable", async () => {
  const value = fixture();
  queueMicrotask(() => {
    value.ready();
    value.outside.focus();
  });
  await value.transaction.commit();
  expect(document.activeElement).toBe(value.outside);
});
it("does not retry focus from a superseded render", async () => {
  const value = fixture();
  let newer: Promise<void> | undefined;
  queueMicrotask(() => {
    value.ready();
    newer = value.adapter.begin(value.app).commit();
  });
  await value.transaction.commit();
  await newer;
  expect(document.activeElement).toBe(document.body);
});
it("does not retry when a focus callback deliberately blurs the restored target", async () => {
  const value = fixture();
  value.ready();
  value.target.addEventListener("focus", () => value.target.blur(), { once: true });
  await value.transaction.commit();
  expect(document.activeElement).toBe(document.body);
  expect(value.target.focus).toHaveBeenCalledOnce();
});
it("reports a deferred focus failure through the enhancement barrier", async () => {
  const value = fixture();
  vi.mocked(value.target.focus)
    .mockImplementationOnce(() => undefined)
    .mockImplementationOnce(() => {
      throw new Error("retry focus failure");
    });
  await expect(value.transaction.commit()).rejects.toThrow();
});
it.each(["removed", "adopted", "disposed"] as const)(
  "does not retry a %s focus target",
  async (mode) => {
    const value = fixture();
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const foreign = frame.contentDocument;
    if (!foreign) throw new Error("Missing foreign document");
    queueMicrotask(() => {
      value.ready();
      if (mode === "removed") value.target.remove();
      else if (mode === "adopted") foreign.body.append(foreign.adoptNode(value.target));
      else value.installed.star.dispose();
    });
    await value.transaction.commit();
    expect(value.target.focus).toHaveBeenCalledOnce();
    expect(foreign.activeElement).toBe(foreign.body);
  },
);
it("releases a focus listener registered just before acquisition throws", async () => {
  const value = fixture();
  const add = value.target.addEventListener.bind(value.target);
  const remove = vi.spyOn(value.target, "removeEventListener");
  vi.spyOn(value.target, "addEventListener").mockImplementationOnce((type, listener, options) => {
    add(type, listener, options);
    throw new Error("focus listener acquisition failure");
  });
  await expect(value.transaction.commit()).rejects.toThrow();
  expect(remove).toHaveBeenCalledWith("focus", expect.any(Function), true);
});
it("releases a focus listener when its registration disposes the render owner", async () => {
  const value = fixture();
  value.ready();
  const add = value.target.addEventListener.bind(value.target);
  const remove = vi.spyOn(value.target, "removeEventListener");
  vi.spyOn(value.target, "addEventListener").mockImplementationOnce((type, listener, options) => {
    add(type, listener, options);
    value.installed.star.dispose();
  });
  await value.transaction.commit();
  expect(value.target.focus).not.toHaveBeenCalled();
  expect(remove).toHaveBeenCalledWith("focus", expect.any(Function), true);
});
