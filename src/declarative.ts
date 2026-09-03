import { cancelElementRequests, cancelRequests } from "./fetch";
import { attempt, throwCollectedErrors } from "./errors";
import { isElementNode, isInputElement, isSelectElement } from "./dom";
import { bindStarExpressionRuntime } from "./expression-runtime";
import {
  directiveAttribute,
  parseDirectiveAttribute,
  type StarDirective,
  type StarDirectiveCleanup,
  type StarDirectiveContext,
  type StarParsedDirectiveAttribute,
} from "./directive";
import type { ApplicationCapabilities, ApplicationLifecycle } from "./kernel";
import type {
  StarOperationObserver,
  StarOperationSubscriptionOptions,
  StarOperationUnsubscribe,
} from "./observation";
import { effect, reactive, stop, type ReactiveEffect } from "./reactivity";
import type { ComputedRecord, StarAction, StarContext, StarInstance, StateRecord } from "./types";

const EMPTY_COMPUTED = Object.freeze({}) as Readonly<ComputedRecord>;
const SKIP_MODEL_WRITE = Symbol("skip-model-write");
const DIRECTIVE_PREFIX = "data-";

interface ParsedEvent {
  event: string;
  prevent: boolean;
  stop: boolean;
  once: boolean;
  self: boolean;
  outside: boolean;
  window: boolean;
  document: boolean;
  capture: boolean;
  passive: boolean;
  key?: string;
  debounce?: number;
  throttle?: number;
}

interface MountedDirective {
  active: boolean;
  attribute: StarParsedDirectiveAttribute<unknown>;
  readonly cleanups: StarDirectiveCleanup[];
  readonly definition: StarDirective<unknown>;
}

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    ((typeof value === "object" && value !== null) || typeof value === "function") &&
    "then" in value &&
    typeof value.then === "function"
  );
}

function mergeState(target: StateRecord, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (isPlainObject(existing) && isPlainObject(value)) mergeState(existing, value);
    else target[key] = cloneValue(value);
  }
}

function camelCase(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_match, character: string) => character.toUpperCase());
}

function readPath(target: object, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[camelCase(key)];
  }, target);
}

function writePath(target: object, path: string, value: unknown): void {
  const keys = path.split(".").map(camelCase);
  const finalKey = keys.pop();
  if (!finalKey) throw new Error("A binding path cannot be empty.");

  let parent = target as Record<string, unknown>;
  for (const key of keys) {
    if (!isPlainObject(parent[key])) parent[key] = {};
    parent = parent[key] as Record<string, unknown>;
  }
  parent[finalKey] = value;
}

function milliseconds(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)(ms|s)?$/.exec(value);
  if (!match) return undefined;
  const amount = Number(match[1]);
  return match[2] === "s" ? amount * 1000 : amount;
}

function parseEvent(attribute: string): ParsedEvent {
  const [event = "", ...modifiers] = attribute.slice("data-on:".length).split("__");
  const parsed: ParsedEvent = {
    event,
    prevent: false,
    stop: false,
    once: false,
    self: false,
    outside: false,
    window: false,
    document: false,
    capture: false,
    passive: false,
  };

  for (const modifier of modifiers) {
    const [name, argument] = modifier.split(".", 2);
    if (name === "prevent") parsed.prevent = true;
    else if (name === "stop") parsed.stop = true;
    else if (name === "once") parsed.once = true;
    else if (name === "self") parsed.self = true;
    else if (name === "outside") parsed.outside = true;
    else if (name === "window") parsed.window = true;
    else if (name === "document") parsed.document = true;
    else if (name === "capture") parsed.capture = true;
    else if (name === "passive") parsed.passive = true;
    else if (name === "debounce") parsed.debounce = milliseconds(argument ?? "250ms") ?? 250;
    else if (name === "throttle") parsed.throttle = milliseconds(argument ?? "250ms") ?? 250;
    else if (
      ["enter", "escape", "space", "tab", "up", "down", "left", "right"].includes(name ?? "")
    ) {
      parsed.key = name!;
    }
  }
  return parsed;
}

function expectedKey(key: string): string {
  return {
    enter: "Enter",
    escape: "Escape",
    space: " ",
    tab: "Tab",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
  }[key]!;
}

