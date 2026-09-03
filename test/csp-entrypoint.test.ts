import $ from "jquery";
import { afterEach, describe, expect, it } from "vitest";
import { installStarCore } from "../src/core";
import {
  CSP_CONTRACT_DIGEST,
  CSP_GRAMMAR_VERSION,
  createCSPExpressionEngine,
  installStarCSP,
  isStarCSPExpressionError,
} from "../src/csp";
import { createTrustedExpressionEngine } from "../src/expression";

afterEach(() => {
  const installed = $ as JQueryStatic & { star?: { dispose(): unknown } };
  installed.star?.dispose();
  document.body.replaceChildren();
});

describe("CSP public entry point", () => {
  it("exports the frozen identity without installing jQStar at import time", () => {
    expect(($ as JQueryStatic & { star?: unknown }).star).toBeUndefined();
    expect(($.fn as JQueryStatic["fn"] & { star?: unknown }).star).toBeUndefined();
    expect(CSP_GRAMMAR_VERSION).toBe("jqstar-csp-expression/1");
    expect(CSP_CONTRACT_DIGEST).toBe(
      "2726c0377afac773700d0ec2334a0cb88bc246e67ad80b63b583ff5a5e5d349f",
    );
  });

  it("installs explicitly, evaluates declarative markup, and disposes idempotently", async () => {
    document.body.innerHTML = `
      <main data-jqs data-signals="{ count: 2 }">
        <button type="button" data-on:click="$count++">Increment</button>
        <output data-text="$count"></output>
      </main>
    `;

    const installed = installStarCSP($);
    expect(installStarCSP($)).toBe(installed);
    installed.star.boot();

    $("button").trigger("click");
    await installed.star.nextUpdate();
    expect($("output").text()).toBe("3");

    const star = installed.star;
    const report = star.dispose();
    expect(report.released).toContainEqual({ category: "effect", owner: "kernel:expressions" });
    expect(star.dispose()).toBe(report);
    expect(($ as JQueryStatic & { star?: unknown }).star).toBeUndefined();
  });

  it("rejects incompatible live-engine replacement in both directions", () => {
    installStarCore($);
    expect(() => installStarCSP($)).toThrow(
      "jQStar is already installed with a different expression engine",
    );
    $.star.dispose();

    installStarCSP($);
    expect(() => installStarCore($, { expressionEngine: createTrustedExpressionEngine() })).toThrow(
      "Select an expression engine during initial installation",
    );
  });

  it("returns structured diagnostics from the public factory", () => {
    const engine = createCSPExpressionEngine();
    let failure: unknown;
    try {
      engine.compileValue("globalThis")({} as never);
    } catch (error) {
      failure = error;
    }
    expect(isStarCSPExpressionError(failure)).toBe(true);
    expect(failure).toMatchObject({
      code: "CSP_CAPABILITY_IDENTIFIER",
      grammarVersion: CSP_GRAMMAR_VERSION,
      phase: "compile",
    });
    engine.dispose();
  });
});
