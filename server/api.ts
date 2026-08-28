import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface ProofApi {
  handle(request: IncomingMessage, response: ServerResponse): Promise<boolean>;
}

export interface ProofApiOptions {
  environment?: "local" | "self-hosted" | "test";
  maxBodyBytes?: number;
}

const componentSystems = [
  ["jquery-star", "jQuery Star"],
  ["datastar", "Datastar"],
  ["daisyui", "daisyUI"],
  ["radix", "Radix Primitives"],
  ["tailwind", "Tailwind CSS"],
  ["bootstrap", "Bootstrap"],
  ["shoelace", "Shoelace"],
] as const;

const feedItems = [
  {
    value: "jquery-star",
    title: "jQuery Star",
    description: "Reactive HTML components with real jQuery expressions and native forms.",
    meta: "Runtime · Source owned",
  },
  {
    value: "datastar",
    title: "Datastar",
    description: "Server-driven signals and HTML patch events through the official SDK.",
    meta: "Server channel · SDK",
  },
  {
    value: "tailwind",
    title: "Tailwind CSS",
    description: "Build-time utility CSS used to author the compiled jQuery Star theme.",
    meta: "Styling · Build time",
  },
  {
    value: "daisyui",
    title: "daisyUI",
    description: "A Tailwind component plugin built around reusable class combinations.",
    meta: "Styling · Plugin",
  },
  {
    value: "radix",
    title: "Radix Primitives",
    description: "Unstyled React primitives focused on interaction and accessibility behavior.",
    meta: "React · Primitives",
  },
  {
    value: "shadcn",
    title: "shadcn/ui",
    description: "A source-owned component distribution model that inspired this registry.",
    meta: "Source registry · React",
  },
  {
    value: "bootstrap",
    title: "Bootstrap",
    description: "A broad CSS and JavaScript component framework with established conventions.",
    meta: "Framework · CSS and JS",
  },
  {
    value: "shoelace",
    title: "Shoelace",
    description: "Framework-agnostic components distributed as standards-based custom elements.",
    meta: "Web components · Runtime",
  },
  {
    value: "alpine",
    title: "Alpine.js",
    description: "Attribute-driven client behavior for server-rendered HTML applications.",
    meta: "HTML-first · Runtime",
  },
  {
    value: "htmx",
    title: "htmx",
    description: "HTML attributes that extend links and forms with server-driven requests.",
    meta: "HTML-first · Server driven",
  },
  {
    value: "lit",
    title: "Lit",
    description: "A small library for creating standards-based web components.",
    meta: "Web components · Authoring",
  },
  {
    value: "native-html",
    title: "Native HTML",
    description: "Platform controls, forms, dialogs, popovers, and semantic document structure.",
    meta: "Platform · No dependency",
  },
] as const;

const projectItems = [
  { id: "jqstar", name: "jqstar", owner: "Platform", status: "active", updated: "2026-08-28" },
  {
    id: "registry-cli",
    name: "Registry CLI",
    owner: "Developer Experience",
    status: "active",
    updated: "2026-08-27",
  },
  {
    id: "datastar-bridge",
    name: "Datastar Bridge",
    owner: "Runtime",
    status: "active",
    updated: "2026-08-26",
  },
  {
    id: "theme-lab",
    name: "Theme Lab",
    owner: "Design Systems",
    status: "planning",
    updated: "2026-08-25",
  },
  {
    id: "catalog-site",
    name: "Catalog Site",
    owner: "Developer Experience",
    status: "active",
    updated: "2026-08-24",
  },
  {
    id: "accessibility-lab",
    name: "Accessibility Lab",
    owner: "Quality",
    status: "active",
    updated: "2026-08-23",
  },
  {
    id: "server-runtime",
    name: "Server Runtime",
    owner: "Platform",
    status: "planning",
    updated: "2026-08-22",
  },
  {
    id: "migration-kit",
    name: "Migration Kit",
    owner: "Developer Experience",
    status: "paused",
    updated: "2026-08-21",
  },
  {
    id: "component-proof",
    name: "Component Proof",
    owner: "Quality",
    status: "active",
    updated: "2026-08-20",
  },
  {
    id: "theme-tokens",
    name: "Theme Tokens",
    owner: "Design Systems",
    status: "active",
    updated: "2026-08-19",
  },
  {
    id: "deployment-kit",
    name: "Deployment Kit",
    owner: "Platform",
    status: "planning",
    updated: "2026-08-18",
  },
  {
    id: "legacy-adapter",
    name: "Legacy Adapter",
    owner: "Runtime",
    status: "paused",
    updated: "2026-08-17",
  },
] as const;

