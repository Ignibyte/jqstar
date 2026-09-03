import type { StarPlugin } from "jquery-star/core";

export interface ExternalPluginFacade {
  readonly label: "external-ready";
  readonly ledger: string[];
}

export declare function createExternalPlugin(ledger?: string[]): StarPlugin<ExternalPluginFacade>;
export declare function createFailingExternalPlugin(ledger?: string[]): StarPlugin;
export declare function createCleanupFailingExternalPlugin(ledger?: string[]): StarPlugin;
