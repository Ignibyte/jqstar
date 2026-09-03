import type { StarRenderAdapter } from "jquery-star/core";

export type ExternalHost = "htmx" | "turbo";
export type ExternalRenderState =
  | "canceled"
  | "committed"
  | "enhancing"
  | "externally-mutated"
  | "failed"
  | "prepared"
  | "removing";

export interface ExternalRenderOperation {
  beginMutation(preserveRoots?: Iterable<Element>): ExternalRenderOperation;
  beforeRemove(removalBoundary: Element): void;
  cancel(): void;
  commit(): Promise<void>;
  fail(error: unknown): Promise<void>;
  mutated(incomingRoots?: Iterable<Element>): void;
  snapshot(): Readonly<{
    bridgeOperationId: number;
    renderOperationId: number | null;
    flowId: string;
    state: ExternalRenderState;
    removalCount: number;
  }>;
}

export interface ExternalRenderObservation {
  readonly sequence: number;
  readonly bridgeOperationId: number;
  readonly renderOperationId: number | null;
  readonly host: ExternalHost;
  readonly version: string;
  readonly flowId: string;
  readonly boundaryCategory: string;
  readonly phase: ExternalRenderState;
  readonly outcome: string;
  readonly removalCount: number;
}

export interface ExternalRenderCoordinator {
  prepare(options: {
    flowId: string;
    boundary: Element;
    boundaryCategory?: string;
  }): ExternalRenderOperation;
  observations(): readonly ExternalRenderObservation[];
  dispose(): Promise<
    Readonly<{
      schema: "jqstar-external-render-disposal/1";
      attempted: number;
      remaining: number;
    }>
  >;
}

export function createExternalRenderCoordinator(options: {
  adapter: StarRenderAdapter;
  host: ExternalHost;
  version: string;
  minimumVersion: string;
  maximumVersionExclusive: string;
}): ExternalRenderCoordinator;

export function matchingPreservedRoots(options: {
  outgoing: Element;
  incoming: Element;
  marker: "data-turbo-permanent" | "hx-preserve";
}): readonly Element[];
