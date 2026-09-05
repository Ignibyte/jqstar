import type { ProjectId, StrategyFactory, ViewState } from "./types";

export const createServerStrategy: StrategyFactory = (context) => {
  const listeners = new Set<(state: ViewState) => void>();
  let selected: ProjectId = context.initial.id;
  let state: ViewState = { status: "ready", id: selected, version: context.initial.version };
  let controller: AbortController | undefined;
  let pending = 0;
  let disposed = false;
  let initial = true;
  const notify = () => {
    for (const listener of listeners) listener(state);
  };
  const load = (id: ProjectId, fresh = false) => {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    const application = context.coordinator();
    state = { status: "loading", id };
    notify();
    context.trace("fetch");
    pending += 1;
    void application
      .run(
        context.$.star.get(context.endpoint(id), {
          payload: {},
          profile: "core.datastar",
          retry: "never",
          openWhenHidden: true,
          requestCancellation: current,
          headers: fresh ? { "Cache-Control": "no-cache" } : {},
        }),
      )
      .then(
        () => {
          if (current.signal.aborted || disposed) return;
          state = { status: "ready", id, version: Number(application.state.resolvedVersion) };
          notify();
        },
        () => {
          if (current.signal.aborted || disposed) return;
          state = { status: "error", id };
          notify();
        },
      )
      .finally(() => {
        pending -= 1;
      });
  };
  return {
    acquire(id, publish) {
      if (disposed) throw new Error("Research coordinator is disposed.");
      const existing = listeners.size > 0;
      listeners.add(publish);
      if (id !== selected || (!existing && !initial)) {
        selected = id;
        load(id);
      }
      initial = false;
      publish(state);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(publish);
        if (!listeners.size) controller?.abort();
      };
    },
    invalidate(id) {
      if (!disposed && listeners.size && id === selected) load(id, true);
    },
    dispose() {
      disposed = true;
      controller?.abort();
      listeners.clear();
    },
    inspect: () => ({ records: 0, observers: listeners.size, tasks: pending, timers: 0 }),
  };
};
