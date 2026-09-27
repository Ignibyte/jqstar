import type { StarDisposalCategory, StarDisposalReport } from "./disposal";
import type { StarOperationObserver, StarOperationOwner } from "./observation";
import type { StarPluginResourceKind } from "./plugin";

export type StarMetadataCountKey =
  | "installed"
  | "capabilities"
  | "records"
  | "subscriptions"
  | "effects"
  | "tasks"
  | "attachments"
  | "pending"
  | "disabled"
  | "disposed"
  | "renders"
  | "observers"
  | "waiters"
  | "history"
  | "requests"
  | "listeners";

export type StarMetadataBoundary = "capabilities" | "service-resources" | "attachments" | "bridge";

export interface StarServiceMetadataView {
  readonly boundary: StarMetadataBoundary;
  readonly counts: Readonly<Partial<Record<StarMetadataCountKey, number>>>;
}

export interface StarServiceMetadataSummary extends StarServiceMetadataView {
  readonly schema: "jqstar-service-counts/1";
}

export interface StarServiceMetadataRegistration {
  readonly namespace: string;
  readonly schema: "jqstar-service-counts/1";
  view(this: void): StarServiceMetadataView;
  serialize(this: void, view: StarServiceMetadataView): unknown;
  observe?(this: void, observer: (event: unknown) => void): () => void;
}

export interface StarPluginMetadata {
  readonly name: string;
  readonly version: string;
}

export interface StarKernelMetadata {
  readonly applications: readonly StarOperationOwner[];
  readonly applicationCount: number;
  readonly plugins: readonly StarPluginMetadata[];
  readonly pluginCount: number;
  readonly serviceCount: number;
  readonly ownership: Readonly<Record<StarPluginResourceKind, number>>;
  readonly pendingEnhancements: number;
  readonly pendingTasks: number;
  readonly protocolProfiles: number;
  readonly protocolBodies: number;
  readonly middleware: number;
  readonly expression: "installed";
}

export interface StarMetadataDisposalCounts {
  readonly attempted: Readonly<Record<StarDisposalCategory, number>>;
  readonly released: Readonly<Record<StarDisposalCategory, number>>;
  readonly failed: Readonly<Record<StarDisposalCategory, number>>;
  readonly remaining: Readonly<Record<StarDisposalCategory, number>>;
}

export interface StarMetadataSequence {
  next(): number;
}

export interface StarMetadataTerminal {
  read(): StarMetadataDisposalCounts | null;
}

export interface StarKernelAttachment<Value> {
  readonly value: Value;
  release(): void;
}

export interface StarKernelMetadataAdapter {
  readonly version: string;
  readonly id: string;
  readonly terminal: StarMetadataTerminal;
  readonly sequence: StarMetadataSequence;
  read(): StarKernelMetadata;
  services(visit: (registration: StarServiceMetadataRegistration) => void): void;
  observe(observer: StarOperationObserver): () => void;
  own(kind: StarPluginResourceKind, cleanup: () => void): () => void;
  acquire<Value>(
    name: string,
    version: string,
    create: () => { readonly value: Value; dispose(): void },
  ): StarKernelAttachment<Value>;
}

export type StarPluginMetadataVisitor = (
  name: string,
  version: string,
  service: StarServiceMetadataRegistration | undefined,
) => void;

export interface StarKernelMetadataAccess {
  inventory(
    application: (owner: StarOperationOwner) => void,
    resource: (kind: StarPluginResourceKind) => void,
  ): readonly [
    applications: number,
    enhancements: number,
    tasks: number,
    profiles: number,
    bodies: number,
    middleware: number,
  ];
  plugins(visit: StarPluginMetadataVisitor): void;
  observe(observer: StarOperationObserver): () => void;
  own(kind: StarPluginResourceKind, cleanup: () => void): () => void;
  onDisposed(observer: (report: StarDisposalReport) => void): () => void;
}
