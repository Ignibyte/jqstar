# Shared stores

`jquery-star/stores` is the optional shared-state entry introduced in jQStar 1.1. It creates one
store namespace per installed document kernel. Applications in that document can coordinate through
a store without merging their local signals or creating a process global.

Use a local signal when one application owns a value. Use a shared store for client-side state that
several roots must read or change, such as an open workspace, a temporary selection, or a page-wide
preference. Persist durable preferences through an explicit storage adapter. Keep authoritative
records, permissions, validation, and server-state caches on the server or behind a purpose-built
resource API.

Shared stores are visible to page scripts and browser tools. Never put credentials or other secrets
in them, and never use a store value as proof of authentication, authorization, tenancy, or record
ownership. A store is also not a normalized entity cache or a replacement for server validation.

## Install and define

The entry has no import-time side effects. Install core, install the plugin before the first
application starts, and define each store from a definition created by `defineStore()`:

```ts
import $ from "jquery";
import { installStarCore } from "jquery-star/core";
import { defineStore, storesPlugin } from "jquery-star/stores";

const installed = installStarCore($);
const shared = installed.star.use(storesPlugin);

const sessionDefinition = defineStore({
  initial: {
    count: 0,
    status: "idle",
    increment() {
      this.count += 1;
    },
  },
});

const session = shared.define("session", sessionDefinition);
```

Installation returns one frozen facade for the kernel. Repeating `use(storesPlugin)` returns that
same facade. Each definition object can own one name. Repeating
`define("session", sessionDefinition)` returns the existing store, while another definition object
or a second name for the same definition fails. Stores cannot be removed or redefined during the
kernel lifetime.

Names use lower-camel ASCII keys: they start with `a` through `z`, continue with ASCII letters or
digits, and are at most 64 characters. Framework roots and magic keys, including `stores`, `state`,
`constructor`, `prototype`, and `__proto__`, are reserved.

## Accepted data and methods

Initial state can contain `null`, `undefined`, strings, booleans, finite numbers, arrays, plain
objects, null-prototype objects, and function-valued leaves. jQStar clones the graph without
changing or freezing caller input. Shared acyclic references remain shared inside the clone.

Cycles, accessors, symbol keys, promises, non-finite numbers, DOM and jQuery objects, class
instances, `Date`, `Map`, `Set`, and other collection or live objects are rejected before the name
is published. The clone is bounded to 64 levels and 10,000 containers.

Function leaves are ordinary methods. They retain their identity and receive the reactive store as
normal JavaScript `this` when called as a member:

```ts
session.increment();
```

Destructuring a method does not retain its receiver. jQStar does not bind methods, register them as
actions, serialize them, await work they start, or invoke them during inspection. Direct writes and
transactions cannot add, remove, or replace methods.

## Read, write, and transact

The facade exposes:

```ts
shared.stores; // read-only reactive namespace
shared.get("session");
shared.has("session");
shared.names(); // frozen, sorted snapshot
shared.subscribe("session", selector, listener, options);
shared.transaction("session", update);
```

Store values are mutable reactive proxies. The `stores` namespace itself is read-only: assignment,
deletion, property definition, and prototype changes fail. A missing name reads as `undefined`.
Defining it later wakes effects that previously read that missing property.

Use `transaction()` when several fields must become visible in one reactive flush. It clones the
accepted graph, calls one synchronous updater with a detached draft, validates the result, and
commits all data changes before effects run. A throw, returned thenable, invalid value, or method
change leaves the live store unchanged. External side effects performed by the updater cannot be
rolled back.

```ts
shared.transaction<typeof session>("session", (draft) => {
  draft.count = 10;
  draft.status = "ready";
});
```

## Expressions and local signals

After the plugin is installed, behavior contexts receive `context.stores` and trusted or CSP
expressions receive the same fixed `stores` namespace:

```html
<section data-signals="{ store: 'local', count: 1 }">
  <button data-on:click="stores.session.count++">Increment shared count</button>
  <output data-text="stores.session && stores.session.count"></output>
  <output data-text="$store"></output>
</section>
```

`$store` still means the current application's local signal named `store`. It never aliases the
shared namespace or a shared store. Without the plugin, `stores` resolves to `undefined`; it does
not fall through to an ambient global. Plugin helpers cannot shadow the fixed name.

The CSP engine permits safe reads and writes below a store name, but the namespace remains
read-only. Store methods are not CSP call capabilities. Put CSP-invoked behavior in a named action,
or mutate accepted store data directly in the finite expression grammar.

## Subscriptions

`subscribe()` evaluates a selector in an owned reactive effect. The default equality function is
`Object.is`. Set `{ immediate: true }` to receive the initial selection; otherwise the listener runs
only after a later unequal selection. Each change contains the exact `current`, `previous`, `store`,
`name`, and store-lifetime `signal` references.

```ts
const release = shared.subscribe(
  "session",
  (store: typeof session) => store.count,
  ({ current, previous }) => console.log(previous, current),
  { immediate: true },
);

release(); // idempotent
```

Writes use the normal jQStar microtask scheduler, so repeated synchronous writes deliver one
selected result after the batch. A listener or equality failure is observed and contained; it does
not stop sibling subscriptions. Async listeners are unsupported. Register finite asynchronous work
through store setup instead.

## Setup and disposal

A definition can provide one synchronous `setup` callback. It runs once with a frozen context that
contains the store, name, lifetime `AbortSignal`, and owned `cleanup`, `effect`, `subscribe`, and
`task` helpers. Register cleanup immediately after acquiring a resource. A setup failure aborts
work, releases registered resources in reverse order, and leaves the name undefined.

```ts
const onlineDefinition = defineStore({
  initial: { online: navigator.onLine },
  setup({ store, signal, cleanup }) {
    const update = () => (store.online = navigator.onLine);
    window.addEventListener("online", update, { signal });
    window.addEventListener("offline", update, { signal });
    cleanup(() => console.log("online store released"));
  },
});
```

`$.star.dispose()` first makes the facade, namespace, and stores terminal, aborts finite work, then
attempts every registered cleanup exactly once. Application destruction stops that application's
store-dependent UI effects but does not remove a kernel-owned store or affect sibling roots.

Kernel operation observers can select `kind: "store"`. Store records identify definition, setup,
change, subscription, effect, task, and cleanup outcomes with opaque owners and resource IDs. They
contain no state values, selectors, callbacks, DOM objects, or live store references. Application-
scoped observers do not receive kernel-only store records.