export class DeclarativeApplication<State extends StateRecord = StateRecord>
  implements StarInstance<State, ComputedRecord>, ApplicationLifecycle
{
  readonly mode = "attributes" as const;
  readonly root: Element;
  readonly $root: JQuery<Element>;
  readonly state: State;
  readonly computed = EMPTY_COMPUTED;

  private readonly $: JQueryStatic;
  private readonly capabilities: ApplicationCapabilities;
  private readonly owner: string;
  private readonly effects = new Set<ReactiveEffect>();
  private readonly cleanups = new Map<Element, Map<string, () => void>>();
  private readonly directives = new Map<Element, Map<string, MountedDirective>>();
  private releaseExpressionRuntime: (() => void) | undefined;
  private releaseObserver: (() => void) | undefined;
  private isDestroyed = false;

  constructor(
    $: JQueryStatic,
    root: Element,
    capabilities: ApplicationCapabilities,
    initialState: State = {} as State,
  ) {
    this.$ = $;
    this.capabilities = capabilities;
    this.owner = `application:attributes:${capabilities.nextApplicationId()}`;
    this.root = root;
    this.$root = $(root);
    this.state = reactive(cloneValue(initialState));

    try {
      capabilities.applicationCreated(this);
      this.releaseExpressionRuntime = bindStarExpressionRuntime(this, {
        resolveAction: (name) => this.capabilities.resolveAction(name),
        resolveHelper: (name) => this.capabilities.resolveHelper(name),
        startAction: (label, action, context) =>
          this.capabilities.startAction(this, label, action, context),
      });
      const ownedObserver = capabilities.observe(
        `${this.owner}:mutation`,
        root,
        (mutations) => this.handleMutations(mutations),
        {
          attributes: true,
          childList: true,
          subtree: true,
        },
      );
      this.releaseObserver = ownedObserver.release;

      this.loadSignals(root);
      this.loadComputed(root);
      this.scanTree(root);
    } catch (error) {
      const errors = [error];
      this.isDestroyed = true;
      this.releaseOwnedResources(errors);
      throwCollectedErrors(errors, "jQuery Star declarative setup rollback failed.");
    }
  }

  get destroyed(): boolean {
    return this.isDestroyed;
  }

  async run(
    action: string | StarAction<State, ComputedRecord>,
    overrides: Partial<StarContext<State, ComputedRecord>> = {},
  ): Promise<unknown> {
    if (this.isDestroyed) throw new Error("This jQuery Star application has been destroyed.");
    const resolved = typeof action === "string" ? this.capabilities.resolveAction(action) : action;
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
    throwCollectedErrors(errors, "jQuery Star declarative refresh failed.");
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    const errors: unknown[] = [];
    this.releaseOwnedResources(errors);
    throwCollectedErrors(errors, "jQuery Star declarative destruction failed.");
  }

  releaseTree(tree: Element, preservedRoots: readonly Element[] = []): void {
    this.cleanupTree(tree, preservedRoots);
  }

  private context(element = this.root, event?: JQuery.Event): StarContext<State, ComputedRecord> {
    return {
      $: this.$,
      state: this.state,
      computed: this.computed,
      helpers: this.capabilities.helpers,
      root: this.root,
      $root: this.$root,
      element,
      $element: this.$(element),
      ...(event ? { event } : {}),
      instance: this,
    };
  }

  private allWithin(tree: Element, preservedRoots: readonly Element[] = []): Element[] {
    return [tree, ...Array.from(tree.querySelectorAll("*"))].filter(
      (element) =>
        !element.closest("[data-ignore]") &&
        !preservedRoots.some((preserved) => preserved === element || preserved.contains(element)),
    );
  }

  private loadSignals(tree: Element, preservedRoots: readonly Element[] = []): void {
    for (const element of this.allWithin(tree, preservedRoots)) {
      const source = element.getAttribute("data-signals");
      if (source === null) continue;
      try {
        const result = this.capabilities.expressions.compileValue(source, {
          attribute: "data-signals",
        })(this.context(element) as StarContext);
        if (!isPlainObject(result)) throw new TypeError("data-signals must evaluate to an object.");
        mergeState(this.state, result);
      } catch (error) {
        this.report(error, element, "data-signals", source);
      }
    }
  }

  private loadComputed(tree: Element, preservedRoots: readonly Element[] = []): void {
    for (const element of this.allWithin(tree, preservedRoots)) {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.name.startsWith("data-computed:")) {
          this.initializeComputed(element, attribute.name);
        }
      }
    }
  }

  private initializeComputed(element: Element, attributeName: string): void {
    const source = element.getAttribute(attributeName);
    if (source === null) return;
    const key = camelCase(attributeName.slice("data-computed:".length));
    if (!key) return;

    try {
      const evaluate = this.capabilities.expressions.compileValue(source, {
        attribute: attributeName,
      });
      const previous = Object.getOwnPropertyDescriptor(this.state, key);
      Object.defineProperty(this.state, key, {
        enumerable: true,
        configurable: true,
        get: () => evaluate(this.context(element) as StarContext),
      });
      this.setCleanup(element, attributeName, () => {
        if (previous) Object.defineProperty(this.state, key, previous);
        else delete this.state[key];
      });
    } catch (error) {
      this.report(error, element, attributeName, source);
    }
  }

  private scanTree(tree: Element, preservedRoots: readonly Element[] = []): void {
    for (const element of this.allWithin(tree, preservedRoots)) {
      const attributes = Array.from(element.attributes)
        .map((attribute, index) => ({
          attribute,
          index,
          priority: this.capabilities.directives.resolve(attribute.name)?.priority ?? 0,
        }))
        .filter(
          ({ attribute }) =>
            attribute.name !== "data-signals" && !attribute.name.startsWith("data-computed:"),
        )
        .sort((left, right) => right.priority - left.priority || left.index - right.index);
      for (const { attribute } of attributes) {
        this.initializeDirective(element, attribute.name);
      }
    }
  }

  private initializeDirective(element: Element, attributeName: string): void {
    if (!attributeName.startsWith(DIRECTIVE_PREFIX)) return;
    const definition = this.capabilities.directives.resolve(attributeName);
    const source = element.getAttribute(attributeName);
    if (definition) {
      try {
        this.reconcileRegisteredDirective(
          element,
          attributeName,
          source,
          definition as unknown as StarDirective<unknown>,
        );
      } catch (error) {
        this.report(error, element, attributeName, source ?? "");
      }
      return;
    }
    if (source === null) return;

    try {
      if (attributeName.startsWith("data-on:")) this.bindEvent(element, attributeName, source);
      else if (attributeName.startsWith("data-bind:")) this.bindModel(element, attributeName);
      else if (attributeName === "data-html") {
        this.bindValue(element, attributeName, source, (value) =>
          this.$(element).html(String(value ?? "")),
        );
      } else if (attributeName === "data-show") {
        this.bindValue(element, attributeName, source, (value) =>
          this.$(element).toggle(Boolean(value)),
        );
      } else if (attributeName === "data-class") {
        let previous = new Set<string>();
        this.bindValue(element, attributeName, source, (value) => {
          if (!isPlainObject(value)) return;
          const current = new Set(Object.keys(value));
          for (const name of previous) {
            if (!current.has(name)) this.$(element).removeClass(name);
          }
          for (const [name, enabled] of Object.entries(value)) {
            this.$(element).toggleClass(name, Boolean(enabled));
          }
          previous = current;
        });
      } else if (attributeName.startsWith("data-class:")) {
        const name = attributeName.slice("data-class:".length);
        this.bindValue(element, attributeName, source, (value) =>
          this.$(element).toggleClass(name, Boolean(value)),
        );
      } else if (attributeName.startsWith("data-attr:")) {
        const name = attributeName.slice("data-attr:".length);
        this.bindValue(element, attributeName, source, (value) => {
          if (value === null || value === undefined || value === false)
            this.$(element).removeAttr(name);
          else this.$(element).attr(name, value === true ? name : String(value));
        });
      } else if (attributeName.startsWith("data-prop:")) {
        const name = camelCase(attributeName.slice("data-prop:".length));
        this.bindValue(element, attributeName, source, (value) =>
          this.$(element).prop(
            name,
            value as string | number | boolean | symbol | object | null | undefined,
          ),
        );
      } else if (attributeName.startsWith("data-style:")) {
        const name = attributeName.slice("data-style:".length);
        this.bindValue(element, attributeName, source, (value) =>
          this.$(element).css(name, value == null ? "" : String(value)),
        );
      } else if (attributeName === "data-effect") {
        const execute = this.capabilities.expressions.compileStatement(source, {
          attribute: attributeName,
        });
        this.bindEffect(element, attributeName, () =>
          this.handleResult(
            execute(this.context(element) as StarContext),
            element,
            attributeName,
            source,
          ),
        );
      } else if (attributeName === "data-init") {
        this.handleResult(
          this.capabilities.expressions.compileStatement(source, {
            attribute: attributeName,
          })(this.context(element) as StarContext),
          element,
          attributeName,
          source,
        );
      }
    } catch (error) {
      this.report(error, element, attributeName, source);
    }
  }

  private reconcileRegisteredDirective(
    element: Element,
    attributeName: string,
    source: string | null,
    definition: StarDirective<unknown>,
  ): void {
    const current = this.directives.get(element)?.get(attributeName);
    if (source === null) {
      this.cleanupDirective(element, attributeName);
      return;
    }
    if (current?.attribute.value === source) return;

    let attribute: StarParsedDirectiveAttribute<unknown>;
    try {
      attribute = parseDirectiveAttribute(
        definition,
        directiveAttribute(definition, attributeName, source),
      );
    } catch (error) {
      const errors = [error];
      if (current) attempt(errors, () => this.cleanupDirective(element, attributeName));
      throwCollectedErrors(errors, `Directive ${definition.id} parse failed.`);
      return;
    }

    if (!current || current.definition !== definition) {
      if (current) this.cleanupDirective(element, attributeName);
      this.mountRegisteredDirective(element, definition, attribute);
      return;
    }
    if (!definition.update) {
      this.cleanupDirective(element, attributeName);
      this.mountRegisteredDirective(element, definition, attribute);
      return;
    }

    const previous = current.attribute;
    try {
      const result = definition.update(
        this.directiveContext(current, element, attribute, previous),
      );
      this.registerDirectiveResult(current, result);
      current.attribute = attribute;
    } catch (error) {
      const errors = [error];
      attempt(errors, () => this.cleanupDirective(element, attributeName));
      throwCollectedErrors(errors, `Directive ${definition.id} update rollback failed.`);
    }
  }

  private mountRegisteredDirective(
    element: Element,
    definition: StarDirective<unknown>,
    attribute: StarParsedDirectiveAttribute<unknown>,
  ): void {
    let attributes = this.directives.get(element);
    if (!attributes) {
      attributes = new Map();
      this.directives.set(element, attributes);
    }
    const record: MountedDirective = {
      active: true,
      attribute,
      cleanups: [],
      definition: definition as StarDirective<unknown>,
    };
    attributes.set(attribute.name, record);

    try {
      const result = definition.mount(this.directiveContext(record, element, attribute));
      this.registerDirectiveResult(record, result);
      this.setCleanup(element, attribute.name, () => this.releaseDirectiveRecord(element, record));
    } catch (error) {
      const errors = [error];
      attempt(errors, () => this.releaseDirectiveRecord(element, record));
      throwCollectedErrors(errors, `Directive ${definition.id} setup rollback failed.`);
    }
  }

  private directiveContext(
    record: MountedDirective,
    element: Element,
    attribute: StarParsedDirectiveAttribute<unknown>,
    previous?: StarParsedDirectiveAttribute<unknown>,
  ): StarDirectiveContext<unknown> {
    const report = (error: unknown): void =>
      this.report(error, element, attribute.name, attribute.value);
    const context: StarDirectiveContext<unknown> = {
      application: this,
      attribute,
      context: this.context(element) as StarContext,
      element,
      expressions: this.capabilities.expressions,
      helpers: this.capabilities.helpers,
      ...(previous ? { previous } : {}),
      $element: this.$(element),
      cleanup: (cleanup) => this.ownDirectiveCleanup(record, cleanup),
      effect: (run) => {
        this.assertDirectiveActive(record);
        if (typeof run !== "function") {
          throw new Error(`Directive ${record.definition.id} effect must be a function.`);
        }
        const runner = effect(run, { owner: this.owner, onError: report });
        this.effects.add(runner);
        return this.ownDirectiveCleanup(record, () => {
          this.effects.delete(runner);
          stop(runner);
        });
      },
      report,
      task: (task) => {
        this.assertDirectiveActive(record);
        if (typeof task !== "function") {
          throw new Error(`Directive ${record.definition.id} task must be a function.`);
        }
        const controller = new AbortController();
        const result = task(controller.signal);
        if (!isThenable(result)) {
          throw new Error(`Directive ${record.definition.id} task must return a thenable.`);
        }
        const releaseTask = this.capabilities.task(this.owner, result, report);
        return this.ownDirectiveCleanup(record, () => {
          controller.abort();
          releaseTask();
        });
      },
    };
    return Object.freeze(context);
  }

  private assertDirectiveActive(record: MountedDirective): void {
    if (!record.active) {
      throw new Error(`Directive ${record.definition.id} has already been released.`);
    }
  }

  private ownDirectiveCleanup(
    record: MountedDirective,
    cleanup: StarDirectiveCleanup,
  ): StarDirectiveCleanup {
    this.assertDirectiveActive(record);
    if (typeof cleanup !== "function") {
      throw new Error(`Directive ${record.definition.id} cleanup must be a function.`);
    }
    let active = true;
    const owned = (): void => {
      if (!active) return;
      active = false;
      const index = record.cleanups.indexOf(owned);
      if (index >= 0) record.cleanups.splice(index, 1);
      cleanup();
    };
    record.cleanups.push(owned);
    return owned;
  }

  private registerDirectiveResult(record: MountedDirective, result: unknown): void {
    if (result === undefined) return;
    if (isThenable(result)) {
      throw new Error(`Directive ${record.definition.id} returned an asynchronous result.`);
    }
    if (typeof result !== "function") {
      throw new Error(`Directive ${record.definition.id} must return cleanup or undefined.`);
    }
    this.ownDirectiveCleanup(record, result as StarDirectiveCleanup);
  }

  private releaseDirectiveRecord(element: Element, record: MountedDirective): void {
    if (!record.active) return;
    record.active = false;
    const attributes = this.directives.get(element);
    if (attributes?.get(record.attribute.name) === record) {
      attributes.delete(record.attribute.name);
      if (attributes.size === 0) this.directives.delete(element);
    }
    const cleanups = [...record.cleanups].reverse();
    record.cleanups.length = 0;
    const errors: unknown[] = [];
    for (const cleanup of cleanups) attempt(errors, cleanup);
    throwCollectedErrors(errors, `Directive ${record.definition.id} cleanup failed.`);
  }

  private bindValue(
    element: Element,
    attributeName: string,
    source: string,
    apply: (value: unknown) => void,
  ): void {
    const evaluate = this.capabilities.expressions.compileValue(source, {
      attribute: attributeName,
    });
    this.bindEffect(element, attributeName, () => {
      try {
        apply(evaluate(this.context(element) as StarContext));
      } catch (error) {
        this.report(error, element, attributeName, source);
      }
    });
  }

  private bindEffect(element: Element, attributeName: string, run: () => void): void {
    const runner = effect(run, {
      owner: this.owner,
      onError: (error) =>
        this.report(error, element, attributeName, element.getAttribute(attributeName) ?? ""),
    });
    this.effects.add(runner);
    this.setCleanup(element, attributeName, () => {
      this.effects.delete(runner);
      stop(runner);
    });
  }

  private bindModel(element: Element, attributeName: string): void {
    const path = attributeName.slice("data-bind:".length);
    if (!path) throw new Error("data-bind requires a signal name, such as data-bind:count.");

    const runner = effect(() => this.writeModel(element, readPath(this.state, path)), {
      owner: this.owner,
      onError: (error) => this.report(error, element, attributeName, path),
    });
    this.effects.add(runner);
    const namespace = `.jqueryStarBind${Math.random().toString(36).slice(2)}`;
    const handler = (): void => {
      const value = this.readModel(element, readPath(this.state, path));
      if (value !== SKIP_MODEL_WRITE) writePath(this.state, path, value);
    };
    this.setCleanup(element, attributeName, () => {
      this.effects.delete(runner);
      stop(runner);
      this.$(element).off(namespace);
    });
    try {
      this.$(element).on(`input${namespace} change${namespace}`, handler);
    } catch (error) {
      const errors = [error];
      attempt(errors, () => this.cleanupDirective(element, attributeName));
      throwCollectedErrors(errors, "jQuery Star model setup rollback failed.");
    }
  }

  private bindEvent(element: Element, attributeName: string, source: string): void {
    const options = parseEvent(attributeName);
    if (!options.event) throw new Error("data-on requires an event name, such as data-on:click.");
    if (options.prevent && options.passive)
      throw new Error("The prevent and passive modifiers cannot be combined.");

    const execute = this.capabilities.expressions.compileStatement(source, {
      attribute: attributeName,
    });
    let invoked = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let lastInvocation = -Infinity;

    const invoke = (nativeEvent: Event | JQuery.Event): void => {
      if (options.once && invoked) return;
      const eventTarget = (nativeEvent as unknown as { target: EventTarget | null }).target;
      if (options.self && eventTarget !== element) return;
      if (options.outside && element.contains(eventTarget as Node | null)) return;
      if (options.key && (nativeEvent as KeyboardEvent).key !== expectedKey(options.key)) return;

      if (options.prevent) nativeEvent.preventDefault();
      if (options.stop) nativeEvent.stopPropagation();

      const run = (): void => {
        invoked = true;
        lastInvocation = Date.now();
        this.handleResult(
          execute(this.context(element, nativeEvent as JQuery.Event) as unknown as StarContext),
          element,
          attributeName,
          source,
        );
      };

      if (options.debounce !== undefined) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(run, options.debounce);
        return;
      }
      if (options.throttle !== undefined && Date.now() - lastInvocation < options.throttle) return;
      run();
    };

    const target: EventTarget = options.window
      ? this.root.ownerDocument.defaultView!
      : options.document || options.outside
        ? this.root.ownerDocument
        : element;
    const native =
      options.capture || options.passive || options.window || options.document || options.outside;
    const jqueryInvoke = (event: JQuery.Event): void => invoke(event);
    const cleanup = (): void => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (native)
        target.removeEventListener(options.event, invoke as EventListener, {
          capture: options.capture,
        });
      else this.$(element).off(options.event, jqueryInvoke);
    };
    this.setCleanup(element, attributeName, cleanup);
    try {
      if (native) {
        target.addEventListener(options.event, invoke as EventListener, {
          capture: options.capture,
          passive: options.passive,
        });
      } else {
        this.$(element).on(options.event, jqueryInvoke);
      }
    } catch (error) {
      const errors = [error];
      attempt(errors, () => this.cleanupDirective(element, attributeName));
      throwCollectedErrors(errors, "jQuery Star event setup rollback failed.");
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
      for (const option of Array.from(element.options))
        option.selected = selected.has(option.value);
      return;
    }
    const next = String(value ?? "");
    if (this.$(element).val() !== next) {
      this.$(element).val(next);
      element.dispatchEvent(new CustomEvent("jquery-star:model-write"));
    }
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
      if (element.type === "radio") return element.checked ? element.value : SKIP_MODEL_WRITE;
    }
    if (isSelectElement(element) && element.multiple) {
      return Array.from(element.selectedOptions, (option) => option.value);
    }
    return this.$(element).val();
  }

  private setCleanup(element: Element, attribute: string, cleanup: () => void): void {
    let attributes = this.cleanups.get(element);
    if (!attributes) {
      attributes = new Map();
      this.cleanups.set(element, attributes);
    }
    const previous = attributes.get(attribute);
    attributes.delete(attribute);
    if (previous) {
      const errors: unknown[] = [];
      attempt(errors, previous);
      if (errors.length > 0) {
        attempt(errors, cleanup);
        if (attributes.size === 0) this.cleanups.delete(element);
        throwCollectedErrors(errors, "jQuery Star cleanup replacement failed.");
      }
    }
    attributes.set(attribute, cleanup);
  }

  private cleanupDirective(element: Element, attribute: string): void {
    const attributes = this.cleanups.get(element);
    const cleanup = attributes?.get(attribute);
    const directive = this.directives.get(element)?.get(attribute);
    attributes?.delete(attribute);
    if (attributes?.size === 0) this.cleanups.delete(element);
    const errors: unknown[] = [];
    if (cleanup) attempt(errors, cleanup);
    else if (directive) attempt(errors, () => this.releaseDirectiveRecord(element, directive));
    if (attribute.startsWith("data-on:")) {
      attempt(errors, () => cancelElementRequests(element));
    }
    throwCollectedErrors(errors, "jQuery Star directive cleanup failed.");
  }

  private cleanupTree(tree: Element, preservedRoots: readonly Element[] = []): void {
    const errors: unknown[] = [];
    for (const element of [tree, ...Array.from(tree.querySelectorAll("*"))]) {
      if (
        preservedRoots.some((preserved) => preserved === element || preserved.contains(element))
      ) {
        continue;
      }
      attempt(errors, () => cancelElementRequests(element));
    }
    for (const [element, attributes] of Array.from(this.cleanups)) {
      if (element !== tree && !tree.contains(element)) continue;
      if (
        preservedRoots.some((preserved) => preserved === element || preserved.contains(element))
      ) {
        continue;
      }
      this.cleanups.delete(element);
      for (const cleanup of attributes.values()) attempt(errors, cleanup);
    }
    throwCollectedErrors(errors, "jQuery Star declarative subtree cleanup failed.");
  }

  private handleMutations(mutations: MutationRecord[]): void {
    const errors: unknown[] = [];
    for (const mutation of mutations) {
      if (mutation.type === "attributes") {
        const element = mutation.target as Element;
        const attribute = mutation.attributeName;
        if (!attribute) continue;
        if (attribute === "data-ignore") {
          if (element.hasAttribute("data-ignore")) {
            attempt(errors, () => this.cleanupTree(element));
          } else {
            attempt(errors, () => this.loadSignals(element));
            attempt(errors, () => this.loadComputed(element));
            attempt(errors, () => this.scanTree(element));
          }
          continue;
        }
        if (element.closest("[data-ignore]")) continue;
        if (this.capabilities.directives.resolve(attribute)) {
          attempt(errors, () => this.initializeDirective(element, attribute));
          continue;
        }
        attempt(errors, () => this.cleanupDirective(element, attribute));
        if (attribute === "data-signals") {
          attempt(errors, () => this.loadSignals(element));
        } else if (attribute.startsWith("data-computed:")) {
          attempt(errors, () => this.initializeComputed(element, attribute));
        } else {
          attempt(errors, () => this.initializeDirective(element, attribute));
        }
        continue;
      }

      for (const node of Array.from(mutation.removedNodes)) {
        if (isElementNode(node)) {
          attempt(errors, () =>
            this.cleanupTree(node, this.capabilities.preservedRootsWithin(node)),
          );
        }
      }
      for (const node of Array.from(mutation.addedNodes)) {
        if (!isElementNode(node)) continue;
        const preservedRoots = this.capabilities.preservedRootsWithin(node);
        attempt(errors, () => this.loadSignals(node, preservedRoots));
        attempt(errors, () => this.loadComputed(node, preservedRoots));
        attempt(errors, () => this.scanTree(node, preservedRoots));
      }
    }
    for (const error of errors) this.reportLifecycle(error);
  }

  private releaseOwnedResources(errors: unknown[]): void {
    const releaseExpressionRuntime = this.releaseExpressionRuntime;
    this.releaseExpressionRuntime = undefined;
    if (releaseExpressionRuntime) attempt(errors, releaseExpressionRuntime);

    attempt(errors, () => cancelRequests(this.root));

    const releaseObserver = this.releaseObserver;
    this.releaseObserver = undefined;
    if (releaseObserver) attempt(errors, releaseObserver);

    attempt(errors, () => this.cleanupTree(this.root));
    for (const runner of Array.from(this.effects)) {
      this.effects.delete(runner);
      attempt(errors, () => stop(runner));
    }
    attempt(errors, () => this.$.removeData(this.root, "jqueryStar.instance"));
    attempt(errors, () => this.capabilities.applicationDestroyed(this));
  }

  private reportLifecycle(error: unknown): void {
    this.$root.trigger("jquery-star:error", [error]);
  }

  private handleResult(
    result: unknown,
    element: Element,
    attribute: string,
    expression: string,
  ): void {
    if (result instanceof Promise) {
      void result.catch((error: unknown) => this.report(error, element, attribute, expression));
    }
  }

  private report(error: unknown, element: Element, attribute: string, expression: string): void {
    const detail = { error, element, attribute, expression, instance: this };
    this.$root.trigger("jquery-star:error", [detail]);
  }
}
