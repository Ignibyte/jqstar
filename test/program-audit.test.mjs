// @vitest-environment node
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  deriveRequirements,
  ticketRequirements,
  validateMappings,
} from "../scripts/program-audit/requirements.mjs";
import { manualPairs, validateManualRecord } from "../scripts/program-audit/manual-evidence.mjs";

function ticket(id, status = "done", checked = "x", split = false) {
  return {
    path: `docs/tickets/${id}-fixture.md`,
    source: `---\nid: ${id}\nstatus: ${status}\n---\n\n### Acceptance criteria\n\n- [${checked}] [AC-01]${split ? "\n      " : " "}A required behavior with a stable criterion.\n\n### Acceptance evidence\n\n| ID | Result | Evidence |\n| --- | --- | --- |\n| AC-01 | ${checked === "x" ? "Pass" : "Approved-Disposition"} | Direct recorded fixture. |\n\n### Completion audit\n\nStatus: Complete\n`,
  };
}

describe("program requirement derivation", () => {
  it("retains a criterion whose description starts on the following line", () => {
    const input = ticket("0034", "done", "x", true);
    const result = ticketRequirements(input.path, input.source);
    assert.equal(result.requirements[0].criterion, "AC-01");
    assert.equal(result.requirements[0].text, "A required behavior with a stable criterion.");
    const windows = ticketRequirements(input.path, input.source.replaceAll("\n", "\r\n"));
    assert.deepEqual(windows.requirements, result.requirements);
    assert.notEqual(windows.sha256, result.sha256);
  });

  it("checks declined criteria as strictly as completed criteria", () => {
    const input = ticket("0031", "declined", " ");
    assert.equal(
      ticketRequirements(input.path, input.source).requirements[0].disposition,
      "Approved-Disposition",
    );
    assert.throws(
      () => ticketRequirements(input.path, input.source.replace("Approved-Disposition", "Pass")),
      /invalid disposition/u,
    );
    assert.throws(
      () => ticketRequirements(input.path, input.source.replace("Status: Complete", "Pending")),
      /incomplete closure/u,
    );
  });

  it("rejects nonterminal, missing, extra, duplicate and unknown acceptance evidence", () => {
    const input = ticket("0001");
    for (const source of [
      input.source.replace("status: done", "status: testing"),
      input.source.replace(/^\| AC-01.*\n/mu, ""),
      input.source.replace("| AC-01 | Pass", "| AC-02 | Pass"),
      input.source.replace(
        "### Completion audit",
        "| AC-01 | Pass | Duplicate. |\n\n### Completion audit",
      ),
      input.source.replace(
        "### Acceptance evidence",
        "- [x] [AC-01] Duplicate criterion.\n\n### Acceptance evidence",
      ),
      input.source.replace("id: 0001", "id: 0001\nid: 0002"),
      input.source.replace("Direct recorded fixture.", ""),
      input.source.replace(
        "### Completion audit",
        "| AC-999 | Pass | Unknown row. |\n\n### Completion audit",
      ),
    ])
      assert.throws(() => ticketRequirements(input.path, source));
  });

  it("derives the full program and ticket sets deterministically without activating mutation", () => {
    const inputs = [ticket("0001"), ticket("0033", "planned"), ticket("0053", "planned")];
    const program =
      "## Program-level acceptance criteria\n\n- [ ] Preserve native HTML.\n\n## Later\n";
    const first = deriveRequirements(inputs, program, ["0001", "0033", "0053"]);
    const second = deriveRequirements([...inputs].reverse(), program, ["0001", "0033", "0053"]);
    assert.deepEqual(first, second);
    assert.equal(first.requirements.length, 2);
    assert.equal(first.tickets.find(({ id }) => id === "0053").role, "deferred");
    assert.throws(
      () => deriveRequirements([...inputs, inputs[0]], program, ["0001", "0033", "0053"]),
      /Duplicate ticket/u,
    );
  });

  it("rejects missing mappings, weaker evidence, ambiguous selectors and unsafe paths", () => {
    const requirements = [{ id: "0001:AC-01" }];
    const mapping = {
      id: "0001:AC-01",
      review: "This executed case proves the required lifecycle transition.",
      requiredKinds: ["unit"],
      evidence: [
        {
          id: "unit:lifecycle",
          kind: "unit",
          path: "test/runtime.test.ts",
          selector: "an exact named lifecycle test",
        },
      ],
    };
    assert.equal(validateMappings(requirements, [mapping]), true);
    const literal = structuredClone(mapping);
    literal.evidence[0].selector = "plugin version matches *";
    assert.equal(validateMappings(requirements, [literal]), true);
    for (const mutate of [
      (value) => {
        value.evidence = [];
      },
      (value) => {
        value.evidence[0].kind = "documentation";
      },
      (value) => {
        value.evidence[0].path = "../private.json";
      },
      (value) => {
        value.evidence[0].selector = "*";
      },
      (value) => {
        value.evidence[0].selector = "   ";
      },
      (value) => {
        value.id = "9999:AC-01";
      },
    ]) {
      const bad = structuredClone(mapping);
      mutate(bad);
      assert.throws(() => validateMappings(requirements, [bad]));
    }
    assert.throws(() => validateMappings(requirements, []));
    assert.throws(() => validateMappings(requirements, [mapping, mapping]));
  });
});

