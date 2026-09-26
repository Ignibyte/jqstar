import { createKernelMetadata } from "./kernel-metadata";
import type { StarKernelMetadataAdapter } from "./metadata-types";
import type { StarInstalledJQuery } from "./types";

/** Resolve the generic capability on the explicitly installed jQuery instance. */
export function createKernelMetadataAdapter($: JQueryStatic): StarKernelMetadataAdapter {
  const star = ($ as StarInstalledJQuery).star;
  if (!star || typeof star.metadata !== "function") {
    throw new Error("This jQStar installation has no kernel metadata capability.");
  }
  const key = Symbol.for("jqstar.metadata/1");
  const realm = globalThis as typeof globalThis & Record<symbol, unknown>;
  const registry = (realm[key] ??= new WeakMap()) as WeakMap<object, StarKernelMetadataAdapter>;
  const existing = registry.get(star);
  if (existing) return existing;
  const version = star.version;
  if (
    typeof version !== "string" ||
    version.length > 32 ||
    !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version)
  ) {
    throw new Error("Kernel metadata version is invalid.");
  }
  const adapter = createKernelMetadata(star.metadata(), version);
  registry.set(star, adapter);
  return adapter;
}
