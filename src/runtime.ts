import { effect, nextUpdate, reactive, stop, type ReactiveEffect } from "./reactivity";
import { DeclarativeApplication } from "./declarative";
import { clearExpressionCache } from "./expression";
import {
  cancelElementRequests,
  cancelRequests,
  createBackendAction,
  dynamicBackendAction,
} from "./fetch";
import { registerAction, resolveAction } from "./registry";
import { createUI } from "./ui";
import type {
  ComputedRecord,
  EventBinding,
  EventOptions,
  StarAction,
  StarContext,
  StarDefinition,
  StarInstance,
  StarStatic,
  StateRecord,
  UIRule,
  Value,
} from "./types";

const INSTANCE_KEY = "jqueryStar.instance";
let instanceId = 0;

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T;

  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, cloneValue(child)]),
      ) as T;
    }
  }

  return value;
}

function resolveValue<Result, State extends StateRecord, Computed extends ComputedRecord>(
  value: Value<Result, State, Computed>,
  context: StarContext<State, Computed>,
): Result {
  return typeof value === "function"
    ? (value as (context: StarContext<State, Computed>) => Result)(context)
    : value;
}

function readPath(target: object, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, target);
}

function writePath(target: object, path: string, value: unknown): void {
  const keys = path.split(".");
  const finalKey = keys.pop();
  if (!finalKey) throw new Error("A model path cannot be empty.");

  let parent = target as Record<string, unknown>;
  for (const key of keys) {
    const child = parent[key];
    if (!child || typeof child !== "object") parent[key] = {};
    parent = parent[key] as Record<string, unknown>;
  }
  parent[finalKey] = value;
}

function eventOptions<State extends StateRecord, Computed extends ComputedRecord>(
  binding: EventBinding<State, Computed>,
): EventOptions<State, Computed> {
  return typeof binding === "string" || typeof binding === "function"
    ? { action: binding }
    : binding;
}

