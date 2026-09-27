import type { StarInstalledJQuery, StarInstance, StarPluginDocumentHost } from "jquery-star/core";
import type { Project, ProjectId } from "./html.mjs";
export type { Consumer, Project, ProjectId } from "./html.mjs";

export interface ViewState {
  status: "ready" | "loading" | "error";
  id: ProjectId;
  version?: number;
  project?: Project;
}
export interface Residue {
  records: number;
  observers: number;
  tasks: number;
  timers: number | null;
}
export interface Strategy {
  acquire(id: ProjectId, publish: (state: ViewState) => void): () => void;
  invalidate(id: ProjectId): void;
  dispose(): void;
  inspect(): Residue;
}
export interface StrategyContext {
  $: StarInstalledJQuery;
  host: StarPluginDocumentHost;
  initial: Project;
  endpoint(id: ProjectId): string;
  coordinator(): StarInstance;
  load(id: ProjectId, signal: AbortSignal, fresh?: boolean): Promise<Project>;
  trace(phase: string): void;
}
export type StrategyFactory = (context: StrategyContext) => Strategy;
export const freshnessMs = 60_000;
export const gcMs = 250;
