import $ from "jquery";
import { afterEach, expect, it, vi } from "vitest";
import {
  installStarCore,
  type StarKernelMetadataAccess,
  type StarOperationObservation,
} from "../src/core";
import { attachInspector } from "../src/inspect";
import { project } from "../src/inspect/redaction";
import { Collector } from "../src/inspect/collector";
import { Trace } from "../src/inspect/trace";
import { createKernelMetadataAdapter } from "../src/metadata-adapter";
import { defineStore, storesPlugin } from "../src/stores";
import { TrustedKernel } from "./helpers/trusted-kernel";

afterEach(() => {
  vi.restoreAllMocks();
  if ($.star) $.star.dispose();
  document.body.replaceChildren();
});

function install(
  overrides?: (access: StarKernelMetadataAccess) => Partial<StarKernelMetadataAccess>,
) {
  const installed = installStarCore($, { document });
  const access = installed.star.metadata();
  if (overrides)
    vi.spyOn(installed.star, "metadata").mockReturnValue({ ...access, ...overrides(access) });
  return installed;
}

it("returns empty immutable exports after lease release and kernel disposal", () => {
  const installed = install();
  const released = attachInspector($);
  released.dispose();
  const terminal = attachInspector($);
  installed.star.dispose();
  for (const inspector of [released, terminal]) {
    const exported = inspector.exportTrace();
    expect(exported.records).toEqual([]);
    expect(exported.trace.enabled).toBe(false);
    expect(Object.isFrozen(exported)).toBe(true);
    expect(Object.isFrozen(exported.records)).toBe(true);
  }
});

it("rejects missing metadata and invalid kernel versions before retaining an attachment", () => {
  expect(() => attachInspector({} as JQueryStatic)).toThrow("no kernel metadata");
  const metadata = vi.fn();
  expect(() =>
    createKernelMetadataAdapter({
      star: { version: "private-version", metadata },
    } as unknown as JQueryStatic),
  ).toThrow("version is invalid");
  expect(metadata).not.toHaveBeenCalled();
});

it("unsubscribes final notifications and isolates throwing final observers", () => {
  const installed = install();
  const access = installed.star.metadata();
  const removed = vi.fn();
  const observed = vi.fn(() => {
    throw new Error("private-finalizer");
  });
  const release = access.onDisposed(removed);
  release();
  release();
  access.onDisposed(observed);
  const report = installed.star.dispose();
  expect(removed).not.toHaveBeenCalled();
  expect(observed).toHaveBeenCalledExactlyOnceWith(report);
  expect(report.failed).toEqual([]);
});

it("rolls back invalid and unowned metadata attachments exactly once", () => {
  const installed = install((access) => ({
    own(kind, cleanup) {
      if (kind === "service") throw new Error("private-own-failure");
      return access.own(kind, cleanup);
    },
  }));
  const adapter = createKernelMetadataAdapter(installed);
  const dispose = vi.fn();
  for (const [name, version] of [
    ["invalid name", "1"],
    ["valid", "0"],
  ]) {
    expect(() => adapter.acquire(name!, version!, () => ({ value: 1, dispose }))).toThrow(
      "identity is invalid",
    );
  }
  expect(() => adapter.acquire("valid", "1", () => ({ value: 1 }) as never)).toThrow(
    "cleanup capability",
  );
  expect(() => adapter.acquire("valid", "1", () => ({ value: 1, dispose }))).toThrow(
    "private-own-failure",
  );
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(adapter.read().ownership.service).toBe(0);
});

it("releases a newly acquired collector when opening a client fails", () => {
  const installed = install();
  vi.spyOn(Collector.prototype, "open").mockImplementationOnce(() => {
    throw new Error("open failed");
  });
  expect(() => attachInspector($)).toThrow("open failed");
  expect(createKernelMetadataAdapter(installed).read().ownership.service).toBe(0);
  const inspector = attachInspector($);
  expect(inspector.snapshot().lifecycle).toBe("active");
  inspector.dispose();
});

it("rolls back tracing when observation subscription fails and permits recovery", () => {
  let fail = true;
  install((access) => ({
    observe(observer) {
      if (fail) throw new Error("private-subscription");
      return access.observe(observer);
    },
  }));
  const inspector = attachInspector($);
  expect(() => inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 })).toThrow(
    "Invalid inspection configuration",
  );
  expect(inspector.snapshot().trace).toMatchObject({ enabled: false, entries: 0 });
  expect(inspector.snapshot().trace.counters.failures.configuration).toBe(1);
  fail = false;
  inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 });
  expect(inspector.snapshot().trace.enabled).toBe(true);
});

it("counts malformed observations without retaining them or interrupting their publisher", () => {
  let publish: (event: StarOperationObservation) => void = () => undefined;
  install(() => ({
    observe(observer) {
      publish = (event) => {
        void observer(event);
      };
      return () => undefined;
    },
  }));
  const inspector = attachInspector($);
  inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 });
  expect(() => publish({ kind: "unknown" } as never)).not.toThrow();
  expect(() => publish({ kind: "action", phase: "started" } as never)).not.toThrow();
  expect(inspector.readTrace()).toEqual([]);
  expect(inspector.snapshot().trace.counters.failures.capture).toBe(2);
  publish({
    schema: "jquery-star-operation/1",
    kind: "action",
    phase: "cancelled",
    id: "operation-1",
    owner: { id: "application-1", mode: "behavior" },
  } as StarOperationObservation);
  expect(inspector.readTrace()).toMatchObject([{ outcome: "cancelled", phase: "cancelled" }]);
});

