import type {
  StarServiceMetadataRegistration,
  StarServiceMetadataSummary,
  StarServiceMetadataView,
} from "../metadata-types";
import {
  bytes,
  choice,
  copy,
  data,
  exact,
  integer,
  invalid,
  STAR_INSPECTION_LIMITS,
} from "./redaction";

const countKeys = Object.freeze([
  "installed",
  "capabilities",
  "records",
  "subscriptions",
  "effects",
  "tasks",
  "attachments",
  "pending",
  "disabled",
  "disposed",
  "renders",
  "observers",
  "waiters",
  "history",
  "requests",
  "listeners",
]);

function view(input: unknown, serialized: boolean): StarServiceMetadataView {
  const object = exact(
    input,
    serialized ? ["schema", "boundary", "counts"] : ["boundary", "counts"],
  );
  if (!serialized && !Object.isFrozen(object)) return invalid();
  if (serialized && data(object, "schema") !== "jqstar-service-counts/1") return invalid();
  const boundary = choice(data(object, "boundary"), [
    "capabilities",
    "service-resources",
    "attachments",
    "bridge",
  ] as const);
  const source = exact(data(object, "counts"), countKeys);
  if (!serialized && !Object.isFrozen(source)) return invalid();
  const counts: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const key of countKeys) {
    const value = data(source, key);
    if (value !== undefined) counts[key] = integer(value);
  }
  return Object.freeze({ boundary, counts: Object.freeze(counts) });
}

export function serviceSummary(
  registration: StarServiceMetadataRegistration,
): StarServiceMetadataSummary & { namespace: string } {
  if (
    registration.schema !== "jqstar-service-counts/1" ||
    !/^[a-z][a-z0-9.-]{0,95}$/.test(registration.namespace)
  )
    return invalid();
  const approved = view(registration.view(), false);
  const result = view(registration.serialize(approved), true);
  const summary = {
    namespace: registration.namespace,
    schema: "jqstar-service-counts/1" as const,
    ...result,
  };
  if (bytes(summary) > STAR_INSPECTION_LIMITS.maxServiceBytes) return invalid();
  return copy(summary);
}
