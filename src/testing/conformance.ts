import { StarDisposalError, type StarDisposalCategory, type StarDisposalReport } from "../disposal";
import type { StarPlugin } from "../plugin";
import { StarConformanceError, type StarConformanceFailure } from "./errors";
import type {
  StarConformanceCaseResult,
  StarConformanceReport,
  StarHarness,
  StarHarnessFactory,
} from "./types";

export interface StarPluginConformanceOptions {
  readonly createHarness: StarHarnessFactory;
  readonly plugin: StarPlugin;
  readonly failingPlugin?: StarPlugin;
  readonly cleanupFailingPlugin?: StarPlugin;
  readonly exercise?: (harness: StarHarness, facade: unknown) => void | PromiseLike<void>;
}

interface NamedCase {
  readonly name: string;
  readonly run: () => void | PromiseLike<void>;
}

const freeze = Object.freeze;

function failure(error: unknown, name: string): StarConformanceFailure {
  return freeze({
    case: name,
    error: freeze({
      name: error instanceof Error ? error.name.slice(0, 120) : "ThrownValue",
      message: (error instanceof Error ? error.message : String(error)).slice(0, 1_024),
    }),
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function disposalFailure(error: unknown): StarDisposalError | undefined {
  if (error instanceof StarDisposalError) return error;
  if (!(error instanceof AggregateError)) return undefined;
  for (const nested of error.errors as unknown[]) {
    const match = disposalFailure(nested);
    if (match) return match;
  }
  return undefined;
}

async function casesReport(cases: readonly NamedCase[]): Promise<StarConformanceReport> {
  const passed: StarConformanceCaseResult[] = [];
  const errors: unknown[] = [];
  const failures: StarConformanceFailure[] = [];
  for (const testCase of cases) {
    try {
      await testCase.run();
      passed.push(freeze({ name: testCase.name, status: "pass" }));
    } catch (error) {
      errors.push(error);
      failures.push(failure(error, testCase.name));
    }
  }
  if (failures.length > 0) throw new StarConformanceError(errors, failures);
  return freeze({
    schema: "jquery-star-conformance/1",
    cases: freeze(passed),
    passed: passed.length,
  });
}

function applicationRoot(harness: StarHarness, markup: string): HTMLElement {
  const root = harness.document.createElement("section");
  root.innerHTML = markup;
  harness.document.body.append(root);
  return root;
}

export function assertStarDisposal(
  report: StarDisposalReport,
  categories: readonly StarDisposalCategory[] = [
    "application",
    "effect",
    "hook",
    "listener",
    "observer",
    "plugin",
    "request",
    "service",
    "subscription",
    "task",
  ],
): void {
  assert(report.schema === "jquery-star-disposal/1", "The disposal report schema is unsupported.");
  assert(Object.isFrozen(report), "The disposal report must be frozen.");
  assert(report.failed.length === 0, "The disposal report contains cleanup failures.");
  assert(report.remaining.length === 0, "The disposal report contains remaining resources.");
  const attempted = new Set(report.attempted.map(({ category }) => category));
  for (const category of categories) {
    assert(attempted.has(category), `The disposal report did not attempt ${category} cleanup.`);
  }
  for (const resource of report.attempted) {
    assert(resource.owner.trim().length > 0, "A disposal resource has no stable owner.");
  }
  JSON.stringify(report);
}

async function withCaseHarness(
  createHarness: StarHarnessFactory,
  work: (harness: StarHarness, dispose: () => StarDisposalReport) => void | PromiseLike<void>,
): Promise<void> {
  const harness = await createHarness();
  let disposed: true | undefined;
  const dispose = (): StarDisposalReport => {
    disposed = true;
    return harness.dispose();
  };
  try {
    const result = work(harness, dispose);
    if (result) await result;
  } catch (error) {
    if (!disposed) {
      try {
        harness.dispose();
      } catch (cleanupError) {
        if (cleanupError !== error) {
          throw new AggregateError([error, cleanupError], "Case and cleanup failed.", {
            cause: cleanupError,
          });
        }
      }
    }
    throw error;
  }
  if (!disposed) dispose();
}

export async function runCoreConformance(
  createHarness: StarHarnessFactory,
): Promise<StarConformanceReport> {
  return casesReport([
    {
      name: "behavior-application-and-events",
      run: () =>
        withCaseHarness(createHarness, async (harness, dispose) => {
          const root = applicationRoot(
            harness,
            '<button type="button">Increment</button><output></output>',
          );
          const application = harness.mountBehavior(root, {
            state: { count: 0 },
            actions: {
              increment({ state }) {
                state.count += 1;
              },
            },
            ui: {
              button: { on: { click: "increment" } },
              output: { text: ({ state }) => state.count },
            },
          });
          harness.triggerNative(root.querySelector("button")!, "click");
          await harness.flush();
          assert(application.state.count === 1, "The behavior action did not update public state.");
          assert(
            root.querySelector("output")?.textContent === "1",
            "The behavior UI did not settle.",
          );
          assert(
            harness
              .observations()
              .some(({ kind, phase }) => kind === "action" && phase === "completed"),
            "The behavior action did not publish a terminal observation.",
          );
          harness.destroy(application);
          assert(application.destroyed, "The behavior application did not report destruction.");
          const disposalRoot = applicationRoot(harness, "<p>Dispose this root.</p>");
          harness.mountBehavior(disposalRoot, { state: {} });
          assertStarDisposal(dispose(), [
            "application",
            "effect",
            "listener",
            "observer",
            "request",
            "service",
            "subscription",
          ]);
        }),
    },
    {
      name: "declarative-application-and-jquery-event",
      run: () =>
        withCaseHarness(createHarness, async (harness) => {
          const root = applicationRoot(
            harness,
            '<button type="button" data-on:click="$count += 1">Increment</button><output data-text="$count"></output>',
          );
          root.setAttribute("data-signals", "{ count: 1 }");
          const application = harness.mountDeclarative<{ count: number }>(root);
          harness.triggerJQuery(root.querySelector("button")!, "click");
          await harness.flush();
          assert(
            application.state.count === 2,
            "The declarative action did not update public state.",
          );
          assert(
            root.querySelector("output")?.textContent === "2",
            "The declarative UI did not settle.",
          );
        }),
    },
    {
      name: "finite-task-and-idempotent-disposal",
      run: () =>
        withCaseHarness(createHarness, async (harness, dispose) => {
          harness.task("conformance:microtask", Promise.resolve());
          const settled = await harness.flush();
          assert(
            settled.schema === "jquery-star-flush/1",
            "The flush result schema is unsupported.",
          );
          const first = dispose();
          const second = dispose();
          assert(first === second, "Harness disposal did not return the same terminal report.");
        }),
    },
  ]);
}

export async function runPluginConformance(
  options: StarPluginConformanceOptions,
): Promise<StarConformanceReport> {
  const createHarness = () => options.createHarness();
  const cases: NamedCase[] = [
    {
      name: "install-use-and-dispose",
      run: () =>
        withCaseHarness(createHarness, async (harness, dispose) => {
          const facade = harness.install(options.plugin);
          assert(
            harness.install(options.plugin) === facade,
            "Repeated plugin installation changed its facade.",
          );
          await options.exercise?.(harness, facade);
          await harness.flush();
          const terminal = dispose();
          assertStarDisposal(terminal, ["plugin", "service", "subscription"]);
          assert(dispose() === terminal, "Plugin disposal was not idempotent.");
        }),
    },
  ];
  if (options.failingPlugin) {
    cases.push({
      name: "failed-install-rolls-back",
      run: () =>
        withCaseHarness(createHarness, (harness) => {
          let rejected = false;
          try {
            harness.install(options.failingPlugin!);
          } catch {
            rejected = true;
          }
          assert(rejected, "The failing plugin installation did not reject.");
          harness.install(options.plugin);
        }),
    });
  }
  if (options.cleanupFailingPlugin) {
    cases.push({
      name: "failed-cleanup-is-reported",
      run: () =>
        withCaseHarness(createHarness, (harness, dispose) => {
          harness.install(options.cleanupFailingPlugin!);
          let firstError: unknown;
          try {
            dispose();
          } catch (error) {
            firstError = error;
          }
          assert(firstError, "The cleanup-failing plugin did not fail harness disposal.");
          const failure = disposalFailure(firstError);
          assert(failure, "Plugin cleanup failure did not retain its public disposal report.");
          assert(Object.isFrozen(failure.report), "The failed disposal report must be frozen.");
          assert(
            failure.report.failed.some(
              ({ category, owner }) =>
                category === "plugin" && owner === options.cleanupFailingPlugin!.name,
            ),
            "The disposal report did not identify the cleanup-failing plugin.",
          );
          JSON.stringify(failure.report);
          let repeatedError: unknown;
          try {
            dispose();
          } catch (error) {
            repeatedError = error;
          }
          assert(repeatedError === firstError, "Failed harness disposal was not idempotent.");
        }),
    });
  }
  return casesReport(cases);
}
