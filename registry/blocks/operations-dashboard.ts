import $ from "jquery";
import "jquery-star";
import type { StarContext, StateRecord } from "jquery-star";

interface OperationsDashboardState extends StateRecord {
  operationsDashboardLoading: boolean;
  operationsDashboardMessage: string;
  operationsDashboardStreaming: boolean;
}

interface RuntimeLog {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source: string;
  timestamp: string;
}

interface RuntimeSnapshot {
  capacity: number;
  components: number;
  connection: "connected" | "connecting" | "disconnected";
  environment: string;
  logs: RuntimeLog[];
  nextCheck: string;
  region: string;
  revision: number;
  runtime: {
    process: string;
    registry: string;
    transport: string;
  };
  service: string;
  timestamp: string;
}

const blockSelector = '[data-block="operations-dashboard"]';

function dashboardRoot(context: StarContext<OperationsDashboardState>): HTMLElement {
  const root = context.element?.closest(blockSelector) ?? context.root.closest(blockSelector);
  if (!(root instanceof HTMLElement)) {
    throw new Error("Operations Dashboard action must run inside its block root.");
  }
  return root;
}

function part(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Operations Dashboard is missing ${selector}.`);
  }
  return element;
}

function endpoint(root: HTMLElement, name: "snapshotUrl" | "streamUrl"): string {
  const value = root.dataset[name];
  if (!value)
    throw new Error(
      `Operations Dashboard needs data-${name.replace(/[A-Z]/g, "-$&").toLowerCase()}.`,
    );
  return value;
}

function applySnapshot(root: HTMLElement, snapshot: RuntimeSnapshot): void {
  const connection = part(root, '[data-dashboard-part="connection"]');
  connection.dataset.state = snapshot.connection;
  $(connection)
    .find('[data-part="indicator"]')
    .attr(
      "data-variant",
      snapshot.connection === "connected"
        ? "success"
        : snapshot.connection === "connecting"
          ? "warning"
          : "danger",
    );
  $(connection)
    .find('[data-part="title"]')
    .text(snapshot.connection === "connected" ? "Connected" : snapshot.connection);
  $(connection)
    .find('[data-part="description"]')
    .text(`${snapshot.runtime.transport} · ${snapshot.environment} environment`);
  $(connection)
    .find('[data-part="updated"]')
    .attr("datetime", snapshot.timestamp)
    .text(`Revision ${snapshot.revision}`);

  $(root).find('[data-dashboard-value="components"]').text(snapshot.components);
  $(root).find('[data-dashboard-value="revision"]').text(snapshot.revision);
  $(root).find('[data-dashboard-value="capacity"]').text(`${snapshot.capacity}%`);
  $(root).find('[data-dashboard-value="region"]').text(snapshot.region);
  $(root).find('[data-dashboard-value="environment"]').text(snapshot.environment);
  $(root).find('[data-dashboard-value="transport"]').text(snapshot.runtime.transport);
  $(root).find('[data-dashboard-value="process"]').text(snapshot.runtime.process);

  const capacity = part(root, '[data-dashboard-part="capacity"]');
  capacity.style.setProperty("--jqs-value", String(snapshot.capacity));
  capacity.setAttribute("aria-valuenow", String(snapshot.capacity));
  $(capacity).find('[data-part="value"]').text(`${snapshot.capacity}%`);

  const countdown = part(root, '[data-dashboard-part="countdown"]');
  const payload = part(root, '[data-dashboard-part="payload"]');
  const logs = part(root, '[data-dashboard-part="logs"]');
  $.star.ui.countdown.until(countdown, snapshot.nextCheck);
  $.star.ui.jsonViewer.set(payload, snapshot);
  $.star.ui.logViewer.clear(logs);
  snapshot.logs.forEach((entry) => $.star.ui.logViewer.append(logs, entry));
}

let installed = false;

export function installOperationsDashboard(): void {
  if (installed) return;
  installed = true;

  $.star.action<OperationsDashboardState>("operationsDashboard.refresh", async (context) => {
    const root = dashboardRoot(context);
    context.state.operationsDashboardLoading = true;
    try {
      const response = await fetch(endpoint(root, "snapshotUrl"));
      const snapshot = (await response.json()) as RuntimeSnapshot;
      if (!response.ok) throw new Error(`Runtime snapshot failed with ${response.status}.`);
      applySnapshot(root, snapshot);
      context.state.operationsDashboardMessage = `Runtime snapshot revision ${snapshot.revision} applied.`;
    } catch (error) {
      context.state.operationsDashboardMessage =
        error instanceof Error ? error.message : String(error);
    } finally {
      context.state.operationsDashboardLoading = false;
    }
  });

  $.star.action<OperationsDashboardState>("operationsDashboard.stream", async (context) => {
    const root = dashboardRoot(context);
    context.state.operationsDashboardMessage = "Opening the Datastar log stream…";
    try {
      await $.star.get<OperationsDashboardState>(endpoint(root, "streamUrl"), {
        pending: "operationsDashboardStreaming",
        retry: "never",
      })(context);
      context.state.operationsDashboardMessage = "Datastar log stream completed.";
    } catch (error) {
      context.state.operationsDashboardMessage =
        error instanceof Error ? error.message : String(error);
    }
  });
}

installOperationsDashboard();
