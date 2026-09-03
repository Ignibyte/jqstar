import { describe, expect, it, vi } from "vitest";
import {
  createPluginHost,
  satisfiesPluginVersionRange,
  type StarPlugin,
  type StarPluginDocumentHost,
  type StarPluginRegistrar,
} from "../src/plugin";
import { createDirectiveRegistry } from "../src/directive";
import { OperationHub, type StarOperationObservation } from "../src/observation";
import { createActionRegistry } from "../src/registry";
import { RequestMiddlewareRegistry } from "../src/request-middleware";
import { datastarProtocolProfile } from "../src/protocol-datastar";
import { genericProtocolProfile } from "../src/protocol-generic";
import { ProtocolProfileRegistry, type StarProtocolProfileDefinition } from "../src/protocol";
import type { StarContext, StarInstance } from "../src/types";

function plugin<Facade>(
  name: string,
  install: (registrar: StarPluginRegistrar) => Facade,
  overrides: Partial<Omit<StarPlugin<Facade>, "install" | "name">> = {},
): StarPlugin<Facade> {
  return {
    name,
    version: "1.0.0",
    apiVersion: "^0.1.0",
    ...overrides,
    install,
  };
}

function application(): StarInstance {
  return {
    mode: "behavior",
    root: document.createElement("main"),
    $root: {} as JQuery<Element>,
    state: {},
    computed: {},
    destroyed: false,
    observeOperations: vi.fn(() => vi.fn()),
    run: async () => undefined,
    refresh: vi.fn(),
    destroy: vi.fn(),
  };
}

function operationHub(): OperationHub {
  return new OperationHub((_owner, cleanup) => {
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      cleanup();
    };
  });
}

function context(instance: StarInstance): StarContext {
  return {
    $: {} as JQueryStatic,
    state: instance.state,
    computed: instance.computed,
    root: instance.root,
    $root: instance.$root,
    instance,
  };
}

function protocolProfile(id: string): StarProtocolProfileDefinition {
  return {
    id,
    compatibilityEvents: ["jquery-star:fetch"],
    prepareRequest(_input, writer) {
      writer.none();
    },
    adapters: [
      {
        id: "json",
        match: { kind: "exact", mediaType: "application/json" },
        async handle(_response, body) {
          await body.text();
        },
      },
    ],
    empty: () => undefined,
  };
}

describe("stable plugin version ranges", () => {
  it.each([
    ["1.2.3", "*", true],
    ["1.2.3", "1.2.3", true],
    ["1.2.4", "1.2.3", false],
    ["1.9.9", "^1.2.3", true],
    ["2.0.0", "^1.2.3", false],
    ["0.1.9", "^0.1.2", true],
    ["0.2.0", "^0.1.2", false],
    ["0.0.4", "^0.0.3", false],
    ["1.2.9", "~1.2.3", true],
    ["1.3.0", "~1.2.3", false],
    ["1.5.0", ">=1.2.3 <2.0.0", true],
    ["2.0.0", ">=1.2.3 <2.0.0", false],
    ["1.2.3", ">1.2.2", true],
    ["1.2.3", "<=1.2.3", true],
  ])("matches %s against %s", (version, range, expected) => {
    expect(satisfiesPluginVersionRange(version, range)).toBe(expected);
  });

  it.each(["", "^1.2", "1.2.3 || 2.0.0", "1.2.3-beta.1", ">=1.0.0 ^2.0.0"])(
    "rejects unsupported range %s",
    (range) => {
      expect(() => satisfiesPluginVersionRange("1.2.3", range)).toThrow();
    },
  );

  it("rejects unstable and incomplete plugin versions", () => {
    expect(() => satisfiesPluginVersionRange("1.2", "*")).toThrow("major.minor.patch");
    expect(() => satisfiesPluginVersionRange("1.2.3-beta.1", "*")).toThrow("major.minor.patch");
  });
});

