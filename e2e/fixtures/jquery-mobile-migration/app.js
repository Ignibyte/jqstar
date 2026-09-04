(function mobileMigrationFixture(global) {
  "use strict";

  const $ = global.jQuery;
  const { HTMLElement, HTMLInputElement, HTMLOutputElement } = global;
  const root = global.document.querySelector("#migration-app");
  const evidence = {
    activations: 0,
    localFilters: 0,
    pointerCancels: 0,
  };

  if (!$ || !root || !global.jQueryStar) return;

  global.jQueryStar.installStar($);
  $(root).star();

  function filterProjects() {
    const field = global.document.querySelector("#project-query");
    const status = global.document.querySelector("#filter-status");
    if (!(field instanceof HTMLInputElement) || !(status instanceof HTMLElement)) return;
    const query = field.value.trim().toLocaleLowerCase();
    const rows = [...global.document.querySelectorAll("[data-project-row]")];
    let visible = 0;
    for (const row of rows) {
      const matches = (row.getAttribute("data-filter-text") ?? "")
        .toLocaleLowerCase()
        .includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    }
    status.textContent = query
      ? `${visible} project${visible === 1 ? "" : "s"} match locally. Submit to search the server.`
      : "Showing all projects.";
    evidence.localFilters += 1;
  }

  const search = global.document.querySelector("#project-search");
  search?.querySelector("input[type='search']")?.addEventListener("input", filterProjects);
  search?.addEventListener("reset", () => global.setTimeout(filterProjects, 0));

  const gesture = global.document.querySelector("#milestone-gesture");
  const advanceButton = global.document.querySelector("#advance-milestone");
  const output = global.document.querySelector("#milestone-value");
  let pointer = null;

  function advance() {
    if (!(gesture instanceof HTMLElement) || !(output instanceof HTMLOutputElement)) return;
    const current = Number(gesture.dataset.milestone ?? 1);
    const next = current >= 3 ? 1 : current + 1;
    gesture.dataset.milestone = String(next);
    output.value = String(next);
    evidence.activations += 1;
  }

  gesture?.addEventListener("pointerdown", (event) => {
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try {
      gesture.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic test events may not have an active platform pointer.
    }
  });
  gesture?.addEventListener("pointermove", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (Math.abs(event.clientY - pointer.y) > 40) {
      pointer = null;
      evidence.pointerCancels += 1;
    }
  });
  gesture?.addEventListener("pointercancel", () => {
    pointer = null;
    evidence.pointerCancels += 1;
  });
  gesture?.addEventListener("pointerup", (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const horizontal = event.clientX - pointer.x;
    const vertical = Math.abs(event.clientY - pointer.y);
    pointer = null;
    if (horizontal >= 60 && vertical <= 40) advance();
  });
  advanceButton?.addEventListener("click", advance);

  function reflectNetwork() {
    const message = global.document.querySelector("#offline-message");
    if (message instanceof HTMLElement) message.hidden = global.navigator.onLine;
  }

  global.addEventListener("online", reflectNetwork);
  global.addEventListener("offline", reflectNetwork);
  reflectNetwork();

  global.__jqueryMobileMigration = {
    snapshot() {
      return {
        evidence: { ...evidence },
        jqueryVersion: $.fn.jquery,
        mobileRuntimePresent: Object.hasOwn($, "mobile"),
        starMounted: $(root).star("instance") !== undefined,
      };
    },
  };
})(globalThis);
