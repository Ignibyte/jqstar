import { createKernelMetadataAdapter } from "../src/metadata-adapter";
import $ from "jquery";
import Ajv2020 from "ajv/dist/2020.js";
import inspectionSchema from "../schema/inspection.schema.json";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore, type StarPlugin } from "../src/core";
import { attachInspector } from "../src/inspect";
import { defineStore, storesPlugin } from "../src/stores";
import { datastarPlugin } from "../src/datastar";
import { uiPlugin } from "../src/ui";
import { createFieldCodec, persistPlugin } from "../src/persist";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if ($.star) $.star.dispose();
  document.body.replaceChildren();
});

function install() {
  return installStarCore($, { document });
}
function mount() {
  const root = document.createElement("main");
  document.body.append(root);
  $(root).star({ state: { secret: "private-state" } });
  return $(root).star("instance")!;
}
function metadataPlugin(name: string, install: StarPlugin["install"]): StarPlugin {
  return { name, version: "1.0.0", apiVersion: "^0.1.0", install };
}

describe("explicit inspection", () => {
  it("validates real snapshots and exports against the closed published schema", async () => {
    const validate = new Ajv2020({ strict: true, allErrors: true }).compile(inspectionSchema);
    const installed = install();
    installed.star.action("saveRecord", () => undefined);
    const inspector = attachInspector($);
    expect(validate(inspector.snapshot()), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(inspector.exportTrace()), JSON.stringify(validate.errors)).toBe(true);
    inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 });
    inspector.allowField({
      field: "actionCapability",
      purpose: "debugging",
      maxLength: 32,
      retain: true,
      export: true,
      expiresInMs: 1000,
    });
    await mount().run("saveRecord");
    const trace = inspector.exportTrace();
    expect(validate(trace), JSON.stringify(validate.errors)).toBe(true);
    expect(validate(inspector.snapshot()), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...trace, url: "private-value" })).toBe(false);
    expect(validate({ ...trace, records: [{ ...trace.records[0], body: "private-value" }] })).toBe(
      false,
    );
    expect(validate({ ...trace, records: [{ ...trace.records[0], sequence: Infinity }] })).toBe(
      false,
    );
    installed.star.dispose();
    expect(validate(inspector.snapshot()), JSON.stringify(validate.errors)).toBe(true);
    inspector.dispose();
    expect(validate(inspector.snapshot()), JSON.stringify(validate.errors)).toBe(true);
  });

  it("attaches after boot without a trace subscription, timer or record", async () => {
    const installed = install();
    const instance = mount();
    const metadata = createKernelMetadataAdapter(installed);
    const before = metadata.read().ownership;
    const timer = vi.spyOn(globalThis, "setTimeout");
    const inspector = attachInspector($);
    expect(timer).not.toHaveBeenCalled();
    await instance.run(() => undefined);
    const snapshot = inspector.snapshot();
    expect(snapshot.kernel!.applications).toEqual([{ id: "application-1", mode: "behavior" }]);
    expect(snapshot.kernel!.ownership.subscription).toBe(before.subscription);
    expect(snapshot.kernel!.ownership.service).toBe(before.service + 1);
    expect(snapshot.trace).toMatchObject({ enabled: false, entries: 0, bytes: 0 });
    expect(snapshot.trace.counters.observed).toBe(0);
    expect(inspector.readTrace()).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain("private-state");
    expect(Object.isFrozen(snapshot.kernel!.applications[0])).toBe(true);
    inspector.dispose();
    expect(metadata.read().ownership).toEqual(before);
    await expect(instance.run(() => 7)).resolves.toBe(7);
  });

  it("shares one collector, protects trace control, and preserves identity across replacement", async () => {
    const installed = install();
    const first = attachInspector($);
    const second = attachInspector($);
    expect(createKernelMetadataAdapter(installed).read().ownership.service).toBe(1);
    first.enableTrace({ maxEntries: 20, maxBytes: 8192 });
    expect(() => second.enableTrace({ maxEntries: 1, maxBytes: 2 })).toThrow();
    expect(() => second.clearTrace()).toThrow();
    expect(() => second.disableTrace()).toThrow();
    const instance = mount();
    await instance.run(() => undefined);
    expect(second.readTrace()).toHaveLength(2);
    const identity = first.snapshot();
    expect(first.dispose()).toEqual(first.dispose());
    expect(second.snapshot().trace.enabled).toBe(false);
    second.enableTrace({ maxEntries: 20, maxBytes: 8192 });
    await instance.run(() => undefined);
    const records = second.readTrace();
    expect(records[0]!.sequence).toBeGreaterThan(identity.sequence);
    const last = second.snapshot();
    second.dispose();
    const replacement = attachInspector($);
    const next = replacement.snapshot();
    expect(next.kernelId).toBe(last.kernelId);
    expect(next.sequence).toBeGreaterThan(last.sequence);
    replacement.dispose();
  });

  it("filters and samples concurrent actions before exact bounded retention", async () => {
    install();
    const inspector = attachInspector($);
    inspector.enableTrace({
      maxEntries: 7,
      maxBytes: 1200,
      kinds: ["action"],
      outcomes: ["completed"],
      everyNth: 3,
    });
    const instance = mount();
    await Promise.all(Array.from({ length: 150 }, () => instance.run(() => 1)));
    const trace = inspector.exportTrace();
    expect(trace.trace.counters).toMatchObject({
      observed: 300,
      filtered: 150,
      sampled: 100,
      retained: 50,
    });
    expect(trace.records.length).toBeLessThanOrEqual(7);
    expect(new TextEncoder().encode(JSON.stringify(trace.records)).length).toBe(trace.trace.bytes);
    expect(trace.trace.bytes).toBeLessThanOrEqual(1200);
    expect(trace.trace.counters.evicted).toBe(50 - trace.records.length);
    const before = inspector.exportTrace();
    expect(inspector.exportTrace()).toEqual(before);
    expect(Object.isFrozen(trace.records[0])).toBe(true);
    inspector.clearTrace();
    expect(inspector.snapshot().trace.sequence).toBe(trace.trace.sequence);
    await Promise.all(Array.from({ length: 3 }, () => instance.run(() => 1)));
    expect(inspector.readTrace()[0]!.sequence).toBeGreaterThan(trace.trace.sequence);
  });

  it("refuses invalid options without disturbing an existing trace", async () => {
    install();
    const inspector = attachInspector($);
    inspector.enableTrace({ maxEntries: 1, maxBytes: 2 });
    const instance = mount();
    await instance.run(() => undefined);
    expect(inspector.snapshot().trace.counters.oversized).toBe(2);
    for (const options of [
      { maxEntries: 0, maxBytes: 20 },
      { maxEntries: 1, maxBytes: 1 },
      { maxEntries: 4097, maxBytes: 20 },
      { maxEntries: 1, maxBytes: 1048577 },
      { maxEntries: 1, maxBytes: 20, kinds: ["url"] },
      { maxEntries: 1, maxBytes: 20, everyNth: 0 },
      { maxEntries: 1, maxBytes: 20, filter: () => true },
    ]) {
      expect(() => inspector.enableTrace(options as never)).toThrow();
    }
    expect(inspector.snapshot().trace.maxBytes).toBe(2);
  });

  it("captures public request progress and completion without request or response values", async () => {
    const installed = install();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ secret: "private-response" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ETag: "private-validator" },
          }),
      ),
    );
    const inspector = attachInspector($);
    inspector.enableTrace({ maxEntries: 20, maxBytes: 8192, kinds: ["request"] });
    const instance = mount();
    await instance.run(
      installed.star.get("/private-path?token=private-query", {
        headers: { Authorization: "private-credential" },
      }),
    );
    const records = inspector.readTrace();
    expect(records.some((record) => record.phase === "started" && record.method === "GET")).toBe(
      true,
    );
    expect(records.some((record) => record.phase === "completed" && record.status === 200)).toBe(
      true,
    );
    expect(
      records.every((record) => record.kind === "request" && record.ownerId === "application-1"),
    ).toBe(true);
    expect(JSON.stringify(inspector.exportTrace())).not.toContain("private-");
    expect(inspector.snapshot().trace.counters.failures.capture).toBe(0);
    expect(new Ajv2020({ strict: true }).compile(inspectionSchema)(inspector.exportTrace())).toBe(
      true,
    );
  });

  it("bounds inventory rows, reports omissions and rolls metadata back with failed activation", () => {
    const installed = install();
    const inspector = attachInspector($);
    for (let index = 0; index < 260; index++) {
      installed.star.use(
        metadataPlugin(`test.count${index}`, (registrar) => {
          registrar.metadata!({
            namespace: `test.count${index}`,
            schema: "jqstar-service-counts/1",
            view: () =>
              Object.freeze({ boundary: "capabilities", counts: Object.freeze({ installed: 1 }) }),
            serialize: (view) => ({ schema: "jqstar-service-counts/1", ...view }),
          });
        }),
      );
    }
    expect(() =>
      installed.star.use(
        metadataPlugin("test.rollback", (registrar) => {
          registrar.metadata!({
            namespace: "test.rollback",
            schema: "jqstar-service-counts/1",
            view: () =>
              Object.freeze({ boundary: "capabilities", counts: Object.freeze({ installed: 1 }) }),
            serialize: (view) => ({ schema: "jqstar-service-counts/1", ...view }),
          });
          registrar.activate(() => {
            throw new Error("private-activation");
          });
        }),
      ),
    ).toThrow();
    for (let index = 0; index < 260; index++) mount();
    const snapshot = inspector.snapshot();
    expect(snapshot.kernel!.applications).toHaveLength(256);
    expect(snapshot.kernel!.plugins).toHaveLength(256);
    expect(snapshot.services).toHaveLength(32);
    expect(snapshot.omitted).toEqual({ applications: 4, plugins: 4, services: 228 });
    expect(JSON.stringify(snapshot)).not.toContain("test.rollback");
    expect(new TextEncoder().encode(JSON.stringify(snapshot)).byteLength).toBeLessThanOrEqual(
      262144,
    );
  });

  it("allows only future named capabilities and synchronously purges on revocation", async () => {
    const installed = install();
    installed.star.action("saveRecord", () => undefined);
    const inspector = attachInspector($);
    inspector.enableTrace({ maxEntries: 30, maxBytes: 16000 });
    const instance = mount();
    await instance.run("saveRecord");
    expect(JSON.stringify(inspector.readTrace())).not.toContain("saveRecord");
    inspector.allowField({
      field: "actionCapability",
      purpose: "debugging",
      maxLength: 20,
      retain: true,
      export: false,
      expiresInMs: 1000,
    });
    await instance.run("saveRecord");
    expect(
      inspector.readTrace().filter((record) => record.actionCapability === "saveRecord"),
    ).toHaveLength(2);
    expect(JSON.stringify(inspector.exportTrace())).not.toContain("saveRecord");
    const policyId = inspector.snapshot().trace.policyId;
    inspector.denyField("actionCapability");
    expect(JSON.stringify(inspector.readTrace())).not.toContain("saveRecord");
    expect(inspector.snapshot().trace.counters.purged).toBe(2);
    expect(inspector.snapshot().trace.policyId).toBeGreaterThan(policyId);
    expect(() =>
      inspector.allowField({
        field: "body",
        purpose: "support",
        maxLength: 96,
        retain: true,
        export: true,
        expiresInMs: 1000,
      } as never),
    ).toThrow();
    expect(inspector.snapshot().trace.policies).toEqual([]);
  });

  it("withholds expired data even before a delayed timer runs", async () => {
    vi.useFakeTimers();
    let now = 10000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const installed = install();
    installed.star.action("saveRecord", () => undefined);
    const inspector = attachInspector($);
    inspector.enableTrace({ maxEntries: 20, maxBytes: 16000 });
    inspector.allowField({
      field: "actionCapability",
      purpose: "support",
      maxLength: 96,
      retain: true,
      export: true,
      expiresInMs: 10,
    });
    const instance = mount();
    await instance.run("saveRecord");
    const before = inspector.snapshot().trace.entries;
    now = 10011;
    expect(JSON.stringify(inspector.exportTrace())).not.toContain("saveRecord");
    expect(inspector.snapshot().trace.entries).toBe(before);
    await vi.advanceTimersByTimeAsync(10);
    expect(inspector.snapshot().trace.counters.purged).toBe(2);
    inspector.disableTrace();
    expect(createKernelMetadataAdapter(installed).read().ownership.task).toBe(0);
  });

  it("contains serializer failures, recursion and hostile output without invoking getters", () => {
    const installed = install();
    const getter = vi.fn(() => {
      throw new Error("private-error");
    });
    const outputs: unknown[] = [
      Object.defineProperty({}, "boundary", { get: getter }),
      {
        schema: "jqstar-service-counts/1",
        boundary: "service-resources",
        counts: { token: "private-value" },
      },
      { schema: "jqstar-service-counts/1", boundary: "service-resources", counts: { records: -1 } },
    ];
    outputs.push({
      schema: "jqstar-service-counts/1",
      boundary: "service-resources",
      counts: outputs,
    });
    for (let index = 0; index < outputs.length; index++)
      installed.star.use(
        metadataPlugin(`test.bad${index}`, (registrar) => {
          registrar.metadata!({
            namespace: `test.bad${index}`,
            schema: "jqstar-service-counts/1",
            view: () =>
              Object.freeze({
                boundary: "service-resources",
                counts: Object.freeze({ records: 1 }),
              }),
            serialize: () => outputs[index],
          });
        }),
      );
    installed.star.use(
      metadataPlugin("test.recursive", (registrar) => {
        registrar.metadata!({
          namespace: "test.recursive",
          schema: "jqstar-service-counts/1",
          view: () => {
            inspector.snapshot();
            throw new Error("private-error");
          },
          serialize: () => null,
        });
      }),
    );
    const inspector = attachInspector($);
    const snapshot = inspector.snapshot();
    expect(snapshot.services).toEqual([]);
    expect(snapshot.omitted.services).toBe(5);
    expect(snapshot.trace.counters.failures).toMatchObject({ serializer: 5, reentrant: 1 });
    expect(getter).not.toHaveBeenCalled();
    expect(JSON.stringify(snapshot)).not.toContain("private-");
  });

  it("rejects duplicate/schema metadata before any plugin activation", () => {
    const installed = install();
    const activate = vi.fn();
    for (const duplicate of [false, true])
      expect(() =>
        installed.star.use(
          metadataPlugin("test.invalid", (registrar) => {
            registrar.activate(activate);
            const registration = {
              namespace: "test.invalid",
              schema: duplicate ? "jqstar-service-counts/1" : "wrong",
              view: () =>
                Object.freeze({
                  boundary: "capabilities",
                  counts: Object.freeze({ installed: 1 }),
                }),
              serialize: () => null,
            };
            registrar.metadata!(registration as never);
            if (duplicate) registrar.metadata!(registration as never);
          }),
        ),
      ).toThrow();
    expect(activate).not.toHaveBeenCalled();
    expect(createKernelMetadataAdapter(installed).read().pluginCount).toBe(0);
  });

  it("reports shipped service counts without exposing store or persistence data", async () => {
    const installed = install();
    installed.star.use(uiPlugin);
    installed.star.use(datastarPlugin);
    const stores = installed.star.use(storesPlugin);
    const persist = installed.star.use(persistPlugin);
    let finish!: () => void;
    stores.define(
      "preferences",
      defineStore({
        initial: { count: 1 },
        setup(context) {
          context.effect(() => {
            void context.store.count;
          });
          context.task(
            () =>
              new Promise<void>((resolve) => {
                finish = resolve;
              }),
          );
        },
      }),
    );
    const unsubscribe = stores.subscribe(
      "preferences",
      (value: { count: number }) => value.count,
      () => undefined,
    );
    persist.attach(
      "preferences",
      Object.freeze({
        namespace: "private-namespace",
        version: 1,
        codec: createFieldCodec([
          { path: "count", validate: (value) => typeof value === "number" },
        ]),
      }),
    );
    const inspector = attachInspector($);
    const snapshot = inspector.snapshot();
    expect(snapshot.kernel!.plugins.map(({ name }) => name)).toEqual([
      "ui",
      "core.datastar",
      "core.stores",
      "core.persist",
    ]);
    expect(snapshot.services.map(({ namespace }) => namespace)).toEqual([
      "core.stores",
      "core.persist",
    ]);
    expect(
      snapshot.services.find(({ namespace }) => namespace === "core.stores")!.counts,
    ).toMatchObject({ records: 1, effects: 1, tasks: 1, subscriptions: 2 });
    expect(
      snapshot.services.find(({ namespace }) => namespace === "core.persist")!.counts.attachments,
    ).toBe(1);
    expect(JSON.stringify(snapshot)).not.toMatch(/preferences|private-namespace/);
    finish();
    await installed.star.whenEnhanced();
    unsubscribe();
    expect(
      inspector.snapshot().services.find(({ namespace }) => namespace === "core.stores")!.counts
        .tasks,
    ).toBe(0);
  });

  it("retains only terminal counts after kernel cleanup and releases each lease independently", () => {
    const installed = install();
    const metadata = createKernelMetadataAdapter(installed);
    const inspector = attachInspector($);
    const other = attachInspector($);
    inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 });
    inspector.allowField({
      field: "storeName",
      purpose: "support",
      maxLength: 64,
      retain: true,
      export: true,
      expiresInMs: 1000,
    });
    const report = installed.star.dispose();
    const snapshot = other.snapshot();
    expect(snapshot.lifecycle).toBe("disposed");
    expect(snapshot.kernel).toBeNull();
    expect(snapshot.trace.entries).toBe(0);
    expect(Object.values(snapshot.disposal!.attempted).reduce((sum, count) => sum + count, 0)).toBe(
      report.attempted.length,
    );
    expect(Object.values(snapshot.disposal!.released).reduce((sum, count) => sum + count, 0)).toBe(
      report.released.length,
    );
    expect(() => metadata.read()).toThrow();
    inspector.dispose();
    expect(other.snapshot().disposal).not.toBeNull();
    other.dispose();
    expect(other.snapshot().disposal).toBeNull();
  });

  it("contains failed unsubscribe once and reports it through kernel disposal", () => {
    const installed = install();
    const access = installed.star.metadata();
    const cleanup = vi.fn(() => {
      throw new Error("private-cleanup-message");
    });
    vi.spyOn(installed.star, "metadata").mockReturnValue({
      ...access,
      observe(observer) {
        const release = access.observe(observer);
        return () => {
          release();
          cleanup();
        };
      },
    });
    const inspector = attachInspector($);
    inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 });
    expect(inspector.dispose()).toEqual({ schema: "jqstar-inspector-disposal/1", failures: 1 });
    expect(inspector.dispose().failures).toBe(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(
      access.inventory(
        () => undefined,
        () => undefined,
      )[2],
    ).toBe(0);
    const next = attachInspector($);
    next.enableTrace({ maxEntries: 10, maxBytes: 4096 });
    expect(() => installed.star.dispose()).toThrow("jQuery Star kernel disposal failed.");
    expect(next.snapshot().disposal!.failed.service).toBeGreaterThan(0);
    expect(JSON.stringify(next.snapshot())).not.toContain("private-cleanup-message");
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("clears trace and policies when expiry timer ownership fails", async () => {
    const installed = install();
    installed.star.action("saveRecord", () => undefined);
    const access = installed.star.metadata();
    vi.spyOn(installed.star, "metadata").mockReturnValue({
      ...access,
      own(kind, cleanup) {
        if (kind === "task") throw new Error("private-ownership-message");
        return access.own(kind, cleanup);
      },
    });
    const inspector = attachInspector($);
    inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 });
    expect(() =>
      inspector.allowField({
        field: "actionCapability",
        purpose: "support",
        retain: true,
        export: true,
        maxLength: 32,
        expiresInMs: 1000,
      }),
    ).toThrow("Invalid inspection configuration.");
    await mount().run("saveRecord");
    expect(inspector.snapshot().trace).toMatchObject({ enabled: false, entries: 0, policies: [] });
    expect(inspector.snapshot().trace.counters.failures.configuration).toBe(1);
    expect(inspector.readTrace()).toEqual([]);
  });

  it.each(["revocation", "expiry"] as const)(
    "clears all disclosure when rescheduling fails during %s",
    async (stage) => {
      vi.useFakeTimers();
      let now = 10000;
      vi.spyOn(performance, "now").mockImplementation(() => now);
      const installed = install();
      installed.star.action("saveRecord", () => undefined);
      const access = installed.star.metadata();
      let fail = false;
      vi.spyOn(installed.star, "metadata").mockReturnValue({
        ...access,
        own(kind, cleanup) {
          if (kind === "task" && fail) throw new Error("private-rescheduling-message");
          return access.own(kind, cleanup);
        },
      });
      const inspector = attachInspector($);
      inspector.enableTrace({ maxEntries: 20, maxBytes: 8192 });
      inspector.allowField({
        field: "actionCapability",
        purpose: "support",
        retain: true,
        export: true,
        maxLength: 32,
        expiresInMs: 10,
      });
      inspector.allowField({
        field: "storeName",
        purpose: "support",
        retain: true,
        export: true,
        maxLength: 32,
        expiresInMs: 20,
      });
      await mount().run("saveRecord");
      expect(JSON.stringify(inspector.readTrace())).toContain("saveRecord");
      fail = true;
      if (stage === "revocation") {
        expect(() => inspector.denyField("actionCapability")).toThrow(
          "Invalid inspection configuration.",
        );
      } else {
        now += 10;
        await vi.advanceTimersByTimeAsync(10);
      }
      const snapshot = inspector.snapshot();
      expect(snapshot.trace).toMatchObject({ enabled: false, entries: 0, policies: [] });
      expect(
        snapshot.trace.counters.failures[stage === "expiry" ? "capture" : "configuration"],
      ).toBe(1);
      expect(inspector.readTrace()).toEqual([]);
      expect(createKernelMetadataAdapter(installed).read().ownership.task).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
