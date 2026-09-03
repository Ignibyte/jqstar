import fc from "fast-check";
import { expect, it } from "vitest";

import { createPluginHost, satisfiesPluginVersionRange, type StarPlugin } from "../../src/plugin";
import { createDirectiveRegistry, type StarDirective } from "../../src/directive";
import { createActionRegistry } from "../../src/registry";
import { assertProperty } from "./helpers";

function version(major: number, minor: number, patch: number): string {
  return `${major}.${minor}.${patch}`;
}

function graphPlugin(name: string, dependency?: string): StarPlugin<string> {
  return {
    name,
    version: "1.0.0",
    apiVersion: "^0.1.0",
    ...(dependency ? { dependencies: { [dependency]: "^1.0.0" } } : {}),
    install: () => name,
  };
}

it("keeps generated caret ranges inside their stable upper boundary", () => {
  assertProperty(
    "plugin-caret-range-boundary",
    fc.property(
      fc.integer({ min: 0, max: 5 }),
      fc.integer({ min: 0, max: 10 }),
      fc.integer({ min: 0, max: 20 }),
      (major, minor, patch) => {
        const lower = version(major, minor, patch);
        const range = `^${lower}`;
        const upper =
          major > 0
            ? version(major + 1, 0, 0)
            : minor > 0
              ? version(0, minor + 1, 0)
              : version(0, 0, patch + 1);
        expect(satisfiesPluginVersionRange(lower, range)).toBe(true);
        expect(satisfiesPluginVersionRange(upper, range)).toBe(false);
      },
    ),
  );
});

it("orders every generated dependency chain before publishing facades", () => {
  assertProperty(
    "plugin-acyclic-dependency-order",
    fc.property(fc.integer({ min: 1, max: 12 }), (length) => {
      const names = Array.from({ length }, (_value, index) => `acme.p${index}`);
      const plugins = names.map((name, index) => graphPlugin(name, names[index - 1]));
      const requested = [...plugins].reverse();
      const host = createPluginHost(createActionRegistry());

      expect(host.useMany(requested)).toEqual([...names].reverse());
      expect(host.names()).toEqual(names);
    }),
  );
});

it("rejects every generated dependency cycle without publishing partial state", () => {
  assertProperty(
    "plugin-cyclic-dependency-rollback",
    fc.property(fc.integer({ min: 2, max: 12 }), (length) => {
      const actions = createActionRegistry();
      const host = createPluginHost(actions);
      const names = Array.from({ length }, (_value, index) => `acme.p${index}`);
      const plugins = names.map((name, index) =>
        graphPlugin(name, names[(index + 1) % names.length]),
      );

      expect(() => host.useMany(plugins)).toThrow("contains a cycle");
      expect(host.names()).toEqual([]);
      expect(actions.names()).toEqual([]);
      expect(actions.namespaces()).toEqual([]);
    }),
  );
});

it("rejects every generated exact attribute inside a claimed directive prefix", () => {
  assertProperty(
    "plugin-directive-matcher-overlap",
    fc.property(
      fc.integer({ min: 0, max: 10_000 }),
      fc.integer({ min: 0, max: 10_000 }),
      (group, leaf) => {
        const registry = createDirectiveRegistry();
        const prefix: StarDirective = {
          id: `acme.generated.group${group}`,
          match: { prefix: `data-acme.generated:group${group}:` },
          mount: () => undefined,
        };
        const exact: StarDirective = {
          id: `acme.generated.leaf${leaf}`,
          match: { name: `data-acme.generated:group${group}:leaf${leaf}` },
          mount: () => undefined,
        };

        expect(() =>
          registry.preparePluginInstall([
            { namespace: "acme.generated", directives: [prefix, exact], helpers: [] },
          ]),
        ).toThrow("matcher overlaps");
        expect(registry.definitions().map(({ id }) => id)).toEqual(["core.text", "core.destroy"]);
      },
    ),
  );
});

it("rejects every generated helper leaf and descendant as one overlapping path", () => {
  assertProperty(
    "plugin-helper-path-overlap",
    fc.property(
      fc.integer({ min: 0, max: 10_000 }),
      fc.integer({ min: 0, max: 10_000 }),
      (leaf, child) => {
        const registry = createDirectiveRegistry();
        const name = `acme.generated.helper${leaf}`;

        expect(() =>
          registry.preparePluginInstall([
            {
              namespace: "acme.generated",
              directives: [],
              helpers: [
                [name, leaf],
                [`${name}.child${child}`, child],
              ],
            },
          ]),
        ).toThrow("overlaps");
        expect(registry.helpers()).toEqual({});
      },
    ),
  );
});
