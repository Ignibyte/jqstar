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
  HTMLFieldSetElement: dom.window.HTMLFieldSetElement,
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
  `<nav id="package-pagination" data-jqs="pagination" data-page="1" data-page-count="3">
     <a data-part="previous" href="?page=1">Previous</a>
     <a data-part="page" data-page="1" href="?page=1">1</a>
     <a data-part="page" data-page="2" href="?page=2">2</a>
     <a data-part="page" data-page="3" href="?page=3">3</a>
     <a data-part="next" href="?page=2">Next</a>
     <span data-part="status"></span>
   </nav>`,
);
const pagination = document.querySelector("#package-pagination");
$.star.ui.enhance(pagination);
$.star.ui.pagination.next(pagination);
if (
  $.star.ui.pagination.page(pagination) !== 2 ||
  $.star.ui.pagination.pageCount(pagination) !== 3 ||
  pagination.querySelector('[data-page="2"]').getAttribute("aria-current") !== "page" ||
  pagination.querySelector('[data-part="status"]').textContent !== "Page 2 of 3"
) {
  throw new Error("The ESM bundle failed the Pagination component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-transfer-form">
     <div id="package-transfer-list" data-jqs="transfer-list" data-name="permissions" data-value='["write"]'>
       <select data-part="available" multiple><option value="read">Read</option></select>
       <button data-part="add">Add</button><button data-part="add-all">Add all</button>
       <select data-part="selected" multiple><option value="write">Write</option></select>
       <button data-part="remove">Remove</button><button data-part="remove-all">Remove all</button>
       <button data-part="move-up">Move up</button><button data-part="move-down">Move down</button>
       <p data-part="status"></p>
     </div>
   </form>`,
);
const transferList = document.querySelector("#package-transfer-list");
$.star.ui.enhance(transferList);
$.star.ui.transferList.add(transferList, ["read"]);
$.star.ui.transferList.up(transferList, ["read"]);
if (
  $.star.ui.transferList.value(transferList).join(",") !== "read,write" ||
  new FormData(document.querySelector("#package-transfer-form")).getAll("permissions").join(",") !==
    "read,write"
) {
  throw new Error("The ESM bundle failed the Transfer List component smoke test.");
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
  `<section id="package-sidebar" data-jqs="sidebar" data-collapsible="icon" data-value="expanded">
     <aside data-part="panel" aria-label="Package navigation">Navigation</aside>
     <main data-part="content"><button data-part="trigger">Toggle sidebar</button></main>
     <button data-part="backdrop">Close sidebar</button>
   </section>
   <section id="package-carousel" data-jqs="carousel" data-value="one" data-loop aria-label="Package slides">
     <div data-part="content">
       <div data-part="slide" data-value="one">One</div>
       <div data-part="slide" data-value="two">Two</div>
     </div>
     <button data-part="previous">Previous</button>
     <button data-part="next">Next</button>
     <span data-part="status"></span>
   </section>
   <div id="package-toolbar" data-jqs="toolbar" aria-label="Package tools">
     <button data-part="item" data-value="one">One</button>
     <button data-part="item" data-value="two">Two</button>
     <button data-part="item" data-value="three">Three</button>
   </div>`,
);
const packageSidebar = document.querySelector("#package-sidebar");
const packageCarousel = document.querySelector("#package-carousel");
const packageToolbar = document.querySelector("#package-toolbar");
$.star.ui.enhance(packageSidebar);
$.star.ui.enhance(packageCarousel);
$.star.ui.enhance(packageToolbar);
$.star.ui.sidebar.close(packageSidebar);
$.star.ui.carousel.next(packageCarousel);
$.star.ui.toolbar.focus(packageToolbar, "two");
if (
  $.star.ui.sidebar.value(packageSidebar) ||
  packageSidebar.dataset.state !== "collapsed" ||
  $.star.ui.carousel.value(packageCarousel) !== "two" ||
  !packageCarousel.querySelector('[data-value="one"]').hidden ||
  $.star.ui.toolbar.value(packageToolbar) !== "two" ||
  packageToolbar.role !== "toolbar" ||
  document.activeElement !== packageToolbar.querySelector('[data-value="two"]')
) {
  throw new Error("The ESM bundle failed the Sidebar, Carousel, and Toolbar smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-workflow">
     <div id="package-stepper" data-jqs="stepper" data-value="details" data-validate="false">
       <ol data-part="list">
         <li data-part="step" data-value="details"><button data-part="trigger">Details</button></li>
         <li data-part="step" data-value="review"><button data-part="trigger">Review</button></li>
       </ol>
       <section data-part="panel" data-value="details">Details</section>
       <section data-part="panel" data-value="review">Review</section>
       <button data-part="previous">Back</button><button data-part="next">Next</button>
     </div>
     <div id="package-sortable" data-jqs="sortable" data-name="priority">
       <ol data-part="list">
         <li data-part="item" data-value="one"><button data-part="handle">Move</button><button data-part="up">Up</button><button data-part="down">Down</button></li>
         <li data-part="item" data-value="two"><button data-part="handle">Move</button><button data-part="up">Up</button><button data-part="down">Down</button></li>
       </ol>
     </div>
     <div id="package-upload" data-jqs="file-upload"><input data-part="control" type="file" name="asset"><label data-part="dropzone">File</label><ul data-part="list"></ul></div>
   </form>`,
);
const packageStepper = document.querySelector("#package-stepper");
const packageSortable = document.querySelector("#package-sortable");
const packageUpload = document.querySelector("#package-upload");
$.star.ui.enhance(document.querySelector("#package-workflow"));
$.star.ui.stepper.next(packageStepper);
$.star.ui.sortable.move(packageSortable, "two", 0);
const packageFile = new File(["proof"], "proof.txt", { type: "text/plain" });
Object.defineProperty(packageUpload.querySelector('[data-part="control"]'), "files", {
  configurable: true,
  value: [packageFile],
});
packageUpload
  .querySelector('[data-part="control"]')
  .dispatchEvent(new Event("change", { bubbles: true }));
if (
  $.star.ui.stepper.value(packageStepper) !== "review" ||
  $.star.ui.sortable.value(packageSortable).join(",") !== "two,one" ||
  new FormData(document.querySelector("#package-workflow")).getAll("priority").join(",") !==
    "two,one" ||
  $.star.ui.fileUpload.files(packageUpload)[0]?.name !== "proof.txt"
) {
  throw new Error("The ESM bundle failed the Stepper, Sortable, and File Upload smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-preferences">
     <div id="package-multi-select" data-jqs="multi-select">
       <select data-part="control" name="teams" multiple><option value="design" selected>Design</option><option value="api">API</option></select>
     </div>
     <div id="package-time-picker" data-jqs="time-picker">
       <button data-part="decrement">Earlier</button><input data-part="control" type="time" name="review_time" step="900" value="09:00"><button data-part="increment">Later</button>
     </div>
     <div id="package-color-picker" data-jqs="color-picker">
       <input data-part="control" type="color" name="accent" value="#0f766e"><input data-part="value"><button data-part="swatch" data-value="#2563eb">Blue</button>
     </div>
   </form>`,
);
const packagePreferences = document.querySelector("#package-preferences");
const packageMultiSelect = document.querySelector("#package-multi-select");
const packageTimePicker = document.querySelector("#package-time-picker");
const packageColorPicker = document.querySelector("#package-color-picker");
$.star.ui.enhance(packagePreferences);
$.star.ui.multiSelect.set(packageMultiSelect, ["design", "api"]);
$.star.ui.timePicker.set(packageTimePicker, "13:30");
$.star.ui.colorPicker.set(packageColorPicker, "#2563eb");
const packagePreferenceData = new FormData(packagePreferences);
if (
  packagePreferenceData.getAll("teams").join(",") !== "design,api" ||
  packagePreferenceData.get("review_time") !== "13:30" ||
  packagePreferenceData.get("accent") !== "#2563eb" ||
  $.star.ui.multiSelect.value(packageMultiSelect).join(",") !== "design,api" ||
  $.star.ui.timePicker.value(packageTimePicker) !== "13:30" ||
  $.star.ui.colorPicker.value(packageColorPicker) !== "#2563eb"
) {
  throw new Error(
    "The ESM bundle failed the Multi Select, Time Picker, and Color Picker smoke test.",
  );
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-feedback">
     <fieldset id="package-rating" data-jqs="rating" data-value="3">
       <div data-part="items">
         <label data-part="item"><input data-part="control" type="radio" name="rating" value="1"><span data-part="icon">*</span></label>
         <label data-part="item"><input data-part="control" type="radio" name="rating" value="2"><span data-part="icon">*</span></label>
         <label data-part="item"><input data-part="control" type="radio" name="rating" value="3"><span data-part="icon">*</span></label>
         <label data-part="item"><input data-part="control" type="radio" name="rating" value="4"><span data-part="icon">*</span></label>
         <label data-part="item"><input data-part="control" type="radio" name="rating" value="5"><span data-part="icon">*</span></label>
       </div>
       <button data-part="clear">Clear</button><output data-part="status"></output>
     </fieldset>
     <section id="package-message-scroller" data-jqs="message-scroller">
       <div data-part="viewport" aria-label="Package conversation"><div data-part="content"><article data-jqs="message"><div data-part="content">First</div></article></div></div>
       <button data-part="latest"><span data-part="latest-label">Latest</span></button><p data-part="status"></p>
     </section>
   </form>`,
);
const packageFeedback = document.querySelector("#package-feedback");
const packageRating = document.querySelector("#package-rating");
const packageMessageScroller = document.querySelector("#package-message-scroller");
$.star.ui.enhance(packageFeedback);
$.star.ui.rating.set(packageRating, "4");
$.star.ui.messageScroller.follow(packageMessageScroller, false);
packageMessageScroller
  .querySelector('[data-part="viewport"] > [data-part="content"]')
  .insertAdjacentHTML(
    "beforeend",
    '<article data-jqs="message"><div data-part="content">Second</div></article>',
  );
await new Promise((resolve) => window.setTimeout(resolve, 0));
if (
  new FormData(packageFeedback).get("rating") !== "4" ||
  $.star.ui.rating.value(packageRating) !== "4" ||
  $.star.ui.messageScroller.unread(packageMessageScroller) !== 1 ||
  packageMessageScroller.querySelector('[data-part="viewport"]').getAttribute("role") !== "log"
) {
  throw new Error("The ESM bundle failed the Rating, Message, and Message Scroller smoke test.");
}
$.star.ui.messageScroller.latest(packageMessageScroller);

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-search-form" role="search">
     <div id="package-search" data-jqs="search-field">
       <input data-part="control" type="search" name="query"><button data-part="clear">Clear</button><button data-part="submit">Search</button>
     </div>
   </form>
   <section id="package-feed" data-jqs="feed" data-cursor="1" aria-label="Package results">
     <div data-part="content"><article data-jqs="item" data-part="item"><h2 data-part="title">First result</h2><p data-part="description">First description</p></article></div>
     <button data-part="more">Load more</button><div data-part="sentinel"></div><p data-part="status">One result</p>
   </section>`,
);
const packageSearchForm = document.querySelector("#package-search-form");
const packageSearch = document.querySelector("#package-search");
const packageFeed = document.querySelector("#package-feed");
$.star.ui.enhance(packageSearchForm);
$.star.ui.enhance(packageFeed);
$.star.ui.searchField.set(packageSearch, "proof");
$.star.ui.feed.load(packageFeed);
packageFeed
  .querySelector('[data-part="content"]')
  .insertAdjacentHTML(
    "beforeend",
    '<article data-jqs="item" data-part="item"><h2 data-part="title">Second result</h2><p data-part="description">Second description</p></article>',
  );
$.star.ui.feed.complete(packageFeed, { added: 1, cursor: "2", done: true });
if (
  new FormData(packageSearchForm).get("query") !== "proof" ||
  $.star.ui.searchField.value(packageSearch) !== "proof" ||
  $.star.ui.feed.state(packageFeed).cursor !== "2" ||
  packageFeed.querySelector('[data-part="content"]').getAttribute("role") !== "feed" ||
  packageFeed.querySelectorAll('[data-part="item"]')[1]?.getAttribute("aria-posinset") !== "2" ||
  packageFeed.querySelectorAll('[data-part="item"]')[1]?.getAttribute("aria-setsize") !== "2"
) {
  throw new Error("The ESM bundle failed the Search Field, Item, and Feed smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<form id="package-questionnaire-form">
     <section id="package-questionnaire" data-jqs="questionnaire" data-value="direction">
       <progress data-part="progress" aria-label="Question progress"></progress><span data-part="progress-label"></span>
       <fieldset data-part="item" data-value="direction" data-name="direction" data-required>
         <legend>Direction</legend><input data-part="control" type="radio" name="direction" value="workflow"><p data-part="error"></p>
       </fieldset>
       <fieldset data-part="item" data-value="constraints" data-name="constraints" data-multiple data-required>
         <legend>Constraints</legend><input data-part="control" type="checkbox" name="constraints" value="accessible"><input data-part="control" type="checkbox" name="constraints" value="server-ready"><p data-part="error"></p>
       </fieldset>
       <div data-part="actions"><button data-part="previous">Previous</button><button data-part="next">Next</button><button data-part="submit">Submit</button></div><p data-part="status"></p>
     </section>
   </form>`,
);
const packageQuestionnaireForm = document.querySelector("#package-questionnaire-form");
const packageQuestionnaire = document.querySelector("#package-questionnaire");
$.star.ui.enhance(packageQuestionnaire);
$.star.ui.questionnaire.answer(packageQuestionnaire, "direction", "workflow");
$.star.ui.questionnaire.next(packageQuestionnaire);
$.star.ui.questionnaire.answer(packageQuestionnaire, "constraints", ["accessible", "server-ready"]);
if (
  $.star.ui.questionnaire.value(packageQuestionnaire) !== "constraints" ||
  $.star.ui.questionnaire.answers(packageQuestionnaire).direction !== "workflow" ||
  new FormData(packageQuestionnaireForm).getAll("constraints").join(",") !==
    "accessible,server-ready"
) {
  throw new Error("The ESM bundle failed the Questionnaire component smoke test.");
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

document.body.insertAdjacentHTML(
  "beforeend",
  `<figure id="package-chart" data-jqs="chart" data-type="bar">
     <figcaption>Package chart</figcaption>
     <svg data-part="plot"></svg><div data-part="legend"></div><p data-part="status"></p>
     <table data-part="data"><caption>Package values</caption><thead><tr><th>Month</th><th data-series="builds" data-color="#2563eb">Builds</th></tr></thead><tbody><tr><th>Jan</th><td>12</td></tr><tr><th>Feb</th><td>24</td></tr></tbody></table>
   </figure>`,
);
const packageChart = document.querySelector("#package-chart");
$.star.ui.enhance(packageChart);
$.star.ui.chart.setType(packageChart, "line");
if (
  $.star.ui.chart.data(packageChart).series[0].values.join(",") !== "12,24" ||
  packageChart.querySelectorAll('[data-part="line"]').length !== 1 ||
  packageChart.querySelectorAll('[data-part="point"]').length !== 2
) {
  throw new Error("The ESM bundle failed the Chart component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-code-block" data-jqs="code-block">
     <button data-part="copy">Copy</button>
     <pre><code data-part="code">{ "status": "healthy" }</code></pre>
     <p data-part="status"></p>
   </div>`,
);
const packageCodeBlock = document.querySelector("#package-code-block");
$.star.ui.enhance(packageCodeBlock);
if (
  $.star.ui.codeBlock.text(packageCodeBlock) !== '{ "status": "healthy" }' ||
  !packageCodeBlock.querySelector('[data-part="copy"]').getAttribute("aria-describedby")
) {
  throw new Error("The ESM bundle failed the Code Block component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-clipboard" data-jqs="clipboard"><input data-part="value" value="npm install jquery-star"><button data-part="trigger">Copy</button><span data-part="status"></span></div>
   <div id="package-editable" data-jqs="editable"><div data-part="display"><span data-part="preview">Ada</span><button data-part="edit">Edit</button></div><div data-part="editor"><input data-part="control" value="Ada"><button>Apply</button></div><span data-part="status"></span></div>`,
);
const packageClipboard = document.querySelector("#package-clipboard");
const packageEditable = document.querySelector("#package-editable");
$.star.ui.enhance(packageClipboard);
$.star.ui.enhance(packageEditable);
$.star.ui.editable.set(packageEditable, "Grace");
if (
  $.star.ui.clipboard.text(packageClipboard) !== "npm install jquery-star" ||
  $.star.ui.clipboard.state(packageClipboard) !== "idle" ||
  $.star.ui.editable.value(packageEditable) !== "Grace" ||
  packageEditable.querySelector('[data-part="preview"]').textContent !== "Grace"
) {
  throw new Error("The ESM bundle failed the Clipboard or Editable component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<section id="package-log-viewer" data-jqs="log-viewer" data-level="all" data-max="2">
     <header data-part="header"><select data-part="filter"><option value="all">All</option><option value="warn">Warning</option></select><button data-part="pause">Pause</button></header>
     <div data-part="viewport"><ol data-part="entries"><li data-part="entry" data-level="info">Ready</li></ol></div><p data-part="status"></p>
   </section>`,
);
const packageLogViewer = document.querySelector("#package-log-viewer");
$.star.ui.enhance(packageLogViewer);
$.star.ui.logViewer.append(packageLogViewer, {
  level: "warn",
  message: "Built log append",
  source: "package",
});
$.star.ui.logViewer.filter(packageLogViewer, "warn");
if (
  $.star.ui.logViewer.state(packageLogViewer).count !== 2 ||
  $.star.ui.logViewer.state(packageLogViewer).visible !== 1 ||
  packageLogViewer.querySelector('[data-part="viewport"]').getAttribute("role") !== "log"
) {
  throw new Error("The ESM bundle failed the Log Viewer component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<section id="package-json-viewer" data-jqs="json-viewer"><script type="application/json" data-part="source">{"ready":true}</script><div data-part="tree"></div><p data-part="status"></p></section>`,
);
const packageJSONViewer = document.querySelector("#package-json-viewer");
$.star.ui.enhance(packageJSONViewer);
$.star.ui.jsonViewer.set(packageJSONViewer, { nested: { count: 100 } });
$.star.ui.jsonViewer.expandAll(packageJSONViewer);
if (
  $.star.ui.jsonViewer.value(packageJSONViewer).nested.count !== 100 ||
  packageJSONViewer.querySelectorAll('details[data-part="branch"][open]').length !== 2
) {
  throw new Error("The ESM bundle failed the JSON Viewer component smoke test.");
}

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="package-countdown" data-jqs="countdown" data-duration="10"><span data-part="seconds"></span><output data-part="status"></output></div>`,
);
const packageCountdown = document.querySelector("#package-countdown");
$.star.ui.enhance(packageCountdown);
$.star.ui.countdown.start(packageCountdown, 12);
$.star.ui.countdown.pause(packageCountdown);
if (
  $.star.ui.countdown.remaining(packageCountdown) !== 12 ||
  $.star.ui.countdown.state(packageCountdown).paused !== true ||
  packageCountdown.querySelector('[data-part="seconds"]').textContent !== "12"
) {
  throw new Error("The ESM bundle failed the Countdown component smoke test.");
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
  "[data-jqs=sidebar]",
  "[data-jqs=carousel]",
  "[data-jqs=toolbar]",
  "[data-jqs=stepper]",
  "[data-jqs=sortable]",
  "[data-jqs=file-upload]",
  "[data-jqs=multi-select]",
  "[data-jqs=transfer-list]",
  "[data-jqs=split-button]",
  "[data-jqs=time-picker]",
  "[data-jqs=color-picker]",
  "[data-jqs=rating]",
  "[data-jqs=message]",
  "[data-jqs=message-scroller]",
  "[data-jqs=search-field]",
  "[data-jqs=item]",
  "[data-jqs=feed]",
  "[data-jqs=questionnaire]",
  "[data-jqs=attachment]",
  "[data-jqs=bubble]",
  "[data-jqs=aspect-ratio]",
  "[data-jqs=chart]",
  "[data-jqs=direction]",
  "[data-jqs=marker]",
  "[data-jqs=table]",
  "[data-jqs=typography]",
  "[data-jqs=stat]",
  "[data-jqs=timeline]",
  "[data-jqs=status]",
  "[data-jqs=code-block]",
  "[data-jqs=clipboard]",
  "[data-jqs=editable]",
  "[data-jqs=browser-mockup]",
  "[data-jqs=diff]",
  "[data-jqs=log-viewer]",
  "[data-jqs=json-viewer]",
  "[data-jqs=countdown]",
  "[data-jqs=connection-status]",
  "[data-jqs=terminal]",
  "[data-jqs=radial-progress]",
  "[data-jqs=indicator]",
  "[data-jqs=dock]",
  "[data-jqs=swap]",
  "[data-jqs=key-value]",
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
  "built package proof: ESM expression=passed, ESM backend=passed, ESM dialog=passed, ESM collapsible=passed, ESM tabs=passed, ESM popover=passed, ESM tooltip=passed, ESM hover-card=passed, ESM menu=passed, ESM context-menu=passed, ESM menubar=passed, ESM tree=passed, ESM sidebar=passed, ESM carousel=passed, ESM toolbar=passed, ESM stepper=passed, ESM sortable=passed, ESM file-upload=passed, ESM multi-select=passed, ESM transfer-list=passed, ESM time-picker=passed, ESM color-picker=passed, ESM rating=passed, ESM message-scroller=passed, ESM search-field=passed, ESM feed=passed, ESM questionnaire=passed, ESM chart=passed, ESM code-block=passed, ESM clipboard=passed, ESM editable=passed, ESM log-viewer=passed, ESM json-viewer=passed, ESM countdown=passed, ESM toast=passed, ESM select=passed, ESM combobox=passed, ESM data-table=passed, ESM pagination=passed, ESM calendar=passed, ESM date-picker=passed, ESM range-calendar=passed, ESM date-range-picker=passed, ESM form=passed, ESM capable-fields=passed, ESM input-otp=passed, ESM resizable=passed, CSS scroll-area=passed, CSS runtime components=passed, CSS composition and navigation=passed, UMD action=passed",
);
dom.window.close();
