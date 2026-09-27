import { afterEach, expect, it, vi } from "vitest";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

const fixtures: Array<{ frame: HTMLIFrameElement; kernel: Kernel }> = [];

function fixture() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentDocument;
  if (!owner) throw new Error("Missing fixture document.");
  owner.body.innerHTML = "<main><section><button>Keep</button></section></main>";
  const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, owner);
  fixtures.push({ frame, kernel });
  const main = owner.querySelector("main");
  const root = owner.querySelector("section");
  const child = owner.querySelector("button");
  if (!main || !root || !child) throw new Error("Missing fixture nodes.");
  return {
    kernel,
    host: kernel.documentHost,
    main,
    root,
    child,
  };
}

afterEach(() => {
  for (const { frame, kernel } of fixtures.splice(0)) {
    if (!kernel.disposed) kernel.dispose();
    frame.remove();
  }
});

it("releases scoped work before removal once, preserving unscoped services", async () => {
  const { kernel, host, main, root } = fixture();
  const calls: boolean[] = [];
  const unscoped = vi.fn();
  const release = host.own("task", "scoped", () => calls.push(root.isConnected), root);
  host.own("service", "global", unscoped);
  expect(kernel.resourceSummary().find(({ owner }) => owner === "scoped")).toEqual({
    kind: "task",
    owner: "scoped",
  });
  const render = kernel.beginRender(main);
  render.beforeRemove(root);
  render.beforeRemove(root);
  expect(calls).toEqual([true]);
  expect(unscoped).not.toHaveBeenCalled();
  expect(host.canOwn?.(root)).toBe(false);
  expect(() => host.own("task", "too late", vi.fn(), root)).toThrow();
  root.remove();
  render.commit();
  await kernel.whenEnhanced();
  release();
  expect(calls).toEqual([true]);
  kernel.dispose();
  expect(unscoped).toHaveBeenCalledOnce();
});

it.each(["kept", "missing", "failed"])("handles %s promised preservation", async (mode) => {
  const { kernel, host, main, root, child } = fixture();
  const parentCleanup = vi.fn();
  const childCleanup = vi.fn();
  host.own("listener", "parent", parentCleanup, root);
  host.own("observer", "child", childCleanup, child);
  const render = kernel.beginRender(main, { preserveRoots: [child] });
  render.beforeRemove(root);
  expect(parentCleanup).toHaveBeenCalledOnce();
  expect(childCleanup).not.toHaveBeenCalled();
  expect(host.canOwn?.(child)).toBe(true);
  if (mode === "kept") main.append(child);
  root.remove();
  if (mode === "kept") render.commit();
  else if (mode === "missing") expect(() => render.commit()).toThrow("preserved");
  else expect(() => render.fail(new Error("host failed"))).toThrow();
  await kernel.whenEnhanced();
  expect(childCleanup).toHaveBeenCalledTimes(mode === "kept" ? 0 : 1);
  expect(host.canOwn?.(root)).toBe(true);
});

it("releases native removals but preserves same-document moves and detached acquisition", async () => {
  const { kernel, host, main, root, child } = fixture();
  const moved = vi.fn();
  const detached = host.document.createElement("aside");
  const detachedCleanup = vi.fn();
  host.own("listener", "move", moved, child);
  host.own("task", "detached", detachedCleanup, detached);
  main.append(child);
  root.remove();
  await kernel.whenEnhanced();
  expect(moved).not.toHaveBeenCalled();
  expect(detachedCleanup).not.toHaveBeenCalled();
  child.remove();
  await kernel.whenEnhanced();
  expect(moved).toHaveBeenCalledOnce();
  kernel.dispose();
  expect(detachedCleanup).toHaveBeenCalledOnce();
});

it("retains a temporarily detached preserved root until its render finishes", async () => {
  const { kernel, host, main, root } = fixture();
  const cleanup = vi.fn();
  host.own("observer", "preserved", cleanup, root);
  const render = kernel.beginRender(main, { preserveRoots: [root] });
  render.beforeRemove(root);
  root.remove();
  await Promise.resolve();
  await Promise.resolve();
  expect(cleanup).not.toHaveBeenCalled();
  main.append(root);
  render.commit();
  await kernel.whenEnhanced();
  expect(cleanup).not.toHaveBeenCalled();
});

it("does not retire a new detached acquisition for an earlier removal", async () => {
  const { kernel, host, root } = fixture();
  const old = vi.fn();
  const fresh = vi.fn();
  host.own("listener", "old", old, root);
  root.remove();
  host.own("listener", "fresh", fresh, root);
  await kernel.whenEnhanced();
  expect(old).toHaveBeenCalledOnce();
  expect(fresh).not.toHaveBeenCalled();
  kernel.dispose();
  expect(fresh).toHaveBeenCalledOnce();
});

it("rechecks ownership when draining earlier removals disposes the kernel", () => {
  const { kernel, host, root } = fixture();
  host.own("listener", "old", () => kernel.dispose(), root);
  root.remove();
  expect(() => host.own("listener", "fresh", vi.fn(), root)).toThrow();
  expect(kernel.resourceSummary()).toEqual([]);
});

it("does not register a scope after observer setup disposes the kernel", () => {
  const { kernel, host, root } = fixture();
  const Observer = (host.window as Window & typeof globalThis).MutationObserver;
  const observe = vi
    .spyOn(Observer.prototype, "observe")
    .mockImplementation(() => kernel.dispose());
  try {
    expect(() => host.own("listener", "interrupted", vi.fn(), root)).toThrow();
    expect(kernel.resourceSummary()).toEqual([]);
  } finally {
    observe.mockRestore();
  }
});

