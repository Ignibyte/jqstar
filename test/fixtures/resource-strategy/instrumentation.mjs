export function instrumentInspectorTimers() {
  const owner = globalThis;
  const originalSet = owner.setTimeout.bind(owner);
  const originalClear = owner.clearTimeout.bind(owner);
  const originalInterval = owner.setInterval.bind(owner);
  const originalClearInterval = owner.clearInterval.bind(owner);
  const active = new Set();
  owner.inspectorTimers = active;
  owner.setTimeout = (handler, delay, ...args) => {
    const id = originalSet(() => {
      active.delete(id);
      if (typeof handler !== "function") throw new Error("Research timers require callbacks.");
      handler(...args);
    }, delay);
    active.add(id);
    return id;
  };
  owner.clearTimeout = (id) => {
    active.delete(id);
    originalClear(id);
  };
  owner.setInterval = (handler, delay, ...args) => {
    const id = originalInterval(handler, delay, ...args);
    active.add(id);
    return id;
  };
  owner.clearInterval = (id) => {
    active.delete(id);
    originalClearInterval(id);
  };
}
