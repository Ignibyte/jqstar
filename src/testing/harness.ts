import { StarDisposalError, type StarDisposalReport } from "../disposal";
import { installStarCore } from "../trusted-runtime";
import type { StarOperationObservation } from "../observation";
import type { StarPlugin } from "../plugin";
import type {
  ComputedRecord,
  StarDefinition,
  StarInstance,
  StarJQueryMethod,
  StateRecord,
} from "../types";
import { StarFlushError } from "./errors";
import { assertStarDOMRealm } from "./realm";
import type {
  CreateStarHarnessOptions,
  StarFlushDiagnostic,
  StarFlushOptions,
  StarFlushResult,
  StarFlushWork,
  StarHarness,
  StarHarnessApplication,
} from "./types";

interface HarnessTask {
  readonly id: string;
  readonly owner: string;
  readonly promise: Promise<void>;
}

const DEFAULT_MAX_ROUNDS = 100;
const DEFAULT_TIMEOUT_MS = 2_000;
type HarnessApplicationInput =
  StarDefinition<StateRecord, ComputedRecord> | "destroy" | "refresh" | "instance" | "state";
type InvokableApplicationMethod = (
  this: JQuery<Element>,
  value?: HarnessApplicationInput,
) => JQuery | StarInstance | StateRecord | undefined;

function errorValue(error: unknown, message: string): Error {
  return error instanceof Error ? error : new Error(message, { cause: error });
}

function throwSetupFailures(primary: unknown, cleanups: readonly (() => void)[]): never {
  const errors: Error[] = [
    errorValue(primary, "jQStar harness setup failed with a non-Error value."),
  ];
  for (const cleanup of [...cleanups].reverse()) {
    try {
      cleanup();
    } catch (error) {
      errors.push(errorValue(error, "jQStar harness rollback failed with a non-Error value."));
    }
  }
  if (errors.length === 1) throw errors[0]!;
  throw new AggregateError(errors, "jQStar harness setup and rollback failed.");
}

function boundedInteger(value: number | undefined, fallback: number, name: string): number {
  const selected = value ?? fallback;
  if (!Number.isInteger(selected) || selected < 1 || selected > 100_000) {
    throw new TypeError(`${name} must be an integer from 1 through 100000.`);
  }
  return selected;
}

function raceDeadline<Value>(work: Promise<Value>, remainingMs: number): Promise<Value | symbol> {
  const expired = Symbol("expired");
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(expired), Math.max(0, remainingMs));
    void work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(
          error instanceof Error
            ? error
            : new Error("jQStar harness work rejected with a non-Error value.", { cause: error }),
        );
      },
    );
  });
}

function sameRealm(root: Element, options: CreateStarHarnessOptions): void {
  const ElementHost = options.window.Element;
  const owner = options.document ?? options.window.document;
  if (!(root instanceof ElementHost) || root.ownerDocument !== owner) {
    throw new TypeError("A harness application root must belong to its Window and Document realm.");
  }
}

function applicationMethod(jQuery: JQueryStatic): StarJQueryMethod {
  const method: unknown = Reflect.get(jQuery.fn, "star");
  if (typeof method !== "function") {
    throw new Error("The jQStar application method is unavailable.");
  }
  return method as StarJQueryMethod;
}

function invokeApplication(
  jQuery: JQueryStatic,
  selection: JQuery<Element>,
  input?: HarnessApplicationInput,
): JQuery | StarInstance | StateRecord | undefined {
  const method = applicationMethod(jQuery) as unknown as InvokableApplicationMethod;
  return method.call(selection, input);
}

