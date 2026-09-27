import type { StarMetadataSequence } from "../metadata-types";
import type {
  StarInspectionCounters,
  StarInspectionField,
  StarInspectionFieldPolicy,
  StarInspectionKind,
  StarInspectionRecord,
  StarInspectionTraceState,
  StarTraceOptions,
} from "./types";
import {
  bytes,
  choice,
  copy,
  data,
  exact,
  fields,
  increment,
  integer,
  invalid,
  kinds,
  outcomes,
  plain,
  project,
  STAR_INSPECTION_LIMITS,
} from "./redaction";

export type MutableCounters = {
  -readonly [Key in keyof StarInspectionCounters]: StarInspectionCounters[Key];
};
type Policy = { readonly value: StarInspectionFieldPolicy; readonly until: number };
export interface TraceProgress {
  sequence: number;
  policyId: number;
}

type Entry = { readonly record: StarInspectionRecord; readonly bytes: number };

function list<Value extends string>(value: unknown, allowed: readonly Value[]): readonly Value[] {
  if (value === undefined) return allowed;
  if (!Array.isArray(value) || value.length > allowed.length) return invalid();
  const result: Value[] = [];
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1) return invalid();
  for (let index = 0; index < value.length; index++)
    result.push(choice(data(value, String(index)), allowed));
  if (new Set(result).size !== result.length) return invalid();
  return Object.freeze(result);
}

export function traceOptions(input: StarTraceOptions): Required<StarTraceOptions> {
  const value = exact(input, ["maxEntries", "maxBytes", "kinds", "outcomes", "everyNth"]);
  return Object.freeze({
    maxEntries: integer(data(value, "maxEntries"), 1, STAR_INSPECTION_LIMITS.maxEntries),
    maxBytes: integer(data(value, "maxBytes"), 2, STAR_INSPECTION_LIMITS.maxBytes),
    everyNth: integer(data(value, "everyNth") ?? 1, 1, 1_000_000),
    kinds: list(data(value, "kinds"), kinds),
    outcomes: list(data(value, "outcomes"), outcomes),
  });
}

export function fieldPolicy(input: StarInspectionFieldPolicy): StarInspectionFieldPolicy {
  const value = exact(input, ["field", "purpose", "maxLength", "retain", "export", "expiresInMs"]);
  const retain = data(value, "retain");
  const exportable = data(value, "export");
  if (typeof retain !== "boolean" || typeof exportable !== "boolean") return invalid();
  return Object.freeze({
    field: choice(data(value, "field"), fields),
    purpose: choice(data(value, "purpose"), ["debugging", "support"] as const),
    maxLength: integer(data(value, "maxLength"), 1, 96),
    retain,
    export: exportable,
    expiresInMs: integer(data(value, "expiresInMs"), 1, 3_600_000),
  });
}

export class Trace {
  readonly options: Required<StarTraceOptions>;
  readonly #entries: Entry[] = [];
  readonly #positions = { action: 0, request: 0, store: 0, turbo: 0, htmx: 0, policy: 0 };
  readonly #policies = new Map<StarInspectionField, Policy>();
  readonly #counters: MutableCounters;
  readonly #sequence: StarMetadataSequence;
  readonly #start: number;
  #bytes = 2;
  readonly #progress: TraceProgress;
  #elapsed = 0;

  constructor(
    options: Required<StarTraceOptions>,
    counters: MutableCounters,
    sequence: StarMetadataSequence,
    now: number,
    progress: TraceProgress,
  ) {
    this.options = options;
    this.#counters = counters;
    this.#sequence = sequence;
    this.#start = now;
    this.#progress = progress;
  }