describe("transactional plugin installation", () => {
  it("rejects document access when a host has no Document capability", () => {
    const host = createPluginHost(createActionRegistry());

    expect(() =>
      host.use(
        plugin("acme.document", (registrar) => {
          void registrar.documentHost.document;
          return {};
        }),
      ),
    ).toThrow("does not provide a Document");
    expect(() =>
      host.use(
        plugin("acme.window", (registrar) => {
          void registrar.documentHost.window;
          return {};
        }),
      ),
    ).toThrow("does not provide a Document");
    expect(host.names()).toEqual([]);
  });

  it("stages and cancels document resources without double cleanup", () => {
    const listenerRelease = vi.fn();
    const serviceRelease = vi.fn();
    const listen = vi.fn();
    const own = vi.fn();
    const documentHost: StarPluginDocumentHost = {
      document,
      window,
      listen(target, type, listener, options) {
        listen(target, type, listener, options);
        return listenerRelease;
      },
      observe: () => new MutationObserver(vi.fn()),
      own(kind, owner, cleanup) {
        own(kind, owner, cleanup);
        return serviceRelease;
      },
    };
    const host = createPluginHost(
      createActionRegistry(),
      createDirectiveRegistry(),
      undefined,
      undefined,
      undefined,
      documentHost,
    );
    const canceledCleanup = vi.fn();
    host.use(
      plugin("acme.cancelled", (registrar) => {
        registrar.documentHost.listen(document, "cancelled", vi.fn())();
        registrar.documentHost.own("service", "cancelled", canceledCleanup)();
        return {};
      }),
    );

    expect(listen).not.toHaveBeenCalled();
    expect(own).not.toHaveBeenCalled();
    expect(canceledCleanup).toHaveBeenCalledOnce();

    let cancelListener!: () => void;
    let cancelService!: () => void;
    host.use(
      plugin("acme.active", (registrar) => {
        cancelListener = registrar.documentHost.listen(document, "active", vi.fn());
        cancelService = registrar.documentHost.own("service", "active", vi.fn());
        return {};
      }),
    );
    expect(listen).toHaveBeenCalledOnce();
    expect(own).toHaveBeenCalledOnce();

    cancelListener();
    cancelListener();
    cancelService();
    cancelService();
    expect(listenerRelease).toHaveBeenCalledOnce();
    expect(serviceRelease).toHaveBeenCalledOnce();
    host.dispose();
  });

  it("commits request middleware in dependency order and removes it on plugin disposal", () => {
    const middleware = new RequestMiddlewareRegistry();
    const host = createPluginHost(
      createActionRegistry(),
      createDirectiveRegistry(),
      undefined,
      middleware,
    );
    const dependent = plugin(
      "acme.dependent",
      (registrar) => {
        registrar.requestMiddleware({
          id: "dependent",
          handle: (_request, _next, context) => context.complete(),
        });
        return {};
      },
      { dependencies: { "acme.base": "^1.0.0" } },
    );
    const base = plugin("acme.base", (registrar) => {
      registrar.requestMiddleware({
        id: "base",
        handle: (_request, _next, context) => context.complete(),
      });
      return {};
    });

    host.useMany([dependent, base]);

    expect(middleware.snapshot().map(({ id }) => id)).toEqual([
      "acme.base.base",
      "acme.dependent.dependent",
    ]);
    host.dispose();
    host.dispose();
    expect(middleware.snapshot()).toEqual([]);
    middleware.dispose();
  });

  it("rolls request middleware back with the complete plugin batch", () => {
    const middleware = new RequestMiddlewareRegistry();
    const host = createPluginHost(
      createActionRegistry(),
      createDirectiveRegistry(),
      undefined,
      middleware,
    );
    const cleanup = vi.fn();

    expect(() =>
      host.useMany([
        plugin("acme.valid", (registrar) => {
          registrar.requestMiddleware({
            id: "valid",
            handle: (_request, _next, context) => context.complete(),
          });
          registrar.cleanup(cleanup);
          return {};
        }),
        plugin("acme.invalid", (registrar) => {
          registrar.requestMiddleware({
            id: "invalid",
            before: ["acme.missing.target"],
            handle: (_request, _next, context) => context.complete(),
          });
          return {};
        }),
      ]),
    ).toThrow("unknown before target");

    expect(middleware.snapshot()).toEqual([]);
    expect(host.names()).toEqual([]);
    expect(cleanup).toHaveBeenCalledOnce();
    host.dispose();
    middleware.dispose();
  });

  it("commits protocol profiles with the plugin batch and removes them on disposal", () => {
    const protocols = new ProtocolProfileRegistry([
      genericProtocolProfile,
      datastarProtocolProfile,
    ]);
    const host = createPluginHost(
      createActionRegistry(),
      createDirectiveRegistry(),
      undefined,
      undefined,
      protocols,
    );
    host.use(
      plugin("acme.protocol", (registrar) => {
        registrar.protocolProfile(protocolProfile("acme.protocol.custom"));
        return {};
      }),
    );

    expect(protocols.select("acme.protocol.custom").id).toBe("acme.protocol.custom");
    host.dispose();
    host.dispose();
    expect(() => protocols.select("acme.protocol.custom")).toThrow("Unknown protocol profile");
    protocols.dispose();
  });

  it("rolls protocol profiles and every other staged surface back together", () => {
    const actions = createActionRegistry();
    const protocols = new ProtocolProfileRegistry([
      genericProtocolProfile,
      datastarProtocolProfile,
    ]);
    const host = createPluginHost(
      actions,
      createDirectiveRegistry(),
      undefined,
      undefined,
      protocols,
    );
    const cleanup = vi.fn();

    expect(() =>
      host.useMany([
        plugin("acme.valid", (registrar) => {
          registrar.action("acme.valid.run", vi.fn());
          registrar.protocolProfile(protocolProfile("acme.valid.profile"));
          registrar.cleanup(cleanup);
          return {};
        }),
        plugin("acme.invalid", (registrar) => {
          registrar.protocolProfile(protocolProfile("outside.profile.invalid"));
          return {};
        }),
      ]),
    ).toThrow("must be below plugin namespace");

    expect(actions.resolve("acme.valid.run")).toBeUndefined();
    expect(() => protocols.select("acme.valid.profile")).toThrow("Unknown protocol profile");
    expect(host.names()).toEqual([]);
    expect(cleanup).toHaveBeenCalledOnce();
    host.dispose();
    protocols.dispose();
  });

  it("commits operation observers with the plugin batch and releases them on disposal", async () => {
    const observations = operationHub();
    const host = createPluginHost(createActionRegistry(), createDirectiveRegistry(), observations);
    const records: StarOperationObservation[] = [];
    host.use(
      plugin("acme.observe", (registrar) => {
        registrar.observeOperations((observation) => {
          records.push(observation);
        });
        return {};
      }),
    );
    const instance = application();
    observations.trackApplication(instance);

    await observations.runAction(instance, "first", () => undefined, context(instance));
    expect(records.map(({ phase }) => phase)).toEqual(["started", "completed"]);

    host.dispose();
    host.dispose();
    await observations.runAction(instance, "second", () => undefined, context(instance));
    expect(records.map(({ phase }) => phase)).toEqual(["started", "completed"]);
    observations.dispose();
  });

  it("does not expose staged operation observers when a plugin batch rolls back", async () => {
    const observations = operationHub();
    const host = createPluginHost(createActionRegistry(), createDirectiveRegistry(), observations);
    const observer = vi.fn();
    const cleanup = vi.fn();
    expect(() =>
      host.useMany([
        plugin("acme.observe", (registrar) => {
          registrar.observeOperations(observer);
          registrar.cleanup(cleanup);
          return {};
        }),
        plugin("acme.failure", () => {
          throw new Error("plugin failed");
        }),
      ]),
    ).toThrow("plugin failed");
    const instance = application();
    observations.trackApplication(instance);

    await observations.runAction(instance, "after rollback", () => undefined, context(instance));
    expect(observer).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledOnce();
    host.dispose();
    observations.dispose();
  });

  it("commits staged directives and helpers with actions and the typed facade", () => {
    const actions = createActionRegistry();
    const extensions = createDirectiveRegistry();
    const host = createPluginHost(actions, extensions);
    const action = vi.fn();
    const mount = vi.fn();
    const format = vi.fn((value: string) => value.toUpperCase());
    const candidate = plugin("acme.audit", (registrar) => {
      registrar.action("acme.audit.run", action);
      registrar.directive({
        id: "acme.audit.label",
        match: { name: "data-acme.audit:label" },
        mount,
      });
      registrar.helper("acme.audit.format", format);
      return { format };
    });

    const facade = host.use(candidate);

    expect(facade.format).toBe(format);
    expect(actions.resolve("acme.audit.run")).toBe(action);
    expect(extensions.resolve("data-acme.audit:label")?.mount).toBe(mount);
    expect(
      (
        extensions.helpers() as {
          acme: { audit: { format: typeof format } };
        }
      ).acme.audit.format,
    ).toBe(format);
  });

  it("rolls back actions, extensions, facade, namespace, and cleanup on extension collision", () => {
    const actions = createActionRegistry();
    const extensions = createDirectiveRegistry();
    const host = createPluginHost(actions, extensions);
    const cleanup = vi.fn();
    const candidate = plugin("acme.audit", (registrar) => {
      registrar.action("acme.audit.run", vi.fn());
      registrar.directive({
        id: "acme.audit.all",
        match: { prefix: "data-acme.audit:" },
        mount: vi.fn(),
      });
      registrar.directive({
        id: "acme.audit.label",
        match: { name: "data-acme.audit:label" },
        mount: vi.fn(),
      });
      registrar.helper("acme.audit.format", vi.fn());
      registrar.cleanup(cleanup);
      return { leaked: true };
    });

    expect(() => host.use(candidate)).toThrow("matcher overlaps");
    expect(actions.resolve("acme.audit.run")).toBeUndefined();
    expect(actions.namespaces()).toEqual([]);
    expect(extensions.resolve("data-acme.audit:label")).toBeUndefined();
    expect(extensions.helpers()).toEqual({});
    expect(host.names()).toEqual([]);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("orders a complete dependency graph and returns facades in request order", () => {
    const actions = createActionRegistry();
    const host = createPluginHost(actions);
    const order: string[] = [];
    const firstAction = vi.fn();
    const first = plugin("acme.first", (registrar) => {
      order.push("first");
      registrar.action("acme.first.run", firstAction);
      return { source: "first" as const };
    });
    const second = plugin(
      "acme.second",
      (registrar) => {
        order.push("second");
        registrar.action("acme.second.run", vi.fn());
        return { source: "second" as const };
      },
      { dependencies: { "acme.first": "^1.0.0" } },
    );

    const [secondFacade, firstFacade] = host.useMany([second, first] as const);

    expect(order).toEqual(["first", "second"]);
    expect(firstFacade).toEqual({ source: "first" });
    expect(secondFacade).toEqual({ source: "second" });
    expect(host.names()).toEqual(["acme.first", "acme.second"]);
    expect(actions.namespaces()).toEqual(["acme.first", "acme.second"]);
    expect(actions.resolve("acme.first.run")).toBe(firstAction);
  });

  it("uses stable request order when graph nodes are otherwise independent", () => {
    const host = createPluginHost(createActionRegistry());
    const order: string[] = [];
    const third = plugin("acme.third", () => order.push("third"));
    const first = plugin("acme.first", () => order.push("first"));
    const second = plugin("acme.second", () => order.push("second"), {
      after: ["acme.first"],
      before: ["acme.third"],
    });

    host.useMany([third, first, second]);

    expect(order).toEqual(["first", "second", "third"]);
  });

  it("returns one facade for repeated object identity without comparing options", () => {
    const host = createPluginHost(createActionRegistry());
    const install = vi.fn(() => ({ identity: {} }));
    const first = plugin("acme.identity", install);

    const facade = host.use(first);
    (first as { version: string }).version = "invalid-after-install";
    host.lock();

    expect(host.use(first)).toBe(facade);
    expect(host.useMany([first, first] as const)).toEqual([facade, facade]);
    expect(install).toHaveBeenCalledOnce();
    expect(() => host.use(plugin("acme.identity", () => ({ identity: {} })))).toThrow(
      "another plugin object",
    );
  });

  it("rejects reentrant installation without leaking the inner or outer plugin", () => {
    const actions = createActionRegistry();
    const host = createPluginHost(actions);
    const outer = plugin("acme.outer", (registrar) => {
      registrar.action("acme.outer.run", vi.fn());
      host.use(plugin("acme.inner", () => ({})));
      return {};
    });

    expect(() => host.use(outer)).toThrow("cannot be reentrant");
    expect(host.names()).toEqual([]);
    expect(actions.names()).toEqual([]);
    expect(actions.namespaces()).toEqual([]);
  });

  it("rolls back current and earlier staged cleanup when a later installer throws", () => {
    const actions = createActionRegistry();
    const host = createPluginHost(actions);
    const order: string[] = [];
    const first = plugin("acme.first", (registrar) => {
      registrar.action("acme.first.run", vi.fn());
      registrar.cleanup(() => order.push("first-cleanup"));
      return {};
    });
    const second = plugin("acme.second", (registrar) => {
      registrar.action("acme.second.run", vi.fn());
      registrar.cleanup(() => order.push("second-cleanup"));
      throw new Error("installer failed");
    });

    expect(() => host.useMany([first, second])).toThrow("installer failed");
    expect(order).toEqual(["second-cleanup", "first-cleanup"]);
    expect(actions.names()).toEqual([]);
    expect(actions.namespaces()).toEqual([]);
    expect(host.names()).toEqual([]);
  });

  it("attempts every staged rollback callback and keeps the installer failure", () => {
    const host = createPluginHost(createActionRegistry());
    const installerFailure = new Error("installer failed");
    const cleanupFailure = new Error("cleanup failed");
    const completed = vi.fn();
    const candidate = plugin("acme.failure", (registrar) => {
      registrar.cleanup(completed);
      registrar.cleanup(() => {
        throw cleanupFailure;
      });
      throw installerFailure;
    });

    let failure: unknown;
    try {
      host.use(candidate);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([installerFailure, cleanupFailure]);
    expect(completed).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "missing dependency",
      [plugin("acme.consumer", () => ({}), { dependencies: { "acme.missing": "*" } })],
    ],
    [
      "incompatible dependency",
      [
        plugin("acme.base", () => ({})),
        plugin("acme.consumer", () => ({}), { dependencies: { "acme.base": "^2.0.0" } }),
      ],
    ],
    [
      "dependency cycle",
      [
        plugin("acme.first", () => ({}), { dependencies: { "acme.second": "*" } }),
        plugin("acme.second", () => ({}), { dependencies: { "acme.first": "*" } }),
      ],
    ],
    [
      "ordering cycle",
      [
        plugin("acme.first", () => ({}), { before: ["acme.second"] }),
        plugin("acme.second", () => ({}), { before: ["acme.first"] }),
      ],
    ],
    ["unknown order target", [plugin("acme.first", () => ({}), { after: ["acme.missing"] })]],
  ])("rejects a %s without invoking installers", (_name, candidates) => {
    const host = createPluginHost(createActionRegistry());
    const installs = candidates.map((candidate) => vi.spyOn(candidate, "install"));

    expect(() => host.useMany(candidates)).toThrow();
    for (const install of installs) expect(install).not.toHaveBeenCalled();
    expect(host.names()).toEqual([]);
  });

  it("rejects API, manifest, namespace, and ordering violations", () => {
    const host = createPluginHost(createActionRegistry());

    expect(() => host.use(plugin("acme.future", () => ({}), { apiVersion: "^1.0.0" }))).toThrow(
      "provides 0.1.0",
    );
    expect(() => host.use(plugin("ui.external", () => ({})))).toThrow("reserved");
    expect(() => host.use(plugin("core", () => ({})))).toThrow("reserved");
    expect(() => host.use(plugin("ui", () => ({})))).toThrow("reserved");
    expect(() => host.use(plugin("single", () => ({})))).toThrow("dot-qualified");
    expect(() => host.use(plugin("acme.bad", () => ({}), { version: "v1" }))).toThrow(
      "major.minor.patch",
    );
    expect(() => host.use(plugin("acme.self", () => ({}), { after: ["acme.self"] }))).toThrow(
      "cannot order itself",
    );

    const installed = plugin("acme.installed", () => ({}));
    host.use(installed);
    expect(() =>
      host.use(plugin("acme.early", () => ({}), { before: ["acme.installed"] })),
    ).toThrow("cannot be ordered before installed");
  });

  it("rejects malformed JavaScript manifest fields before installation", () => {
    const host = createPluginHost(createActionRegistry());
    const valid = plugin("acme.invalid", () => ({}));

    expect(() => host.use({ ...valid, version: 1 } as unknown as StarPlugin)).toThrow(
      "version must be a string",
    );
    expect(() => host.use({ ...valid, apiVersion: 1 } as unknown as StarPlugin)).toThrow(
      "needs an API version range",
    );
    expect(() => host.use({ ...valid, install: 1 } as unknown as StarPlugin)).toThrow(
      "needs an install function",
    );
    expect(() => host.use({ ...valid, dependencies: [] } as unknown as StarPlugin)).toThrow(
      "name-to-range record",
    );
    expect(() =>
      host.use({
        ...valid,
        dependencies: { "acme.dependency": 1 },
      } as unknown as StarPlugin),
    ).toThrow("needs a version range");
  });

  it("rejects malformed registrar calls and asynchronous installers", () => {
    const host = createPluginHost(createActionRegistry());
    expect(() =>
      host.use(
        plugin("acme.bad-action", (registrar) => {
          registrar.action(1 as unknown as string, null as unknown as () => void);
          return {};
        }),
      ),
    ).toThrow("need a name and function");
    expect(() =>
      host.use(
        plugin("acme.bad-hook", (registrar) => {
          registrar.application(null as unknown as () => void);
          return {};
        }),
      ),
    ).toThrow("application hook must be a function");
    expect(() =>
      host.use(
        plugin("acme.bad-activation", (registrar) => {
          registrar.activate(null as unknown as () => void);
          return {};
        }),
      ),
    ).toThrow("activation must be a function");
    expect(() =>
      host.use(
        plugin("acme.bad-activation-cleanup", (registrar) => {
          registrar.activate(() => "invalid" as unknown as () => void);
          return {};
        }),
      ),
    ).toThrow("activation returned an invalid cleanup");
    expect(() =>
      host.use(
        plugin("acme.bad-cleanup", (registrar) => {
          registrar.cleanup(null as unknown as () => void);
          return {};
        }),
      ),
    ).toThrow("cleanup must be a function");
    expect(() =>
      host.use(
        plugin("acme.bad-directive", (registrar) => {
          registrar.directive(null as unknown as Parameters<StarPluginRegistrar["directive"]>[0]);
          return {};
        }),
      ),
    ).toThrow("directive registrations must be objects");
    expect(() =>
      host.use(
        plugin("acme.bad-helper", (registrar) => {
          registrar.helper(1 as unknown as string, vi.fn());
          return {};
        }),
      ),
    ).toThrow("helper registrations need a string name");
    expect(() =>
      host.use(
        plugin("acme.bad-middleware", (registrar) => {
          registrar.requestMiddleware(
            null as unknown as Parameters<StarPluginRegistrar["requestMiddleware"]>[0],
          );
          return {};
        }),
      ),
    ).toThrow("request middleware registrations must be objects");
    expect(() =>
      host.use(
        plugin("acme.bad-profile", (registrar) => {
          registrar.protocolProfile(
            null as unknown as Parameters<StarPluginRegistrar["protocolProfile"]>[0],
          );
          return {};
        }),
      ),
    ).toThrow("protocol profile registrations must be objects");
    expect(() =>
      host.use(
        plugin("acme.async", async () => {
          await Promise.resolve();
          return {};
        }),
      ),
    ).toThrow("returned an asynchronous facade");
    expect(() => host.useMany([])).toThrow("at least one plugin");
  });

  it("accepts actions with application-specific state types", () => {
    const actions = createActionRegistry();
    const host = createPluginHost(actions);
    host.use(
      plugin("acme.typed", (registrar) => {
        registrar.action<{ count: number }>("acme.typed.increment", ({ state }) => state.count++);
        return {};
      }),
    );

    expect(actions.resolve("acme.typed.increment")).toBeTypeOf("function");
  });

  it("rolls back staged installers when action or namespace preparation fails", () => {
    const actions = createActionRegistry();
    const host = createPluginHost(actions);
    const cleanups: string[] = [];
    actions.register("acme.occupied.existing", vi.fn());
    const occupied = plugin("acme.occupied", (registrar) => {
      registrar.cleanup(() => cleanups.push("occupied"));
      return {};
    });

    expect(() => host.use(occupied)).toThrow("contains existing action");
    expect(cleanups).toEqual(["occupied"]);
    expect(host.names()).toEqual([]);
    expect(actions.namespaces()).toEqual([]);

    const outside = plugin("acme.outside", (registrar) => {
      registrar.action("another.namespace.run", vi.fn());
      registrar.cleanup(() => cleanups.push("outside"));
      return {};
    });
    expect(() => host.use(outside)).toThrow("outside its namespace");
    expect(cleanups).toEqual(["occupied", "outside"]);
  });

  it("rejects overlapping namespaces and duplicate staged actions atomically", () => {
    const actions = createActionRegistry();
    const host = createPluginHost(actions);
    host.use(plugin("acme.tools", () => ({})));

    expect(() => host.use(plugin("acme.tools.audit", () => ({})))).toThrow(
      "overlaps installed namespace",
    );
    expect(() =>
      host.use(
        plugin("acme.duplicate", (registrar) => {
          registrar.action("acme.duplicate.run", vi.fn());
          registrar.action("acme.duplicate.run", vi.fn());
          return {};
        }),
      ),
    ).toThrow("already registered");
    expect(host.names()).toEqual(["acme.tools"]);
  });

  it("closes new installation when locked and rejects all use after disposal", () => {
    const host = createPluginHost(createActionRegistry());
    const installed = plugin("acme.installed", () => ({}));
    host.use(installed);
    host.lock();

    expect(() => host.use(plugin("acme.late", () => ({})))).toThrow(
      "closes when the first application starts",
    );
    host.dispose();
    expect(() => host.use(installed)).toThrow("has been disposed");
  });

  it("invalidates the registrar after synchronous installation", () => {
    const host = createPluginHost(createActionRegistry());
    let registrar: StarPluginRegistrar | undefined;
    const candidate = plugin("acme.capture", (current) => {
      registrar = current;
      return {};
    });
    host.use(candidate);

    expect(() => registrar!.cleanup(vi.fn())).toThrow("after installation ended");
    expect(() =>
      registrar!.directive({
        id: "acme.capture.late",
        match: { name: "data-acme.capture:late" },
        mount: vi.fn(),
      }),
    ).toThrow("after installation ended");
    expect(() => registrar!.helper("acme.capture.late", vi.fn())).toThrow(
      "after installation ended",
    );
    expect(() => registrar!.observeOperations(vi.fn())).toThrow("after installation ended");
    expect(() => registrar!.protocolProfile(protocolProfile("acme.capture.late"))).toThrow(
      "after installation ended",
    );
  });
});

describe("plugin lifecycle", () => {
  it("runs application hooks in install order and cleanup once in reverse order", () => {
    const host = createPluginHost(createActionRegistry());
    const order: string[] = [];
    const first = plugin("acme.first", (registrar) => {
      registrar.application(() => {
        order.push("first-setup");
        return () => order.push("first-cleanup");
      });
      return {};
    });
    const second = plugin("acme.second", (registrar) => {
      registrar.application(() => {
        order.push("second-setup");
        return () => order.push("second-cleanup");
      });
      return {};
    });
    host.useMany([first, second]);

    const cleanup = host.applicationSetup(application());
    cleanup();
    cleanup();

    expect(order).toEqual(["first-setup", "second-setup", "second-cleanup", "first-cleanup"]);
  });

  it("rolls back earlier application hooks when a later hook fails", () => {
    const host = createPluginHost(createActionRegistry());
    const cleanup = vi.fn();
    host.useMany([
      plugin("acme.first", (registrar) => {
        registrar.application(() => cleanup);
        return {};
      }),
      plugin("acme.second", (registrar) => {
        registrar.application(() => {
          throw new Error("hook failed");
        });
        return {};
      }),
    ]);

    expect(() => host.applicationSetup(application())).toThrow("hook failed");
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("rejects invalid hook cleanup and attempts rollback cleanup failures", () => {
    const host = createPluginHost(createActionRegistry());
    const cleanupFailure = new Error("hook cleanup failed");
    const completed = vi.fn();
    host.use(
      plugin("acme.hooks", (registrar) => {
        registrar.application(() => completed);
        registrar.application(() => () => {
          throw cleanupFailure;
        });
        registrar.application(() => "invalid" as unknown as () => void);
        return {};
      }),
    );

    let failure: unknown;
    try {
      host.applicationSetup(application());
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors[1]).toBe(cleanupFailure);
    expect(completed).toHaveBeenCalledOnce();
  });

  it("runs every kernel cleanup once in reverse plugin and registration order", () => {
    const host = createPluginHost(createActionRegistry());
    const order: string[] = [];
    host.useMany([
      plugin("acme.first", (registrar) => {
        registrar.cleanup(() => order.push("first-a"));
        registrar.cleanup(() => order.push("first-b"));
        return {};
      }),
      plugin("acme.second", (registrar) => {
        registrar.cleanup(() => order.push("second"));
        return {};
      }),
    ]);

    host.dispose();
    host.dispose();

    expect(order).toEqual(["second", "first-b", "first-a"]);
  });

  it("attempts every kernel cleanup and aggregates failures", () => {
    const host = createPluginHost(createActionRegistry());
    const first = new Error("first");
    const second = new Error("second");
    const completed = vi.fn();
    host.use(
      plugin("acme.cleanup", (registrar) => {
        registrar.cleanup(() => {
          throw first;
        });
        registrar.cleanup(completed);
        registrar.cleanup(() => {
          throw second;
        });
        return {};
      }),
    );

    let failure: unknown;
    try {
      host.dispose();
    } catch (error) {
      failure = error;
    }
    expect((failure as AggregateError).errors).toEqual([second, first]);
    expect(completed).toHaveBeenCalledOnce();
    expect(() => host.dispose()).not.toThrow();
  });
});
