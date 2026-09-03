import type {
  ComputedRecord,
  StarDisposalReport,
  StarDefinition,
  StarInstalledJQuery,
  StarInstance,
  StarOperationObservation,
  StarPlugin,
  StarPluginFacade,
  StateRecord,
} from "jquery-star/core";
import type { StarResponseController } from "./responses";

export type StarDOMWindow = Window & typeof globalThis;

export interface StarHarnessApplication<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> {
  readonly id: string;
  readonly root: Element;
  readonly instance: StarInstance<State, Computed>;
  readonly mode: "attributes" | "behavior";
  readonly state: State;
  readonly destroyed: boolean;
  destroy(): void;
}

export interface CreateStarHarnessOptions {
  readonly window: StarDOMWindow;
  readonly document?: Document;
  readonly jQuery: JQueryStatic;
  readonly plugins?: readonly StarPlugin[];
  readonly responses?: StarResponseController;
}

export interface StarFlushOptions {
  readonly maxRounds?: number;
  readonly timeoutMs?: number;
}

export interface StarFlushWork {
  readonly category: "operation" | "request" | "task";
  readonly id: string;
  readonly owner: string;
}

export interface StarFlushDiagnostic {
  readonly schema: "jquery-star-flush-diagnostic/1";
  readonly elapsedMs: number;
  readonly outstanding: readonly StarFlushWork[];
  readonly rounds: number;
}

export interface StarFlushResult {
  readonly schema: "jquery-star-flush/1";
  readonly elapsedMs: number;
  readonly rounds: number;
}

export interface StarHarness {
  readonly document: Document;
  readonly installed: StarInstalledJQuery;
  readonly responses?: StarResponseController;
  readonly window: StarDOMWindow;
  install<Facade>(plugin: StarPlugin<Facade>): Facade;
  install<const Plugins extends readonly StarPlugin[]>(
    plugins: Plugins,
  ): { readonly [Key in keyof Plugins]: StarPluginFacade<Plugins[Key]> };
  mountDeclarative<State extends StateRecord = StateRecord>(
    root: Element,
  ): StarHarnessApplication<State>;
  mountBehavior<State extends StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    root: Element,
    definition: StarDefinition<State, Computed>,
  ): StarHarnessApplication<State, Computed>;
  state<State extends StateRecord = StateRecord>(
    application: StarHarnessApplication<State> | Element,
  ): State;
  observations(): readonly StarOperationObservation[];
  triggerNative(target: EventTarget, type: string, init?: EventInit): Event;
  triggerJQuery(
    target: Element | Document | Window,
    type: string,
    extra?: readonly unknown[],
  ): void;
  task(owner: string, work: PromiseLike<unknown>): void;
  flush(options?: StarFlushOptions): Promise<StarFlushResult>;
  destroy(application: StarHarnessApplication | Element): void;
  dispose(): StarDisposalReport;
}

export interface StarDOMRealmOptions {
  readonly window: StarDOMWindow;
  readonly document?: Document;
  readonly jQuery?: JQueryStatic;
}

export interface StarConformanceCaseResult {
  readonly name: string;
  readonly status: "pass";
}

export interface StarConformanceReport {
  readonly schema: "jquery-star-conformance/1";
  readonly cases: readonly StarConformanceCaseResult[];
  readonly passed: number;
}

export type StarHarnessFactory = () => StarHarness | Promise<StarHarness>;
