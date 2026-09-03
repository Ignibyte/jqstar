import $ from "/interop/assets/jquery-module.js";
import { installStarCore } from "/interop/assets/jqstar/core.js";
import { createTurboBridge } from "/interop/assets/jqstar/turbo.js";

const { document, window } = globalThis;
const version = new globalThis.URL(import.meta.url).searchParams.get("version");
if (!version) throw new Error("The Turbo bridge fixture requires an explicit version.");

const Turbo = await import(`/interop/assets/turbo-${version}.js`);
const installed = installStarCore($);
const bridge = installed.star.use(createTurboBridge({ $, Turbo, version }));
for (const root of document.querySelectorAll("[data-jqs]")) $(root).star();

window.__turboBridge = bridge;
window.__turboBridgeJQuery = $;