const accessMembers = [
  { id: "maya", name: "Maya Chen" },
  { id: "luis", name: "Luis Ortiz" },
  { id: "amina", name: "Amina Yusuf" },
] as const;

const accessPermissionItems = [
  { value: "components:read", label: "Read components" },
  { value: "components:write", label: "Write components" },
  { value: "releases:deploy", label: "Deploy releases" },
  { value: "members:invite", label: "Invite members" },
  { value: "billing:manage", label: "Manage billing" },
  { value: "audit:read", label: "Read audit log" },
] as const;

interface AccessAuditEntry {
  actor: string;
  added: string[];
  id: string;
  member: string;
  permissions: string[];
  removed: string[];
  reordered: boolean;
  revision: number;
  timestamp: string;
}

const initialAccessAuditEntries: AccessAuditEntry[] = [
  {
    actor: "Nora Singh",
    added: ["billing:manage"],
    id: "access-audit-3",
    member: "amina",
    permissions: ["components:read", "components:write", "members:invite", "billing:manage"],
    removed: [],
    reordered: false,
    revision: 3,
    timestamp: "2026-08-28T15:24:00.000Z",
  },
  {
    actor: "Eli Brooks",
    added: ["audit:read"],
    id: "access-audit-2",
    member: "luis",
    permissions: ["components:read", "audit:read"],
    removed: [],
    reordered: false,
    revision: 2,
    timestamp: "2026-08-28T14:42:00.000Z",
  },
  {
    actor: "Nora Singh",
    added: ["components:write", "releases:deploy"],
    id: "access-audit-1",
    member: "maya",
    permissions: ["components:read", "components:write", "releases:deploy"],
    removed: [],
    reordered: false,
    revision: 1,
    timestamp: "2026-08-28T13:10:00.000Z",
  },
];

const runtimeLogs = [
  { level: "info", message: "HTTP listener accepted a health probe.", source: "http" },
  { level: "debug", message: "Registry manifest contains 102 components.", source: "registry" },
  {
    level: "warn",
    message: "Public deployment is waiting on its hosting target.",
    source: "deploy",
  },
] as const;

class BodyLimitError extends Error {}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

function logEntryHtml(entry: {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source: string;
  timestamp: string;
}): string {
  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
  return `<li data-part="entry" data-level="${entry.level}" data-value="${escapeHtml(entry.id)}"><time data-part="timestamp" datetime="${escapeHtml(entry.timestamp)}">${escapeHtml(time)}</time><span data-part="level">${entry.level.toLocaleUpperCase()}</span><span data-part="source">${escapeHtml(entry.source)}</span><span data-part="message">${escapeHtml(entry.message)}</span></li>`;
}

