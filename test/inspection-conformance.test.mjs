import $ from "jquery";
import { expect, it } from "vitest";
import * as core from "../src/core.ts";
import * as inspect from "../src/inspect/index.ts";
import * as ui from "../src/ui.ts";
import * as datastar from "../src/datastar.ts";
import * as stores from "../src/stores.ts";
import * as persist from "../src/persist.ts";
import * as turbo from "../src/turbo.ts";
import * as htmx from "../src/htmx.ts";
import { inspectionConformance } from "./fixtures/inspection-conformance.mjs";

it("runs the same public inspection contract used by installed Node, QUnit and browsers", async () => {
  expect(
    await inspectionConformance($, globalThis.window, {
      core,
      inspect,
      ui,
      datastar,
      stores,
      persist,
      turbo,
      htmx,
    }),
  ).toEqual({ plugins: 6, services: 4, actions: 200, bridgeKinds: 2, failures: 0 });
});
