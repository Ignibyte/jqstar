import { describe, expect, it, vi } from "vitest";
import {
  createDirectiveRegistry,
  directiveAttribute,
  parseDirectiveAttribute,
  type NamespacedExtensionSet,
  type StarDirective,
} from "../src/directive";

function directive(
  id: string,
  match: StarDirective["match"],
  overrides: Partial<StarDirective> = {},
): StarDirective {
  return {
    id,
    match,
    mount: vi.fn(),
    ...overrides,
  };
}

function registration(
  namespace: string,
  directives: readonly StarDirective[] = [],
  helpers: readonly (readonly [string, unknown])[] = [],
): NamespacedExtensionSet {
  return { namespace, directives, helpers };
}

describe("directive and helper registry", () => {
  it("starts with the migrated core directives and parses exact and prefix attributes", () => {
    const registry = createDirectiveRegistry();
    const text = registry.resolve("data-text")!;
    const destroy = registry.resolve("data-destroy")!;

    expect(registry.definitions().map(({ id }) => id)).toEqual(["core.text", "core.destroy"]);
    expect(text.priority).toBe(0);
    expect(destroy.priority).toBe(0);
    expect(registry.resolve("data-html")).toBeUndefined();
    expect(parseDirectiveAttribute(text, directiveAttribute(text, "data-text", "$count"))).toEqual({
      name: "data-text",
      suffix: "",
      value: "$count",
      parsed: "$count",
    });

    const extensions = createDirectiveRegistry();
    const prefixed = directive("acme.audit.attribute", { prefix: "data-acme.audit:" });
    extensions.preparePluginInstall([registration("acme.audit", [prefixed])])();
    expect(extensions.resolve("data-acme.audit:highlight")).toBeDefined();
    expect(directiveAttribute(prefixed, "data-acme.audit:highlight", "warning")).toEqual({
      name: "data-acme.audit:highlight",
      suffix: "highlight",
      value: "warning",
    });
  });

  it("prepares an immutable snapshot and exposes nothing before no-throw commit", () => {
    const registry = createDirectiveRegistry();
    const helperValue = { calls: 0 };
    const input = directive("acme.audit.label", { name: "data-acme.audit:label" }, { priority: 7 });
    const commit = registry.preparePluginInstall([
      registration("acme.audit", [input], [["acme.audit.formatLabel", helperValue]]),
    ]);

    expect(registry.resolve("data-acme.audit:label")).toBeUndefined();
    expect(registry.helpers()).toEqual({});
    expect(registry.resolveHelper("acme.audit.formatLabel")).toBeUndefined();
    (input as { priority: number }).priority = -4;
    commit();
    commit();

    const installed = registry.resolve("data-acme.audit:label")!;
    const helpers = registry.helpers() as {
      readonly acme: { readonly audit: { readonly formatLabel: typeof helperValue } };
    };
    expect(installed.priority).toBe(7);
    expect(Object.isFrozen(installed)).toBe(true);
    expect(Object.isFrozen(installed.match)).toBe(true);
    expect(Object.isFrozen(registry.definitions())).toBe(true);
    expect(Object.isFrozen(helpers)).toBe(true);
    expect(Object.isFrozen(helpers.acme)).toBe(true);
    expect(Object.isFrozen(helpers.acme.audit)).toBe(true);
    expect(Object.isFrozen(helperValue)).toBe(false);
    expect(helpers.acme.audit.formatLabel).toBe(helperValue);
    expect(registry.resolveHelper("acme.audit.formatLabel")).toEqual({
      name: "acme.audit.formatLabel",
      value: helperValue,
    });
    expect(Object.isFrozen(registry.resolveHelper("acme.audit.formatLabel"))).toBe(true);
  });

  it.each([
    [null, "registrations must be objects"],
    [{ id: "single", match: { name: "data-acme.audit:one" }, mount: vi.fn() }, "dot-qualified"],
    [
      { id: "other.audit.one", match: { name: "data-acme.audit:one" }, mount: vi.fn() },
      "outside its namespace",
    ],
    [{ id: "acme.audit.one", match: null, mount: vi.fn() }, "matcher must be an object"],
    [
      {
        id: "acme.audit.one",
        match: { name: "data-acme.audit:one", prefix: "data-acme.audit:" },
        mount: vi.fn(),
      },
      "exactly one name or prefix",
    ],
    [{ id: "acme.audit.one", match: { name: "aria-label" }, mount: vi.fn() }, "lowercase data-*"],
    [
      { id: "acme.audit.one", match: { prefix: "data-acme.audit" }, mount: vi.fn() },
      "end with a colon",
    ],
    [
      { id: "acme.audit.one", match: { name: "data-other.audit:one" }, mount: vi.fn() },
      "below its data-acme.audit:",
    ],
    [
      {
        id: "acme.audit.one",
        match: { name: "data-acme.audit:one" },
        priority: 1001,
        mount: vi.fn(),
      },
      "-1000 through 1000",
    ],
    [
      { id: "acme.audit.one", match: { name: "data-acme.audit:one" }, mount: true },
      "mount must be a function",
    ],
    [
      {
        id: "acme.audit.one",
        match: { name: "data-acme.audit:one" },
        mount: vi.fn(),
        parse: true,
      },
      "parse must be a function",
    ],
    [
      {
        id: "acme.audit.one",
        match: { name: "data-acme.audit:one" },
        mount: vi.fn(),
        update: true,
      },
      "update must be a function",
    ],
  ])("rejects invalid directive registration %#", (input, message) => {
    const registry = createDirectiveRegistry();
    expect(() =>
      registry.preparePluginInstall([
        registration("acme.audit", [input as unknown as StarDirective]),
      ]),
    ).toThrow(message as string);
    expect(registry.definitions()).toHaveLength(2);
  });

  it.each([
    [
      directive("acme.audit.same", { name: "data-acme.audit:one" }),
      directive("acme.audit.same", { name: "data-acme.audit:two" }),
      "ID",
    ],
    [
      directive("acme.audit.one", { name: "data-acme.audit:one" }),
      directive("acme.audit.two", { name: "data-acme.audit:one" }),
      "overlaps",
    ],
    [
      directive("acme.audit.all", { prefix: "data-acme.audit:" }),
      directive("acme.audit.one", { name: "data-acme.audit:one" }),
      "overlaps",
    ],
    [
      directive("acme.audit.group", { prefix: "data-acme.audit:group:" }),
      directive("acme.audit.all", { prefix: "data-acme.audit:" }),
      "overlaps",
    ],
  ])("rejects directive ID and matcher collisions %#", (first, second, message) => {
    const registry = createDirectiveRegistry();
    expect(() =>
      registry.preparePluginInstall([registration("acme.audit", [first, second])]),
    ).toThrow(message);
    expect(registry.resolve("data-acme.audit:one")).toBeUndefined();
  });

  it.each([
    [42, "dotted JavaScript identifiers"],
    ["acme.audit", "outside its namespace"],
    ["other.audit.format", "outside its namespace"],
    ["acme.audit.bad-name", "dotted JavaScript identifiers"],
    ["state.tools.format", "root state is reserved"],
    ["acme.audit.constructor", "segment constructor is reserved"],
  ])("rejects invalid helper registration %#", (name, message) => {
    const registry = createDirectiveRegistry();
    const namespace = String(name).startsWith("state.") ? "state.tools" : "acme.audit";
    expect(() =>
      registry.preparePluginInstall([registration(namespace, [], [[name as string, vi.fn()]])]),
    ).toThrow(message);
    expect(registry.helpers()).toEqual({});
  });

  it("rejects hyphenated helper namespaces and overlapping helper leaves", () => {
    const registry = createDirectiveRegistry();
    expect(() =>
      registry.preparePluginInstall([
        registration("acme.audit-tools", [], [["acme.auditTools.format", vi.fn()]]),
      ]),
    ).toThrow("outside its namespace");

    expect(() =>
      registry.preparePluginInstall([
        registration(
          "acme.audit",
          [],
          [
            ["acme.audit.format", vi.fn()],
            ["acme.audit.format.date", vi.fn()],
          ],
        ),
      ]),
    ).toThrow("overlaps");
  });

  it("merges sibling plugin helper namespaces and clears every committed extension", () => {
    const registry = createDirectiveRegistry();
    registry.preparePluginInstall([
      registration("acme.audit", [], [["acme.audit.format", "audit"]]),
      registration("acme.session", [], [["acme.session.current", "session"]]),
    ])();

    expect(registry.helpers()).toEqual({
      acme: {
        audit: { format: "audit" },
        session: { current: "session" },
      },
    });

    registry.clear();
    expect(registry.definitions()).toEqual([]);
    expect(registry.helpers()).toEqual({});
    expect(registry.resolveHelper("acme.audit.format")).toBeUndefined();
    expect(registry.resolveHelper("acme.session.current")).toBeUndefined();
  });
});
