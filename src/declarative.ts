import { compileStatement, compileValue } from "./expression";
import { cancelElementRequests, cancelRequests } from "./fetch";
import { effect, reactive, stop, type ReactiveEffect } from "./reactivity";
import { resolveAction } from "./registry";
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

export class DeclarativeApplication<
  State extends StateRecord = StateRecord,
> implements StarInstance<State, ComputedRecord> {
  readonly mode = "attributes" as const;
  readonly root: Element;
  readonly $root: JQuery<Element>;
  readonly state: State;
  readonly computed = EMPTY_COMPUTED;

  private readonly $: JQueryStatic;
  private readonly effects = new Set<ReactiveEffect>();
  private readonly cleanups = new Map<Element, Map<string, () => void>>();
  private readonly observer: MutationObserver;
  private isDestroyed = false;

  constructor($: JQueryStatic, root: Element, initialState: State = {} as State) {
    this.$ = $;
    this.root = root;
    this.$root = $(root);
    this.state = reactive(cloneValue(initialState));

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const element = mutation.target as Element;
          const attribute = mutation.attributeName;
          if (!attribute) continue;
          if (attribute === "data-ignore") {
            if (element.hasAttribute("data-ignore")) this.cleanupTree(element);
            else {
              this.loadSignals(element);
              this.loadComputed(element);
              this.scanTree(element);
            }
            continue;
          }
          if (element.closest("[data-ignore]")) continue;
          this.cleanupDirective(element, attribute);
          if (attribute === "data-signals") this.loadSignals(element);
          else if (attribute.startsWith("data-computed:"))
            this.initializeComputed(element, attribute);
          else this.initializeDirective(element, attribute);
          continue;
        }

        for (const node of Array.from(mutation.removedNodes)) {
          if (node instanceof Element) this.cleanupTree(node);
        }
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue;
          this.loadSignals(node);
          this.loadComputed(node);
          this.scanTree(node);
        }
      }
    });

    this.observer.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    this.loadSignals(root);
    this.loadComputed(root);
    this.scanTree(root);
  }

  get destroyed(): boolean {
    return this.isDestroyed;
  }

  async run(
    action: string | StarAction<State, ComputedRecord>,
    overrides: Partial<StarContext<State, ComputedRecord>> = {},
  ): Promise<unknown> {
    if (this.isDestroyed) throw new Error("This jQuery Star application has been destroyed.");
    const resolved = (typeof action === "string" ? resolveAction(action) : action) as
      StarAction<State, ComputedRecord> | undefined;
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
    this.cleanupTree(this.root);
    for (const runner of this.effects) stop(runner);
    this.effects.clear();
  }

  private context(element = this.root, event?: JQuery.Event): StarContext<State, ComputedRecord> {
    return {
      $: this.$,
      state: this.state,
      computed: this.computed,
      root: this.root,
      $root: this.$root,
      element,
      $element: this.$(element),
      ...(event ? { event } : {}),
      instance: this,
    };
  }

  private allWithin(tree: Element): Element[] {
    return [tree, ...Array.from(tree.querySelectorAll("*"))].filter(
      (element) => !element.closest("[data-ignore]"),
    );
  }

  private loadSignals(tree: Element): void {
    for (const element of this.allWithin(tree)) {
      const source = element.getAttribute("data-signals");
      if (source === null) continue;
      try {
        const result = compileValue(source)(this.context(element) as StarContext);
        if (!isPlainObject(result)) throw new TypeError("data-signals must evaluate to an object.");
        mergeState(this.state, result);
      } catch (error) {
        this.report(error, element, "data-signals", source);
      }
    }
  }

  private loadComputed(tree: Element): void {
    for (const element of this.allWithin(tree)) {
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
      const evaluate = compileValue(source);
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

  private scanTree(tree: Element): void {
    for (const element of this.allWithin(tree)) {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.name === "data-signals" || attribute.name.startsWith("data-computed:"))
          continue;
        this.initializeDirective(element, attribute.name);
      }
    }
  }

  private initializeDirective(element: Element, attributeName: string): void {
    if (!attributeName.startsWith(DIRECTIVE_PREFIX)) return;
    const source = element.getAttribute(attributeName);
    if (source === null) return;

    try {
      if (attributeName.startsWith("data-on:")) this.bindEvent(element, attributeName, source);
      else if (attributeName.startsWith("data-bind:")) this.bindModel(element, attributeName);
      else if (attributeName === "data-text") {
        this.bindValue(element, attributeName, source, (value) =>
          this.$(element).text(String(value ?? "")),
        );
      } else if (attributeName === "data-html") {
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
        const execute = compileStatement(source);
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
          compileStatement(source)(this.context(element) as StarContext),
          element,
          attributeName,
          source,
        );
      } else if (attributeName === "data-destroy") {
        const execute = compileStatement(source);
        this.setCleanup(element, attributeName, () => {
          this.handleResult(
            execute(this.context(element) as StarContext),
            element,
            attributeName,
            source,
          );
        });
      }
    } catch (error) {
      this.report(error, element, attributeName, source);
    }
  }

  private bindValue(
    element: Element,
    attributeName: string,
    source: string,
    apply: (value: unknown) => void,
  ): void {
    const evaluate = compileValue(source);
    this.bindEffect(element, attributeName, () => {
      try {
        apply(evaluate(this.context(element) as StarContext));
      } catch (error) {
        this.report(error, element, attributeName, source);
      }
    });
  }

  private bindEffect(element: Element, attributeName: string, run: () => void): void {
    const runner = effect(run);
    this.effects.add(runner);
    this.setCleanup(element, attributeName, () => {
      stop(runner);
      this.effects.delete(runner);
    });
  }

  private bindModel(element: Element, attributeName: string): void {
    const path = attributeName.slice("data-bind:".length);
    if (!path) throw new Error("data-bind requires a signal name, such as data-bind:count.");

    const runner = effect(() => this.writeModel(element, readPath(this.state, path)));
    this.effects.add(runner);
    const namespace = `.jqueryStarBind${Math.random().toString(36).slice(2)}`;
    const handler = (): void => {
      const value = this.readModel(element, readPath(this.state, path));
      if (value !== SKIP_MODEL_WRITE) writePath(this.state, path, value);
    };
    this.$(element).on(`input${namespace} change${namespace}`, handler);

    this.setCleanup(element, attributeName, () => {
      stop(runner);
      this.effects.delete(runner);
      this.$(element).off(namespace);
    });
  }

  private bindEvent(element: Element, attributeName: string, source: string): void {
    const options = parseEvent(attributeName);
    if (!options.event) throw new Error("data-on requires an event name, such as data-on:click.");
    if (options.prevent && options.passive)
      throw new Error("The prevent and passive modifiers cannot be combined.");

    const execute = compileStatement(source);
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
      ? window
      : options.document || options.outside
        ? document
        : element;
    const native =
      options.capture || options.passive || options.window || options.document || options.outside;
    const jqueryInvoke = (event: JQuery.Event): void => invoke(event);
    if (native) {
      target.addEventListener(options.event, invoke as EventListener, {
        capture: options.capture,
        passive: options.passive,
      });
    } else {
      this.$(element).on(options.event, jqueryInvoke);
    }

    this.setCleanup(element, attributeName, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (native)
        target.removeEventListener(options.event, invoke as EventListener, {
          capture: options.capture,
        });
      else this.$(element).off(options.event, jqueryInvoke);
    });
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
      if (element.type === "radio") return element.checked ? element.value : SKIP_MODEL_WRITE;
    }
    if (element instanceof HTMLSelectElement && element.multiple) {
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
    attributes.get(attribute)?.();
    attributes.set(attribute, cleanup);
  }

  private cleanupDirective(element: Element, attribute: string): void {
    const attributes = this.cleanups.get(element);
    const cleanup = attributes?.get(attribute);
    cleanup?.();
    if (attribute.startsWith("data-on:")) cancelElementRequests(element);
    attributes?.delete(attribute);
    if (attributes?.size === 0) this.cleanups.delete(element);
  }

  private cleanupTree(tree: Element): void {
    for (const element of [tree, ...Array.from(tree.querySelectorAll("*"))]) {
      cancelElementRequests(element);
    }
    for (const [element, attributes] of Array.from(this.cleanups)) {
      if (element !== tree && !tree.contains(element)) continue;
      for (const cleanup of attributes.values()) cleanup();
      this.cleanups.delete(element);
    }
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
