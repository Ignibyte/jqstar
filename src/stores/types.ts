export type StarStorePrimitive = string | number | boolean | null | undefined;

export type StarStoreMethod = (this: StarStoreObject, ...args: readonly unknown[]) => unknown;

export type StarStoreData =
  StarStorePrimitive | StarStoreMethod | StarStoreObject | readonly StarStoreData[];

export interface StarStoreObject {
  [key: string]: StarStoreData;
}

export type StarStoreCleanup = () => void;
export type StarStoreTask = (signal: AbortSignal) => PromiseLike<unknown>;
export type StarStoreSelector<Store extends object, Selected> = (store: Store) => Selected;

export interface StarStoreChange<Store extends object, Selected> {
  readonly current: Selected;
  readonly name: string;
  readonly previous: Selected;
  readonly signal: AbortSignal;
  readonly store: Store;
}

export type StarStoreListener<Store extends object, Selected> = (
  change: StarStoreChange<Store, Selected>,
) => void;

export interface StarStoreSubscriptionOptions<Selected> {
  readonly equality?: (previous: Selected, current: Selected) => boolean;
  readonly immediate?: boolean;
}

export interface StarStoreSetupContext<Store extends object> {
  readonly name: string;
  readonly signal: AbortSignal;
  readonly store: Store;
  cleanup(cleanup: StarStoreCleanup): StarStoreCleanup;
  effect(run: () => void): StarStoreCleanup;
  subscribe<Selected>(
    selector: StarStoreSelector<Store, Selected>,
    listener: StarStoreListener<Store, Selected>,
    options?: StarStoreSubscriptionOptions<Selected>,
  ): StarStoreCleanup;
  task(task: StarStoreTask): StarStoreCleanup;
}

export interface StarStoreDefinition<Store extends object = StarStoreObject> {
  readonly initial: Store | (() => Store);
  readonly setup?: (context: StarStoreSetupContext<Store>) => void | StarStoreCleanup;
}

export type StarStoresScope = Readonly<Record<string, StarStoreObject | undefined>>;

export interface StarStoresFacade {
  readonly stores: StarStoresScope;
  define<Store extends object>(name: string, definition: StarStoreDefinition<Store>): Store;
  get<Store extends object = StarStoreObject>(name: string): Store | undefined;
  has(name: string): boolean;
  names(): readonly string[];
  subscribe<Store extends object, Selected>(
    name: string,
    selector: StarStoreSelector<Store, Selected>,
    listener: StarStoreListener<Store, Selected>,
    options?: StarStoreSubscriptionOptions<Selected>,
  ): StarStoreCleanup;
  transaction<Store extends object>(name: string, update: (draft: Store) => void): Store;
}