  #elapsedAt(now: number): number {
    this.#elapsed = Math.max(
      this.#elapsed,
      Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, now - this.#start)),
    );
    return this.#elapsed;
  }

  #accept(kind: StarInspectionKind, outcome: StarInspectionRecord["outcome"]): boolean {
    this.#counters.observed = increment(this.#counters.observed);
    if (!this.options.kinds.includes(kind) || !this.options.outcomes.includes(outcome)) {
      this.#counters.filtered = increment(this.#counters.filtered);
      return false;
    }
    this.#positions[kind] = (this.#positions[kind] + 1) % this.options.everyNth;
    if (this.#positions[kind] !== 0) {
      this.#counters.sampled = increment(this.#counters.sampled);
      return false;
    }
    return true;
  }

  #retain(record: StarInspectionRecord): void {
    const length = bytes(record);
    this.#progress.sequence = record.sequence;
    if (length + 2 > this.options.maxBytes) {
      this.#counters.oversized = increment(this.#counters.oversized);
      return;
    }
    while (
      this.#entries.length >= this.options.maxEntries ||
      this.#bytes + length + Number(this.#entries.length > 0) > this.options.maxBytes
    ) {
      const removed = this.#entries.shift()!;
      this.#bytes -= removed.bytes + Number(this.#entries.length > 0);
      this.#counters.evicted = increment(this.#counters.evicted);
    }
    this.#bytes += length + Number(this.#entries.length > 0);
    this.#entries.push({ record, bytes: length });
    this.#counters.retained = increment(this.#counters.retained);
  }

  capture(input: unknown, kind: StarInspectionKind, now: number): void {
    const object = plain(input);
    const phase = data(object, "phase");
    const outcome =
      phase === "completed" || phase === "committed"
        ? "completed"
        : phase === "failed"
          ? "failed"
          : phase === "cancelled" || phase === "canceled"
            ? "cancelled"
            : "pending";
    if (!this.#accept(kind, outcome)) return;
    const record = project(
      input,
      kind,
      this.#sequence.next(),
      this.#elapsedAt(now),
      (field, value) => {
        const policy = this.#policies.get(field);
        if (!policy || !policy.value.retain || now >= policy.until) return undefined;
        if (
          typeof value !== "string" ||
          value.length > policy.value.maxLength ||
          !/^[a-z][a-zA-Z0-9]*$/.test(value)
        )
          return undefined;
        return value;
      },
    );
    this.#retain(record);
  }

  #policyRecord(
    field: StarInspectionField,
    phase: "allowed" | "denied" | "expired",
    now: number,
  ): void {
    this.#progress.policyId = this.#sequence.next();
    if (this.#accept("policy", "completed"))
      this.#retain(
        Object.freeze({
          sequence: this.#sequence.next(),
          kind: "policy",
          phase,
          outcome: "completed",
          field,
          policyId: this.#progress.policyId,
          elapsedMs: this.#elapsedAt(now),
        }),
      );
  }

  #purge(field: StarInspectionField): void {
    for (let index = this.#entries.length - 1; index >= 0; index--) {
      if (this.#entries[index]!.record[field] !== undefined) {
        const [removed] = this.#entries.splice(index, 1);
        this.#bytes -= removed!.bytes + Number(this.#entries.length > 0);
        this.#counters.purged = increment(this.#counters.purged);
      }
    }
  }

  allow(policy: StarInspectionFieldPolicy, now: number): void {
    this.#purge(policy.field);
    this.#policies.set(policy.field, { value: policy, until: now + policy.expiresInMs });
    this.#policyRecord(policy.field, "allowed", now);
  }

  deny(field: StarInspectionField, now: number): void {
    this.#purge(field);
    if (this.#policies.delete(field)) this.#policyRecord(field, "denied", now);
  }

  expire(now: number): void {
    for (const [field, policy] of this.#policies) {
      if (now >= policy.until) {
        this.#purge(field);
        this.#policies.delete(field);
        this.#policyRecord(field, "expired", now);
      }
    }
  }

  expiry(): number | undefined {
    let earliest = Infinity;
    for (const policy of this.#policies.values()) earliest = Math.min(earliest, policy.until);
    return earliest === Infinity ? undefined : earliest;
  }

  records(now: number, exporting: boolean): readonly StarInspectionRecord[] {
    const result: StarInspectionRecord[] = [];
    for (const { record } of this.#entries) {
      // Expired/revoked records are withheld without changing retention or sampling during reads.
      if (
        fields.some(
          (field) =>
            record[field] !== undefined &&
            (!this.#policies.has(field) || now >= this.#policies.get(field)!.until),
        )
      )
        continue;
      const projected = { ...record };
      if (exporting)
        for (const field of fields)
          if (!this.#policies.get(field)?.value.export) delete projected[field];
      result.push(projected);
    }
    return copy(result);
  }

  state(now: number): StarInspectionTraceState {
    return copy({
      enabled: true,
      maxEntries: this.options.maxEntries,
      maxBytes: this.options.maxBytes,
      entries: this.#entries.length,
      bytes: this.#bytes,
      sequence: this.#progress.sequence,
      policyId: this.#progress.policyId,
      kinds: this.options.kinds,
      outcomes: this.options.outcomes,
      everyNth: this.options.everyNth,
      policies: [...this.#policies.values()]
        .filter((policy) => now < policy.until)
        .map((policy) => policy.value),
      counters: this.#counters,
    });
  }

  clear(): void {
    this.#entries.length = 0;
    this.#bytes = 2;
  }
  dispose(): void {
    this.clear();
    this.#policies.clear();
  }
}
