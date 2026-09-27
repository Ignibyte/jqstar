import type {
  StarKernelMetadata,
  StarMetadataDisposalCounts,
  StarServiceMetadataSummary,
} from "../metadata-types";

export type StarInspectionKind = "action" | "request" | "store" | "turbo" | "htmx" | "policy";
export type StarInspectionOutcome = "pending" | "completed" | "cancelled" | "failed";
export type StarInspectionField = "actionCapability" | "storeName";
export type StarInspectionFailure =
  "configuration" | "capture" | "serializer" | "reentrant" | "clock" | "export" | "cleanup";

export interface StarTraceOptions {
  readonly maxEntries: number;
  readonly maxBytes: number;
  readonly kinds?: readonly StarInspectionKind[];
  readonly outcomes?: readonly StarInspectionOutcome[];
  readonly everyNth?: number;
}

export interface StarInspectionFieldPolicy {
  readonly field: StarInspectionField;
  readonly purpose: "debugging" | "support";
  readonly maxLength: number;
  readonly retain: boolean;
  readonly export: boolean;
  readonly expiresInMs: number;
}

export interface StarInspectionRecord {
  readonly sequence: number;
  readonly kind: StarInspectionKind;
  readonly phase: string;
  readonly outcome: StarInspectionOutcome;
  readonly elapsedMs: number;
  readonly id?: string;
  readonly parentId?: string;
  readonly ownerId?: string;
  readonly category?: string;
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly status?: number;
  readonly attempt?: number;
  readonly loaded?: number;
  readonly total?: number;
  readonly removals?: number;
  readonly renderId?: number;
  readonly policyId?: number;
  readonly field?: StarInspectionField;
  readonly actionCapability?: string;
  readonly storeName?: string;
}

export interface StarInspectionCounters {
  readonly observed: number;
  readonly filtered: number;
  readonly sampled: number;
  readonly retained: number;
  readonly evicted: number;
  readonly oversized: number;
  readonly purged: number;
  readonly failures: Readonly<Record<StarInspectionFailure, number>>;
}

export interface StarInspectionTraceState {
  readonly enabled: boolean;
  readonly maxEntries: number;
  readonly maxBytes: number;
  readonly entries: number;
  readonly bytes: number;
  readonly sequence: number;
  readonly policyId: number;
  readonly kinds: readonly StarInspectionKind[];
  readonly outcomes: readonly StarInspectionOutcome[];
  readonly everyNth: number;
  readonly policies: readonly StarInspectionFieldPolicy[];
  readonly counters: StarInspectionCounters;
}

export interface StarInspectionTrace {
  readonly schema: "jqstar-inspection-trace/1";
  readonly kernelId: string;
  readonly trace: StarInspectionTraceState;
  readonly records: readonly StarInspectionRecord[];
}

export interface StarInspectionSnapshot {
  readonly schema: "jqstar-inspection-snapshot/1";
  readonly version: string;
  readonly kernelId: string;
  readonly sequence: number;
  readonly lifecycle: "active" | "disposed" | "released";
  readonly kernel: StarKernelMetadata | null;
  readonly services: readonly (StarServiceMetadataSummary & { readonly namespace: string })[];
  readonly omitted: {
    readonly applications: number;
    readonly plugins: number;
    readonly services: number;
  };
  readonly trace: StarInspectionTraceState;
  readonly disposal: StarMetadataDisposalCounts | null;
}

export interface StarInspectorDisposalReport {
  readonly schema: "jqstar-inspector-disposal/1";
  readonly failures: number;
}

export interface StarInspector {
  snapshot(): StarInspectionSnapshot;
  enableTrace(options: StarTraceOptions): void;
  disableTrace(): void;
  readTrace(): readonly StarInspectionRecord[];
  exportTrace(): StarInspectionTrace;
  clearTrace(): void;
  allowField(policy: StarInspectionFieldPolicy): void;
  denyField(field: StarInspectionField): void;
  dispose(): StarInspectorDisposalReport;
}
