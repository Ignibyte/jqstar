import $ from "/interop/assets/jquery-module.js";
import { installStarCore } from "/interop/assets/jqstar/core.js";
import { createHtmxBridge } from "/interop/assets/jqstar/htmx.js";

const { document, htmx, window } = globalThis;
const version = new globalThis.URL(import.meta.url).searchParams.get("version");
if (!version) throw new Error("The htmx bridge fixture requires an explicit version.");
if (!htmx || typeof htmx !== "object") throw new Error("The htmx host did not load.");

const installed = installStarCore($);
const bridge = installed.star.use(createHtmxBridge({ $, htmx, version }));
for (const root of document.querySelectorAll("[data-jqs]")) $(root).star();

window.__htmxBridge = bridge;
window.__htmxBridgeJQuery = $;
