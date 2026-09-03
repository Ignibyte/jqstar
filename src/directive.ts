import type { StarExpressionEngine } from "./expression";
import type { StarContext, StarInstance } from "./types";

export type StarDirectiveCleanup = () => void;

export type StarDirectiveTask = (signal: AbortSignal) => PromiseLike<unknown>;

export type StarExpressionHelperScope = Readonly<Record<string, unknown>>;

export interface StarExpressionHelperRecord {
  readonly name: string;
  readonly value: unknown;
}

export interface StarDirectiveExactMatcher {
  readonly name: string;
  readonly prefix?: never;
}

export interface StarDirectivePrefixMatcher {
  readonly name?: never;
  readonly prefix: string;
}

export type StarDirectiveMatcher = StarDirectiveExactMatcher | StarDirectivePrefixMatcher;

export interface StarDirectiveAttribute {
  readonly name: string;
  readonly suffix: string;
  readonly value: string;
}

export interface StarParsedDirectiveAttribute<Parsed = string> extends StarDirectiveAttribute {
  readonly parsed: Parsed;
}

export interface StarDirectiveContext<Parsed = string> {
  readonly application: StarInstance;
  readonly attribute: StarParsedDirectiveAttribute<Parsed>;
  readonly context: StarContext;
  readonly element: Element;
  readonly expressions: StarExpressionEngine;
  readonly helpers: StarExpressionHelperScope;
  readonly previous?: StarParsedDirectiveAttribute<Parsed>;
  readonly $element: JQuery<Element>;
  cleanup(this: void, cleanup: StarDirectiveCleanup): StarDirectiveCleanup;
  effect(this: void, run: () => void): StarDirectiveCleanup;
  report(this: void, error: unknown): void;
  task(this: void, task: StarDirectiveTask): StarDirectiveCleanup;
}

export interface StarDirective<Parsed = string> {
  readonly id: string;
  readonly match: StarDirectiveMatcher;
  readonly priority?: number;
  mount(this: void, context: StarDirectiveContext<Parsed>): void | StarDirectiveCleanup;
  parse?(this: void, attribute: StarDirectiveAttribute): Parsed;
  update?(this: void, context: StarDirectiveContext<Parsed>): void | StarDirectiveCleanup;
}

export interface NamespacedExtensionSet {
  readonly directives: readonly StarDirective[];
  readonly helpers: readonly (readonly [string, unknown])[];
  readonly namespace: string;
}

export interface DirectiveRegistry {
  clear(): void;
  definitions(): readonly StarDirective[];
  helpers(): StarExpressionHelperScope;
  preparePluginInstall(registrations: readonly NamespacedExtensionSet[]): () => void;
  resolve(attribute: string): StarDirective | undefined;
  resolveHelper(name: string): StarExpressionHelperRecord | undefined;
}

const directiveIdPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const attributePattern = /^data-[a-z0-9][a-z0-9._:-]*$/;
const helperPathPattern = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;
const reservedHelperRoots = new Set([
  "action",
  "args",
  "computed",
  "console",
  "document",
  "el",
  "event",
  "evt",
  "fetch",
  "globalThis",
  "helpers",
  "history",
  "instance",
  "location",
  "navigator",
  "root",
  "signals",
  "state",
  "this",
  "window",
]);
const reservedHelperSegments = new Set(["__proto__", "constructor", "prototype"]);

