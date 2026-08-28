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
  FormData: dom.window.FormData,
  CustomEvent: dom.window.CustomEvent,
  HTMLDialogElement: dom.window.HTMLDialogElement,
  HTMLDetailsElement: dom.window.HTMLDetailsElement,
  HTMLElement: dom.window.HTMLElement,
  HTMLButtonElement: dom.window.HTMLButtonElement,
  HTMLFormElement: dom.window.HTMLFormElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLLIElement: dom.window.HTMLLIElement,
  HTMLOListElement: dom.window.HTMLOListElement,
  HTMLOptionElement: dom.window.HTMLOptionElement,
  HTMLOptGroupElement: dom.window.HTMLOptGroupElement,
  HTMLSelectElement: dom.window.HTMLSelectElement,
  HTMLTableCellElement: dom.window.HTMLTableCellElement,
  HTMLTableElement: dom.window.HTMLTableElement,
  HTMLTableRowElement: dom.window.HTMLTableRowElement,
  HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
  HTMLUListElement: dom.window.HTMLUListElement,
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

document.body.insertAdjacentHTML(
  "beforeend",
  `<label for="package-date-control">Package date</label>
   <div id="package-date-picker" data-jqs="date-picker">
     <input id="package-date-control" data-part="control" name="date" value="2026-08-28">
     <div id="package-date-popover" data-jqs="popover" data-part="popover">
       <button data-part="trigger"><span data-part="value"></span></button>
       <div data-part="content">
         <div id="package-calendar" data-jqs="calendar" data-month="2026-08">
           <div data-part="header">
             <button data-part="previous">Previous</button>
             <h2 data-part="heading"></h2>
             <button data-part="next">Next</button>
           </div>
           <div data-part="grid"></div>
         </div>
       </div>
     </div>
   </div>`,
);
const datePicker = document.querySelector("#package-date-picker");
const packageCalendar = document.querySelector("#package-calendar");
$.star.ui.enhance(datePicker);
$.star.ui.datePicker.open(datePicker);
$.star.ui.datePicker.select(datePicker, "2026-08-31");
if (
  $.star.ui.datePicker.value(datePicker) !== "2026-08-31" ||
  $.star.ui.calendar.value(packageCalendar) !== "2026-08-31" ||
  packageCalendar.querySelector('[data-part="grid"]').role !== "grid" ||
  packageCalendar.querySelectorAll('[data-part="day"]').length !== 42 ||
  document.querySelector("#package-date-popover").dataset.state !== "closed"
) {
  throw new Error("The ESM bundle failed the Calendar and Date Picker component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<label for="package-range-start">Package range</label>
   <div id="package-range-picker" data-jqs="date-range-picker">
     <input id="package-range-start" data-part="start-control" name="start" value="2026-08-28">
     <input data-part="end-control" name="end" value="2026-08-30" aria-label="Package range end">
     <div id="package-range-popover" data-jqs="popover" data-part="popover">
       <button data-part="trigger"><span data-part="value"></span></button>
       <div data-part="content">
         <div id="package-range-calendar" data-jqs="range-calendar" data-month="2026-08">
           <div data-part="header">
             <button data-part="previous">Previous</button>
             <h2 data-part="heading"></h2>
             <button data-part="next">Next</button>
           </div>
           <div data-part="grid"></div>
           <p data-part="status"></p>
         </div>
       </div>
     </div>
   </div>`,
);
const dateRangePicker = document.querySelector("#package-range-picker");
const packageRangeCalendar = document.querySelector("#package-range-calendar");
$.star.ui.enhance(dateRangePicker);
$.star.ui.dateRangePicker.select(dateRangePicker, "2026-09-04", "2026-09-01");
if (
  JSON.stringify($.star.ui.dateRangePicker.value(dateRangePicker)) !==
    JSON.stringify({ start: "2026-09-01", end: "2026-09-04" }) ||
  packageRangeCalendar.querySelector('[data-value="2026-09-02"]').dataset.state !== "in-range" ||
  packageRangeCalendar.querySelectorAll('[aria-selected="true"]').length !== 4
) {
  throw new Error("The ESM bundle failed the Range Calendar and Date Range Picker smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-form" data-jqs="form">
     <div data-jqs="field">
       <label for="package-email">Package email</label>
       <input id="package-email" name="email" type="email" required>
       <p data-part="message" hidden></p>
     </div>
   </form>`,
);
const packageForm = document.querySelector("#package-form");
const packageEmail = document.querySelector("#package-email");
$.star.ui.enhance(packageForm);
if ($.star.ui.form.validate(packageForm) || packageEmail.ariaInvalid !== "true") {
  throw new Error("The ESM bundle failed the Form invalid-state smoke test.");
}
packageEmail.value = "proof@example.com";
packageEmail.dispatchEvent(new Event("input", { bubbles: true }));
if (!$.star.ui.form.valid(packageForm) || packageEmail.hasAttribute("aria-invalid")) {
  throw new Error("The ESM bundle failed the Form valid-state smoke test.");
}
$.star.ui.form.setErrors(packageForm, { email: "Already registered." });
if (
  !packageEmail.validity.customError ||
  packageEmail.validationMessage !== "Already registered."
) {
  throw new Error("The ESM bundle failed the Form backend-error smoke test.");
}
$.star.ui.form.clearErrors(packageForm);
if (packageEmail.validity.customError) {
  throw new Error("The ESM bundle failed to clear Form backend errors.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-capable-fields">
     <div id="package-number-field" data-jqs="number-field">
       <button data-part="decrement">Decrease</button>
       <input data-part="control" type="number" name="quantity" min="1" max="3" value="1">
       <button data-part="increment">Increase</button>
     </div>
     <div id="package-password-field" data-jqs="password-field">
       <input data-part="control" type="password" name="password" value="secret">
       <button data-part="toggle">Show</button>
     </div>
     <div id="package-tags-input" data-jqs="tags-input" data-name="tags" data-value='["jQuery"]'>
       <ul data-part="list"></ul>
       <input data-part="control" type="text">
     </div>
   </form>`,
);
const packageCapableFields = document.querySelector("#package-capable-fields");
const packageNumberField = document.querySelector("#package-number-field");
const packagePasswordField = document.querySelector("#package-password-field");
const packageTagsInput = document.querySelector("#package-tags-input");
$.star.ui.enhance(packageCapableFields);
$.star.ui.numberField.increment(packageNumberField);
$.star.ui.passwordField.show(packagePasswordField);
$.star.ui.tagsInput.add(packageTagsInput, "Datastar");
const capableFieldsData = new FormData(packageCapableFields);
if (
  $.star.ui.numberField.value(packageNumberField) !== 2 ||
  !$.star.ui.passwordField.visible(packagePasswordField) ||
  JSON.stringify($.star.ui.tagsInput.value(packageTagsInput)) !==
    JSON.stringify(["jQuery", "Datastar"]) ||
  capableFieldsData.get("quantity") !== "2" ||
  JSON.stringify(capableFieldsData.getAll("tags")) !== JSON.stringify(["jQuery", "Datastar"])
) {
  throw new Error("The ESM bundle failed the capable form field smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-verification-form">
     <div id="package-input-otp" data-jqs="input-otp" data-length="6">
       <input data-part="control" type="text" name="code" aria-label="Package verification code">
       <div data-part="slots"></div>
       <span data-part="status"></span>
     </div>
   </form>
   <div id="package-resizable" data-jqs="resizable" data-value='[30,70]'>
     <section data-part="panel" data-min="20" data-max="60">Navigation</section>
     <div data-part="handle" aria-label="Resize package navigation"></div>
     <section data-part="panel" data-min="40">Content</section>
   </div>`,
);
const packageVerificationForm = document.querySelector("#package-verification-form");
const packageInputOTP = document.querySelector("#package-input-otp");
const packageResizable = document.querySelector("#package-resizable");
$.star.ui.enhance(packageVerificationForm);
$.star.ui.enhance(packageResizable);
$.star.ui.inputOTP.set(packageInputOTP, "12a3456");
$.star.ui.resizable.resize(packageResizable, 0, 40);
const packageSplitter = packageResizable.querySelector('[data-part="handle"]');
if (
  $.star.ui.inputOTP.value(packageInputOTP) !== "123456" ||
  !$.star.ui.inputOTP.complete(packageInputOTP) ||
  new FormData(packageVerificationForm).get("code") !== "123456" ||
  packageInputOTP.querySelectorAll('[data-part="slot"]').length !== 6 ||
  JSON.stringify($.star.ui.resizable.value(packageResizable)) !== JSON.stringify([40, 60]) ||
  packageSplitter.role !== "separator" ||
  packageSplitter.getAttribute("aria-valuenow") !== "40"
) {
  throw new Error("The ESM bundle failed the Input OTP and Resizable component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-context-menu" data-jqs="context-menu">
     <div data-part="trigger" tabindex="0">Package card</div>
     <div data-part="content" aria-label="Package context actions">
       <button data-part="item" data-value="open">Open</button>
     </div>
   </div>
   <div id="package-menubar" data-jqs="menubar" aria-label="Package commands">
     <div data-part="menu" data-jqs="menu" data-value="file">
       <button data-part="trigger">File</button>
       <div data-part="content"><button data-part="item" data-value="new">New</button></div>
     </div>
     <div data-part="menu" data-jqs="menu" data-value="edit">
       <button data-part="trigger">Edit</button>
       <div data-part="content"><button data-part="item" data-value="undo">Undo</button></div>
     </div>
   </div>
   <ul id="package-tree" data-jqs="tree" data-selection="multiple" data-value='["src"]' aria-label="Package files">
     <li data-part="item" data-value="src" data-expanded="false">
       <div data-part="row"><span data-part="toggle"></span><span data-part="label">src</span></div>
       <ul data-part="group">
         <li data-part="item" data-value="index"><div data-part="row"><span data-part="spacer"></span><span data-part="label">index.ts</span></div></li>
       </ul>
     </li>
   </ul>`,
);
const packageContextMenu = document.querySelector("#package-context-menu");
const packageMenubar = document.querySelector("#package-menubar");
const packageTree = document.querySelector("#package-tree");
$.star.ui.enhance(packageContextMenu);
$.star.ui.enhance(packageMenubar);
$.star.ui.enhance(packageTree);
$.star.ui.contextMenu.open(packageContextMenu, 20, 30);
const packageContextContent = packageContextMenu.querySelector('[data-part="content"]');
if (
  packageContextMenu.dataset.state !== "open" ||
  packageContextContent.role !== "menu" ||
  packageContextContent.style.left !== "20px"
) {
  throw new Error("The ESM bundle failed the Context Menu component smoke test.");
}
$.star.ui.contextMenu.close(packageContextMenu);
$.star.ui.menubar.open(packageMenubar, "edit");
if (
  $.star.ui.menubar.value(packageMenubar) !== "edit" ||
  packageMenubar.role !== "menubar" ||
  packageMenubar.querySelector('[data-value="edit"] > [data-part="trigger"]').role !== "menuitem"
) {
  throw new Error("The ESM bundle failed the Menubar component smoke test.");
}
$.star.ui.menubar.close(packageMenubar);
$.star.ui.tree.expand(packageTree, "src");
$.star.ui.tree.select(packageTree, "index", true);
if (
  JSON.stringify($.star.ui.tree.value(packageTree)) !== JSON.stringify(["src", "index"]) ||
  packageTree.role !== "tree" ||
  packageTree.querySelector('[data-value="src"]').ariaExpanded !== "true" ||
  packageTree.querySelector('[data-value="index"]').ariaSelected !== "true"
) {
  throw new Error("The ESM bundle failed the Tree View component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-hover-card" data-jqs="hover-card">
     <a data-part="trigger" href="#package-profile">Package maintainer</a>
     <div data-part="content">
       <h2 data-part="title">Package maintainer</h2>
       <a id="package-profile" href="#profile">View profile</a>
     </div>
   </div>`,
);
const hoverCard = document.querySelector("#package-hover-card");
$.star.ui.enhance(hoverCard);
$.star.ui.hoverCard.open(hoverCard);
if (
  hoverCard.dataset.state !== "open" ||
  hoverCard.querySelector('[data-part="trigger"]').ariaExpanded !== "true" ||
  hoverCard.querySelector('[data-part="content"]').hidden
) {
  throw new Error("The ESM bundle failed the Hover Card component smoke test.");
}
hoverCard.querySelector("#package-profile").focus();
$.star.ui.hoverCard.close(hoverCard);
if (document.activeElement !== hoverCard.querySelector('[data-part="trigger"]')) {
  throw new Error("The built Hover Card failed focus return.");
}

const theme = await readFile(new URL("../dist/jquery-star-ui.css", import.meta.url), "utf8");
const componentSelectors = [
  "[data-jqs=button]",
  "dialog[data-jqs=dialog]",
  "[data-jqs=field]",
  "[data-jqs=input]",
  "[data-jqs=textarea]",
  "form[data-jqs=form]",
  "[data-jqs=file-input]",
  "[data-jqs=input-group]",
  "[data-jqs=label]",
  "[data-jqs=native-select]",
  "[data-jqs=button-group]",
  "meter[data-jqs=meter]",
  "[data-jqs=checkbox]",
  "[data-jqs=switch]",
  "[data-jqs=collapsible]",
  "[data-jqs=accordion]",
  "[data-jqs=tabs]",
  "[data-jqs=popover]",
  "[data-jqs=tooltip]",
  "[data-jqs=hover-card]",
  "[data-jqs=menu]",
  "[data-jqs=toast-viewport]",
  "[data-jqs=toast]",
  "[data-jqs=select]",
  "[data-jqs=combobox]",
  "[data-jqs=data-table]",
  "[data-jqs=calendar]",
  "[data-jqs=range-calendar]",
  "[data-jqs=date-picker]",
  "[data-jqs=date-range-picker]",
  "[data-jqs=number-field]",
  "[data-jqs=password-field]",
  "[data-jqs=tags-input]",
  "[data-jqs=input-otp]",
  "[data-jqs=resizable]",
  "[data-jqs=scroll-area]",
  "[data-jqs=context-menu]",
  "[data-jqs=menubar]",
  "[data-jqs=tree]",
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
  "built package proof: ESM expression=passed, ESM backend=passed, ESM dialog=passed, ESM collapsible=passed, ESM tabs=passed, ESM popover=passed, ESM tooltip=passed, ESM hover-card=passed, ESM menu=passed, ESM context-menu=passed, ESM menubar=passed, ESM tree=passed, ESM toast=passed, ESM select=passed, ESM combobox=passed, ESM data-table=passed, ESM calendar=passed, ESM date-picker=passed, ESM range-calendar=passed, ESM date-range-picker=passed, ESM form=passed, ESM capable-fields=passed, ESM input-otp=passed, ESM resizable=passed, CSS scroll-area=passed, CSS runtime components=passed, CSS composition and navigation=passed, UMD action=passed",
);
dom.window.close();
