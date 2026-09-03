import { effect, nextUpdate, reactive, stop, type ReactiveEffect } from "./reactivity";
import { DeclarativeApplication } from "./declarative";
import { isElementNode, isInputElement, isSelectElement } from "./dom";
import { attempt, throwCollectedErrors } from "./errors";
import type { StarExpressionEngine } from "./expression-types";
import {
  cancelElementRequests,
  cancelRequests,
  createBackendAction,
  dynamicBackendAction,
} from "./fetch";
import { bindStarExpressionRuntime } from "./expression-runtime";
import { Kernel, type ApplicationCapabilities, type ApplicationLifecycle } from "./kernel";
import type { StarPlugin } from "./plugin";
import type {
  StarOperationObserver,
  StarOperationSubscriptionOptions,
  StarOperationUnsubscribe,
} from "./observation";
import type {
  ComputedRecord,
  EventBinding,
  EventOptions,
  StarAction,
  StarContext,
  StarDefinition,
  StarCoreStatic,
  StarInstalledJQuery,
  StarInstance,
  StarJQueryMethod,
  StateRecord,
  UIRule,
  Value,
} from "./types";
import { STAR_VERSION } from "./version";

const INSTANCE_KEY = "jqueryStar.instance";

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
>
  implements StarInstance<State, Computed>, ApplicationLifecycle
{
  readonly mode = "behavior" as const;
  readonly root: Element;
  readonly $root: JQuery<Element>;
  readonly state: State;
  readonly computed: Readonly<Computed>;

  private readonly $: JQueryStatic;
  private readonly capabilities: ApplicationCapabilities;
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
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private releaseExpressionRuntime: (() => void) | undefined;
  private releaseObserver: (() => void) | undefined;
  private isDestroyed = false;

  constructor(
    $: JQueryStatic,
    root: Element,
    definition: StarDefinition<State, Computed>,
    capabilities: ApplicationCapabilities,
  ) {
    this.$ = $;
    this.capabilities = capabilities;
    this.root = root;
    this.$root = $(root);
    this.definition = definition;
    this.namespace = `.jqueryStar${capabilities.nextApplicationId()}`;
    this.state = reactive(cloneValue((definition.state ?? {}) as State));
    this.computed = this.createComputed();

    try {
      capabilities.applicationCreated(this);
      this.releaseExpressionRuntime = bindStarExpressionRuntime(this, {
        resolveAction: (name) =>
          (this.definition.actions?.[name] as StarAction | undefined) ??
          this.capabilities.resolveAction(name),
        resolveHelper: (name) => this.capabilities.resolveHelper(name),
        startAction: (label, action, context) =>
          this.capabilities.startAction(this, label, action, context),
      });
      this.installRules();
      this.mountTree(root);

      const ownedObserver = capabilities.observe(
        `application:${this.namespace}:mutation`,
        root,
        (mutations) => this.handleMutations(mutations),
        { childList: true, subtree: true },
      );
      this.releaseObserver = ownedObserver.release;
    } catch (error) {
      const errors = [error];
      this.isDestroyed = true;
      this.releaseOwnedResources(errors);
      throwCollectedErrors(errors, "jQuery Star application setup rollback failed.");
    }
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
        ? (this.definition.actions?.[action] ?? this.capabilities.resolveAction(action))
        : action;

    if (!resolved) throw new Error(`Unknown jQuery Star action: ${String(action)}`);
    const context = { ...this.context(), ...overrides };
    const label = typeof action === "string" ? action : resolved.name || "anonymous";
    return this.capabilities.runAction(
      this,
      label,
      resolved as unknown as StarAction,
      context as unknown as StarContext,
    );
  }

  observeOperations(
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): StarOperationUnsubscribe {
    if (this.isDestroyed) throw new Error("This jQuery Star application has been destroyed.");
    return this.capabilities.observeOperations(this, observer, options);
  }

  refresh(): void {
    if (this.isDestroyed) return;
    const errors: unknown[] = [];
    for (const runner of this.effects) attempt(errors, runner);
    throwCollectedErrors(errors, "jQuery Star application refresh failed.");
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    const errors: unknown[] = [];
    this.releaseOwnedResources(errors);
    throwCollectedErrors(errors, "jQuery Star application destruction failed.");
  }

  releaseTree(tree: Element, preservedRoots: readonly Element[] = []): void {
    const errors: unknown[] = [];
    for (const element of [tree, ...Array.from(tree.querySelectorAll("*"))]) {
      if (
        preservedRoots.some((preserved) => preserved === element || preserved.contains(element))
      ) {
        continue;
      }
      attempt(errors, () => cancelElementRequests(element));
    }
    for (const [element, rules] of Array.from(this.mounted)) {
      if (!tree.contains(element)) continue;
      if (
        preservedRoots.some((preserved) => preserved === element || preserved.contains(element))
      ) {
        continue;
      }
      this.mounted.delete(element);

      for (const [rule, cleanup] of Array.from(rules)) {
        if (cleanup) attempt(errors, cleanup);
        if (rule.unmount) {
          attempt(errors, () => rule.unmount!(this.elementContext(element)));
        }
      }
    }
    throwCollectedErrors(errors, "jQuery Star subtree cleanup failed.");
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
      helpers: this.capabilities.helpers,
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

    const runner = effect(
      () => {
        for (const element of this.elements(selector)) {
          this.applyBindings(element, rule);
        }
      },
      {
        owner: this.namespace,
        onError: (error) => this.$root.trigger("jquery-star:error", [error]),
      },
    );
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
    if (isInputElement(element)) {
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

    if (isSelectElement(element) && element.multiple) {
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
    if (isInputElement(element)) {
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

    if (isSelectElement(element) && element.multiple) {
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
      clearTimeout(previous);
      const timer = setTimeout(invoke, options.debounce);
      timers.set(element, timer);
      this.timers.add(timer);
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

  private mountTree(tree: Element, preservedRoots: readonly Element[] = []): void {
    for (const [selector, rule] of Object.entries(this.definition.ui ?? {})) {
      if (!rule.mount && !rule.unmount) continue;
      for (const element of this.elementsWithin(tree, selector)) {
        if (
          preservedRoots.some((preserved) => preserved === element || preserved.contains(element))
        ) {
          continue;
        }
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

    rules.set(rule, undefined);
    const cleanup = rule.mount?.(this.elementContext(element));
    rules.set(rule, cleanup || undefined);
  }

  private handleMutations(mutations: MutationRecord[]): void {
    let refresh = false;
    const errors: unknown[] = [];

    for (const mutation of mutations) {
      for (const node of Array.from(mutation.removedNodes)) {
        if (isElementNode(node)) {
          attempt(errors, () =>
            this.releaseTree(node, this.capabilities.preservedRootsWithin(node)),
          );
        }
      }

      for (const node of Array.from(mutation.addedNodes)) {
        if (isElementNode(node)) {
          attempt(errors, () => this.mountTree(node, this.capabilities.preservedRootsWithin(node)));
          refresh = true;
        }
      }
    }

    if (refresh) attempt(errors, () => this.refresh());
    for (const error of errors) this.$root.trigger("jquery-star:error", [error]);
  }

  private releaseOwnedResources(errors: unknown[]): void {
    const releaseExpressionRuntime = this.releaseExpressionRuntime;
    this.releaseExpressionRuntime = undefined;
    if (releaseExpressionRuntime) attempt(errors, releaseExpressionRuntime);

    attempt(errors, () => cancelRequests(this.root));
    const releaseObserver = this.releaseObserver;
    this.releaseObserver = undefined;
    if (releaseObserver) attempt(errors, releaseObserver);

    attempt(errors, () => this.$root.off(this.namespace));
    const timers = [...this.timers];
    this.timers.clear();
    for (const timer of timers) attempt(errors, () => clearTimeout(timer));
    const effects = [...this.effects];
    this.effects.clear();
    for (const runner of effects) attempt(errors, () => stop(runner));
    attempt(errors, () => this.releaseTree(this.root));
    attempt(errors, () => this.$.removeData(this.root, INSTANCE_KEY));
    attempt(errors, () => this.capabilities.applicationDestroyed(this));
  }
}

const SKIP_MODEL_WRITE = Symbol("skip-model-write");

export interface StarRuntimeInstallOptions {
  readonly document?: Document;
  readonly expressionEngine?: StarExpressionEngine;
  readonly createExpressionEngine: () => StarExpressionEngine;
}

interface RuntimeInstallation {
  readonly document: Document;
  readonly expressionEngine: StarExpressionEngine;
  readonly installed: StarInstalledJQuery;
  readonly kernel: Kernel;
}

const runtimeInstallations = new WeakMap<JQueryStatic, RuntimeInstallation>();

function installationDocument(options: StarRuntimeInstallOptions): Document {
  if (options.document) return options.document;
  if (typeof document === "undefined") {
    throw new Error("jQuery Star needs an ambient Document.");
  }
  return document;
}

export function runtimeInstallationFor($: JQueryStatic): RuntimeInstallation | undefined {
  return runtimeInstallations.get($);
}

export function installStarRuntime(
  $: JQueryStatic,
  options: StarRuntimeInstallOptions,
): StarInstalledJQuery {
  const existing = runtimeInstallations.get($);
  if (existing) {
    if (options.document && options.document !== existing.document) {
      throw new Error("jQStar is already installed for a different Document.");
    }
    if (options.expressionEngine && options.expressionEngine !== existing.expressionEngine) {
      throw new Error(
        "jQStar is already installed. Select an expression engine during initial installation.",
      );
    }
    return existing.installed;
  }
  const owner = installationDocument(options);
  const existingStarMethod = ($.fn as unknown as { star?: unknown }).star;
  if ((Object.prototype.hasOwnProperty.call($, "star") && $.star) || existingStarMethod) {
    throw new Error("This jQuery instance already has a jQStar installation from another runtime.");
  }
  const ownsExpressionEngine = options.expressionEngine === undefined;
  const expressionEngine = options.expressionEngine ?? options.createExpressionEngine();
  let kernel: Kernel;
  try {
    kernel = new Kernel($, owner, expressionEngine);
  } catch (error) {
    if (ownsExpressionEngine) expressionEngine.dispose();
    throw error;
  }

  const star: StarCoreStatic = {
    version: STAR_VERSION,
    dispose() {
      try {
        return kernel.dispose();
      } finally {
        finalizeDisposal();
      }
    },
    use: ((plugin: StarPlugin | readonly StarPlugin[]) => {
      if (Array.isArray(plugin)) {
        const facades = kernel.plugins.useMany(plugin);
        const uiIndex = plugin.findIndex(({ name }) => name === "ui");
        if (uiIndex >= 0 && !("ui" in star)) {
          Object.defineProperty(star, "ui", {
            configurable: false,
            enumerable: true,
            value: facades[uiIndex],
            writable: false,
          });
        }
        return facades;
      }
      const official = plugin as StarPlugin;
      const facade = kernel.plugins.use(official);
      if (official.name === "ui" && !("ui" in star)) {
        Object.defineProperty(star, "ui", {
          configurable: false,
          enumerable: true,
          value: facade,
          writable: false,
        });
      }
      return facade;
    }) as StarCoreStatic["use"],
    action(name, action) {
      kernel.registerAction(name, action as unknown as StarAction);
      return star;
    },
    boot(root = owner.documentElement) {
      kernel.assertActive("boot applications");
      if (typeof root === "string") return $(root).star();
      return $(root).star();
    },
    clearExpressionCache: () => {
      kernel.assertActive("clear expression caches");
      kernel.expressions.clearCache();
    },
    observeOperations: (observer, subscriptionOptions) =>
      kernel.observeOperations(observer, subscriptionOptions),
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
    whenEnhanced: () => kernel.whenEnhanced(),
  };

  const mutable = $ as unknown as {
    star: StarCoreStatic;
    fn: JQueryStatic["fn"] & { star?: StarJQueryMethod };
  };
  mutable.star = star;
  kernel.registerAction("get", dynamicBackendAction("GET"));
  kernel.registerAction("post", dynamicBackendAction("POST"));
  kernel.registerAction("put", dynamicBackendAction("PUT"));
  kernel.registerAction("patch", dynamicBackendAction("PATCH"));
  kernel.registerAction("delete", dynamicBackendAction("DELETE"));

  const starMethod = function <State extends StateRecord, Computed extends ComputedRecord>(
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
      kernel.assertActive("boot applications");
      const existing = $.data(element, INSTANCE_KEY) as StarInstance | undefined;
      if (existing && !existing.destroyed) {
        throw new Error(
          "This element already has a jQuery Star application. Destroy it before reinitializing.",
        );
      }

      let instance: (StarInstance<State, Computed> & ApplicationLifecycle) | undefined;
      try {
        instance =
          input === undefined
            ? (new DeclarativeApplication(
                $,
                element,
                kernel.applicationCapabilities,
              ) as StarInstance<State, Computed> & ApplicationLifecycle)
            : new Application($, element, input, kernel.applicationCapabilities);
        kernel.trackApplication(instance, instance);
        $.data(element, INSTANCE_KEY, instance);
      } catch (error) {
        const errors = [error];
        if (instance && !instance.destroyed) attempt(errors, () => instance!.destroy());
        attempt(errors, () => $.removeData(element, INSTANCE_KEY));
        throwCollectedErrors(errors, "jQuery Star application commit failed.");
      }
    });
    return this;
  } as StarJQueryMethod;
  mutable.fn.star = starMethod;

  const installed = $ as StarInstalledJQuery;
  runtimeInstallations.set($, {
    document: owner,
    expressionEngine,
    installed,
    kernel,
  });
  function finalizeDisposal(): void {
    if (!kernel.disposalSettled) return;
    if (runtimeInstallations.get($)?.kernel === kernel) runtimeInstallations.delete($);
    if (mutable.star === star) delete (mutable as { star?: StarCoreStatic }).star;
    if (mutable.fn.star === starMethod) {
      delete (mutable.fn as unknown as { star?: StarJQueryMethod }).star;
    }
  }
  return installed;
}

export function runtimeExpressionEngineFor($: JQueryStatic): StarExpressionEngine | undefined {
  return runtimeInstallations.get($)?.expressionEngine;
}
