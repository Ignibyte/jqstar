import { execFileSync } from "node:child_process";

import { existedAtRevision, loadQualityScope, repoPath } from "./lib.mjs";

const BUDGET_SCHEMA = "jqstar-quality-budgets/1";
const RATCHET_COMPARISON = "immutable-delivery-base";
const FIRST_BASELINE = "establish-when-base-has-no-budgets";
const BUDGET_PATH = "config/quality-budgets.json";
// Ticket 0055 measured the expanded public UI in the installed package. These nine
// exact transitions remain available for its older immutable delivery base.
const REVIEWED_REBASELINE_0055 = new Map([
  ["bundles.dist/jquery-star.umd.cjs", { from: 464896, to: 559104 }],
  ["bundles.dist/ui.cjs", { from: 318464, to: 408576 }],
  ["bundles.dist/ui.js", { from: 318464, to: 410624 }],
  ["bundles.dist/jquery-star-ui.css", { from: 169984, to: 171008 }],
  ["consumerBundles.rootImportBytes", { from: 542720, to: 634880 }],
  ["consumerBundles.coreImportGzipBytes", { from: 63000, to: 64512 }],
  ["consumerBundles.cspImportGzipBytes", { from: 45000, to: 46080 }],
  ["consumerBundles.cspImportBrotliBytes", { from: 39000, to: 40960 }],
  ["consumerBundles.storesImportGzipBytes", { from: 66560, to: 67584 }],
]);
// Ticket 0053 measured these two further increases against the current delivery base.
const REVIEWED_REBASELINE_0053 = new Map([
  ["consumerBundles.rootImportBytes", { from: 634880, to: 634881 }],
  ["consumerBundles.storesImportGzipBytes", { from: 67584, to: 67623 }],
]);

function numericLeaves(value, prefix = "") {
  const leaves = new Map();
  if (!value || typeof value !== "object" || Array.isArray(value)) return leaves;
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof entry === "number") leaves.set(path, entry);
    else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      for (const [nestedPath, nestedValue] of numericLeaves(entry, path)) {
        leaves.set(nestedPath, nestedValue);
      }
    }
  }
  return leaves;
}

export function evaluateBudgetRatchet(current, baseline, baseRevision) {
  const failures = [];
  if (current?.$schema !== BUDGET_SCHEMA) {
    failures.push(`Quality budget schema must be ${BUDGET_SCHEMA}.`);
  }
  if (current?.ratchet?.comparison !== RATCHET_COMPARISON) {
    failures.push(`Quality budget ratchet comparison must be ${RATCHET_COMPARISON}.`);
  }
  if (current?.ratchet?.firstBaseline !== FIRST_BASELINE) {
    failures.push(`Quality budget first-baseline rule must be ${FIRST_BASELINE}.`);
  }

  if (!baseRevision) {
    return {
      status: failures.length === 0 ? "not-applicable" : "fail",
      baseRevision: null,
      reason: "standalone scope has no immutable Git revision",
      failures,
    };
  }
  if (!baseline) {
    return {
      status: failures.length === 0 ? "first-baseline" : "fail",
      baseRevision,
      reason: "immutable delivery base has no quality budgets",
      failures,
    };
  }

  const currentValues = numericLeaves(current);
  for (const [path, baselineValue] of numericLeaves(baseline)) {
    const currentValue = currentValues.get(path);
    const reviewed = [REVIEWED_REBASELINE_0055.get(path), REVIEWED_REBASELINE_0053.get(path)];
    if (typeof currentValue !== "number") {
      failures.push(`${path} was removed from the immutable-base budgets.`);
    } else if (
      currentValue > baselineValue &&
      !reviewed.some((limit) => limit?.from === baselineValue && currentValue <= limit.to)
    ) {
      failures.push(`${path} ${currentValue} loosens immutable-base ceiling ${baselineValue}.`);
    }
  }
  return {
    status: failures.length === 0 ? "pass" : "fail",
    baseRevision,
    reason: "compared with quality budgets at immutable delivery base",
    failures,
  };
}

function readBudgetAtRevision(revision) {
  if (!revision || !existedAtRevision(BUDGET_PATH, revision)) return null;
  return JSON.parse(
    execFileSync("git", ["show", `${revision}:${BUDGET_PATH}`], {
      cwd: repoPath("."),
      encoding: "utf8",
    }),
  );
}

export async function evaluateCurrentBudgetRatchet(current) {
  const scope = await loadQualityScope();
  const baseRevision = scope.base ?? scope.head ?? null;
  return evaluateBudgetRatchet(current, readBudgetAtRevision(baseRevision), baseRevision);
}
