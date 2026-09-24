/* global document, HTMLIFrameElement, window */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const server = await createServer({
  configFile: resolve("vite.demo.config.ts"),
  server: { host: "127.0.0.1", port: 0, strictPort: true },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== "string");
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/components/lab/`);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  const result = await page.evaluate(
    async ({ runtimeURL, coreURL, factoryURL }) => {
      const runtime = await import(runtimeURL);
      const { installStarCore } = await import(coreURL);
      const { jQueryFactory } = await import(factoryURL);
      const body = document.body;
      const unheld = document.createElement("iframe");
      body.append(unheld);
      window.__unheldWeak = new WeakRef(unheld.contentDocument);
      unheld.remove();
      const held = document.createElement("iframe");
      body.append(held);
      window.__heldDocument = held.contentDocument;
      window.__heldWeak = new WeakRef(held.contentDocument);
      held.remove();
      const refs = [];
      let family = "";
      const originalAppend = body.append;
      body.append = function (...nodes) {
        const value = Reflect.apply(originalAppend, this, nodes);
        for (const node of nodes) {
          if (node instanceof HTMLIFrameElement)
            refs.push({ family, ref: new WeakRef(node.contentDocument) });
        }
        return value;
      };
      const exercises = [];
      const coreExercises = [];
      try {
        const cases = [
          ...["resizable", "sortable"].map((kind) => [
            kind,
            "exerciseLayoutOwnership",
            [kind, "facade"],
          ]),
          ["feed", "exerciseFeedOwnership", ["facade"]],
          ["toast", "exerciseToastOwnership", ["facade"]],
          ["questionnaire", "exerciseQuestionnaireOwnership", ["facade"]],
          ["form", "exerciseFormOwnership", ["facade"]],
          ["time-picker", "exerciseTimePickerOwnership", ["facade"]],
          ...["countdown", "carousel", "message-scroller", "dialog"].map((kind) => [
            kind,
            "exerciseDocumentOwnership",
            [kind, "adopted"],
          ]),
          ...["number-field", "password-field", "search-field", "rating"].map((kind) => [
            kind,
            "exerciseNativeFieldOwnership",
            [kind, "adopted"],
          ]),
          ...["input-otp", "tags-input", "toggle", "toggle-group"].map((kind) => [
            kind,
            "exerciseTokenOwnership",
            [kind, "adopted"],
          ]),
          ...["tabs", "toolbar", "pagination", "sidebar"].map((kind) => [
            kind,
            "exerciseNavigationOwnership",
            [kind, "adopted"],
          ]),
          ...["collapsible", "accordion", "editable", "stepper"].map((kind) => [
            kind,
            "exerciseDisclosureStepOwnership",
            [kind, "adopted"],
          ]),
          ...[
            "select",
            "combobox",
            "multi-select",
            "color-picker",
            "file-upload",
            "tree",
            "transfer-list",
            "popover",
            "tooltip",
            "hover-card",
          ].map((name) => [
            name,
            `exercise${name
              .split("-")
              .map((part) => part[0].toUpperCase() + part.slice(1))
              .join("")}Ownership`,
            ["facade"],
          ]),
          ["menu", "exerciseMenuOwnership", ["facade", "menu"]],
          ["context-menu", "exerciseMenuOwnership", ["facade", "context-menu"]],
          ["menubar", "exerciseMenubarOwnership", ["facade"]],
          ...["clipboard", "code-block"].map((kind) => [
            kind,
            "exerciseCopyOwnership",
            [kind, "facade"],
          ]),
          ...["json-viewer", "log-viewer"].map((kind) => [
            kind,
            "exerciseViewerOwnership",
            [kind, "facade"],
          ]),
          ...["chart", "data-table"].map((kind) => [
            kind,
            "exerciseReportingOwnership",
            [kind, "facade"],
          ]),
          ...["calendar", "range-calendar", "date-picker", "date-range-picker"].map((kind) => [
            kind,
            "exerciseCalendarOwnership",
            [kind, "facade"],
          ]),
        ];
        if (cases.length !== 50 || new Set(cases.map(([name]) => name)).size !== 50)
          throw new Error("The document-retention census must contain 50 distinct UI families.");
        for (const [name, method, args] of cases) {
          family = name;
          const outcome = await runtime[method](jQueryFactory, ...args);
          exercises.push({ name, accepted: Object.values(outcome).every(Boolean) });
        }
        for (const mode of [
          "explicit",
          "automatic",
          "action",
          "adopted",
          "disposed-first",
          "facade",
        ]) {
          for (const [name, method, extra] of [
            ["menu", "exerciseMenuOwnership", ["menu"]],
            ["context-menu", "exerciseMenuOwnership", ["context-menu"]],
            ["menubar", "exerciseMenubarOwnership", []],
            ["select", "exerciseSelectOwnership", []],
            ["combobox", "exerciseComboboxOwnership", []],
            ["multi-select", "exerciseMultiSelectOwnership", []],
            ["tooltip", "exerciseTooltipOwnership", []],
            ["hover-card", "exerciseHoverCardOwnership", []],
            ["toast", "exerciseToastOwnership", []],
          ]) {
            family = `${name}/${mode}`;
            const outcome = await runtime[method](jQueryFactory, mode, ...extra);
            exercises.push({ name: family, accepted: Object.values(outcome).every(Boolean) });
          }
        }
        for (const kind of ["idle", "behavior", "declarative"]) {
          family = `core/${kind}`;
          const frame = document.createElement("iframe");
          body.append(frame);
          const owner = frame.contentWindow;
          const $ = installStarCore(jQueryFactory(owner), { document: owner.document });
          try {
            const root = owner.document.createElement("section");
            root.innerHTML = "<button>Increment</button><output></output>";
            owner.document.body.append(root);
            if (kind === "behavior") {
              $(root).star({
                state: { count: 1 },
                ui: { output: { text: ({ state }) => state.count } },
              });
            } else if (kind === "declarative") {
              root.setAttribute("data-signals", "{ count: 1 }");
              root.querySelector("output").setAttribute("data-text", "$count");
              $(root).star();
            }
            coreExercises.push({
              name: family,
              accepted:
                kind === "idle"
                  ? !!$.star.version
                  : root.querySelector("output").textContent === "1",
            });
          } finally {
            try {
              $.star.dispose();
            } finally {
              frame.remove();
            }
          }
        }
        for (const mode of [
          "ordinary",
          "method",
          "method-nonfunction",
          "capture",
          "once",
          "passive",
          "signal",
          "native-return",
          "native-throw",
        ]) {
          family = `core/plugin-listener/${mode}`;
          const outcome = runtime.exerciseStagedListenerCancellation(jQueryFactory, mode);
          coreExercises.push({
            name: family,
            accepted: outcome.after === 0 && outcome.listenerResources === 0,
          });
        }
        for (const cancel of [false, true]) {
          family = `core/plugin-listener/duplicate-${cancel}`;
          const outcome = runtime.exerciseStagedListenerDuplicate(jQueryFactory, cancel);
          coreExercises.push({
            name: family,
            accepted: outcome.nativeCalls === 2 && outcome.beforeRelease === 1,
          });
        }
        for (const mode of [
          "capture-mutation",
          "late-disposal",
          "setup-throw",
          "late-throw",
          "option-disposal",
          "method-disposal",
        ]) {
          family = `core/document-listener/acquire-${mode}`;
          const outcome = runtime.exerciseDocumentListenerAcquisition(jQueryFactory, mode);
          coreExercises.push({ name: family, accepted: outcome.deliveries === 0 });
        }
        for (const mode of [
          "duplicate",
          "once",
          "abort",
          "cleanup",
          "nested-before",
          "nested-after",
        ]) {
          family = `core/document-listener/identity-${mode}`;
          const outcome = runtime.exerciseDocumentListenerIdentity(jQueryFactory, mode);
          coreExercises.push({
            name: family,
            accepted: outcome.receivers && outcome.deliveries === outcome.beforeRelease,
          });
        }
        family = "core/document-listener/options";
        const options = runtime.exerciseDocumentListenerOptions(jQueryFactory);
        coreExercises.push({
          name: family,
          accepted:
            options.rows.length === 28 && options.rows.every((row) => row.owned === row.native),
        });
        for (const key of ["method", "capture", "once", "passive", "signal"]) {
          for (const previous of [false, true]) {
            family = `core/document-listener/getter-${key}-${previous}`;
            const outcome = runtime.exerciseDocumentListenerGetter(jQueryFactory, key, previous);
            coreExercises.push({
              name: family,
              accepted: outcome.entered && outcome.deliveries === 1,
            });
          }
        }
        for (const throws of [false, true]) {
          family = `core/plugin-observer/${throws}`;
          const outcome = await runtime.exerciseFirstScopeObserver(jQueryFactory, throws);
          coreExercises.push({
            name: family,
            accepted:
              outcome.entered &&
              outcome.rejected &&
              outcome.deliveries === 0 &&
              outcome.disconnects === 2,
          });
        }
      } finally {
        body.append = originalAppend;
      }
      window.__documentRefs = refs;
      return { refs: refs.length, exercises, coreExercises };
    },
    {
      runtimeURL: `/@fs${resolve("e2e/fixtures/ui-document-ownership.ts")}`,
      coreURL: `/@fs${resolve("src/core.ts")}`,
      factoryURL: `/@fs${resolve("node_modules/jquery/dist-module/jquery.factory.module.js")}`,
    },
  );
  assert.equal(result.refs, 247);
  assert.equal(result.exercises.length, 104);
  assert.equal(result.coreExercises.length, 39);
  assert.deepEqual(
    result.exercises.filter(({ accepted }) => !accepted),
    [],
  );
  assert.deepEqual(
    result.coreExercises.filter(({ accepted }) => !accepted),
    [],
  );
  const states = [];
  for (let iteration = 0; iteration < 12; iteration++) {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(20);
    const state = await page.evaluate(() => ({
      retained: window.__documentRefs
        .filter(({ ref }) => !!ref.deref())
        .map(({ family }) => family),
      unheld: !!window.__unheldWeak.deref(),
      held: !!window.__heldWeak.deref(),
    }));
    states.push(state);
    if (state.retained.length === 0 && !state.unheld) break;
  }
  const final = states.at(-1);
  assert.ok(
    states.every(({ held: alive }) => alive),
    "The held control Document was collected.",
  );
  assert.equal(final.unheld, false, "The unheld control Document was retained.");
  assert.deepEqual(final.retained, [], "Disposed Documents were retained.");
  console.log(
    JSON.stringify({
      schema: "jqstar-document-retention/1",
      status: "pass",
      families: 50,
      additionalOwnershipModes: 54,
      coreExercises: result.coreExercises.length,
      disposedDocuments: result.refs,
      collectedDocuments: result.refs,
      collectionCycles: states.length,
      heldControlRetained: final.held,
      unheldControlCollected: !final.unheld,
    }),
  );
} finally {
  await browser?.close();
  await server.close();
}
