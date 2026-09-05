import jquery from "jquery";
import { createRenderAdapter, installStarCore, patchElements } from "jquery-star/core";
import type { StarDisposalReport, StarInstance, StarPlugin } from "jquery-star/core";
import { defineStore, storesPlugin } from "jquery-star/stores";
import { panelContent } from "./html.mjs";
import type { Consumer, Project, ProjectId, Strategy, StrategyFactory, ViewState } from "./types";

export interface InspectorFixture {
  dispose(): StarDisposalReport;
  inspect(): ReturnType<Strategy["inspect"]> & {
    fetches: number;
    pending: number;
    states: string[];
  };
  remove(consumer: Consumer): Promise<void>;
  preserve(): Promise<void>;
  identity(): unknown[];
  settle(): Promise<void>;
}

export function bootInspector(factory: StrategyFactory, plugins: readonly StarPlugin[] = []): void {
  const $ = installStarCore(jquery, { document });
  for (const plugin of plugins) $.star.use(plugin);
  const stores = $.star.use(storesPlugin);
  const root = document.querySelector<HTMLElement>("#inspector")!;
  const initial = JSON.parse(document.querySelector("#initial-project")!.textContent!) as Project;
  const selected = stores.define("inspector", defineStore({ initial: { id: initial.id } }));
  const base = `/resource-strategy/${root.dataset.session!}`;
  const endpoint = (id: ProjectId) => `${base}/project/${id}`;
  const applications = new Map<string, StarInstance>();
  const views = new Map<Consumer, ViewState>();
  const tasks = new Set<Promise<unknown>>();
  const states: string[] = [];
  let fetches = 0;
  let strategy: Strategy;
  let disposed = false;
  const announcement = document.querySelector<HTMLElement>("#announcement")!;
  const retry = document.querySelector<HTMLButtonElement>("#retry")!;
  const form = document.querySelector<HTMLFormElement>("#edit")!;
  const name = form.elements.namedItem("name") as HTMLInputElement;
  const version = form.elements.namedItem("version") as HTMLInputElement;

  const trace = (phase: string) => {
    if (phase === "fetch") fetches += 1;
    else states.push(phase);
  };
  const track = <T>(task: Promise<T>): Promise<T> => {
    tasks.add(task);
    void task.then(
      () => tasks.delete(task),
      () => tasks.delete(task),
    );
    return task;
  };
  const updateForm = (id: ProjectId, resolvedVersion: number) => {
    form.action = endpoint(id);
    version.value = String(resolvedVersion);
    name.value =
      root.querySelector<HTMLElement>(`[data-part=content][data-project="${id}"]`)?.dataset.name ??
      `Project ${id}`;
    document.querySelector<HTMLAnchorElement>("#native-route")!.href =
      `${base}/${root.dataset.strategy!}?selected=${id}`;
  };
  const publish = (consumer: Consumer, state: ViewState) => {
    const app = applications.get(consumer);
    if (disposed || !app || app.destroyed || state.id !== selected.id) return;
    views.set(consumer, state);
    const element = app.root;
    element.setAttribute("aria-busy", String(state.status === "loading"));
    element.setAttribute("data-state", state.status);
    Object.assign(app.state, { status: state.status, selected: state.id, version: state.version });
    trace(`${consumer}:${state.status}`);
    if (state.project) {
      patchElements(root, panelContent(consumer, state.project));
      if (consumer === "activity" && state.project.activity.length === 0)
        element.setAttribute("data-state", "empty");
    }
    retry.hidden = state.status !== "error" && document.activeElement !== retry;
    if (
      state.status === "error" &&
      announcement.textContent !== "Project could not be loaded. Retry."
    )
      announcement.textContent = "Project could not be loaded. Retry.";
    if (state.status !== "ready") return;
    if (
      consumer === "activity" &&
      element.querySelector("[data-part=content]")?.textContent === "No activity yet."
    )
      element.setAttribute("data-state", "empty");
    const active = [...views.values()];
    if (
      !active.every(
        (view) => view.status === "ready" && view.id === state.id && view.version === state.version,
      )
    )
      return;
    const message = `Project ${state.id}, version ${state.version}.`;
    if (message !== announcement.textContent) {
      announcement.textContent = message;
      trace("announced");
    }
    updateForm(state.id, state.version!);
  };
  const select = (id: ProjectId) => {
    selected.id = id;
    root.dataset.selected = id;
    for (const link of root.querySelectorAll<HTMLElement>("[data-select]")) {
      if (link.dataset.select === id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  };
  $.star.use({
    name: "research.inspector",
    version: "0.0.0",
    apiVersion: "0.1.0",
    install(registrar) {
      const host = registrar.documentHost;
      strategy = factory({
        $,
        host,
        initial,
        endpoint,
        coordinator: () => applications.get("inspector")!,
        trace,
        load(id, signal, fresh = false) {
          trace("fetch");
          return track(
            fetch(endpoint(id), {
              signal,
              credentials: "same-origin",
              headers: { Accept: "application/json" },
              cache: fresh ? "reload" : "default",
            }).then(async (response) => {
              if (!response.ok) throw new Error(`Read failed: ${response.status}`);
              return (await response.json()) as Project;
            }),
          );
        },
      });
      registrar.cleanup(() => strategy.dispose());
      host.own("service", "research.inspector.strategy", () => strategy.dispose());
      registrar.application((app) => {
        applications.set(app.root.id, app);
        const consumer = app.root.getAttribute("data-consumer") as Consumer | null;
        let release = () => {};
        const unsubscribe = consumer
          ? stores.subscribe<{ id: ProjectId }, ProjectId>(
              "inspector",
              (value) => value.id,
              ({ current }) => {
                release();
                release = strategy.acquire(current, (state) => publish(consumer, state));
              },
              { immediate: true },
            )
          : () => {};
        return () => {
          unsubscribe();
          release();
          applications.delete(app.root.id);
          if (consumer) views.delete(consumer);
        };
      });
      registrar.action("research.inspector.select", ({ event, element }) => {
        const mouse = event as MouseEvent;
        if (mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.altKey) return;
        event?.preventDefault();
        select((element as HTMLElement).dataset.select as ProjectId);
      });
      registrar.action("research.inspector.retry", () => strategy.invalidate(selected.id));
      registrar.action("research.inspector.save", ({ event }) => {
        event?.preventDefault();
        const savedId = selected.id;
        const controller = new AbortController();
        const release = host.own("task", "research.inspector.write", () => controller.abort());
        const body = new URLSearchParams();
        new FormData(form).forEach((value, key) => body.set(key, String(value)));
        return track(
          fetch(form.action, {
            method: "POST",
            body,
            signal: controller.signal,
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          })
            .then(async (response) => {
              const result = (await response.json()) as { message: string };
              if (disposed || controller.signal.aborted) return;
              if (savedId === selected.id) announcement.textContent = result.message;
              if (response.ok) strategy.invalidate(savedId);
            })
            .finally(release),
        );
      });
      return {};
    },
  });
  $(root).star({
    state: { resolvedId: initial.id, resolvedVersion: initial.version },
    ui: {
      "[data-select]": { on: { click: "research.inspector.select" } },
      "#retry": { on: { click: "research.inspector.retry" } },
      "#edit": { on: { submit: "research.inspector.save" } },
    },
  });
  for (const element of root.querySelectorAll("[data-consumer]")) $(element).star({ state: {} });
  const render = createRenderAdapter($);
  let terminal: StarDisposalReport | undefined;
  (window as typeof window & { inspectorFixture: InspectorFixture }).inspectorFixture = {
    dispose() {
      if (terminal) return terminal;
      disposed = true;
      terminal = $.star.dispose();
      return terminal;
    },
    inspect: () => ({ ...strategy.inspect(), fetches, pending: tasks.size, states: [...states] }),
    identity: () => [...applications.values()],
    async settle() {
      await $.star.whenEnhanced();
      await Promise.allSettled([...tasks]);
      await $.star.whenEnhanced();
    },
    async remove(consumer) {
      const element = document.getElementById(consumer)!;
      const transaction = render.begin(element);
      transaction.beforeRemove(element);
      element.remove();
      await transaction.commit();
    },
    async preserve() {
      const summary = document.getElementById("summary")!;
      const boundary = document.getElementById("panels")!;
      const transaction = render.begin(boundary, { preserveRoots: [summary] });
      transaction.beforeRemove(boundary);
      const next = document.createElement("div");
      next.id = "panels";
      next.append(summary);
      boundary.replaceWith(next);
      await transaction.commit();
    },
  };
}