it("withholds disclosure and counts an unavailable monotonic clock", async () => {
  const installed = install();
  installed.star.action("clockProbe", () => undefined);
  const inspector = attachInspector($);
  inspector.enableTrace({ maxEntries: 10, maxBytes: 4096, kinds: ["action"] });
  inspector.allowField({
    field: "actionCapability",
    purpose: "support",
    maxLength: 32,
    retain: true,
    export: true,
    expiresInMs: 1000,
  });
  const root = document.createElement("main");
  document.body.append(root);
  $(root).star({ state: {} });
  const instance = $(root).star("instance")!;
  await instance.run("clockProbe");
  expect(JSON.stringify(inspector.readTrace())).toContain("clockProbe");
  vi.spyOn(performance, "now").mockImplementation(() => {
    throw new Error("private-clock");
  });
  expect(inspector.snapshot().trace.policies).toEqual([]);
  expect(inspector.exportTrace().trace.counters.failures.clock).toBeGreaterThan(0);
  expect(inspector.readTrace()).toEqual([]);
  expect(() => inspector.enableTrace({ maxEntries: 1, maxBytes: 2 })).toThrow(
    "Invalid inspection configuration",
  );
});

it("contains failed trace projection and leaves an immutable empty export", () => {
  install();
  const inspector = attachInspector($);
  inspector.enableTrace({ maxEntries: 10, maxBytes: 4096 });
  const failure = vi.spyOn(Trace.prototype, "records").mockImplementation(() => {
    throw new Error("private-export");
  });
  expect(inspector.readTrace()).toEqual([]);
  const exported = inspector.exportTrace();
  expect(exported.records).toEqual([]);
  expect(exported.trace.enabled).toBe(false);
  expect(Object.isFrozen(exported)).toBe(true);
  expect(JSON.stringify(exported)).not.toContain("private-export");
  failure.mockRestore();
  expect(inspector.snapshot().trace.counters.failures.export).toBe(2);
  expect(inspector.snapshot().trace.enabled).toBe(true);
});

it("contains an unavailable inventory without retaining its error", () => {
  install(() => ({
    inventory() {
      throw new Error("private-inventory");
    },
  }));
  const inspector = attachInspector($);
  const snapshot = inspector.snapshot();
  expect(snapshot.kernel).toBeNull();
  expect(snapshot.services).toEqual([]);
  expect(snapshot.trace.counters.failures.export).toBe(1);
  expect(JSON.stringify(snapshot)).not.toContain("private-inventory");
});

it("rolls back store resource counts when subscription or task ownership is refused", async () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const kernel = new TrustedKernel($, frame.contentDocument!);
  const ownershipError = new Error("private-store-owner");
  vi.spyOn(kernel.documentHost as Required<typeof kernel.documentHost>, "task").mockImplementation(
    () => {
      throw ownershipError;
    },
  );
  const facade = kernel.plugins.use(storesPlugin);
  const own = vi.spyOn(kernel.documentHost, "own");
  own.mockImplementationOnce(() => {
    throw ownershipError;
  });
  expect(() =>
    facade.define(
      "subscriptionFailure",
      defineStore({
        initial: { count: 0 },
        setup(context) {
          context.subscribe(
            (store) => store.count,
            () => undefined,
          );
        },
      }),
    ),
  ).toThrow();
  expect(() =>
    facade.define(
      "taskFailure",
      defineStore({
        initial: {},
        setup(context) {
          context.task(() => Promise.reject(new Error("private-task")));
        },
      }),
    ),
  ).toThrow();
  await Promise.resolve();
  await Promise.resolve();
  expect(facade.names()).toEqual([]);
  kernel.metadata().plugins((_name, _version, registration) => {
    expect(registration!.view().counts).toMatchObject({
      subscriptions: 0,
      effects: 0,
      tasks: 0,
      records: 0,
    });
  });
  kernel.dispose();
  frame.remove();
});

it.each(["turbo", "htmx"] as const)(
  "preserves pending and canceled %s categories without host objects",
  (kind) => {
    for (const [phase, outcome] of [
      ["prepared", "pending"],
      ["canceled", "cancelled"],
    ] as const) {
      const record = project(
        {
          schema: `jqstar-${kind}-bridge-observation/1`,
          phase,
          targetCategory: "region",
          bridgeOperationId: 1,
          renderOperationId: null,
          removalCount: 0,
          target: document.body,
        },
        kind,
        1,
        0,
        () => undefined,
      );
      expect(record).toMatchObject({ kind, phase, outcome, id: `${kind}-1` });
      expect(record).not.toHaveProperty("target");
      expect(Object.isFrozen(record)).toBe(true);
    }
  },
);
