export async function inspectionConformance($, window, entries) {
  const ensure = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const installed = entries.core.installStarCore($, { document: window.document });
  const star = installed.star;
  const root = window.document.createElement("section");
  root.setAttribute("data-jqs", "inspection-proof");
  window.document.body.append(root);
  let first;
  let second;
  try {
    star.use(entries.ui.uiPlugin);
    star.use(entries.datastar.datastarPlugin);
    const stores = star.use(entries.stores.storesPlugin);
    const preferences = stores.define(
      "preferences",
      entries.stores.defineStore({ initial: { count: 1, token: "private-store-value" } }),
    );
    star.use(entries.persist.persistPlugin).attach(
      "preferences",
      Object.freeze({
        namespace: "private-storage-name",
        version: 1,
        codec: entries.persist.createFieldCodec([
          { path: "count", validate: (value) => typeof value === "number" },
        ]),
      }),
    );
    star.use(
      entries.turbo.createTurboBridge({
        $,
        version: "8.0.23",
        onError() {},
        Turbo: { cache: {}, session: {}, start() {}, visit() {} },
      }),
    );
    star.use(
      entries.htmx.createHtmxBridge({
        $,
        version: "2.0.10",
        onError() {},
        htmx: {
          version: "2.0.10",
          config: { defaultSwapStyle: "innerHTML" },
          ajax() {},
          off() {},
          on() {},
          process() {},
          swap() {},
          trigger() {},
        },
      }),
    );
    star.action("inspectAction", () => undefined);
    $(root).star({ state: { secret: "private-application-value" } });
    const instance = $(root).star("instance");
    const before = { effect: 0, listener: 0, observer: 0, service: 0, subscription: 0, task: 0 };
    star.metadata().inventory(
      () => {},
      (kind) => {
        before[kind]++;
      },
    );
    first = entries.inspect.attachInspector(installed);
    second = (entries.inspectAgain ?? entries.inspect).attachInspector(installed);
    await instance.run("inspectAction");
    const initial = first.snapshot();
    ensure(
      initial.trace.enabled === false && initial.trace.counters.observed === 0,
      "Default tracing must remain off",
    );
    ensure(
      initial.kernel.ownership.subscription === before.subscription,
      "Disabled tracing subscribed",
    );
    ensure(
      initial.kernel.ownership.service === before.service + 1,
      "Inspector leases duplicated their collector",
    );
    ensure(
      initial.services.map(({ namespace }) => namespace).join() ===
        "core.stores,core.persist,core.turbo,core.htmx",
      "Installed service inventory differs",
    );
    ensure(
      initial.kernel.plugins.length === 6 && initial.kernel.applications.length === 1,
      "Plugin/application inventory differs",
    );
    ensure(
      Object.isFrozen(initial) && Object.isFrozen(initial.services[0].counts),
      "Snapshot is mutable",
    );
    ensure(
      !/private-|preferences|inspectAction/.test(JSON.stringify(initial)),
      "Snapshot retained private data",
    );
    first.enableTrace({ maxEntries: 17, maxBytes: 4096 });
    const observed = second.snapshot();
    for (const namespace of ["core.turbo", "core.htmx"]) {
      ensure(
        observed.services.find((service) => service.namespace === namespace).counts.observers === 1,
        "Bridge inspection subscription differs",
      );
    }
    window.document.body.dispatchEvent(
      new window.CustomEvent("turbo:before-cache", { bubbles: true, detail: {} }),
    );
    window.document.body.dispatchEvent(
      new window.CustomEvent("htmx:responseError", { bubbles: true, detail: {} }),
    );
    const bridgeRecords = second.readTrace();
    ensure(
      bridgeRecords.some((record) => record.kind === "turbo") &&
        bridgeRecords.some((record) => record.kind === "htmx"),
      "Public bridge observations were not captured",
    );
    let refused = false;
    try {
      second.disableTrace();
    } catch {
      refused = true;
    }
    ensure(refused, "Another lease changed trace control");
    await Promise.all(Array.from({ length: 200 }, () => instance.run("inspectAction")));
    preferences.count++;
    await star.whenEnhanced();
    const trace = second.exportTrace();
    ensure(
      trace.records.length <= 17 && trace.trace.bytes <= 4096 && trace.trace.counters.evicted > 0,
      "Trace bounds failed",
    );
    ensure(
      new TextEncoder().encode(JSON.stringify(trace.records)).byteLength === trace.trace.bytes,
      "Trace UTF-8 accounting differs",
    );
    ensure(
      !/private-|preferences|inspectAction/.test(JSON.stringify(trace)),
      "Trace retained private fields by default",
    );
    ensure(
      JSON.stringify(second.exportTrace()) === JSON.stringify(trace),
      "Export mutated trace state",
    );
    first.clearTrace();
    first.allowField({
      field: "actionCapability",
      purpose: "debugging",
      maxLength: 32,
      retain: true,
      export: false,
      expiresInMs: 1000,
    });
    await instance.run("inspectAction");
    ensure(
      second.readTrace().some((record) => record.actionCapability === "inspectAction"),
      "Explicit field policy did not apply",
    );
    ensure(
      !JSON.stringify(second.exportTrace()).includes("inspectAction"),
      "Export ignored its separate permission",
    );
    first.denyField("actionCapability");
    ensure(
      !JSON.stringify(second.readTrace()).includes("inspectAction"),
      "Revocation retained a sensitive record",
    );
    first.dispose();
    ensure(second.snapshot().trace.enabled === false, "Controller release left tracing enabled");
    second.enableTrace({ maxEntries: 3, maxBytes: 1024 });
    await instance.run("inspectAction");
    ensure(second.readTrace().length === 2, "Surviving lease lost the collector");
    const report = star.dispose();
    const terminal = second.snapshot();
    ensure(
      terminal.lifecycle === "disposed" && terminal.kernel === null && terminal.trace.entries === 0,
      "Kernel cleanup retained live inspection data",
    );
    ensure(
      Object.values(terminal.disposal.attempted).reduce((sum, value) => sum + value, 0) ===
        report.attempted.length,
      "Terminal attempted counts differ",
    );
    ensure(
      Object.values(terminal.disposal.released).reduce((sum, value) => sum + value, 0) ===
        report.released.length,
      "Terminal release counts differ",
    );
    ensure(
      report.failed.length === 0 && report.remaining.length === 0,
      "Installed kernel cleanup failed",
    );
    ensure(second.dispose() === second.dispose(), "Lease disposal is not idempotent");
    return Object.freeze({ plugins: 6, services: 4, actions: 200, bridgeKinds: 2, failures: 0 });
  } finally {
    first?.dispose();
    second?.dispose();
    star.dispose();
    root.remove();
  }
}
