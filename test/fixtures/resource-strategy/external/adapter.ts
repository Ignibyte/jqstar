import { QueryClient, QueryObserver } from "@tanstack/query-core";
import { freshnessMs, gcMs } from "../types";
import type { Project, ProjectId, StrategyFactory } from "../types";

export const createExternalStrategy: StrategyFactory = (context) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: freshnessMs,
        gcTime: gcMs,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
  const key = (id: ProjectId) => ["project-inspector/1", id] as const;
  const observers = new Set<QueryObserver<Project>>();
  let disposed = false;
  client.setQueryData(key(context.initial.id), context.initial);
  return {
    acquire(id, publish) {
      if (disposed) throw new Error("Research client is disposed.");
      const observer = new QueryObserver<Project>(client, {
        queryKey: key(id),
        queryFn: ({ signal }) => {
          const reload = client.getQueryState(key(id))?.isInvalidated ?? false;
          return context.load(id, signal, reload);
        },
      });
      observers.add(observer);
      const update = () => {
        const result = observer.getCurrentResult();
        if (result.fetchStatus === "fetching") publish({ status: "loading", id });
        else if (result.status === "error") publish({ status: "error", id });
        else if (result.data)
          publish({ status: "ready", id, version: result.data.version, project: result.data });
      };
      const unsubscribe = observer.subscribe(update);
      update();
      return () => {
        unsubscribe();
        observer.destroy();
        observers.delete(observer);
      };
    },
    invalidate(id) {
      if (disposed) return;
      void client.invalidateQueries({ queryKey: key(id), exact: true });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const observer of observers) observer.destroy();
      observers.clear();
      client.clear();
    },
    inspect: () => ({
      records: client.getQueryCache().getAll().length,
      observers: observers.size,
      tasks: client.isFetching(),
      // Public Query Core APIs do not enumerate timers; the browser driver measures them.
      timers: null,
    }),
  };
};