class Application<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
> implements StarInstance<State, Computed> {
  readonly mode = "behavior" as const;
  readonly root: Element;
  readonly $root: JQuery<Element>;
  readonly state: State;
  readonly computed: Readonly<Computed>;

  private readonly $: JQueryStatic;
  private readonly definition: StarDefinition<State, Computed>;
  private readonly namespace: string;
  private readonly effects = new Set<ReactiveEffect>();
  private readonly mounted = new Map<
    Element,
    Map<UIRule<State, Computed>, (() => void) | undefined>
  >();
  private readonly onceElements = new WeakMap<object, WeakSet<Element>>();
  private readonly debounceTimers = new WeakMap<
    object,
    WeakMap<Element, ReturnType<typeof setTimeout>>
  >();
  private readonly throttleTimes = new WeakMap<object, WeakMap<Element, number>>();
  private readonly observer: MutationObserver;
  private isDestroyed = false;

  constructor($: JQueryStatic, root: Element, definition: StarDefinition<State, Computed>) {
    this.$ = $;
    this.root = root;
    this.$root = $(root);
    this.definition = definition;
    this.namespace = `.jqueryStar${++instanceId}`;
    this.state = reactive(cloneValue((definition.state ?? {}) as State));
    this.computed = this.createComputed();

    this.installRules();
    this.mountTree(root);

    this.observer = new MutationObserver((mutations) => {
      let refresh = false;

      for (const mutation of mutations) {
        for (const node of Array.from(mutation.removedNodes)) {
          if (node instanceof Element) this.unmountTree(node);
        }

        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof Element) {
            this.mountTree(node);
            refresh = true;
          }
        }
      }

      if (refresh) this.refresh();
    });

    this.observer.observe(root, { childList: true, subtree: true });
  }

  get destroyed(): boolean {
    return this.isDestroyed;
  }

  async run(
    action: string | StarAction<State, Computed>,
    overrides: Partial<StarContext<State, Computed>> = {},
  ): Promise<unknown> {
    if (this.isDestroyed) throw new Error("This jQuery Star application has been destroyed.");

    const resolved =
      typeof action === "string"
        ? (this.definition.actions?.[action] ?? resolveAction(action))
        : action;

    if (!resolved) throw new Error(`Unknown jQuery Star action: ${String(action)}`);
    return resolved({ ...this.context(), ...overrides });
  }

  refresh(): void {
    if (this.isDestroyed) return;
    for (const runner of this.effects) runner();
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    cancelRequests(this.root);
    this.observer.disconnect();
    this.$root.off(this.namespace);

    for (const runner of this.effects) stop(runner);
    this.effects.clear();
    this.unmountTree(this.root);
    this.$.removeData(this.root, INSTANCE_KEY);
  }

  private createComputed(): Readonly<Computed> {
    const getters = (this.definition.computed ?? {}) as Partial<
      Record<keyof Computed, (context: StarContext<State, Computed>) => Computed[keyof Computed]>
    >;
    const computed = new Proxy({} as Computed, {
      get: (_target, key) => {
        const getter = getters[key as keyof Computed];
        if (!getter) return undefined;
        return getter(this.context(computed));
      },
      has: (_target, key) => key in getters,
      ownKeys: () => Reflect.ownKeys(getters),
      getOwnPropertyDescriptor: (_target, key) =>
        key in getters ? { enumerable: true, configurable: true } : undefined,
      set: () => {
        throw new TypeError("Computed values are read-only.");
      },
    });
    return computed;
  }

  private context(computed = this.computed): StarContext<State, Computed> {
    return {
      $: this.$,
      state: this.state,
      computed,
      root: this.root,
      $root: this.$root,
      instance: this,
    };
  }

  private elementContext(element: Element, event?: JQuery.Event): StarContext<State, Computed> {
    return {
      ...this.context(),
      element,
      $element: this.$(element),
      ...(event ? { event } : {}),
    };
  }

  private elements(selector: string): Element[] {
    if (selector === "&") return [this.root];
    return Array.from(this.root.querySelectorAll(selector));
  }

  private elementsWithin(tree: Element, selector: string): Element[] {
    if (selector === "&") return tree === this.root ? [this.root] : [];

    const elements = tree.matches(selector) ? [tree] : [];
    elements.push(...Array.from(tree.querySelectorAll(selector)));
    return elements;
  }

  private installRules(): void {
    for (const [selector, rule] of Object.entries(this.definition.ui ?? {})) {
      this.installBindings(selector, rule);
      this.installModel(selector, rule);
      this.installEvents(selector, rule);
    }
  }

  private installBindings(selector: string, rule: UIRule<State, Computed>): void {
    const hasBindings =
      rule.text !== undefined ||
      rule.html !== undefined ||
      rule.show !== undefined ||
      rule.disabled !== undefined ||
      rule.class !== undefined ||
      rule.attr !== undefined ||
      rule.prop !== undefined ||
      rule.style !== undefined ||
      rule.model !== undefined;

    if (!hasBindings) return;

    const runner = effect(() => {
      for (const element of this.elements(selector)) {
        this.applyBindings(element, rule);
      }
    });
    this.effects.add(runner);
  }

  private applyBindings(element: Element, rule: UIRule<State, Computed>): void {
    const context = this.elementContext(element);
    const $element = this.$(element);

    if (rule.text !== undefined) {
      $element.text(String(resolveValue(rule.text, context) ?? ""));
    }
    if (rule.html !== undefined) {
      $element.html(String(resolveValue(rule.html, context) ?? ""));
    }
    if (rule.show !== undefined) {
      $element.toggle(Boolean(resolveValue(rule.show, context)));
    }
    if (rule.disabled !== undefined) {
      $element.prop("disabled", Boolean(resolveValue(rule.disabled, context)));
    }

    for (const [name, value] of Object.entries(rule.class ?? {})) {
      $element.toggleClass(name, Boolean(resolveValue(value, context)));
    }

    for (const [name, value] of Object.entries(rule.attr ?? {})) {
      const resolved = resolveValue(value, context);
      if (resolved === null || resolved === undefined || resolved === false) {
        $element.removeAttr(name);
      } else {
        $element.attr(name, resolved === true ? name : String(resolved));
      }
    }

    for (const [name, value] of Object.entries(rule.prop ?? {})) {
      $element.prop(name, resolveValue(value, context));
    }

    for (const [name, value] of Object.entries(rule.style ?? {})) {
      const resolved = resolveValue(value, context);
      $element.css(name, resolved === null ? "" : resolved);
    }

    if (rule.model !== undefined) {
      const path = typeof rule.model === "string" ? rule.model : rule.model.path;
      this.writeModel(element, readPath(this.state, path));
    }
  }

  private installModel(selector: string, rule: UIRule<State, Computed>): void {
    if (rule.model === undefined) return;

    const path = typeof rule.model === "string" ? rule.model : rule.model.path;
    const events =
      typeof rule.model === "string" ? "input change" : (rule.model.event ?? "input change");
    const namespacedEvents = events
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => `${name}${this.namespace}`)
      .join(" ");

    const application = this;
    const handler = function (this: Element, _event: JQuery.Event): void {
      const result = application.readModel(this, readPath(application.state, path));
      if (result !== SKIP_MODEL_WRITE) writePath(application.state, path, result);
    };

    if (selector === "&") {
      this.$root.on(namespacedEvents, handler);
    } else {
      this.$root.on(namespacedEvents, selector, handler);
    }
  }

  private writeModel(element: Element, value: unknown): void {
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") {
        element.checked = Array.isArray(value)
          ? value.map(String).includes(element.value)
          : Boolean(value);
        return;
      }
      if (element.type === "radio") {
        element.checked = String(value ?? "") === element.value;
        return;
      }
    }

    if (element instanceof HTMLSelectElement && element.multiple) {
      const selected = new Set(Array.isArray(value) ? value.map(String) : []);
      for (const option of Array.from(element.options)) {
        option.selected = selected.has(option.value);
      }
      return;
    }

    const next = String(value ?? "");
    if (this.$(element).val() !== next) this.$(element).val(next);
  }

  private readModel(element: Element, current: unknown): unknown {
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") {
        if (Array.isArray(current)) {
          const values = current.map(String);
          return element.checked
            ? Array.from(new Set([...values, element.value]))
            : values.filter((value) => value !== element.value);
        }
        return element.checked;
      }
      if (element.type === "radio") {
        return element.checked ? element.value : SKIP_MODEL_WRITE;
      }
    }

    if (element instanceof HTMLSelectElement && element.multiple) {
      return Array.from(element.selectedOptions, (option) => option.value);
    }

    return this.$(element).val();
  }

  private installEvents(selector: string, rule: UIRule<State, Computed>): void {
    for (const [eventName, binding] of Object.entries(rule.on ?? {})) {
      const options = eventOptions(binding);
      const namespacedEvent = `${eventName}${this.namespace}`;
      const application = this;
      const handler = function (this: Element, event: JQuery.Event): void {
        application.handleEvent(options, this, event);
      };

      if (selector === "&") {
        this.$root.on(namespacedEvent, handler);
      } else {
        this.$root.on(namespacedEvent, selector, handler);
      }
    }
  }

  private handleEvent(
    options: EventOptions<State, Computed>,
    element: Element,
    event: JQuery.Event,
  ): void {
    if (options.prevent) event.preventDefault();
    if (options.stop) event.stopPropagation();

    const identity = options as object;
    if (options.once) {
      let seen = this.onceElements.get(identity);
      if (!seen) {
        seen = new WeakSet();
        this.onceElements.set(identity, seen);
      }
      if (seen.has(element)) return;
      seen.add(element);
    }

    const invoke = (): void => {
      void this.run(options.action, this.elementContext(element, event)).catch((error: unknown) => {
        this.$root.trigger("jquery-star:error", [error]);
      });
    };

    if (options.debounce !== undefined) {
      let timers = this.debounceTimers.get(identity);
      if (!timers) {
        timers = new WeakMap();
        this.debounceTimers.set(identity, timers);
      }
      const previous = timers.get(element);
      if (previous) clearTimeout(previous);
      timers.set(element, setTimeout(invoke, options.debounce));
      return;
    }

    if (options.throttle !== undefined) {
      let times = this.throttleTimes.get(identity);
      if (!times) {
        times = new WeakMap();
        this.throttleTimes.set(identity, times);
      }
      const now = Date.now();
      const previous = times.get(element) ?? -Infinity;
      if (now - previous < options.throttle) return;
      times.set(element, now);
    }

    invoke();
  }

  private mountTree(tree: Element): void {
    for (const [selector, rule] of Object.entries(this.definition.ui ?? {})) {
      if (!rule.mount && !rule.unmount) continue;
      for (const element of this.elementsWithin(tree, selector)) {
        this.mountElement(element, rule);
      }
    }
  }

  private mountElement(element: Element, rule: UIRule<State, Computed>): void {
    let rules = this.mounted.get(element);
    if (!rules) {
      rules = new Map();
      this.mounted.set(element, rules);
    }
    if (rules.has(rule)) return;

    const cleanup = rule.mount?.(this.elementContext(element));
    rules.set(rule, cleanup || undefined);
  }

  private unmountTree(tree: Element): void {
    for (const element of [tree, ...Array.from(tree.querySelectorAll("*"))]) {
      cancelElementRequests(element);
    }
    for (const [element, rules] of Array.from(this.mounted)) {
      if (element !== tree && !tree.contains(element)) continue;

      for (const [rule, cleanup] of rules) {
        cleanup?.();
        rule.unmount?.(this.elementContext(element));
      }
      this.mounted.delete(element);
    }
  }
}

