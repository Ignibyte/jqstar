const { document, performance } = globalThis;

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function redacted(value) {
  ensure(
    !/private-investigation|auditLog\.refresh|projectBrowser|\/api\/|data-block/.test(
      JSON.stringify(value),
    ),
    "Inspection retained an application label, URL, selector, or private value",
  );
}

export async function investigateProjectBrowser({ $, attachInspector, createRenderAdapter }) {
  const started = performance.now();
  const root = document.querySelector('[data-block="project-browser"]');
  ensure(root, "Project Browser markup is missing");
  $.star.ui.enhance(document);
  $(root).star();
  await $.star.whenEnhanced();
  const inspector = attachInspector($);
  const initial = inspector.snapshot();
  const sibling = document.createElement("section");
  sibling.setAttribute("data-jqs", "card");
  sibling.textContent = "Replacement workspace";
  root.after(sibling);
  $(sibling).star({ state: { count: 0 } });
  const replacement = $(sibling).star("instance");
  const retained = $(root).star("instance");
  // Seed the application integration mistake: hiding an outgoing root does not dispose it.
  root.hidden = true;
  const hidden = inspector.snapshot();
  ensure(
    hidden.kernel.applications.length === initial.kernel.applications.length + 1,
    "The hidden application should still be owned beside its replacement",
  );
  ensure(!retained.destroyed && root.isConnected, "Seeded retained-root condition is absent");
  const transaction = createRenderAdapter($).begin(root);
  transaction.beforeRemove(root);
  root.remove();
  await transaction.commit();
  const corrected = inspector.snapshot();
  ensure(retained.destroyed, "Public render cleanup did not destroy the outgoing application");
  ensure(!replacement.destroyed && sibling.isConnected, "Cleanup destroyed the sibling");
  replacement.state.count = 1;
  ensure(replacement.state.count === 1, "The sibling cannot continue working");
  ensure(corrected.kernel.applications.length === 1, "Removed roots remain in the snapshot");
  for (const snapshot of [initial, hidden, corrected]) redacted(snapshot);
  const disposal = $.star.dispose();
  const terminal = inspector.snapshot();
  ensure(disposal.remaining.length === 0 && disposal.failed.length === 0, "Cleanup failed");
  ensure(terminal.lifecycle === "disposed" && terminal.kernel === null, "Terminal data is live");
  inspector.dispose();
  return {
    id: "project-browser-ownership",
    elapsedMs: performance.now() - started,
    resolved: true,
    publicReads: 4,
    diagnosis: "hidden-root-remains-owned",
    before: initial,
    fault: hidden,
    corrected,
    terminal,
    cleanup: { failed: disposal.failed.length, remaining: disposal.remaining.length },
  };
}

export async function investigateAuditLog({ $, attachInspector }) {
  const started = performance.now();
  const root = document.querySelector('[data-block="audit-log"]');
  ensure(root, "Audit Log markup is missing");
  $.star.ui.enhance(document);
  $(root).star();
  await $.star.whenEnhanced();
  const application = $(root).star("instance");
  application.state.auditLogQuery = "private-investigation-query";
  const inspector = attachInspector($);
  inspector.enableTrace({ maxEntries: 64, maxBytes: 16384, kinds: ["action", "request"] });
  const initial = inspector.snapshot();
  // The local server returns one controlled HTTP 503, then an official SDK signal patch.
  await application.run("auditLog.refresh").catch(() => undefined);
  const fault = inspector.exportTrace();
  const failed = fault.records.find((record) => record.kind === "request" && record.status === 503);
  ensure(failed?.outcome === "failed", "Trace did not identify the failed backend request");
  ensure(
    fault.records.some((record) => record.kind === "action" && record.id === failed.parentId),
    "The request has no public action correlation",
  );
  ensure(application.state.auditLogLoading === false, "The failure left loading active");
  ensure(application.state.auditLogError !== null, "The application did not show its failure");
  inspector.clearTrace();
  await application.run("auditLog.refresh");
  await $.star.whenEnhanced();
  const corrected = inspector.exportTrace();
  ensure(
    corrected.records.some((record) => record.kind === "request" && record.outcome === "completed"),
    "The repaired response did not complete",
  );
  ensure(application.state.auditLogCount === 1, "The official SDK patch did not update the app");
  ensure(application.state.auditLogError === null, "The repaired response retained the error");
  ensure(application.state.auditLogLoading === false, "The repaired response retained loading");
  for (const value of [initial, fault, corrected]) redacted(value);
  const disposal = $.star.dispose();
  const terminal = inspector.snapshot();
  ensure(disposal.remaining.length === 0 && disposal.failed.length === 0, "Cleanup failed");
  ensure(terminal.trace.entries === 0, "Terminal inspector retained requests");
  inspector.dispose();
  return {
    id: "audit-log-request",
    elapsedMs: performance.now() - started,
    resolved: true,
    publicReads: 4,
    diagnosis: "backend-http-503-action-was-registered",
    before: initial,
    fault,
    corrected,
    terminal,
    cleanup: { failed: disposal.failed.length, remaining: disposal.remaining.length },
  };
}
