import type {
  StarKernelMetadataAdapter,
  StarMetadataSequence,
  StarMetadataTerminal,
} from "../metadata-types";
import type {
  StarInspectionCounters,
  StarInspectionFailure,
  StarInspectionField,
  StarInspectionFieldPolicy,
  StarInspectionKind,
  StarInspectionRecord,
  StarInspectionSnapshot,
  StarInspectionTrace,
  StarInspectionTraceState,
  StarInspector,
  StarInspectorDisposalReport,
  StarTraceOptions,
} from "./types";
import { choice, copy, data, fields, increment, plain } from "./redaction";
import { fieldPolicy, Trace, traceOptions, type MutableCounters } from "./trace";
import { serviceSummary } from "./service-adapter";
import { snapshotDocument } from "./snapshot";

interface Client {
  collector: Collector | undefined;
  release: (() => void) | undefined;
  terminal: StarMetadataTerminal | undefined;
  readonly sequence: StarMetadataSequence;
  readonly id: string;
  readonly version: string;
  lifecycle: "disposed" | "released";
  report: StarInspectorDisposalReport | undefined;
}

class InspectionCleanupFailure extends Error {}

function counters(): MutableCounters {
  return {
    observed: 0,
    filtered: 0,
    sampled: 0,
    retained: 0,
    evicted: 0,
    oversized: 0,
    purged: 0,
    failures: {
      configuration: 0,
      capture: 0,
      serializer: 0,
      reentrant: 0,
      clock: 0,
      export: 0,
      cleanup: 0,
    },
  };
}

function disabled(
  countersValue: StarInspectionCounters = counters(),
  sequence = 0,
  policyId = 0,
): StarInspectionTraceState {
  return copy({
    enabled: false,
    maxEntries: 0,
    maxBytes: 0,
    entries: 0,
    bytes: 0,
    sequence,
    policyId,
    kinds: [],
    outcomes: [],
    everyNth: 1,
    policies: [],
    counters: countersValue,
  });
}

function inactiveSnapshot(client: Client): StarInspectionSnapshot {
  return snapshotDocument(
    client.version,
    client.id,
    client.sequence.next(),
    client.lifecycle,
    null,
    [],
    disabled(),
    client.terminal?.read() ?? null,
  );
}

function inactiveTrace(client: Client): StarInspectionTrace {
  return copy({
    schema: "jqstar-inspection-trace/1",
    kernelId: client.id,
    trace: disabled(),
    records: [],
  });
}

function clientLease(client: Client): StarInspector {
  const active = (): Collector => {
    if (!client.collector) throw new Error("This inspector lease is closed.");
    return client.collector;
  };
  return Object.freeze({
    snapshot: () => client.collector?.snapshot() ?? inactiveSnapshot(client),
    enableTrace: (options: StarTraceOptions) => active().enable(client, options),
    disableTrace: () => active().disable(client),
    readTrace: () => client.collector?.records(false) ?? Object.freeze([]),
    exportTrace: () => client.collector?.export() ?? inactiveTrace(client),
    clearTrace: () => active().clear(client),
    allowField: (policy: StarInspectionFieldPolicy) => active().allow(client, policy),
    denyField: (field: StarInspectionField) => active().deny(client, field),
    dispose() {
      if (client.report) return client.report;
      const collector = client.collector;
      client.collector = undefined;
      client.lifecycle = "released";
      client.terminal = undefined;
      client.report =
        collector?.release(client) ??
        Object.freeze({ schema: "jqstar-inspector-disposal/1", failures: 0 });
      return client.report;
    },
  });
}

export class Collector {
  #adapter: StarKernelMetadataAdapter | undefined;
  readonly #id: string;
  readonly #version: string;
  readonly #terminal: StarMetadataTerminal;
  readonly #sequence: StarMetadataSequence;
  readonly #clients = new Set<Client>();
  readonly #counters = counters();
  #controller: Client | undefined;
  #trace: Trace | undefined;
  #cleanups: Array<() => void> = [];
  #timer: (() => void) | undefined;
  #busy = false;
  #capturing = false;
  #closed = false;
  #lastTime = 0;
  readonly #progress = { sequence: 0, policyId: 0 };

