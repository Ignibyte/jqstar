import { installNavigationHostCorrections } from "./host-corrections.js";

const { document, window } = globalThis;
const roles = new Set(["main", "nested", "permanent", "disclosure", "region", "region-child"]);

export function bootNavigationFixture({
  $,
  installStarCore,
  uiPlugin,
  createBridge,
  host,
  configured,
}) {
  let installed;
  let bridge;
  let active = new Map();
  let created = 0;
  let released = 0;
  let duplicates = 0;
  let unhandledErrors = 0;
  let handledHostErrors = 0;
  let sequence = 0;
  let terminal = false;
  let before;
  let disposal;
  const events = [];
  const documentId = window.crypto.randomUUID();
  let generation = 0;
  const record = (event, data = {}) => {
    const value = Object.freeze({ event, documentId, generation, sequence: ++sequence, ...data });
    if (events.length < 10000) events.push(value);
    return value;
  };
  const showRecovery = () => {
    const element = document.getElementById("recovery");
    if (element) element.hidden = false;
    document.documentElement.removeAttribute("aria-busy");
  };
  const clearRecovery = () => {
    const element = document.getElementById("recovery");
    if (element) element.hidden = true;
  };
  const publicDispose = () => {
    if (!installed) return disposal;
    const report = installed.star.dispose();
    disposal = Object.freeze({
      attempted: report.attempted.length,
      resourcesReleased: report.released.length,
      failed: report.failed.length,
      remaining: report.remaining.length,
    });
    installed = undefined;
    bridge = undefined;
    before = undefined;
    record("document-disposed", {
      created,
      released,
      live: active.size,
      failed: disposal.failed,
      remaining: disposal.remaining,
      unhandledErrors,
      handledHostErrors,
    });
    return disposal;
  };
  const start = () => {
    generation += 1;
    installed = installStarCore($);
    active = new Map();
    created = 0;
    released = 0;
    duplicates = 0;
    unhandledErrors = 0;
    handledHostErrors = 0;
    const plugins = [uiPlugin];
    if (createBridge) {
      bridge = installed.star.use(createBridge($));
      bridge.observe((observation) =>
        record(`render-${observation.phase}`, {
          operation: observation.renderOperationId ?? observation.bridgeOperationId,
          removals: observation.removalCount,
        }),
      );
    }
    plugins.push({
      name: "research.navigation",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        registrar.application((application) => {
          const root = application.root;
          const role = roles.has(root.getAttribute("data-role"))
            ? root.getAttribute("data-role")
            : "other";
          if (active.has(root)) duplicates += 1;
          active.set(root, application);
          created += 1;
          record("application-created", { role, created, released, live: active.size });
          return () => {
            if (active.get(root) === application) active.delete(root);
            released += 1;
            record("application-released", { role, created, released, live: active.size });
          };
        });
        registrar.documentHost.listen(
          document,
          "click",
          (event) => {
            if (event.target.closest?.("#canceled")) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          },
          true,
        );
        registrar.documentHost.listen(window, "pagehide", () => {
          publicDispose();
          window.navigator.sendBeacon("/navigation/events", JSON.stringify(events.slice(-256)));
        });
        registrar.documentHost.listen(window, "scroll", () => record("scroll-observed"));
        if (configured) {
          installNavigationHostCorrections(registrar.documentHost, host, showRecovery, () => {
            handledHostErrors += 1;
          });
          for (const event of ["turbo:fetch-request-error", "htmx:sendError", "htmx:timeout"]) {
            registrar.documentHost.listen(document, event, showRecovery);
          }
          for (const event of ["turbo:before-visit", "htmx:beforeRequest"]) {
            registrar.documentHost.listen(document, event, clearRecovery);
          }
        }
        // Register after the known host handlers. Native dispatch may run a
        // microtask checkpoint between listeners, so an earlier probe would
        // count a rejection before its later handler prevents it.
        for (const eventName of ["error", "unhandledrejection"]) {
          registrar.documentHost.listen(window, eventName, (event) => {
            if (!event.defaultPrevented) unhandledErrors += 1;
          });
        }
        return Object.freeze({});
      },
    });
    installed.star.use(plugins);
    const permanent = document.getElementById("permanent");
    if (permanent) $(permanent).star({ state: { preference: 0 } });
    for (const root of document.querySelectorAll("[data-jqs]")) {
      if (!$(root).star("instance")) $(root).star();
    }
    record("document-ready", { created, released, live: active.size });
  };
  const restore = (event) => {
    if (event.persisted && !terminal) start();
  };
  window.addEventListener("pageshow", restore);
  start();
  window.__navigationFixture = Object.freeze({
    async barrier() {
      if (bridge) await bridge.whenIdle();
      if (installed) await installed.star.whenEnhanced();
      record("barrier-settled", { created, released, live: active.size });
    },
    capturePreserved() {
      const node = document.getElementById("permanent");
      const application = node ? $(node).star("instance") : undefined;
      if (application) application.state.preference = 7;
      before = { node, application };
    },
    preservation() {
      const node = document.getElementById("permanent");
      const application = node ? $(node).star("instance") : undefined;
      return {
        sameNode: Boolean(before && before.node === node),
        sameApplication: Boolean(before && before.application === application),
        sameState: application?.state.preference === 7,
      };
    },
    snapshot() {
      return {
        created,
        released,
        live: active.size,
        duplicates,
        unhandledErrors,
        handledHostErrors,
        connectedLive: [...active.keys()].filter((root) => root.isConnected).length,
        events: events.map((event) => ({ ...event })),
        bridge:
          bridge?.observations().map((event) => ({
            phase: event.phase,
            outcome: event.outcome,
            operation: event.renderOperationId ?? event.bridgeOperationId,
            renderOperation: event.renderOperationId,
            bridgeOperation: event.bridgeOperationId,
            removals: event.removalCount,
          })) ?? [],
      };
    },
    dispose() {
      if (!terminal) {
        terminal = true;
        window.removeEventListener("pageshow", restore);
        publicDispose();
      }
      return { ...disposal, created, released, live: active.size, duplicates };
    },
  });
}
