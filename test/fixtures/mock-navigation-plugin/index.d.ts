import type { StarInstance, StarPlugin } from "jquery-star/core";

export interface MockNavigationObservation {
  readonly id: string;
  readonly phase: "started" | "completed" | "cancelled" | "failed";
}

export interface MockNavigationFacade {
  readonly ledger: readonly MockNavigationObservation[];
  visit(application: StarInstance, root: Element, html: string): Promise<unknown>;
}

export declare function createMockNavigationPlugin(
  jQuery: JQueryStatic,
  ledger?: MockNavigationObservation[],
): StarPlugin<MockNavigationFacade>;
