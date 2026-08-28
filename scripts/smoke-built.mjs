import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>", {
  url: "http://localhost/",
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Element: dom.window.Element,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  HTMLDialogElement: dom.window.HTMLDialogElement,
  HTMLDetailsElement: dom.window.HTMLDetailsElement,
  HTMLElement: dom.window.HTMLElement,
  HTMLButtonElement: dom.window.HTMLButtonElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLOptionElement: dom.window.HTMLOptionElement,
  HTMLOptGroupElement: dom.window.HTMLOptGroupElement,
  HTMLSelectElement: dom.window.HTMLSelectElement,
  HTMLTableCellElement: dom.window.HTMLTableCellElement,
  HTMLTableElement: dom.window.HTMLTableElement,
  HTMLTableRowElement: dom.window.HTMLTableRowElement,
  KeyboardEvent: dom.window.KeyboardEvent,
  MutationObserver: dom.window.MutationObserver,
  Node: dom.window.Node,
});

const { default: $ } = await import("jquery");
$.fx.off = true;

await import("../dist/jquery-star.js");

HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function (returnValue = "") {
  this.returnValue = returnValue;
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};

document.body.innerHTML = `
  <section id="esm" data-signals="{ count: 0 }">
    <button data-on:click="$count++; $(el).fadeOut()">Increment</button>
    <output data-text="$count"></output>
  </section>
`;

$("#esm").star();
$("#esm button").trigger("click");
await $.star.nextUpdate();

if ($("#esm output").text() !== "1" || $("#esm button").css("display") !== "none") {
  throw new Error("The ESM bundle failed the declarative expression smoke test.");
}

const esmInstance = $("#esm").star("instance");
const originalFetch = globalThis.fetch;
let requestMethod;
globalThis.fetch = async (_url, init) => {
  requestMethod = init?.method;
  return new Response(JSON.stringify({ count: 7 }), {
    headers: { "Content-Type": "application/json" },
  });
};
await esmInstance.run($.star.post("/proof"));
await $.star.nextUpdate();
globalThis.fetch = originalFetch;

