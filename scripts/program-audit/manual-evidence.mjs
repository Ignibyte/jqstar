import assert from "node:assert/strict";
import { boundedText as text, closedObject as object } from "./contracts.mjs";

export const manualPairs = Object.freeze({
  "nvda-windows": Object.freeze({
    os: "Windows",
    assistiveTechnology: "NVDA",
    browsers: Object.freeze(["Firefox", "Chrome"]),
    steps: Object.freeze([
      "grid-1",
      "grid-2",
      "grid-3",
      "grid-4",
      "interaction-1",
      "interaction-2",
      "interaction-3",
      "interaction-4",
      "updates-1",
      "updates-2",
      "csp-1",
      "csp-2",
      "csp-3",
      "csp-4",
    ]),
  }),
  "voiceover-safari": Object.freeze({
    os: "macOS",
    assistiveTechnology: "VoiceOver",
    browsers: Object.freeze(["Safari"]),
    steps: Object.freeze([
      "grid-1",
      "grid-2",
      "grid-3",
      "interaction-1",
      "interaction-2",
      "interaction-3",
      "interaction-4",
      "updates-1",
      "updates-2",
      "csp-1",
      "csp-2",
      "csp-3",
      "csp-4",
    ]),
  }),
});

export function validateManualRecord(record, expected) {
  object(
    record,
    [
      "schema",
      "pair",
      "artifact",
      "source",
      "environment",
      "input",
      "tester",
      "date",
      "profile",
      "steps",
    ],
    "Manual record",
  );
  assert(record.schema === "jqstar-assistive-technology/1", "Unsupported manual record schema");
  assert(Object.hasOwn(manualPairs, record.pair), "Unsupported assistive-technology pair");
  assert(
    /^[a-z0-9][a-z0-9._-]*\.tgz$/u.test(expected.artifact.filename) &&
      /^[a-f0-9]{64}$/u.test(expected.artifact.sha256) &&
      /^[a-f0-9]{40}$/u.test(expected.source.commit) &&
      /^[a-f0-9]{64}$/u.test(expected.source.receiptSha256),
    "Invalid frozen manual evidence identity",
  );
  const pair = manualPairs[record.pair];
  assert(pair, "Unsupported assistive-technology pair");
  object(record.artifact, ["filename", "sha256"], "Manual artifact");
  assert(
    record.artifact.filename === expected.artifact.filename &&
      record.artifact.sha256 === expected.artifact.sha256,
    "Manual artifact identity mismatch",
  );
  object(record.source, ["commit", "receiptSha256"], "Manual source");
  assert(
    record.source.commit === expected.source.commit &&
      record.source.receiptSha256 === expected.source.receiptSha256,
    "Manual source/receipt identity mismatch",
  );
  object(
    record.environment,
    [
      "os",
      "osVersion",
      "browser",
      "browserVersion",
      "assistiveTechnology",
      "assistiveTechnologyVersion",
    ],
    "Manual environment",
  );
  for (const [name, value] of Object.entries(record.environment)) text(value, name, 120);
  assert(record.environment.os === pair.os, "Incorrect manual operating system");
  assert(
    record.environment.assistiveTechnology === pair.assistiveTechnology,
    "Incorrect assistive technology",
  );
  assert(pair.browsers.includes(record.environment.browser), "Incorrect manual browser");
  const frozenEnvironment = expected.environments[record.pair];
  assert(
    frozenEnvironment &&
      Object.keys(record.environment).every(
        (name) => record.environment[name] === frozenEnvironment[name],
      ),
    "Manual environment differs from the frozen supported versions",
  );
  object(record.input, ["mode", "layout", "verbosity", "quickNav"], "Manual input");
  for (const name of ["mode", "layout", "verbosity"]) text(record.input[name], name, 500);
  assert(
    record.input.quickNav === null || typeof record.input.quickNav === "boolean",
    "Quick Nav must be recorded explicitly",
  );
  if (record.pair === "voiceover-safari")
    assert(typeof record.input.quickNav === "boolean", "VoiceOver needs its Quick Nav setting");
  text(record.tester, "Tester", 120);
  text(record.profile, "Browser profile", 500);
  assert(
    /^\d{4}-\d{2}-\d{2}$/u.test(record.date) &&
      Number.isFinite(Date.parse(`${record.date}T00:00:00Z`)) &&
      new Date(`${record.date}T00:00:00Z`).toISOString().startsWith(record.date),
    "Manual test date is invalid",
  );
  assert(
    record.date >= expected.earliestDate && record.date <= expected.latestDate,
    "Manual test date is outside the candidate interval",
  );
  assert(
    Array.isArray(record.steps) && record.steps.length === pair.steps.length,
    "Manual charter is incomplete",
  );
  for (const step of record.steps)
    object(step, ["id", "result", "observation", "issue", "quickNav"], "Manual step");
  assert(
    JSON.stringify(record.steps.map(({ id }) => id).sort()) ===
      JSON.stringify([...pair.steps].sort()),
    "Manual charter contains missing, duplicated, or unknown steps",
  );
  for (const step of record.steps) {
    object(step, ["id", "result", "observation", "issue", "quickNav"], "Manual step");
    assert(
      step.result === "pass",
      "A failed, skipped, or unapproved manual step cannot pass the audit",
    );
    text(step.observation, "Manual observation");
    assert(
      record.pair === "voiceover-safari"
        ? typeof step.quickNav === "boolean"
        : step.quickNav === null,
      "Each manual step needs its Quick Nav setting",
    );
    assert(
      step.issue === null || typeof step.issue === "string",
      "Manual issue reference is invalid",
    );
    if (step.issue !== null) text(step.issue, "Manual issue reference", 500);
  }
  return {
    pair: record.pair,
    status: "pass",
    steps: record.steps.length,
    date: record.date,
  };
}