  constructor(adapter: StarKernelMetadataAdapter) {
    this.#adapter = adapter;
    this.#id = adapter.id;
    this.#version = adapter.version;
    this.#terminal = adapter.terminal;
    this.#sequence = adapter.sequence;
  }

  open(release: () => void): StarInspector {
    if (this.#closed) throw new Error("The inspector collector is closed.");
    const client: Client = {
      collector: this,
      release,
      terminal: this.#terminal,
      sequence: this.#sequence,
      id: this.#id,
      version: this.#version,
      lifecycle: "disposed",
      report: undefined,
    };
    this.#clients.add(client);
    return clientLease(client);
  }

  #failure(category: StarInspectionFailure): void {
    const values = this.#counters.failures as Record<StarInspectionFailure, number>;
    values[category] = increment(values[category]);
  }

  #now(): number {
    try {
      const now = Math.floor(performance.now());
      if (!Number.isSafeInteger(now) || now < 0) throw new Error();
      this.#lastTime = Math.max(this.#lastTime, now);
      return this.#lastTime;
    } catch {
      this.#failure("clock");
      return Infinity;
    }
  }

  #assert(client?: Client): void {
    if (this.#busy || this.#closed || (client && this.#controller && this.#controller !== client)) {
      this.#failure(this.#busy ? "reentrant" : "configuration");
      throw new Error("Inspection control is unavailable.");
    }
  }

  #configure<Value>(client: Client, run: () => Value): Value {
    this.#assert(client);
    this.#busy = true;
    try {
      return run();
    } catch {
      this.#failure("configuration");
      throw new Error("Invalid inspection configuration.");
    } finally {
      this.#busy = false;
    }
  }

  #state(now: number): StarInspectionTraceState {
    return (
      this.#trace?.state(now) ??
      disabled(this.#counters, this.#progress.sequence, this.#progress.policyId)
    );
  }

  #capture(event: unknown, kind: StarInspectionKind): void {
    if (!this.#trace || this.#closed || this.#busy || this.#capturing) return;
    this.#capturing = true;
    try {
      const now = this.#now();
      if (Number.isFinite(now)) this.#trace.capture(event, kind, now);
    } catch {
      this.#failure("capture");
    } finally {
      this.#capturing = false;
    }
  }

  #cleanup(release: () => void): void {
    try {
      release();
    } catch (error) {
      // Final attachment cleanup can rethrow failures already counted by this collector.
      if (!(error instanceof InspectionCleanupFailure)) this.#failure("cleanup");
    }
  }

  #stop(): void {
    if (this.#trace) {
      const state = this.#trace.state(this.#now());
      this.#progress.sequence = state.sequence;
      this.#progress.policyId = state.policyId;
      this.#trace.dispose();
      this.#trace = undefined;
    }
    const timer = this.#timer;
    this.#timer = undefined;
    if (timer) this.#cleanup(timer);
    const cleanups = this.#cleanups;
    this.#cleanups = [];
    for (const release of cleanups.reverse()) this.#cleanup(release);
    this.#controller = undefined;
  }

  enable(client: Client, input: StarTraceOptions): void {
    this.#configure(client, () => {
      const options = traceOptions(input);
      const now = this.#now();
      if (!Number.isFinite(now)) throw new Error();
      this.#stop();
      this.#trace = new Trace(options, this.#counters, this.#sequence, now, this.#progress);
      this.#controller = client;
      try {
        if (
          options.kinds.some((kind) => kind === "action" || kind === "request" || kind === "store")
        ) {
          this.#cleanups.push(
            this.#adapter!.observe((event) => {
              try {
                this.#capture(
                  event,
                  choice(data(plain(event), "kind"), ["action", "request", "store"] as const),
                );
              } catch {
                this.#failure("capture");
              }
            }),
          );
        }
        this.#adapter!.services((registration) => {
          const kind =
            registration.namespace === "core.turbo"
              ? "turbo"
              : registration.namespace === "core.htmx"
                ? "htmx"
                : undefined;
          if (!kind || !options.kinds.includes(kind) || !registration.observe) return;
          const release = registration.observe((event) => this.#capture(event, kind));
          if (typeof release !== "function") throw new Error();
          this.#cleanups.push(release);
        });
      } catch {
        this.#stop();
        throw new Error();
      }
    });
  }

  disable(client: Client): void {
    this.#assert(client);
    this.#stop();
  }
  clear(client: Client): void {
    this.#assert(client);
    this.#trace?.clear();
  }

  #schedule(): void {
    const old = this.#timer;
    this.#timer = undefined;
    if (old) this.#cleanup(old);
    const expiry = this.#trace?.expiry();
    if (expiry === undefined || !this.#adapter) return;
    const timer = setTimeout(
      () => {
        const release = this.#timer;
        this.#timer = undefined;
        if (release) this.#cleanup(release);
        try {
          this.#trace?.expire(this.#now());
          this.#schedule();
        } catch {
          this.#stop();
          this.#failure("capture");
        }
      },
      Math.max(0, expiry - this.#now()),
    );
    try {
      this.#timer = this.#adapter.own("task", () => clearTimeout(timer));
    } catch {
      clearTimeout(timer);
      this.#stop();
      throw new Error("Inspection timer ownership failed.");
    }
  }

  allow(client: Client, input: StarInspectionFieldPolicy): void {
    this.#configure(client, () => {
      if (!this.#trace || this.#controller !== client) throw new Error();
      const policy = fieldPolicy(input);
      const now = this.#now();
      if (!Number.isFinite(now)) throw new Error();
      this.#trace.allow(policy, now);
      this.#schedule();
    });
  }

  deny(client: Client, field: StarInspectionField): void {
    this.#configure(client, () => {
      const accepted = choice(field, fields);
      this.#trace?.deny(accepted, this.#now());
      this.#schedule();
    });
  }

  records(exporting: boolean): readonly StarInspectionRecord[] {
    this.#assert();
    this.#busy = true;
    try {
      return this.#trace?.records(this.#now(), exporting) ?? Object.freeze([]);
    } catch {
      this.#failure("export");
      return Object.freeze([]);
    } finally {
      this.#busy = false;
    }
  }

  export(): StarInspectionTrace {
    this.#assert();
    this.#busy = true;
    try {
      const now = this.#now();
      return copy({
        schema: "jqstar-inspection-trace/1",
        kernelId: this.#id,
        trace: this.#state(now),
        records: this.#trace?.records(now, true) ?? [],
      });
    } catch {
      this.#failure("export");
      return copy({
        schema: "jqstar-inspection-trace/1",
        kernelId: this.#id,
        trace: disabled(this.#counters, this.#progress.sequence, this.#progress.policyId),
        records: [],
      });
    } finally {
      this.#busy = false;
    }
  }

  snapshot(): StarInspectionSnapshot {
    this.#assert();
    this.#busy = true;
    try {
      const services: Array<StarInspectionSnapshot["services"][number]> = [];
      const kernel = this.#adapter!.read();
      this.#adapter!.services((registration) => {
        try {
          services.push(serviceSummary(registration));
        } catch {
          this.#failure("serializer");
        }
      });
      return snapshotDocument(
        this.#version,
        this.#id,
        this.#sequence.next(),
        "active",
        kernel,
        services,
        this.#state(this.#now()),
        this.#terminal.read(),
      );
    } catch {
      this.#failure("export");
      return snapshotDocument(
        this.#version,
        this.#id,
        this.#sequence.next(),
        "active",
        null,
        [],
        this.#state(this.#now()),
        this.#terminal.read(),
      );
    } finally {
      this.#busy = false;
    }
  }

  release(client: Client): StarInspectorDisposalReport {
    this.#clients.delete(client);
    if (this.#controller === client) this.#stop();
    const release = client.release;
    client.release = undefined;
    if (release) this.#cleanup(release);
    return Object.freeze({
      schema: "jqstar-inspector-disposal/1",
      failures: this.#counters.failures.cleanup,
    });
  }

  dispose(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#stop();
    for (const client of this.#clients) {
      client.collector = undefined;
      client.release = undefined;
    }
    this.#clients.clear();
    this.#adapter = undefined;
    if (this.#counters.failures.cleanup)
      throw new InspectionCleanupFailure("Inspection cleanup failed.");
  }
}
