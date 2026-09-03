import type { StarAction } from "./types";

export type ActionRegistrar = (name: string, action: StarAction) => void;

export interface NamespacedActionSet {
  readonly actions: readonly (readonly [name: string, action: StarAction])[];
  readonly namespace: string;
}

export interface ActionRegistry {
  readonly register: ActionRegistrar;
  clear(): void;
  names(): readonly string[];
  namespaces(): readonly string[];
  preparePluginInstall(registrations: readonly NamespacedActionSet[]): () => void;
  resolve(name: string): StarAction | undefined;
}

function withinNamespace(name: string, namespace: string): boolean {
  return name === namespace || name.startsWith(`${namespace}.`);
}

function overlappingNamespace(left: string, right: string): boolean {
  return withinNamespace(left, right) || withinNamespace(right, left);
}

export function createActionRegistry(): ActionRegistry {
  let actions = new Map<string, StarAction>();
  let namespaces = new Set<string>();

  return {
    register(name, action) {
      if (!name.trim()) throw new Error("A global action needs a name.");
      const owner = [...namespaces].find((namespace) => withinNamespace(name, namespace));
      if (owner) {
        throw new Error(`Action ${name} belongs to the installed plugin namespace ${owner}.`);
      }
      actions.set(name, action);
    },
    resolve: (name) => actions.get(name),
    names: () => [...actions.keys()].sort(),
    namespaces: () => [...namespaces].sort(),
    preparePluginInstall(registrations) {
      const candidateActions = new Map(actions);
      const candidateNamespaces = new Set(namespaces);

      for (const registration of registrations) {
        const overlap = [...candidateNamespaces].find((namespace) =>
          overlappingNamespace(registration.namespace, namespace),
        );
        if (overlap) {
          throw new Error(
            `Plugin namespace ${registration.namespace} overlaps installed namespace ${overlap}.`,
          );
        }
        const occupied = [...candidateActions.keys()].find((name) =>
          withinNamespace(name, registration.namespace),
        );
        if (occupied) {
          throw new Error(
            `Plugin namespace ${registration.namespace} contains existing action ${occupied}.`,
          );
        }

        candidateNamespaces.add(registration.namespace);
        for (const [name, action] of registration.actions) {
          if (!name.startsWith(`${registration.namespace}.`)) {
            throw new Error(
              `Plugin ${registration.namespace} cannot register action outside its namespace: ${name}.`,
            );
          }
          if (candidateActions.has(name)) {
            throw new Error(`Action ${name} is already registered.`);
          }
          candidateActions.set(name, action);
        }
      }

      let committed = false;
      return () => {
        if (committed) return;
        committed = true;
        actions = candidateActions;
        namespaces = candidateNamespaces;
      };
    },
    clear: () => {
      actions.clear();
      namespaces.clear();
    },
  };
}
