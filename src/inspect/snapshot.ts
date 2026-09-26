import type { StarKernelMetadata, StarMetadataDisposalCounts } from "../metadata-types";
import type { StarInspectionSnapshot, StarInspectionTraceState } from "./types";
import { bytes, copy, invalid, STAR_INSPECTION_LIMITS } from "./redaction";

export function snapshotDocument(
  version: string,
  kernelId: string,
  sequence: number,
  lifecycle: StarInspectionSnapshot["lifecycle"],
  kernel: StarKernelMetadata | null,
  services: StarInspectionSnapshot["services"],
  trace: StarInspectionTraceState,
  disposal: StarMetadataDisposalCounts | null,
): StarInspectionSnapshot {
  const result: StarInspectionSnapshot = {
    schema: "jqstar-inspection-snapshot/1",
    version,
    kernelId,
    sequence,
    lifecycle,
    kernel,
    services,
    trace,
    disposal,
    omitted: {
      applications: kernel ? kernel.applicationCount - kernel.applications.length : 0,
      plugins: kernel ? kernel.pluginCount - kernel.plugins.length : 0,
      services: kernel ? kernel.serviceCount - services.length : 0,
    },
  };
  if (bytes(result) > STAR_INSPECTION_LIMITS.maxSnapshotBytes) return invalid();
  return copy(result);
}
