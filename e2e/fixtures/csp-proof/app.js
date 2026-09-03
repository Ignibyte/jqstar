import $ from "/jquery-module.js";
import {
  CSP_CONTRACT_DIGEST,
  CSP_GRAMMAR_VERSION,
  createCSPExpressionEngine,
  installStarCSP,
  isStarCSPExpressionError,
} from "/csp.js";
import { datastarPlugin } from "/datastar.js";
import { uiPlugin } from "/ui.js";

const { document, window } = globalThis;
const fetch = globalThis.fetch.bind(globalThis);
const proof = window.__jqstarCSP;
const installed = installStarCSP($);
const star = installed.star;
const operations = [];
const stopOperations = star.observeOperations((operation) => {
  operations.push(`${operation.kind}:${operation.phase}`);
});

star.use({
  name: "proof.csp",
  version: "1.0.0",
  apiVersion: "^0.1.0",
  install(registrar) {
    registrar.action("proof.csp.save", async (context) => {
      await Promise.resolve();
      context.state.saved = context.args?.[0] === context.state.count;
      return { saved: context.state.saved };
    });
    registrar.action("proof.csp.async", async (context) => {
      await Promise.resolve();
      context.state.asyncMessage = "settled";
      return "settled";
    });
    registrar.helper("proof.csp.upper", (value) => String(value).toUpperCase());
    return Object.freeze({ installed: true });
  },
});
star.use(datastarPlugin);
const ui = star.use(uiPlugin);
star.boot(document.querySelector("#app"));
ui.enhance(document);

proof.restore();
document.documentElement.dataset.jqstarCspReady = "true";
window.__jqstarCSPReady = true;
window.__finishJQStarCSPProof = async () => {
  proof.arm();
  const root = document.querySelector("#app");
  const instance = $(root).star("instance");
  document.querySelector("#save").click();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  await star.nextUpdate();
  await instance.run("proof.csp.async");
  await instance.run(star.get("/csp-json", { profile: "core.generic" }));
  await instance.run(star.get("/csp-html", { profile: "core.generic", target: "#replace" }));
  await star.whenEnhanced();
  const htmlText = document.querySelector("#replace").textContent;
  await instance.run(star.get("/csp-datastar", { profile: "core.datastar" }));
  await star.whenEnhanced();
  document.querySelector("#toggle").click();

  const deniedEngine = createCSPExpressionEngine();
  let deniedCode = "none";
  try {
    deniedEngine.compileValue("globalThis");
  } catch (error) {
    if (isStarCSPExpressionError(error)) deniedCode = error.code;
  } finally {
    deniedEngine.dispose();
  }

  const axeResult = await window.axe.run(document);
  const redirect = await fetch("/csp-redirect");
  const slow = instance.run(star.get("/csp-slow", { profile: "core.generic" }));
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  $(root).star("destroy");
  await slow;
  const slowResult = operations.includes("request:cancelled") ? "cancelled" : "completed";
  stopOperations();
  const disposal = star.dispose();
  await new Promise((resolve) => window.setTimeout(resolve, 50));

  const result = {
    schema: "jqstar-csp-browser-case/1",
    grammarVersion: CSP_GRAMMAR_VERSION,
    corpusDigest: CSP_CONTRACT_DIGEST,
    state: {
      asyncMessage: instance.state.asyncMessage,
      count: instance.state.count,
      saved: instance.state.saved,
      serverMessage: instance.state.serverMessage,
    },
    dom: {
      fired: document.querySelector("#increment").getAttribute("data-fired"),
      helper: document.querySelector("#helper").textContent,
      htmlText,
      stream: document.querySelector("#stream").textContent.trim(),
      togglePressed: document.querySelector("#toggle").getAttribute("aria-pressed"),
    },
    deniedCode,
    slowResult,
    operations,
    disposal: {
      attempted: disposal.attempted.length,
      failed: disposal.failed.length,
      released: disposal.released.length,
      remaining: disposal.remaining.length,
    },
    accessibilityViolations: axeResult.violations.map(({ id }) => id),
    endpointStatus: { redirect: redirect.status },
    canary: proof.canary,
    events: proof.events,
    instrumentation: proof.instrumentation,
    runtimeCalls: proof.runtimeCalls,
  };
  proof.restore();
  window.__jqstarCSPResult = result;
  document.querySelector("#result").textContent = "Passed";
  return result;
};
