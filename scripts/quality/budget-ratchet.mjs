import { execFileSync } from "node:child_process";

import { existedAtRevision, loadQualityScope, repoPath } from "./lib.mjs";

const BUDGET_SCHEMA = "jqstar-quality-budgets/1";
const RATCHET_COMPARISON = "immutable-delivery-base";
const FIRST_BASELINE = "establish-when-base-has-no-budgets";
const BUDGET_PATH = "config/quality-budgets.json";

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
    if (typeof currentValue !== "number") {
      failures.push(`${path} was removed from the immutable-base budgets.`);
    } else if (currentValue > baselineValue) {
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
