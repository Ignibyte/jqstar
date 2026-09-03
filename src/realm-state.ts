type JQStarRealmState = readonly [WeakMap<object, unknown>, WeakSet<object>, WeakSet<object>];

const realm = globalThis as typeof globalThis & Record<PropertyKey, unknown>;

export const jqstarRealmState = (realm[Symbol.for("jqstar.x/1")] ??= Object.freeze([
  new WeakMap(),
  new WeakSet(),
  new WeakSet(),
])) as JQStarRealmState;
