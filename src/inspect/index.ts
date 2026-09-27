import { createKernelMetadataAdapter } from "../metadata-adapter";
import { Collector } from "./collector";
import type { StarInspector } from "./types";

export { STAR_INSPECTION_LIMITS } from "./redaction";
export type {
  StarInspectionKind,
  StarInspectionOutcome,
  StarInspectionField,
  StarInspectionFailure,
  StarTraceOptions,
  StarInspectionFieldPolicy,
  StarInspectionRecord,
  StarInspectionCounters,
  StarInspectionTraceState,
  StarInspectionTrace,
  StarInspectionSnapshot,
  StarInspectorDisposalReport,
  StarInspector,
} from "./types";

export function attachInspector($: JQueryStatic): StarInspector {
  const adapter = createKernelMetadataAdapter($);
  const attachment = adapter.acquire("core.inspect", "1", () => {
    const collector = new Collector(adapter);
    return { value: collector, dispose: () => collector.dispose() };
  });
  try {
    return attachment.value.open(() => attachment.release());
  } catch (error) {
    attachment.release();
    throw error;
  }
}

export type {
  StarKernelMetadata,
  StarPluginMetadata,
  StarMetadataDisposalCounts,
  StarServiceMetadataSummary,
  StarServiceMetadataView,
  StarMetadataBoundary,
  StarMetadataCountKey,
} from "../metadata-types";
export type { StarOperationOwner } from "../observation";
export type { StarDisposalCategory } from "../disposal";
export type { StarPluginResourceKind } from "../plugin";