if (requestMethod !== "POST" || $("#esm output").text() !== "7") {
  throw new Error("The ESM bundle failed the backend-action smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<button id="dialog-trigger">Open</button>
   <dialog id="package-dialog" data-jqs="dialog">
     <h2 data-part="title">Package dialog</h2>
     <button data-part="close">Close</button>
   </dialog>`,
);
const dialog = document.querySelector("#package-dialog");
const trigger = document.querySelector("#dialog-trigger");
$.star.ui.dialog.open(dialog, { trigger });
if (!dialog.open || dialog.dataset.state !== "open" || trigger.ariaExpanded !== "true") {
  throw new Error("The ESM bundle failed the dialog component smoke test.");
}
$.star.ui.dialog.close(dialog, "passed");

document.body.insertAdjacentHTML(
  "beforeend",
  `<details id="package-collapsible" data-jqs="collapsible">
     <summary data-part="trigger">Package disclosure</summary>
     <div data-part="content">Disclosure content</div>
   </details>`,
);
const collapsible = document.querySelector("#package-collapsible");
$.star.ui.enhance(collapsible);
$.star.ui.collapsible.open(collapsible);
if (
  !collapsible.open ||
  collapsible.dataset.state !== "open" ||
  collapsible.querySelector("summary").ariaExpanded !== "true"
) {
  throw new Error("The ESM bundle failed the Collapsible component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-tabs" data-jqs="tabs" data-value="first">
     <div data-part="list" aria-label="Package tabs">
       <button data-part="trigger" data-value="first">First</button>
       <button data-part="trigger" data-value="second">Second</button>
     </div>
     <section data-part="panel" data-value="first">First panel</section>
     <section data-part="panel" data-value="second">Second panel</section>
   </div>`,
);
const tabs = document.querySelector("#package-tabs");
$.star.ui.enhance(tabs);
$.star.ui.tabs.activate(tabs, "second");
if (
  $.star.ui.tabs.value(tabs) !== "second" ||
  tabs.querySelector('[data-part="trigger"][data-value="second"]').ariaSelected !== "true" ||
  tabs.querySelector('[data-part="panel"][data-value="second"]').hidden
) {
  throw new Error("The ESM bundle failed the Tabs component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-popover" data-jqs="popover">
     <button data-part="trigger">Open package popover</button>
     <div data-part="content"><h2 data-part="title">Package popover</h2></div>
   </div>`,
);
const popover = document.querySelector("#package-popover");
$.star.ui.enhance(popover);
$.star.ui.popover.open(popover);
if (
  popover.dataset.state !== "open" ||
  popover.querySelector('[data-part="trigger"]').ariaExpanded !== "true" ||
  popover.querySelector('[data-part="content"]').hidden
) {
  throw new Error("The ESM bundle failed the Popover component smoke test.");
}
$.star.ui.popover.close(popover);

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-tooltip" data-jqs="tooltip">
     <button data-part="trigger">Package status</button>
     <div data-part="content">All package checks passed</div>
   </div>`,
);
const tooltip = document.querySelector("#package-tooltip");
$.star.ui.enhance(tooltip);
$.star.ui.tooltip.open(tooltip);
if (
  tooltip.dataset.state !== "open" ||
  tooltip.querySelector('[data-part="content"]').role !== "tooltip" ||
  !tooltip
    .querySelector('[data-part="trigger"]')
    .getAttribute("aria-describedby")
    ?.includes(tooltip.querySelector('[data-part="content"]').id)
) {
  throw new Error("The ESM bundle failed the Tooltip component smoke test.");
}
$.star.ui.tooltip.close(tooltip);

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-menu" data-jqs="menu">
     <button data-part="trigger">Package actions</button>
     <div data-part="content">
       <button data-part="item" data-value="run">Run proof</button>
       <button data-part="checkbox-item" data-value="checked" data-checked="true">Checked</button>
     </div>
   </div>`,
);
const menu = document.querySelector("#package-menu");
$.star.ui.enhance(menu);
$.star.ui.menu.open(menu);
if (
  menu.dataset.state !== "open" ||
  menu.querySelector('[data-part="content"]').role !== "menu" ||
  menu.querySelector('[data-part="trigger"]').ariaExpanded !== "true" ||
  menu.querySelector('[data-part="checkbox-item"]').ariaChecked !== "true"
) {
  throw new Error("The ESM bundle failed the Dropdown Menu component smoke test.");
}
menu.querySelector('[data-part="item"]').click();
if (menu.dataset.state !== "closed") {
  throw new Error("The built Dropdown Menu did not close after selection.");
}

const toast = $.star.ui.toast.show({
  description: "The built package can create notifications.",
  duration: false,
  title: "Package toast",
  variant: "success",
});
const toastViewport = document.querySelector('[data-jqs="toast-viewport"]');
if (
  toast.dataset.state !== "open" ||
  toast.role !== "group" ||
  toastViewport.role !== "region" ||
  toastViewport.querySelector('[data-part="announcer"]')?.role !== "status"
) {
  throw new Error("The ESM bundle failed the Toast component smoke test.");
}
$.star.ui.toast.dismiss(toast);

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-select-form">
     <label for="package-select-control">Package foundation</label>
     <div id="package-select" data-jqs="select">
       <select id="package-select-control" data-part="control" name="foundation">
         <option value="jquery-star">jQuery Star</option>
         <option value="datastar">Datastar</option>
       </select>
     </div>
   </form>`,
);
const select = document.querySelector("#package-select");
$.star.ui.enhance(select);
$.star.ui.select.select(select, "datastar");
if (
  $.star.ui.select.value(select) !== "datastar" ||
  select.querySelector('[data-part="control"]').value !== "datastar" ||
  select.querySelector('[data-part="trigger"]').role !== "combobox" ||
  select.querySelector('[data-part="option"][data-value="datastar"]').ariaSelected !== "true" ||
  $("#package-select-form").serialize() !== "foundation=datastar"
) {
  throw new Error("The ESM bundle failed the Select component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-combobox-form">
     <label for="package-combobox-control">Package technology</label>
     <div id="package-combobox" data-jqs="combobox">
       <input id="package-combobox-control" data-part="control" name="query">
       <input data-part="value" type="hidden" name="technology">
       <div data-part="content">
         <div data-part="option" data-value="jquery-star">jQuery Star</div>
         <div data-part="option" data-value="datastar">Datastar</div>
       </div>
     </div>
   </form>`,
);
const combobox = document.querySelector("#package-combobox");
$.star.ui.enhance(combobox);
$.star.ui.combobox.select(combobox, "datastar");
if (
  $.star.ui.combobox.value(combobox) !== "datastar" ||
  $.star.ui.combobox.query(combobox) !== "Datastar" ||
  combobox.querySelector('[data-part="control"]').role !== "combobox" ||
  combobox.querySelector('[data-part="content"]').role !== "listbox" ||
  $("#package-combobox-form").serialize() !== "query=Datastar&technology=datastar"
) {
  throw new Error("The ESM bundle failed the Combobox component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-data-table" data-jqs="data-table" data-page-size="1">
     <div data-part="viewport">
       <table data-part="table">
         <caption>Package systems</caption>
         <thead><tr><th scope="col" data-key="score" data-type="number"><button data-part="sort">Score</button></th></tr></thead>
         <tbody>
           <tr data-row-id="one"><td data-key="score">1</td></tr>
           <tr data-row-id="two"><td data-key="score">2</td></tr>
         </tbody>
       </table>
     </div>
     <span data-part="page-status"></span>
     <button data-part="previous">Previous</button>
     <button data-part="next">Next</button>
   </div>`,
);
const dataTable = document.querySelector("#package-data-table");
$.star.ui.enhance(dataTable);
$.star.ui.dataTable.sort(dataTable, "score", "descending");
if (
  dataTable.querySelector('th[data-key="score"]').getAttribute("aria-sort") !== "descending" ||
  dataTable.querySelector('tr[data-row-id="two"]').hidden ||
  dataTable.querySelector('[data-part="page-status"]').textContent !== "1–1 of 2"
) {
  throw new Error("The ESM bundle failed the Data Table component smoke test.");
}

const theme = await readFile(new URL("../dist/jquery-star-ui.css", import.meta.url), "utf8");
const componentSelectors = [
  "[data-jqs=button]",
  "dialog[data-jqs=dialog]",
  "[data-jqs=field]",
  "[data-jqs=input]",
  "[data-jqs=textarea]",
  "[data-jqs=checkbox]",
  "[data-jqs=switch]",
  "[data-jqs=collapsible]",
  "[data-jqs=accordion]",
  "[data-jqs=tabs]",
  "[data-jqs=popover]",
  "[data-jqs=tooltip]",
  "[data-jqs=menu]",
  "[data-jqs=toast-viewport]",
  "[data-jqs=toast]",
  "[data-jqs=select]",
  "[data-jqs=combobox]",
  "[data-jqs=data-table]",
  "[data-jqs=card]",
  "[data-jqs=badge]",
  "[data-jqs=alert]",
  "[data-jqs=separator]",
  "[data-jqs=avatar]",
  "[data-jqs=skeleton]",
  "progress[data-jqs=progress]",
  "[data-jqs=breadcrumb]",
  "[data-jqs=pagination]",
  "[data-jqs=navigation-menu]",
  "[data-jqs=command]",
];
if (componentSelectors.some((selector) => !theme.includes(selector))) {
  throw new Error("The built component theme is missing a verified component selector.");
}

$("#esm").star("destroy").remove();
delete $.fn.star;
delete $.star;

const require = createRequire(import.meta.url);
require("../dist/jquery-star.umd.cjs");

document.body.innerHTML = `
  <section id="umd" data-signals="{ removed: false }">
    <button data-on:click="@removeItem">Remove</button>
    <output data-text="$removed"></output>
  </section>
`;

$.star.action("removeItem", ({ state }) => {
  state.removed = true;
});

$("#umd").star();
$("#umd button").trigger("click");
await $.star.nextUpdate();

if ($("#umd output").text() !== "true") {
  throw new Error("The UMD bundle failed the named-action smoke test.");
}

console.log(
  "built package proof: ESM expression=passed, ESM backend=passed, ESM dialog=passed, ESM collapsible=passed, ESM tabs=passed, ESM popover=passed, ESM tooltip=passed, ESM menu=passed, ESM toast=passed, ESM select=passed, ESM combobox=passed, ESM data-table=passed, CSS runtime components=passed, CSS composition and navigation=passed, UMD action=passed",
);
dom.window.close();