const identity = {
  artifact: { filename: "jquery-star-1.1.0.tgz", sha256: "a".repeat(64) },
  source: { commit: "b".repeat(40), receiptSha256: "c".repeat(64) },
  earliestDate: "2026-09-05",
  latestDate: "2026-09-06",
  environments: Object.fromEntries(
    Object.entries(manualPairs).map(([pair, settings]) => [
      pair,
      {
        os: settings.os,
        osVersion: "synthetic-test-1",
        browser: settings.browsers[0],
        browserVersion: "synthetic-test-1",
        assistiveTechnology: settings.assistiveTechnology,
        assistiveTechnologyVersion: "synthetic-test-1",
      },
    ]),
  ),
};

function manual(pair = "nvda-windows") {
  const settings = manualPairs[pair];
  const quickNav = pair === "voiceover-safari" ? false : null;
  return {
    schema: "jqstar-assistive-technology/1",
    pair,
    artifact: { ...identity.artifact },
    source: { ...identity.source },
    environment: {
      os: settings.os,
      osVersion: "synthetic-test-1",
      browser: settings.browsers[0],
      browserVersion: "synthetic-test-1",
      assistiveTechnology: settings.assistiveTechnology,
      assistiveTechnologyVersion: "synthetic-test-1",
    },
    input: { mode: "keyboard", layout: "desktop", verbosity: "default", quickNav },
    tester: "Synthetic schema fixture; not release evidence",
    date: "2026-09-06",
    profile: "synthetic clean-profile fixture",
    steps: settings.steps.map((id) => ({
      id,
      result: "pass",
      observation: "Synthetic schema control; no assistive-technology test was performed.",
      issue: null,
      quickNav,
    })),
  };
}

describe("manual evidence validation", () => {
  it("requires both defined charter shapes with every step and exact candidate identity", () => {
    for (const pair of Object.keys(manualPairs)) {
      const record = manual(pair);
      assert.equal(validateManualRecord(record, identity).steps, manualPairs[pair].steps.length);
    }
  });

  it("rejects stale identities, wrong environments, omitted steps, skips and invalid dates", () => {
    for (const mutate of [
      (r) => {
        r.artifact.sha256 = "d".repeat(64);
      },
      (r) => {
        r.source.commit = "e".repeat(40);
      },
      (r) => {
        r.source.receiptSha256 = "f".repeat(64);
      },
      (r) => {
        r.environment.os = "macOS";
      },
      (r) => {
        r.environment.browser = "Playwright";
      },
      (r) => {
        r.environment.browserVersion = "private-canary";
      },
      (r) => {
        r.steps.pop();
      },
      (r) => {
        r.steps[1].id = r.steps[0].id;
      },
      (r) => {
        r.steps[0].result = "skipped";
      },
      (r) => {
        r.steps[0].result = "fail";
      },
      (r) => {
        r.date = "2026-02-31";
      },
      (r) => {
        r.date = "2026-09-04";
      },
      (r) => {
        r.date = "2026-09-07";
      },
      (r) => {
        r.steps[0].observation = "";
      },
      (r) => {
        r.extraSecret = "private-canary";
      },
    ]) {
      const record = manual();
      mutate(record);
      assert.throws(
        () => validateManualRecord(record, identity),
        (error) => !String(error).includes("private-canary"),
      );
    }
    const voiceover = manual("voiceover-safari");
    voiceover.steps[0].quickNav = null;
    assert.throws(() => validateManualRecord(voiceover, identity), /Quick Nav/u);
  });
});