const SKIP_MODEL_WRITE = Symbol("skip-model-write");

export function installStar($: JQueryStatic): StarStatic {
  if ($.star) return $.star;

  const star: StarStatic = {
    version: "0.1.0",
    ui: createUI(),
    action(name, action) {
      registerAction(name, action as unknown as StarAction);
      return star;
    },
    boot(root = document.documentElement) {
      if (typeof root === "string") return $(root).star();
      return $(root).star();
    },
    clearExpressionCache,
    get(url, options) {
      return createBackendAction("GET", url, options);
    },
    post(url, options) {
      return createBackendAction("POST", url, options);
    },
    put(url, options) {
      return createBackendAction("PUT", url, options);
    },
    patch(url, options) {
      return createBackendAction("PATCH", url, options);
    },
    delete(url, options) {
      return createBackendAction("DELETE", url, options);
    },
    nextUpdate,
  };

  $.star = star;
  registerAction("get", dynamicBackendAction("GET"));
  registerAction("post", dynamicBackendAction("POST"));
  registerAction("put", dynamicBackendAction("PUT"));
  registerAction("patch", dynamicBackendAction("PATCH"));
  registerAction("delete", dynamicBackendAction("DELETE"));

  $.fn.star = function <State extends StateRecord, Computed extends ComputedRecord>(
    this: JQuery,
    input?: StarDefinition<State, Computed> | "destroy" | "refresh" | "instance" | "state",
  ): JQuery | StarInstance<State, Computed> | State | undefined {
    if (input === "instance" || input === "state") {
      const element = this.get(0);
      const instance = element
        ? ($.data(element, INSTANCE_KEY) as StarInstance<State, Computed> | undefined)
        : undefined;
      return input === "state" ? instance?.state : instance;
    }

    if (input === "destroy" || input === "refresh") {
      this.each((_index: number, element: HTMLElement) => {
        const instance = $.data(element, INSTANCE_KEY) as StarInstance | undefined;
        if (input === "destroy") {
          instance?.destroy();
          $.removeData(element, INSTANCE_KEY);
        } else instance?.refresh();
      });
      return this;
    }

    this.each((_index: number, element: HTMLElement) => {
      const existing = $.data(element, INSTANCE_KEY) as StarInstance | undefined;
      if (existing && !existing.destroyed) {
        throw new Error(
          "This element already has a jQuery Star application. Destroy it before reinitializing.",
        );
      }

      const instance =
        input === undefined
          ? new DeclarativeApplication($, element)
          : new Application($, element, input);
      $.data(element, INSTANCE_KEY, instance);
    });
    return this;
  } as JQuery["star"];

  return star;
}
