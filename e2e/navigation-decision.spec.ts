import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { runNavigationScenarios } from "../test/fixtures/navigation-decision/driver.mjs";
import type { NavigationCandidate } from "../test/fixtures/navigation-decision/driver.mjs";

const evidence = JSON.parse(readFileSync("quality/navigation-decision.json", "utf8")) as {
  contract: { candidates: NavigationCandidate[] };
};

const origin = `http://127.0.0.1:${process.env.JQS_NAVIGATION_DECISION_PORT ?? 4179}`;
const subset = [
  "NAV-01",
  "NAV-05",
  "NAV-13",
  "NAV-16",
  "NAV-18",
  "NAV-19",
  "NAV-24",
  "NAV-26",
  "NAV-28",
];

for (const candidate of evidence.contract.candidates) {
  test(`installed navigation contract: ${candidate.id}`, async ({ browser }, info) => {
    const result = await runNavigationScenarios(browser, origin, candidate, {
      configuration: "configured",
      subset,
    });
    await info.attach("navigation-semantic-evidence", {
      contentType: "application/json",
      body: JSON.stringify(result),
    });
    expect(result.flows.map((flow) => flow.id)).toEqual(subset);
    expect(result.flows.filter((flow) => flow.status === "fail")).toEqual([]);
    for (const flow of result.flows) {
      if (flow.status === "not-applicable") {
        expect(candidate.javascript).toBe(false);
        expect(flow.id).toBe("NAV-24");
      } else {
        expect(flow.assertions.length).toBeGreaterThan(0);
        expect(flow.assertions.every((assertion) => assertion.passed)).toBe(true);
      }
    }
  });

  if (candidate.javascript) {
    test(`navigation accessibility: ${candidate.id}`, async ({ context, page }) => {
      await context.addCookies([
        { name: "jqs-nav-candidate", value: candidate.id, url: origin },
        { name: "jqs-nav-configuration", value: "configured", url: origin },
      ]);
      for (const route of ["start", "not-found"]) {
        await page.goto(`${origin}/navigation/${route}`);
        await page.waitForFunction(() =>
          Boolean(
            (globalThis as typeof globalThis & { __navigationFixture?: unknown })
              .__navigationFixture,
          ),
        );
        const report = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(report.violations).toEqual([]);
      }
    });
  }
}