function projectRowHtml(project: (typeof projectItems)[number]): string {
  const status = project.status[0]!.toLocaleUpperCase() + project.status.slice(1);
  const variant =
    project.status === "active"
      ? "success"
      : project.status === "planning"
        ? "warning"
        : "secondary";
  const updated = new Date(`${project.updated}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
  return `<tr data-row-id="${escapeHtml(project.id)}"><td><input data-part="row-select" type="checkbox" aria-label="Select ${escapeHtml(project.name)}"></td><th scope="row" data-key="name">${escapeHtml(project.name)}</th><td data-key="owner">${escapeHtml(project.owner)}</td><td data-key="status" data-value="${escapeHtml(project.status)}"><span data-jqs="badge" data-variant="${variant}">${status}</span></td><td data-key="updated" data-value="${project.updated}">${updated}</td></tr>`;
}

function projectPaginationHtml(page: number, pageCount: number): string {
  const previous = Math.max(1, page - 1);
  const next = Math.min(pageCount, page + 1);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
    .map(
      (value) =>
        `<li><a data-part="page" data-page="${value}" href="?page=${value}"${value === page ? ' aria-current="page"' : ""}>${value}</a></li>`,
    )
    .join("");
  return `<nav id="project-browser-pagination" data-jqs="pagination" data-navigation="manual" data-page="${page}" data-page-count="${pageCount}" data-on:jquery-star:pagination:change="@projectBrowser.page" aria-label="Project results pages"><ul><li><a data-part="previous" href="?page=${previous}"${page <= 1 ? ' aria-disabled="true"' : ""}>Previous</a></li>${pages}<li><a data-part="next" href="?page=${next}"${page >= pageCount ? ' aria-disabled="true"' : ""}>Next</a></li></ul><p data-part="status" aria-live="polite">Page ${page} of ${pageCount}</p></nav>`;
}

function accessTransferHtml(permissions: readonly string[]): string {
  const assigned = new Set(permissions);
  const options = (selected: boolean): string =>
    accessPermissionItems
      .filter((permission) => assigned.has(permission.value) === selected)
      .map(
        (permission) =>
          `<option value="${escapeHtml(permission.value)}">${escapeHtml(permission.label)}</option>`,
      )
      .join("");
  return `<div id="access-manager-permissions" data-jqs="transfer-list" data-name="permissions" data-value="${escapeHtml(JSON.stringify(permissions))}" data-on:jquery-star:transfer-list:change="@accessManager.change" data-attr:aria-busy="$accessManagerLoading"><div data-part="pane"><label for="access-manager-available">Available permissions</label><select id="access-manager-available" data-part="available" multiple size="6">${options(false)}</select></div><div data-part="controls" role="group" aria-label="Assignment controls"><button data-jqs="button" data-part="add" data-variant="outline" type="button">Add →</button><button data-jqs="button" data-part="remove" data-variant="outline" type="button">← Remove</button><button data-jqs="button" data-part="add-all" data-variant="ghost" type="button">Add all</button><button data-jqs="button" data-part="remove-all" data-variant="ghost" type="button">Remove all</button></div><div data-part="pane"><label for="access-manager-selected">Assigned permissions</label><select id="access-manager-selected" data-part="selected" multiple size="6">${options(true)}</select></div><div data-part="order-controls" role="group" aria-label="Priority controls"><button data-jqs="button" data-part="move-up" data-variant="outline" type="button">Move up</button><button data-jqs="button" data-part="move-down" data-variant="outline" type="button">Move down</button></div><p data-part="status" aria-live="polite">${permissions.length} assigned</p></div>`;
}

function accessPermissionLabel(value: string): string {
  return accessPermissionItems.find((permission) => permission.value === value)?.label ?? value;
}

function accessAuditPresentation(entry: AccessAuditEntry): {
  kind: "added" | "changed" | "removed" | "reordered" | "unchanged";
  label: string;
  summary: string;
  variant: "danger" | "outline" | "secondary" | "success";
} {
  const added = entry.added.map(accessPermissionLabel);
  const removed = entry.removed.map(accessPermissionLabel);
  if (added.length && removed.length) {
    return {
      kind: "changed",
      label: "Changed",
      summary: `Added ${added.join(", ")}; removed ${removed.join(", ")}.`,
      variant: "secondary",
    };
  }
  if (added.length) {
    return {
      kind: "added",
      label: "Added",
      summary: `Added ${added.join(", ")}.`,
      variant: "success",
    };
  }
  if (removed.length) {
    return {
      kind: "removed",
      label: "Removed",
      summary: `Removed ${removed.join(", ")}.`,
      variant: "danger",
    };
  }
  if (entry.reordered) {
    return {
      kind: "reordered",
      label: "Reordered",
      summary: "Changed permission priority.",
      variant: "secondary",
    };
  }
  return {
    kind: "unchanged",
    label: "No change",
    summary: "Saved without permission changes.",
    variant: "outline",
  };
}

function accessAuditRowHtml(entry: AccessAuditEntry): string {
  const member = accessMembers.find((candidate) => candidate.id === entry.member)!;
  const presentation = accessAuditPresentation(entry);
  const timestamp = new Date(entry.timestamp).toLocaleString("en-US", {
    day: "numeric",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  const permissions = entry.permissions.map(accessPermissionLabel).join(", ");
  return `<tr data-row-id="${escapeHtml(entry.id)}"><td data-key="timestamp" data-value="${escapeHtml(entry.timestamp)}"><time datetime="${escapeHtml(entry.timestamp)}">${escapeHtml(timestamp)} UTC</time><small>${escapeHtml(entry.actor)}</small></td><th scope="row" data-key="member" data-value="${escapeHtml(entry.member)}">${escapeHtml(member.name)}</th><td data-key="change" data-value="${presentation.kind}"><span data-jqs="badge" data-variant="${presentation.variant}">${presentation.label}</span><span data-part="change-summary">${escapeHtml(presentation.summary)}</span></td><td data-key="permissions">${escapeHtml(permissions || "No assigned permissions")}</td><td data-key="revision" data-value="${entry.revision}">#${entry.revision}</td></tr>`;
}

function accessAuditPaginationHtml(page: number, pageCount: number): string {
  const previous = Math.max(1, page - 1);
  const next = Math.min(pageCount, page + 1);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
    .map(
      (value) =>
        `<li><a data-part="page" data-page="${value}" href="?audit-page=${value}"${value === page ? ' aria-current="page"' : ""}>${value}</a></li>`,
    )
    .join("");
  return `<nav id="audit-log-pagination" data-jqs="pagination" data-navigation="manual" data-page="${page}" data-page-count="${pageCount}" data-on:jquery-star:pagination:change="@auditLog.page" aria-label="Access audit pages"><ul><li><a data-part="previous" href="?audit-page=${previous}"${page <= 1 ? ' aria-disabled="true"' : ""}>Previous</a></li>${pages}<li><a data-part="next" href="?audit-page=${next}"${page >= pageCount ? ' aria-disabled="true"' : ""}>Next</a></li></ul><p data-part="status" aria-live="polite">Page ${page} of ${pageCount}</p></nav>`;
}

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function method(request: IncomingMessage, response: ServerResponse, expected: string): boolean {
  if (request.method === expected) return true;
  response.setHeader("Allow", expected);
  json(response, 405, { error: `Method must be ${expected}.` });
  return false;
}

async function requestText(request: IncomingMessage, maximum: number): Promise<string> {
  let source = "";
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.byteLength;
    if (size > maximum) throw new BodyLimitError(`Request body exceeds ${maximum} bytes.`);
    source += value.toString("utf8");
  }
  return source;
}