export function createStarHarness(options: CreateStarHarnessOptions): StarHarness {
  if (!options || typeof options !== "object") {
    throw new TypeError("jQStar harness options must be an object.");
  }
  const documentHost = assertStarDOMRealm({
    window: options.window,
    ...(options.document ? { document: options.document } : {}),
    jQuery: options.jQuery,
  });
  const restoreFetch: Array<() => void> = [];
  try {
    if (options.responses) {
      restoreFetch.push(options.responses.install(globalThis));
      if (options.window !== (globalThis as unknown)) {
        restoreFetch.push(options.responses.install(options.window));
      }
    }
  } catch (error) {
    throwSetupFailures(error, restoreFetch);
  }

  let installed: ReturnType<typeof installStarCore> | undefined;
  try {
    installed = installStarCore(options.jQuery, { document: documentHost });
    if (options.plugins?.length) installed.star.use(options.plugins);
  } catch (error) {
    const claimedInstallation = installed;
    throwSetupFailures(error, [
      ...restoreFetch,
      ...(claimedInstallation ? [() => claimedInstallation.star.dispose()] : []),
    ]);
  }

  const observations: StarOperationObservation[] = [];
  const outstandingOperations = new Map<string, StarFlushWork>();
  const handles = new Map<Element, StarHarnessApplication>();
  const tasks = new Map<string, HarnessTask>();
  const taskErrors: unknown[] = [];
  let applicationId = 0;
  let taskId = 0;
  let disposed = false;
  let disposalReport: StarDisposalReport | undefined;
  let disposalError: AggregateError | undefined;
  const unsubscribe = installed.star.observeOperations((observation) => {
    observations.push(observation);
    if (observation.phase === "started") {
      outstandingOperations.set(observation.id, {
        category: observation.kind === "request" ? "request" : "operation",
        id: observation.id,
        owner: observation.owner.id,
      });
    } else if (["completed", "cancelled", "failed"].includes(observation.phase)) {
      outstandingOperations.delete(observation.id);
    }
  });

  const assertActive = (operation: string): void => {
    if (disposed) throw new Error(`This jQStar harness has been disposed and cannot ${operation}.`);
  };

  const instanceFor = <
    State extends StateRecord = StateRecord,
    Computed extends ComputedRecord = ComputedRecord,
  >(
    root: Element,
  ): StarInstance<State, Computed> => {
    const instance = invokeApplication(installed, installed(root), "instance");
    if (!instance) throw new Error("jQStar did not create an application for the supplied root.");
    return instance as StarInstance<State, Computed>;
  };

  const createHandle = <
    State extends StateRecord,
    Computed extends ComputedRecord = ComputedRecord,
  >(
    root: Element,
    instance: StarInstance<State, Computed>,
  ): StarHarnessApplication<State, Computed> => {
    const id = `harness-application-${++applicationId}`;
    const handle: StarHarnessApplication<State, Computed> = Object.freeze({
      id,
      root,
      instance,
      mode: instance.mode,
      state: instance.state,
      get destroyed() {
        return instance.destroyed;
      },
      destroy() {
        if (!instance.destroyed) instance.destroy();
        handles.delete(root);
      },
    });
    handles.set(root, handle);
    return handle;
  };

  const workSnapshot = (): readonly StarFlushWork[] =>
    Object.freeze([
      ...[...outstandingOperations.values()].map((work) => Object.freeze({ ...work })),
      ...[...tasks.values()].map(({ id, owner }) =>
        Object.freeze({ category: "task" as const, id, owner }),
      ),
      ...(options.responses?.outstanding() ?? []),
    ]);

  const diagnostic = (started: number, rounds: number): StarFlushDiagnostic =>
    Object.freeze({
      schema: "jquery-star-flush-diagnostic/1",
      elapsedMs: Math.max(0, Date.now() - started),
      outstanding: workSnapshot(),
      rounds,
    });

  const installPlugin = ((plugin: StarPlugin | readonly StarPlugin[]) => {
    assertActive("install plugins");
    return installed.star.use(plugin as StarPlugin);
  }) as StarHarness["install"];

  const harness: StarHarness = {
    document: documentHost,
    installed,
    ...(options.responses ? { responses: options.responses } : {}),
    window: options.window,
    install: installPlugin,
    mountDeclarative<State extends StateRecord = StateRecord>(root: Element) {
      assertActive("mount applications");
      sameRealm(root, options);
      invokeApplication(installed, installed(root));
      return createHandle(root, instanceFor<State>(root));
    },
    mountBehavior<State extends StateRecord, Computed extends ComputedRecord = ComputedRecord>(
      root: Element,
      definition: StarDefinition<State, Computed>,
    ) {
      assertActive("mount applications");
      sameRealm(root, options);
      invokeApplication(
        installed,
        installed(root),
        definition as StarDefinition<StateRecord, ComputedRecord>,
      );
      return createHandle(root, instanceFor<State, Computed>(root));
    },
    state<State extends StateRecord = StateRecord>(
      application: StarHarnessApplication<State> | Element,
    ) {
      assertActive("read application state");
      if (application instanceof options.window.Element) {
        sameRealm(application, options);
        return instanceFor<State>(application).state;
      }
      if (!handles.has(application.root)) {
        throw new Error("This application handle is not owned by the active harness.");
      }
      return application.state;
    },
    observations: () => Object.freeze([...observations]),
    triggerNative(target, type, init = {}) {
      assertActive("trigger native events");
      if (!target || typeof target.dispatchEvent !== "function") {
        throw new TypeError("A native event target must implement dispatchEvent().");
      }
      const event = new options.window.Event(type, { bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    },
    triggerJQuery(target, type, extra = []) {
      assertActive("trigger jQuery events");
      installed(target).trigger(type, [...extra]);
    },
    task(owner, work) {
      assertActive("register finite tasks");
      if (typeof owner !== "string" || owner.trim() === "") {
        throw new TypeError("A harness task owner must be a non-empty string.");
      }
      const id = `harness-task-${++taskId}`;
      const promise = Promise.resolve(work).then(
        () => undefined,
        (error: unknown) => {
          taskErrors.push(error);
        },
      );
      const record = { id, owner: owner.slice(0, 200), promise };
      tasks.set(id, record);
      void promise.finally(() => tasks.delete(id));
    },
    async flush(flushOptions: StarFlushOptions = {}) {
      assertActive("flush work");
      const maxRounds = boundedInteger(flushOptions.maxRounds, DEFAULT_MAX_ROUNDS, "maxRounds");
      const timeoutMs = boundedInteger(flushOptions.timeoutMs, DEFAULT_TIMEOUT_MS, "timeoutMs");
      const started = Date.now();
      let rounds = 0;
      let stableRounds = 0;
      let previousSignature = "";
      while (rounds < maxRounds) {
        rounds += 1;
        const pendingTasks = [...tasks.values()].map(({ promise }) => promise);
        const work = Promise.all([
          installed.star.whenEnhanced(),
          options.responses?.settle() ?? Promise.resolve(),
          ...pendingTasks,
        ]).then(() => undefined);
        const remainingMs = timeoutMs - (Date.now() - started);
        const result = await raceDeadline(work, remainingMs);
        if (typeof result === "symbol") throw new StarFlushError(diagnostic(started, rounds));
        if (taskErrors.length > 0) {
          const failures = taskErrors.splice(0);
          throw new AggregateError(failures, "jQStar harness tasks failed.");
        }
        await Promise.resolve();
        const outstanding = workSnapshot();
        const signature = outstanding
          .map(({ category, id, owner }) => `${category}:${id}:${owner}`)
          .join("|");
        stableRounds =
          outstanding.length === 0 && signature === previousSignature ? stableRounds + 1 : 0;
        previousSignature = signature;
        if (stableRounds >= 1) {
          return Object.freeze<StarFlushResult>({
            schema: "jquery-star-flush/1",
            elapsedMs: Math.max(0, Date.now() - started),
            rounds,
          });
        }
        if (outstanding.length > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
        if (Date.now() - started >= timeoutMs)
          throw new StarFlushError(diagnostic(started, rounds));
      }
      throw new StarFlushError(diagnostic(started, rounds));
    },
    destroy(application: StarHarnessApplication | Element) {
      assertActive("destroy applications");
      const root = application instanceof options.window.Element ? application : application.root;
      sameRealm(root, options);
      const handle = handles.get(root);
      if (handle) handle.destroy();
      else invokeApplication(installed, installed(root), "destroy");
      handles.delete(root);
    },
    dispose() {
      if (disposalError) throw disposalError;
      if (disposalReport) return disposalReport;
      disposed = true;
      const errors: unknown[] = [];
      try {
        unsubscribe();
      } catch (error) {
        errors.push(error);
      }
      handles.clear();
      tasks.clear();
      taskErrors.length = 0;
      try {
        disposalReport = installed.star.dispose();
      } catch (error) {
        if (error instanceof StarDisposalError) disposalReport = error.report;
        errors.push(error);
      }
      try {
        options.responses?.dispose();
      } catch (error) {
        errors.push(error);
      }
      for (const restore of restoreFetch.reverse()) {
        try {
          restore();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) {
        disposalError = new AggregateError(errors, "jQStar harness disposal failed.");
        throw disposalError;
      }
      return disposalReport!;
    },
  };
  return Object.freeze(harness);
}
