import { expect, it, vi } from "vitest";
import { createActionRegistry } from "../src/registry";

it("keeps direct action registration isolated by registry", () => {
  const first = createActionRegistry();
  const second = createActionRegistry();
  const firstAction = vi.fn();
  const secondAction = vi.fn();
  first.register("first", firstAction);
  second.register("second", secondAction);

  expect(first.resolve("first")).toBe(firstAction);
  expect(first.resolve("second")).toBeUndefined();
  expect(second.resolve("first")).toBeUndefined();
  expect(second.resolve("second")).toBe(secondAction);
});

it("preserves legacy overwrite behavior outside claimed plugin namespaces", () => {
  const actions = createActionRegistry();
  const first = vi.fn();
  const second = vi.fn();
  actions.register("legacy.save", first);
  actions.register("legacy.save", second);

  expect(actions.resolve("legacy.save")).toBe(second);
  expect(actions.namespaces()).toEqual([]);
});

it("prepares namespaced actions without publishing them before commit", () => {
  const actions = createActionRegistry();
  const run = vi.fn();
  const commit = actions.preparePluginInstall([
    { namespace: "acme.audit", actions: [["acme.audit.run", run]] },
  ]);

  expect(actions.resolve("acme.audit.run")).toBeUndefined();
  expect(actions.namespaces()).toEqual([]);

  commit();
  commit();
  expect(actions.resolve("acme.audit.run")).toBe(run);
  expect(actions.namespaces()).toEqual(["acme.audit"]);
  expect(() => actions.register("acme.audit.other", vi.fn())).toThrow(
    "belongs to the installed plugin namespace acme.audit",
  );
});

it("rejects a conflicting namespaced snapshot without changing live actions", () => {
  const actions = createActionRegistry();
  const legacy = vi.fn();
  actions.register("acme.audit.legacy", legacy);

  expect(() =>
    actions.preparePluginInstall([
      { namespace: "acme.audit", actions: [["acme.audit.run", vi.fn()]] },
    ]),
  ).toThrow("contains existing action acme.audit.legacy");
  expect(actions.resolve("acme.audit.legacy")).toBe(legacy);
  expect(actions.namespaces()).toEqual([]);
});
