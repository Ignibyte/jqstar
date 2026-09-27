import type { StarPluginDocumentHost, StarPluginRegistrar } from "./plugin";
import type { StarMetadataBoundary, StarServiceMetadataView } from "./metadata-types";

export function registerServiceMetadata(
  registrar: StarPluginRegistrar,
  namespace: string,
  boundary: StarMetadataBoundary,
  counts: () => StarServiceMetadataView["counts"],
  observe?: (observer: (event: unknown) => void) => () => void,
): void {
  registrar.metadata?.({
    namespace,
    schema: "jqstar-service-counts/1",
    view: () => Object.freeze({ boundary, counts: Object.freeze(counts()) }),
    serialize: (view) => Object.freeze({ schema: "jqstar-service-counts/1", ...view }),
    ...(observe ? { observe } : {}),
  });
}

/** Count service-owned subscriptions/effects; task settlement remains with the service's promise. */
export function countServiceResources(
  sourceHost: Pick<StarPluginDocumentHost, "operation" | "own" | "task">,
) {
  const resourceCounts = { subscriptions: 0, effects: 0, tasks: 0 };
  const host: typeof sourceHost = {
    operation: (event) => sourceHost.operation?.(event),
    own(kind, owner, cleanup) {
      const count =
        kind === "subscription" ? "subscriptions" : kind === "effect" ? "effects" : undefined;
      if (!count) return sourceHost.own(kind, owner, cleanup);
      resourceCounts[count]++;
      try {
        return sourceHost.own(kind, owner, () => {
          resourceCounts[count]--;
          cleanup();
        });
      } catch (error) {
        resourceCounts[count]--;
        throw error;
      }
    },
    task: sourceHost.task!,
  };
  return { host, counts: resourceCounts };
}