async function requestBody(
  request: IncomingMessage,
  maximum: number,
): Promise<Record<string, unknown>> {
  const source = await requestText(request, maximum);
  if (!source) return {};
  try {
    const value = JSON.parse(source) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function sendWebResponse(source: Response, destination: ServerResponse): Promise<void> {
  destination.writeHead(source.status, Object.fromEntries(source.headers));
  const reader = source.body?.getReader();
  if (!reader) {
    destination.end();
    return;
  }
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    destination.write(Buffer.from(value));
  }
  destination.end();
}

function webRequest(request: IncomingMessage): Request {
  return new Request(new URL(request.url ?? "/", "http://localhost"));
}

export function createProofApi(options: ProofApiOptions = {}): ProofApi {
  const environment = options.environment ?? "local";
  const maximum = options.maxBodyBytes ?? 10 * 1024 * 1024;
  let metricsRevision = 0;
  let operationsRevision = 0;
  let runtimeRevision = 0;
  let runtimeStreamRevision = 0;
  let profileRevision = 0;
  let inviteRevision = 0;
  let projectBrowserRevision = 0;
  let accessRevision = 0;
  let accessAuditRevision = 3;
  let accessAuditStreamRevision = 0;
  const accessAssignments = new Map<string, string[]>([
    ["maya", ["components:read", "components:write", "releases:deploy"]],
    ["luis", ["components:read", "audit:read"]],
    ["amina", ["components:read", "components:write", "members:invite", "billing:manage"]],
  ]);
  const accessAuditEntries = initialAccessAuditEntries.map((entry) => ({
    ...entry,
    added: [...entry.added],
    permissions: [...entry.permissions],
    removed: [...entry.removed],
  }));

  async function route(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname === "/health") {
      if (!method(request, response, "GET")) return true;
      json(response, 200, { components: 102, environment, service: "jqstar", status: "healthy" });
      return true;
    }

    if (url.pathname === "/api/demo/operations") {
      if (!method(request, response, "GET")) return true;
      operationsRevision += 1;
      json(response, 200, {
        components: 102,
        latency: Math.max(48, 82 - operationsRevision * 3),
        release: `v0.6.0-${environment}`,
        requests: 12_840 + operationsRevision * 294,
        revision: operationsRevision,
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    if (url.pathname === "/api/demo/runtime") {
      if (!method(request, response, "GET")) return true;
      runtimeRevision += 1;
      const timestamp = new Date();
      const logs = runtimeLogs.map((entry, index) => ({
        ...entry,
        id: `snapshot-${runtimeRevision}-${index + 1}`,
        timestamp: new Date(
          timestamp.valueOf() - (runtimeLogs.length - index) * 1_000,
        ).toISOString(),
      }));
      json(response, 200, {
        capacity: Math.min(88, 64 + runtimeRevision * 3),
        components: 102,
        connection: "connected",
        environment,
        logs,
        nextCheck: new Date(timestamp.valueOf() + 30_000).toISOString(),
        region: "us-central",
        revision: runtimeRevision,
        runtime: {
          process: "node-http",
          registry: "source-owned",
          transport: "datastar-sse",
        },
        service: "jqstar",
        timestamp: timestamp.toISOString(),
      });
      return true;
    }

    if (url.pathname === "/api/demo/runtime/stream") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      runtimeStreamRevision += 1;
      const revision = runtimeStreamRevision;
      const timestamp = Date.now();
      const logs = [
        {
          id: `stream-${revision}-1`,
          level: "info" as const,
          message: `Datastar stream ${revision} opened.`,
          source: "sse",
          timestamp: new Date(timestamp).toISOString(),
        },
        {
          id: `stream-${revision}-2`,
          level: "debug" as const,
          message: "jQuery Star enhanced the server-appended entry.",
          source: "ui",
          timestamp: new Date(timestamp + 1_000).toISOString(),
        },
        {
          id: `stream-${revision}-3`,
          level: "warn" as const,
          message: "Hosting remains local until a public target is available.",
          source: "deploy",
          timestamp: new Date(timestamp + 2_000).toISOString(),
        },
      ];
      const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
        for (const entry of logs) {
          await new Promise<void>((resolve) => setTimeout(resolve, 90));
          stream.patchElements(logEntryHtml(entry), {
            selector: "#runtime-log-entries",
            mode: "append",
            eventId: entry.id,
          });
        }
        stream.patchSignals(
          JSON.stringify({
            controlPlaneMessage: `Datastar stream ${revision} appended ${logs.length} log entries.`,
          }),
          { eventId: `stream-${revision}-complete` },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }

    if (url.pathname === "/api/demo/metrics") {
      if (!method(request, response, "GET")) return true;
      metricsRevision += 1;
      const offset = metricsRevision * 7;
      json(response, 200, {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        message: `The ${environment} backend patched four table rows (revision ${metricsRevision}).`,
        series: [
          [248 + offset, 326 + offset, 391 + offset, 438 + offset],
          [112 + offset, 218 + offset, 284 + offset, 347 + offset],
        ],
      });
      return true;
    }

    if (url.pathname === "/api/demo/feed") {
      if (!method(request, response, "GET")) return true;
      const query = (url.searchParams.get("query") ?? "").trim().toLocaleLowerCase();
      const requestedCursor = Number(url.searchParams.get("cursor") ?? 0);
      const cursor =
        Number.isInteger(requestedCursor) && requestedCursor >= 0 ? requestedCursor : 0;
      const matches = feedItems.filter((item) =>
        `${item.title} ${item.description} ${item.meta}`.toLocaleLowerCase().includes(query),
      );
      const items = matches.slice(cursor, cursor + 3);
      const nextCursor = cursor + items.length;
      json(response, 200, {
        cursor: String(nextCursor),
        done: nextCursor >= matches.length,
        items,
        message: `${nextCursor} of ${matches.length} matching results loaded.`,
        total: matches.length,
      });
      return true;
    }

    if (url.pathname === "/api/demo/projects") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      const query = String(read.signals.projectBrowserQuery ?? "")
        .trim()
        .toLocaleLowerCase();
      const requestedPage = Number(read.signals.projectBrowserPage ?? 1);
      const requestedSort = String(read.signals.projectBrowserSort ?? "name");
      const sort = (["name", "owner", "status", "updated"] as const).find(
        (key) => key === requestedSort,
      );
      const requestedDirection = String(read.signals.projectBrowserDirection ?? "ascending");
      const direction =
        requestedDirection === "descending" || requestedDirection === "none"
          ? requestedDirection
          : "ascending";
      const matches = projectItems.filter((project) =>
        `${project.name} ${project.owner} ${project.status}`.toLocaleLowerCase().includes(query),
      );
      const sorted = [...matches];
      if (sort && direction !== "none") {
        sorted.sort((left, right) => {
          const result = left[sort].localeCompare(right[sort], undefined, {
            numeric: true,
            sensitivity: "base",
          });
          return direction === "descending" ? -result : result;
        });
      }
      const pageSize = 4;
      const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
      const page = Math.min(
        Math.max(Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1, 1),
        pageCount,
      );
      const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);
      projectBrowserRevision += 1;
      const revision = projectBrowserRevision;
      const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
        stream.patchSignals(
          JSON.stringify({
            projectBrowserCount: matches.length,
            projectBrowserMessage: `${matches.length} matching project${matches.length === 1 ? "" : "s"}. Page ${page} of ${pageCount}.`,
            projectBrowserPage: page,
          }),
          { eventId: `project-browser-${revision}-signals` },
        );
        stream.patchElements(
          pageItems.length
            ? pageItems.map(projectRowHtml).join("")
            : '<tr><td colspan="5">No projects match this search.</td></tr>',
          {
            selector: "#project-browser-rows",
            mode: "inner",
            eventId: `project-browser-${revision}-rows`,
          },
        );
        stream.patchElements(projectPaginationHtml(page, pageCount), {
          selector: "#project-browser-pagination",
          mode: "outer",
          eventId: `project-browser-${revision}-pagination`,
        });
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }

    if (url.pathname === "/api/demo/increment") {
      if (!method(request, response, "POST")) return true;
      const signals = await requestBody(request, maximum);
      const current = typeof signals.serverCount === "number" ? signals.serverCount : 0;
      json(response, 200, {
        serverCount: current + 10,
        serverMessage: "The JSON response patched these signals.",
      });
      return true;
    }

    if (url.pathname === "/api/demo/access") {
      if (request.method !== "GET" && request.method !== "POST") {
        response.setHeader("Allow", "GET, POST");
        json(response, 405, { error: "Method must be GET or POST." });
        return true;
      }
      const read =
        request.method === "GET"
          ? await ServerSentEventGenerator.readSignals(webRequest(request))
          : { success: true as const, signals: await requestBody(request, maximum) };
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      const member = String(read.signals.accessManagerMember ?? "maya");
      const memberRecord = accessMembers.find((candidate) => candidate.id === member);
      if (!memberRecord) {
        json(response, 422, { error: "Unknown access member." });
        return true;
      }
      if (request.method === "POST") {
        const requested = read.signals.accessManagerPermissions;
        const allowed = new Set<string>(
          accessPermissionItems.map((permission) => permission.value),
        );
        if (
          !Array.isArray(requested) ||
          requested.some(
            (permission) => typeof permission !== "string" || !allowed.has(permission),
          ) ||
          new Set(requested).size !== requested.length
        ) {
          json(response, 422, { error: "Access permissions must be unique catalog values." });
          return true;
        }
        const previous = accessAssignments.get(member) ?? [];
        const permissions = [...requested];
        const previousSet = new Set(previous);
        const nextSet = new Set(permissions);
        accessAssignments.set(member, permissions);
        accessAuditRevision += 1;
        accessAuditEntries.unshift({
          actor: "Current user",
          added: permissions.filter((permission) => !previousSet.has(permission)),
          id: `access-audit-${accessAuditRevision}`,
          member,
          permissions,
          removed: previous.filter((permission) => !nextSet.has(permission)),
          reordered:
            previous.length === permissions.length &&
            previous.every((permission) => nextSet.has(permission)) &&
            previous.some((permission, index) => permissions[index] !== permission),
          revision: accessAuditRevision,
          timestamp: new Date().toISOString(),
        });
        if (accessAuditEntries.length > 100) accessAuditEntries.length = 100;
      }
      const permissions = accessAssignments.get(member) ?? [];
      accessRevision += 1;
      const revision = accessRevision;
      const saved = request.method === "POST";
      const sdkResponse = ServerSentEventGenerator.stream((stream) => {
        stream.patchElements(accessTransferHtml(permissions), {
          selector: "#access-manager-permissions",
          mode: "outer",
          eventId: `access-${revision}-permissions`,
        });
        stream.patchSignals(
          JSON.stringify({
            accessManagerCount: permissions.length,
            accessManagerMember: member,
            accessManagerMessage: saved
              ? `${memberRecord.name} access saved at revision ${revision}.`
              : `${memberRecord.name} access loaded from the backend.`,
            accessManagerPermissions: permissions,
          }),
          { eventId: `access-${revision}-signals` },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }

    if (url.pathname === "/api/demo/access/audit") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      const requestedMember = String(read.signals.auditLogMember ?? "all");
      const member =
        requestedMember === "all" ||
        accessMembers.some((candidate) => candidate.id === requestedMember)
          ? requestedMember
          : "all";
      const query = String(read.signals.auditLogQuery ?? "")
        .trim()
        .toLocaleLowerCase();
      const requestedPage = Number(read.signals.auditLogPage ?? 1);
      const matches = accessAuditEntries.filter((entry) => {
        if (member !== "all" && entry.member !== member) return false;
        if (!query) return true;
        const memberRecord = accessMembers.find((candidate) => candidate.id === entry.member)!;
        const searchable = [
          entry.actor,
          memberRecord.name,
          ...entry.permissions.map(accessPermissionLabel),
          accessAuditPresentation(entry).summary,
        ]
          .join(" ")
          .toLocaleLowerCase();
        return searchable.includes(query);
      });
      const pageSize = 3;
      const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
      const page = Math.min(
        Math.max(Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1, 1),
        pageCount,
      );
      const entries = matches.slice((page - 1) * pageSize, page * pageSize);
      accessAuditStreamRevision += 1;
      const streamRevision = accessAuditStreamRevision;
      const sdkResponse = ServerSentEventGenerator.stream((stream) => {
        stream.patchSignals(
          JSON.stringify({
            auditLogCount: matches.length,
            auditLogMember: member,
            auditLogMessage: `${matches.length} access event${matches.length === 1 ? "" : "s"}. Page ${page} of ${pageCount}.`,
            auditLogPage: page,
          }),
          { eventId: `audit-log-${streamRevision}-signals` },
        );
        stream.patchElements(
          entries.length
            ? entries.map(accessAuditRowHtml).join("")
            : '<tr><td colspan="5">No access events match these filters.</td></tr>',
          {
            selector: "#audit-log-rows",
            mode: "inner",
            eventId: `audit-log-${streamRevision}-rows`,
          },
        );
        stream.patchElements(accessAuditPaginationHtml(page, pageCount), {
          selector: "#audit-log-pagination",
          mode: "outer",
          eventId: `audit-log-${streamRevision}-pagination`,
        });
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }

    if (url.pathname === "/api/demo/profile") {
      if (!method(request, response, "POST")) return true;
      const body = await requestBody(request, maximum);
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim() : "";
      if (!displayName || !email || !email.includes("@")) {
        json(response, 422, {
          error: "Display name and a valid email address are required.",
        });
        return true;
      }
      profileRevision += 1;
      json(response, 200, {
        displayName,
        email,
        environment,
        revision: profileRevision,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }

    if (url.pathname === "/api/demo/profile/invite") {
      if (!method(request, response, "POST")) return true;
      inviteRevision += 1;
      json(response, 200, {
        inviteUrl: `https://jqstar.dev/invite/${environment}-${inviteRevision}`,
        revision: inviteRevision,
      });
      return true;
    }

    if (url.pathname === "/api/demo/stream") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      const current = typeof read.signals.serverCount === "number" ? read.signals.serverCount : 0;
      const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
        stream.patchSignals(
          JSON.stringify({
            serverCount: current + 1,
            serverMessage: "The official Datastar SDK patched this signal.",
          }),
          { eventId: "demo-signals", retryDuration: 2_000 },
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        stream.patchElements(
          `<li>SDK-streamed HTML <button data-on:click="$(el).closest('li').fadeOut()">Fade it out</button></li>`,
          { selector: "#server-feed", mode: "append", eventId: "demo-elements" },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }

    if (url.pathname === "/api/demo/account") {
      if (!method(request, response, "POST")) return true;
      const source = await requestText(request, maximum);
      const taken = source.toLocaleLowerCase().includes("taken@example.com");
      json(
        response,
        taken ? 422 : 200,
        taken
          ? {
              errors: {
                _form: "The server rejected one field. Your file selection was left intact.",
                email: "That account already exists. Try another email.",
              },
            }
          : { message: `The ${environment} backend accepted the multipart form.` },
      );
      return true;
    }

    const multipartMessages: Record<string, string> = {
      "/api/demo/project": "project submission",
      "/api/demo/preferences": "preferences submission",
      "/api/demo/feedback": "feedback submission",
      "/api/demo/questionnaire": "build brief",
    };
    const label = multipartMessages[url.pathname];
    if (label) {
      if (!method(request, response, "POST")) return true;
      const source = await requestText(request, maximum);
      json(response, 200, {
        message: `The ${environment} backend received a ${Buffer.byteLength(source).toLocaleString()} byte multipart ${label}.`,
      });
      return true;
    }

    if (url.pathname === "/api/demo/autocomplete") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      const query = String(read.signals.componentQuery ?? "")
        .trim()
        .toLocaleLowerCase();
      const matches = componentSystems.filter(([, name]) =>
        name.toLocaleLowerCase().includes(query),
      );
      const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
        await new Promise<void>((resolve) => setTimeout(resolve, 120));
        stream.patchSignals(JSON.stringify({ componentResultCount: matches.length }));
        stream.patchElements(
          matches.length
            ? matches
                .map(
                  ([value, name]) =>
                    `<div data-part="option" data-value="${escapeHtml(value)}">${escapeHtml(name)}</div>`,
                )
                .join("") +
                '<div data-part="loading" hidden>Searching the server…</div><div data-part="empty" hidden>No matching systems</div>'
            : '<div data-part="loading" hidden>Searching the server…</div><div data-part="empty">No matching systems</div>',
          { selector: "#technology-combobox-content", mode: "inner" },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }
    return false;
  }

  return {
    async handle(request, response) {
      try {
        return await route(request, response);
      } catch (error) {
        if (response.headersSent) throw error;
        if (error instanceof BodyLimitError) {
          json(response, 413, { error: error.message });
          return true;
        }
        json(response, 500, { error: "Unexpected backend error." });
        return true;
      }
    },
  };
}