it("forgets an earlier removal while unrelated preservation is pending", async () => {
  const { kernel, host, main, root, child } = fixture();
  main.append(child);
  const old = vi.fn();
  const fresh = vi.fn();
  host.own("listener", "old", old, root);
  const render = kernel.beginRender(main, { preserveRoots: [child] });
  root.remove();
  host.own("listener", "fresh", fresh, root);
  host.own("listener", "another", vi.fn(), main);
  render.commit();
  await kernel.whenEnhanced();
  expect(old).toHaveBeenCalledOnce();
  expect(fresh).not.toHaveBeenCalled();
});

it("keeps overlapping removal barriers independent", async () => {
  const { kernel, host, main, root, child } = fixture();
  const outer = kernel.beginRender(main);
  const inner = kernel.beginRender(root);
  outer.beforeRemove(root);
  inner.beforeRemove(child);
  inner.commit();
  expect(host.canOwn?.(child)).toBe(false);
  outer.commit();
  expect(host.canOwn?.(child)).toBe(true);
  await kernel.whenEnhanced();
});

it("contains cleanup failure and reentry without skipping later resources or leaking barriers", async () => {
  const { kernel, host, main, root } = fixture();
  const calls: string[] = [];
  host.own("listener", "first", () => calls.push("first"), root);
  host.own(
    "observer",
    "throwing",
    () => {
      calls.push("throwing");
      expect(() => host.own("task", "reentry", vi.fn(), root)).toThrow();
      throw new Error("cleanup failure");
    },
    root,
  );
  const render = kernel.beginRender(main);
  render.beforeRemove(root);
  expect(calls).toEqual(["throwing", "first"]);
  expect(() => render.commit()).toThrow("cleanup failure");
  await kernel.whenEnhanced();
  expect(host.canOwn?.(root)).toBe(true);
  expect(kernel.resourceSummary().some(({ owner }) => owner === "reentry")).toBe(false);
});

it("rejects foreign scope and releases adopted roots only in their old owner", async () => {
  const first = fixture();
  const second = fixture();
  const cleanup = vi.fn();
  expect(first.host.canOwn?.(second.root)).toBe(false);
  expect(() => first.host.own("task", "foreign", cleanup, second.root)).toThrow();
  first.host.own("task", "adopted", cleanup, first.root);
  second.main.append(second.host.document.adoptNode(first.root));
  await first.kernel.whenEnhanced();
  expect(cleanup).toHaveBeenCalledOnce();
  expect(second.host.canOwn?.(first.root)).toBe(true);
});

it("abandons open barriers on disposal and rejects cleanup-time acquisition", () => {
  const { kernel, host, main, root } = fixture();
  let active: boolean | undefined;
  host.own(
    "task",
    "root",
    () => {
      active = host.canOwn?.(root);
      expect(() => host.own("task", "new", vi.fn(), root)).toThrow();
    },
    root,
  );
  kernel.beginRender(main);
  kernel.dispose();
  expect(active).toBe(false);
  expect(kernel.resourceSummary()).toEqual([]);
});

it("allows preserved-child acquisition from parent cleanup", async () => {
  const { kernel, host, main, root, child } = fixture();
  const cleanup = vi.fn();
  host.own(
    "listener",
    "parent",
    () => {
      host.own("listener", "kept child", cleanup, child);
    },
    root,
  );
  const render = kernel.beginRender(main, { preserveRoots: [child] });
  render.beforeRemove(root);
  main.append(child);
  root.remove();
  render.commit();
  await kernel.whenEnhanced();
  expect(cleanup).not.toHaveBeenCalled();
  kernel.dispose();
  expect(cleanup).toHaveBeenCalledOnce();
});

it("reports native cleanup errors after releasing siblings and refuses native cleanup reentry", async () => {
  const { kernel, host, root, child } = fixture();
  const sibling = vi.fn();
  host.own("task", "sibling", sibling, child);
  host.own(
    "listener",
    "throwing",
    () => {
      expect(host.canOwn?.(child)).toBe(false);
      expect(() => host.own("task", "reentry", vi.fn(), root)).toThrow();
      throw new Error("native cleanup failure");
    },
    root,
  );
  root.remove();
  await expect(kernel.whenEnhanced()).rejects.toThrow("native cleanup failure");
  expect(sibling).toHaveBeenCalledOnce();
  await expect(kernel.whenEnhanced()).resolves.toBeUndefined();
  expect(host.canOwn?.(root)).toBe(true);
});

it("releases a preserved root removed after commit while the enhancement barrier settles", async () => {
  const { kernel, host, main, root } = fixture();
  const cleanup = vi.fn();
  host.own("task", "kept", cleanup, root);
  const render = kernel.beginRender(main, { preserveRoots: [root] });
  render.commit();
  root.remove();
  await kernel.whenEnhanced();
  expect(cleanup).toHaveBeenCalledOnce();
});

it("blocks missing promised roots throughout incoming boot", async () => {
  const { kernel, host, main, root } = fixture();
  const incoming = host.document.createElement("aside");
  main.append(incoming);
  const boot = vi.fn(() => {
    expect(host.canOwn?.(root)).toBe(false);
    expect(() => host.own("task", "revival", vi.fn(), root)).toThrow();
  });
  const render = kernel.beginRender(main, { preserveRoots: [root], boot });
  root.remove();
  expect(() => render.commit([incoming])).toThrow("preserved");
  expect(boot).toHaveBeenCalledOnce();
  await kernel.whenEnhanced();
  expect(host.canOwn?.(root)).toBe(true);
});