function isRecord(value: unknown): value is Record<string, unknown> {
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

function assertDirectiveId(id: unknown, namespace: string): asserts id is string {
  if (typeof id !== "string" || !directiveIdPattern.test(id)) {
    throw new Error(
      `Plugin ${namespace} directive IDs must be dot-qualified lowercase names: ${String(id)}.`,
    );
  }
  if (!id.startsWith(`${namespace}.`)) {
    throw new Error(`Plugin ${namespace} cannot register directive outside its namespace: ${id}.`);
  }
}

function matcherValue(matcher: StarDirectiveMatcher): { kind: "name" | "prefix"; value: string } {
  if (!isRecord(matcher)) throw new Error("A jQStar directive matcher must be an object.");
  const keys = Object.keys(matcher);
  const hasName = Object.hasOwn(matcher, "name");
  const hasPrefix = Object.hasOwn(matcher, "prefix");
  if (keys.length !== 1 || hasName === hasPrefix) {
    throw new Error("A jQStar directive matcher needs exactly one name or prefix.");
  }
  const kind = hasName ? "name" : "prefix";
  const value = matcher[kind];
  if (typeof value !== "string" || !attributePattern.test(value) || value !== value.toLowerCase()) {
    throw new Error(
      `A jQStar directive ${kind} must be a lowercase data-* attribute: ${String(value)}.`,
    );
  }
  if (kind === "prefix" && !value.endsWith(":")) {
    throw new Error(`A jQStar directive prefix must end with a colon: ${value}.`);
  }
  return { kind, value };
}

function ownedMatcher(matcher: StarDirectiveMatcher, namespace: string): void {
  const { kind, value } = matcherValue(matcher);
  const prefix = `data-${namespace}:`;
  if (!value.startsWith(prefix) || (kind === "name" && value.length === prefix.length)) {
    throw new Error(
      `Plugin ${namespace} directive attributes must be below its ${prefix} namespace: ${value}.`,
    );
  }
}

function overlapsMatcher(left: StarDirectiveMatcher, right: StarDirectiveMatcher): boolean {
  const first = matcherValue(left);
  const second = matcherValue(right);
  if (first.kind === "name" && second.kind === "name") return first.value === second.value;
  if (first.kind === "prefix" && second.kind === "prefix") {
    return first.value.startsWith(second.value) || second.value.startsWith(first.value);
  }
  const exact = first.kind === "name" ? first.value : second.value;
  const prefix = first.kind === "prefix" ? first.value : second.value;
  return exact.startsWith(prefix);
}

function snapshotDirective(directive: StarDirective, namespace: string): StarDirective {
  if (!directive || typeof directive !== "object") {
    throw new Error(`Plugin ${namespace} directive registrations must be objects.`);
  }
  assertDirectiveId(directive.id, namespace);
  ownedMatcher(directive.match, namespace);
  const priority = directive.priority ?? 0;
  if (!Number.isInteger(priority) || priority < -1000 || priority > 1000) {
    throw new Error(
      `Directive ${directive.id} priority must be an integer from -1000 through 1000.`,
    );
  }
  if (directive.parse !== undefined && typeof directive.parse !== "function") {
    throw new Error(`Directive ${directive.id} parse must be a function.`);
  }
  if (typeof directive.mount !== "function") {
    throw new Error(`Directive ${directive.id} mount must be a function.`);
  }
  if (directive.update !== undefined && typeof directive.update !== "function") {
    throw new Error(`Directive ${directive.id} update must be a function.`);
  }
  const match = Object.freeze({ ...directive.match }) as StarDirectiveMatcher;
  return Object.freeze({
    id: directive.id,
    match,
    priority,
    ...(directive.parse ? { parse: directive.parse } : {}),
    mount: directive.mount,
    ...(directive.update ? { update: directive.update } : {}),
  });
}

function assertHelper(name: unknown, namespace: string): asserts name is string {
  if (typeof name !== "string" || !helperPathPattern.test(name)) {
    throw new Error(
      `Plugin ${namespace} helper names must be dotted JavaScript identifiers: ${String(name)}.`,
    );
  }
  if (!helperPathPattern.test(namespace) || !name.startsWith(`${namespace}.`)) {
    throw new Error(`Plugin ${namespace} cannot register helper outside its namespace: ${name}.`);
  }
  const segments = name.split(".");
  const root = segments[0]!;
  if (reservedHelperRoots.has(root)) {
    throw new Error(`Expression helper root ${root} is reserved by jQStar.`);
  }
  const unsafe = segments.find((segment) => reservedHelperSegments.has(segment));
  if (unsafe) throw new Error(`Expression helper segment ${unsafe} is reserved by jQStar.`);
}

function overlappingPath(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`);
}

function buildHelperScope(entries: ReadonlyMap<string, unknown>): StarExpressionHelperScope {
  const root = Object.create(null) as Record<string, unknown>;
  const containers: Record<string, unknown>[] = [root];
  for (const [name, value] of entries) {
    const segments = name.split(".");
    const leaf = segments.pop()!;
    let parent = root;
    for (const segment of segments) {
      const child = parent[segment];
      if (child && typeof child === "object") {
        parent = child as Record<string, unknown>;
      } else {
        const created = Object.create(null) as Record<string, unknown>;
        parent[segment] = created;
        containers.push(created);
        parent = created;
      }
    }
    parent[leaf] = value;
  }
  for (const container of [...containers].reverse()) Object.freeze(container);
  return root;
}

function buildHelperRecords(
  entries: ReadonlyMap<string, unknown>,
): ReadonlyMap<string, StarExpressionHelperRecord> {
  return new Map(
    [...entries].map(([name, value]) => [name, Object.freeze({ name, value })] as const),
  );
}

function builtinDirective<Parsed>(directive: StarDirective<Parsed>): StarDirective<Parsed> {
  return Object.freeze({
    ...directive,
    match: Object.freeze({ ...directive.match }) as StarDirectiveMatcher,
    priority: directive.priority ?? 0,
  });
}

function builtinDirectives(): readonly StarDirective[] {
  const text = builtinDirective<string>({
    id: "core.text",
    match: { name: "data-text" },
    mount({ attribute, context, effect, expressions, $element }) {
      const evaluate = expressions.compileValue(attribute.value, { attribute: attribute.name });
      effect(() => $element.text(String(evaluate(context) ?? "")));
    },
  });
  const destroy = builtinDirective<string>({
    id: "core.destroy",
    match: { name: "data-destroy" },
    mount({ attribute, cleanup, context, expressions, report }) {
      const execute = expressions.compileStatement(attribute.value, {
        attribute: attribute.name,
      });
      cleanup(() => {
        const result = execute(context);
        if (isThenable(result)) void Promise.resolve(result).catch(report);
      });
    },
  });
  return Object.freeze([text, destroy]);
}

function matchesAttribute(directive: StarDirective, attribute: string): boolean {
  return "name" in directive.match
    ? directive.match.name === attribute
    : attribute.startsWith(directive.match.prefix);
}

export function directiveAttribute<Parsed>(
  directive: StarDirective<Parsed>,
  name: string,
  value: string,
): StarDirectiveAttribute {
  const matcher = matcherValue(directive.match);
  return Object.freeze({
    name,
    suffix: matcher.kind === "prefix" ? name.slice(matcher.value.length) : "",
    value,
  });
}

export function parseDirectiveAttribute<Parsed>(
  directive: StarDirective<Parsed>,
  attribute: StarDirectiveAttribute,
): StarParsedDirectiveAttribute<Parsed> {
  const parsed = directive.parse
    ? directive.parse(attribute)
    : (attribute.value as unknown as Parsed);
  return Object.freeze({ ...attribute, parsed });
}

export function createDirectiveRegistry(): DirectiveRegistry {
  let directives: readonly StarDirective[] = builtinDirectives();
  let helperEntries = new Map<string, unknown>();
  let helperRecords = buildHelperRecords(helperEntries);
  let helperScope = buildHelperScope(helperEntries);

  return {
    definitions: () => directives,
    helpers: () => helperScope,
    resolve: (attribute) => directives.find((directive) => matchesAttribute(directive, attribute)),
    resolveHelper: (name) => helperRecords.get(name),
    preparePluginInstall(registrations) {
      const candidateDirectives = [...directives];
      const candidateHelpers = new Map(helperEntries);
      for (const registration of registrations) {
        for (const input of registration.directives) {
          const directive = snapshotDirective(input, registration.namespace);
          const duplicateId = candidateDirectives.find((current) => current.id === directive.id);
          if (duplicateId) throw new Error(`Directive ID ${directive.id} is already registered.`);
          const overlap = candidateDirectives.find((current) =>
            overlapsMatcher(current.match, directive.match),
          );
          if (overlap) {
            throw new Error(
              `Directive ${directive.id} matcher overlaps registered directive ${overlap.id}.`,
            );
          }
          candidateDirectives.push(directive);
        }
        for (const [inputName, value] of registration.helpers) {
          assertHelper(inputName, registration.namespace);
          const overlap = [...candidateHelpers.keys()].find((name) =>
            overlappingPath(name, inputName),
          );
          if (overlap) {
            throw new Error(
              `Expression helper ${inputName} overlaps registered helper ${overlap}.`,
            );
          }
          candidateHelpers.set(inputName, value);
        }
      }
      const nextDirectives = Object.freeze(candidateDirectives);
      const nextHelpers = new Map(candidateHelpers);
      const nextHelperRecords = buildHelperRecords(nextHelpers);
      const nextScope = buildHelperScope(nextHelpers);
      let committed = false;
      return () => {
        if (committed) return;
        committed = true;
        directives = nextDirectives;
        helperEntries = nextHelpers;
        helperRecords = nextHelperRecords;
        helperScope = nextScope;
      };
    },
    clear() {
      directives = Object.freeze([]);
      helperEntries.clear();
      helperRecords = buildHelperRecords(helperEntries);
      helperScope = buildHelperScope(helperEntries);
    },
  };
}
