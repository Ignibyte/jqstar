import { freshnessMs, gcMs } from "./types";
import type { Project, ProjectId, StrategyFactory, ViewState } from "./types";

interface RecordEntry {
  state: ViewState;
  updated: number;
  listeners: Set<(state: ViewState) => void>;
  controller?: AbortController;
  task?: Promise<void>;
  timer?: ReturnType<typeof setTimeout>;
}

export const createNativeStrategy: StrategyFactory = (context) => {
  const records = new Map<ProjectId, RecordEntry>();
  let disposed = false;
  const ready = (project: Project): ViewState => ({
    status: "ready",
    id: project.id,
    version: project.version,
    project,
  });
  records.set(context.initial.id, {
    state: ready(context.initial),
    updated: Date.now(),
    listeners: new Set(),
  });
  const notify = (record: RecordEntry) => {
    for (const listener of record.listeners) listener(record.state);
  };
  const load = (id: ProjectId, record: RecordEntry, fresh = false) => {
    if (record.task && !fresh) return;
    record.controller?.abort();
    const controller = new AbortController();
    record.controller = controller;
    record.state = { status: "loading", id };
    notify(record);
    const task = context
      .load(id, controller.signal, fresh)
      .then(
        (project) => {
          if (controller.signal.aborted || disposed) return;
          record.state = ready(project);
          record.updated = Date.now();
          notify(record);
        },
        () => {
          if (controller.signal.aborted || disposed) return;
          record.state = { status: "error", id };
          notify(record);
        },
      )
      .finally(() => {
        if (record.task === task) {
          delete record.task;
          delete record.controller;
        }
      });
    record.task = task;
  };
  return {
    acquire(id, publish) {
      if (disposed) throw new Error("Research cache is disposed.");
      let record = records.get(id);
      if (!record) {
        record = { state: { status: "loading", id }, updated: 0, listeners: new Set() };
        records.set(id, record);
      }
      if (record.timer) clearTimeout(record.timer);
      delete record.timer;
      record.listeners.add(publish);
      if (record.state.status !== "ready" || Date.now() - record.updated >= freshnessMs)
        load(id, record);
      publish(record.state);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (disposed) return;
        record.listeners.delete(publish);
        if (record.listeners.size) return;
        record.controller?.abort();
        delete record.task;
        delete record.controller;
        record.timer = setTimeout(() => {
          records.delete(id);
          delete record.timer;
        }, gcMs);
      };
    },
    invalidate(id) {
      const record = records.get(id);
      if (!record || disposed) return;
      record.updated = 0;
      if (record.listeners.size) load(id, record, true);
      else record.state = { status: "loading", id };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const record of records.values()) {
        record.controller?.abort();
        if (record.timer) clearTimeout(record.timer);
        record.listeners.clear();
      }
      records.clear();
    },
    inspect: () => ({
      records: records.size,
      observers: [...records.values()].reduce((count, entry) => count + entry.listeners.size, 0),
      tasks: [...records.values()].filter((entry) => Boolean(entry.task)).length,
      timers: [...records.values()].filter((entry) => entry.timer).length,
    }),
  };
};
