(function migrationFixture(global) {
  "use strict";

  const $ = global.jQuery;
  const { document, HTMLElement } = global;
  const counters = {
    legacyDestroy: 0,
    legacyInit: 0,
    nativeDestroy: 0,
    nativeInit: 0,
    patches: 0,
  };
  const evidence = {
    legacyDataAbsentBeforeRemoval: false,
    nativeDestroyedBeforeRemoval: false,
  };
  const legacyDialogs = new WeakMap();

  global.jQueryStar.installStar($);

  function updateLegacyOrder(root) {
    const order = $(root)
      .find("#legacy-sortable > li")
      .map((_index, item) => item.dataset.value)
      .get()
      .join(",");
    $(root).find("#legacy-order").val(order);
  }

  function initializeLegacy(root) {
    const $root = $(root);
    const $dialog = $root.find("#legacy-dialog");
    $dialog.dialog({ autoOpen: false, modal: true, width: 420 });
    legacyDialogs.set(root, $dialog);
    $root.find("#legacy-tabs").tabs();
    $root.find("#legacy-owner").autocomplete({ source: ["Ada", "Grace", "Linus"] });
    $root.find("#legacy-due").datepicker();
    $root.find("#legacy-sortable").sortable({ update: () => updateLegacyOrder(root) });
    $root.find("#legacy-menu").menu();
    $root.find(".legacy-command, #legacy-open, #replace-legacy").button();
    $root.tooltip({ items: "[title]" });
    $root.off(".migrationFixture");
    $root.on("click.migrationFixture", "#legacy-open", () => $dialog.dialog("open"));
    $dialog
      .off("click.migrationFixture", "#legacy-dialog-save")
      .on("click.migrationFixture", "#legacy-dialog-save", () => $dialog.dialog("close"));
    $root.on("click.migrationFixture", "#replace-legacy", () => replaceLegacy(root));
    updateLegacyOrder(root);
    counters.legacyInit += 1;
  }

  function destroyLegacy(root) {
    const $root = $(root);
    const widgets = [
      [legacyDialogs.get(root), "dialog"],
      [$root.find("#legacy-tabs"), "tabs"],
      [$root.find("#legacy-owner"), "autocomplete"],
      [$root.find("#legacy-due"), "datepicker"],
      [$root.find("#legacy-sortable"), "sortable"],
      [$root.find("#legacy-menu"), "menu"],
    ];
    for (const [$target, plugin] of widgets) {
      if ($target?.length > 0) {
        $target[plugin]("destroy");
        counters.legacyDestroy += 1;
      }
    }
    $root.find(".legacy-command, #legacy-open, #replace-legacy").button("destroy");
    $root.tooltip("destroy");
    $root.off(".migrationFixture");
    evidence.legacyDataAbsentBeforeRemoval = widgets.every(([$target]) => {
      const values = $target?.data() ?? {};
      return Object.keys(values).every((key) => !key.startsWith("ui"));
    });
    legacyDialogs.delete(root);
  }

  function initializeNative(root) {
    $(root).star();
    $(root)
      .off("click.migrationFixture", "#replace-native")
      .on("click.migrationFixture", "#replace-native", () => replaceNative(root));
    counters.nativeInit += 1;
  }

  function destroyNative(root) {
    const instance = $(root).star("instance");
    $(root).star("destroy");
    evidence.nativeDestroyedBeforeRemoval = instance?.destroyed === true;
    counters.nativeDestroy += 1;
  }

  async function replaceLegacy(root) {
    const response = await global.fetch("/jquery-ui-migration/fragment/legacy");
    const holder = document.createElement("div");
    holder.innerHTML = await response.text();
    const incoming = holder.firstElementChild;
    if (!(incoming instanceof HTMLElement)) throw new Error("Missing legacy replacement.");
    destroyLegacy(root);
    root.replaceWith(incoming);
    initializeLegacy(incoming);
    counters.patches += 1;
  }

  async function replaceNative(root) {
    const response = await global.fetch("/jquery-ui-migration/fragment/native");
    const holder = document.createElement("div");
    holder.innerHTML = await response.text();
    const incoming = holder.firstElementChild;
    if (!(incoming instanceof HTMLElement)) throw new Error("Missing native replacement.");
    destroyNative(root);
    root.replaceWith(incoming);
    initializeNative(incoming);
    counters.patches += 1;
  }

  function dataKeys(selector) {
    return Object.keys($(selector).data()).sort();
  }

  function snapshot() {
    const legacy = document.querySelector("#legacy-island");
    const native = document.querySelector("#native-island");
    return {
      counters: { ...counters },
      evidence: { ...evidence },
      jqueryVersion: $.fn.jquery,
      jqueryUiVersion: $.ui.version,
      legacyDataKeys: legacy ? dataKeys("#legacy-tabs") : [],
      legacyRevision: legacy?.dataset.revision ?? "missing",
      nativeHasInstance: native ? $(native).star("instance") !== undefined : false,
      nativeRevision: native?.dataset.revision ?? "missing",
      nativeUiDataKeys: native
        ? dataKeys("#native-island").filter((key) => key.startsWith("ui"))
        : [],
    };
  }

  const legacy = document.querySelector("#legacy-island");
  const native = document.querySelector("#native-island");
  const compositeNative = document.querySelector("#composite-native");
  if (
    !(legacy instanceof HTMLElement) ||
    !(native instanceof HTMLElement) ||
    !(compositeNative instanceof HTMLElement)
  ) {
    throw new Error("Migration ownership islands are missing.");
  }
  initializeLegacy(legacy);
  initializeNative(native);
  initializeNative(compositeNative);
  $("#composite-legacy-button").button();
  document.querySelector("#fixture-status").textContent =
    "jQuery 4.0.0, jQuery UI 1.14.2, and jQStar ready";
  global.__jqueryUiMigration = { snapshot };
})(globalThis);
