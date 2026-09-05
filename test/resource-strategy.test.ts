import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StarInstalledJQuery, StarPlugin } from "jquery-star/core";
import { createStarHarness, runPluginConformance } from "jquery-star/testing";
import type { StarDOMWindow, StarHarness } from "jquery-star/testing";
import { createNativeStrategy } from "./fixtures/resource-strategy/native";
import { createExternalStrategy } from "./fixtures/resource-strategy/external/adapter";
import type { Project, Strategy, StrategyFactory } from "./fixtures/resource-strategy/types";

const harnesses: StarHarness[] = [];
const frames: HTMLIFrameElement[] = [];
function createHarness() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const harness = createStarHarness({ window: frame.contentWindow as StarDOMWindow, jQuery: $ });
  harnesses.push(harness);
  return harness;
}
afterEach(() => {
  for (const harness of harnesses.splice(0)) {
    try {
      harness.dispose();
    } catch {
      /* Cleanup-failure cases inspect the terminal report. */
    }
  }
  for (const frame of frames.splice(0)) frame.remove();
});

for (const [name, factory] of Object.entries({
  native: createNativeStrategy,
  external: createExternalStrategy,
})) {
  describe(`research ${name} ownership`, () => {
    const project: Project = { id: "A", name: "Project A", version: 1, activity: [] };
    function plugin(load: Parameters<StrategyFactory>[0]["load"], failure?: "install" | "cleanup") {
      const facades: Strategy[] = [];
      const definition: StarPlugin<Strategy> = {
        name: `research.${name}`,
        version: "0.0.0",
        apiVersion: "0.1.0",
        install(registrar) {
          const strategy = factory({
            $: $ as StarInstalledJQuery,
            host: registrar.documentHost,
            initial: project,
            endpoint: (id) => `https://example.test/project/${id}`,
            coordinator: () => {
              throw new Error("Client prototypes must not require a coordinator action.");
            },
            trace: () => {},
            load,
          });
          facades.push(strategy);
          registrar.cleanup(() => strategy.dispose());
          registrar.documentHost.own("service", `research.${name}.cache`, () => strategy.dispose());
          registrar.application((application) =>
            strategy.acquire("B", (state) => {
              Object.assign(application.state, { status: state.status, version: state.version });
            }),
          );
          if (failure === "install") throw new Error("Deliberate install failure.");
          if (failure === "cleanup")
            registrar.cleanup(() => {
              throw new Error("Deliberate cleanup failure.");
            });
          return strategy;
        },
      };
      return { definition, facades };
    }

    it("passes public plugin use, rollback and cleanup conformance", async () => {
      const load = vi.fn(async (id: Project["id"], signal: AbortSignal) => {
        await Promise.resolve();
        signal.throwIfAborted();
        return { ...project, id };
      });
      const normal = plugin(load);
      const failed = plugin(load, "install");
      const cleanup = plugin(load, "cleanup");
      const report = await runPluginConformance({
        createHarness,
        plugin: normal.definition,
        failingPlugin: failed.definition,
        cleanupFailingPlugin: cleanup.definition,
        async exercise(harness, facade) {
          const roots = ["summary", "activity"].map((id) => {
            const root = harness.document.createElement("section");
            root.id = id;
            root.setAttribute("data-jqs", "");
            harness.document.body.append(root);
            return harness.mountBehavior(root, { state: { status: "initial", version: 0 } });
          });
          await vi.waitFor(() =>
            expect(roots.map((root) => root.state.status)).toEqual(["ready", "ready"]),
          );
          expect(load).toHaveBeenCalledTimes(1);
          expect((facade as Strategy).inspect().observers).toBe(2);
          harness.destroy(roots[0]!);
          expect((facade as Strategy).inspect().observers).toBe(1);
          harness.destroy(roots[1]!);
          expect((facade as Strategy).inspect().observers).toBe(0);
        },
      });
      expect(report.passed).toBe(3);
      for (const facade of [...normal.facades, ...failed.facades, ...cleanup.facades]) {
        expect(facade.inspect()).toMatchObject({ records: 0, observers: 0, tasks: 0 });
        expect(() => facade.acquire("B", () => {})).toThrow("disposed");
      }
    });

    it("cannot create a new timer when a retained lease is released after disposal", () => {
      const harness = createHarness();
      const facade = harness.install(plugin(async () => project).definition);
      const release = facade.acquire("A", () => {});
      harness.dispose();
      const timer = vi.spyOn(globalThis, "setTimeout");
      try {
        release();
        release();
        expect(timer).not.toHaveBeenCalled();
      } finally {
        timer.mockRestore();
      }
    });

    it("retains a shared request for one lease and aborts the final lease", async () => {
      const requests: { signal: AbortSignal; resolve: (value: Project) => void }[] = [];
      const load = vi.fn(
        (_id: Project["id"], signal: AbortSignal) =>
          new Promise<Project>((resolve, reject) => {
            requests.push({ signal, resolve });
            signal.addEventListener("abort", () => reject(new Error("Loader aborted.")), {
              once: true,
            });
          }),
      );
      const harness = createHarness();
      const facade = harness.install(plugin(load).definition);
      const first: string[] = [];
      const second: string[] = [];
      const releaseFirst = facade.acquire("B", (state) => first.push(state.status));
      const releaseSecond = facade.acquire("B", (state) => second.push(state.status));
      expect(requests).toHaveLength(1);
      releaseFirst();
      expect(requests[0]!.signal.aborted).toBe(false);
      releaseSecond();
      expect(requests[0]!.signal.aborted).toBe(true);
      requests[0]!.resolve({ ...project, id: "B" });
      await Promise.resolve();
      await Promise.resolve();
      expect(first).not.toContain("ready");
      expect(second).not.toContain("ready");
      const recovered: string[] = [];
      const release = facade.acquire("B", (state) => recovered.push(state.status));
      expect(requests).toHaveLength(2);
      requests[1]!.resolve({ ...project, id: "B", version: 2 });
      await vi.waitFor(() => expect(recovered).toContain("ready"));
      release();
      harness.dispose();
      expect(facade.inspect().records).toBe(0);
    });
  });
}
