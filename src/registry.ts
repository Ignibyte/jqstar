import type { StarAction } from "./types";

const actions = new Map<string, StarAction>();

export function registerAction(name: string, action: StarAction): void {
  if (!name.trim()) throw new Error("A global action needs a name.");
  actions.set(name, action);
}

export function resolveAction(name: string): StarAction | undefined {
  return actions.get(name);
}
