(() => {
  const script = document.currentScript;
  const host = script?.dataset.host ?? "native";
  const expectedVersion = script?.dataset.version ?? "browser";
  const records = [];
  let sequence = 0;

  function targetCategory(target) {
    if (target === document || target === document.documentElement) return "document";
    if (target === document.body) return "body";
    if (!(target instanceof Element)) return "other";
    if (target.localName === "turbo-frame") return "frame";
    if (target instanceof HTMLFormElement) return "form";
    if (target instanceof HTMLAnchorElement) return "link";
    return "element";
  }

  function targetKey(target) {
    if (target === document || target === document.documentElement) return "document";
    if (target === document.body) return "body";
    if (!(target instanceof Element)) return "other";
    return target.dataset.interopKey || targetCategory(target);
  }

  function semanticTarget(event) {
    const detail = event.detail;
    if (!detail || typeof detail !== "object") return event.target;
    for (const key of ["elt", "target", "targetElement", "newBody", "newFrame"]) {
      if (detail[key] instanceof Element) return detail[key];
    }
    return event.target;
  }

  function focusKey() {
    const active = document.activeElement;
    if (!(active instanceof Element) || active === document.body) return "none";
    return active.dataset.focusKey || targetCategory(active);
  }

  function surfaceFingerprint() {
    const projection = [
      `route:${document.body?.dataset.route ?? "none"}`,
      ...[...document.querySelectorAll("[id]")]
        .slice(0, 128)
        .map((element) => `${element.localName}#${element.id}`)
        .sort(),
    ].join("|");
    let hash = 2166136261;
    for (let index = 0; index < projection.length; index += 1) {
      hash = Math.imul(hash ^ projection.charCodeAt(index), 16777619);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function record(event, phase, outcome = "none", target = null) {
    records.push(
      Object.freeze({
        sequence: ++sequence,
        host,
        version: expectedVersion,
        event,
        phase,
        outcome,
        targetCategory: targetCategory(target),
        targetKey: targetKey(target),
        surfaceFingerprint: surfaceFingerprint(),
        focusKey: focusKey(),
        historyLength: history.length,
        ownedRootCount: document.querySelectorAll("[data-jqs]").length,
        preservedRootCount: document.querySelectorAll("[data-jqs-preserve]").length,
      }),
    );
  }

  function listen(name, phase, callback) {
    document.addEventListener(
      name,
      (event) => {
        callback?.(event);
        record(name, phase, event.defaultPrevented ? "canceled" : "none", semanticTarget(event));
      },
      true,
    );
  }

  if (host === "turbo") {
    for (const [name, phase] of [
      ["turbo:click", "intent"],
      ["turbo:before-visit", "intent"],
      ["turbo:visit", "request"],
      ["turbo:before-fetch-request", "request"],
      ["turbo:before-fetch-response", "response"],
      ["turbo:before-cache", "cache"],
      ["turbo:before-render", "before-mutation"],
      ["turbo:render", "after-mutation"],
      ["turbo:load", "settled"],
      ["turbo:before-frame-render", "before-mutation"],
      ["turbo:frame-render", "after-mutation"],
      ["turbo:frame-load", "settled"],
      ["turbo:frame-missing", "failed"],
      ["turbo:fetch-request-error", "failed"],
      ["turbo:submit-start", "intent"],
      ["turbo:submit-end", "settled"],
    ]) {
      listen(name, phase, (event) => {
        const detail = event.detail;
        const url = detail && typeof detail === "object" && "url" in detail ? detail.url : null;
        if (
          name === "turbo:before-visit" &&
          url &&
          new URL(String(url), document.baseURI).pathname.endsWith("/cancel")
        ) {
          event.preventDefault();
        }
      });
    }
  }

  if (host === "htmx") {
    for (const [name, phase] of [
      ["htmx:confirm", "intent"],
      ["htmx:beforeRequest", "request"],
      ["htmx:beforeSend", "request"],
      ["htmx:beforeOnLoad", "response"],
      ["htmx:beforeSwap", "before-mutation"],
      ["htmx:beforeCleanupElement", "removing"],
      ["htmx:afterSwap", "after-mutation"],
      ["htmx:afterSettle", "settled"],
      ["htmx:afterRequest", "settled"],
      ["htmx:beforeHistorySave", "cache"],
      ["htmx:historyCacheHit", "cache"],
      ["htmx:historyCacheMiss", "cache"],
      ["htmx:historyCacheMissLoad", "request"],
      ["htmx:historyCacheMissLoadError", "failed"],
      ["htmx:historyCacheError", "failed"],
      ["htmx:historyRestore", "settled"],
      ["htmx:oobBeforeSwap", "before-mutation"],
      ["htmx:oobAfterSwap", "after-mutation"],
      ["htmx:oobErrorNoTarget", "failed"],
      ["htmx:responseError", "failed"],
      ["htmx:sendAbort", "canceled"],
      ["htmx:sendError", "failed"],
      ["htmx:swapError", "failed"],
      ["htmx:timeout", "failed"],
      ["htmx:targetError", "failed"],
    ]) {
      listen(name, phase, (event) => {
        const detail = event.detail;
        const trigger = detail?.requestConfig?.elt;
        if (name === "htmx:beforeSwap" && trigger?.id === "cancel-swap") {
          event.preventDefault();
        }
        if (name === "htmx:beforeSwap" && trigger?.id === "swap-error") {
          detail.serverResponse = null;
        }
      });
    }
  }

  window.__interop = Object.freeze({
    host,
    expectedVersion,
    records,
    clear() {
      records.splice(0);
      sequence = 0;
    },
    snapshot() {
      return records.map((entry) => ({ ...entry }));
    },
  });
})();
