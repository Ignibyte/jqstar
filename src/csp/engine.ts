import type {
  StarExpressionEngine,
  StarExpressionLocation,
  StarStatementEvaluator,
  StarValueEvaluator,
} from "../expression-types";
import type { StarContext } from "../types";
import type { CSPExpressionNode, CSPProgramNode } from "./ast";
import { CSP_CONTRACT_DIGEST, CSP_GRAMMAR_VERSION, type CSPEntryKind } from "./contract";
import { cspError } from "./diagnostics";
import { evaluateCSP } from "./evaluator";
import { parseCSP } from "./parser";

export const CSP_CACHE_LIMITS = Object.freeze({ entries: 128, bytes: 262_144 });
const cspExpressionEngines = new WeakSet<StarExpressionEngine>();

interface CacheEntry {
  readonly bytes: number;
  readonly evaluator: StarValueEvaluator | StarStatementEvaluator;
  readonly program: CSPExpressionNode | CSPProgramNode;
}

function locationKey(location: StarExpressionLocation | undefined): readonly unknown[] {
  return [location?.attribute ?? null, location?.line ?? null, location?.column ?? null];
}

function normalizedLocation(
  location: StarExpressionLocation | undefined,
): StarExpressionLocation | undefined {
  if (!location) return undefined;
  return Object.freeze({
    ...(location.attribute === undefined ? {} : { attribute: location.attribute }),
    ...(location.line === undefined ? {} : { line: location.line }),
    ...(location.column === undefined ? {} : { column: location.column }),
  });
}

export function createCSPExpressionEngine(): StarExpressionEngine {
  const cache = new Map<string, CacheEntry>();
  let cacheBytes = 0;
  let disposed = false;

  const compile = (
    entryKind: CSPEntryKind,
    source: string,
    inputLocation?: StarExpressionLocation,
  ): StarValueEvaluator | StarStatementEvaluator => {
    if (disposed) {
      throw cspError("CSP_ENGINE_DISPOSED", "evaluate", String(source ?? ""), 0, 0, inputLocation);
    }
    const location = normalizedLocation(inputLocation);
    const key = JSON.stringify([
      CSP_GRAMMAR_VERSION,
      CSP_CONTRACT_DIGEST,
      entryKind,
      source,
      ...locationKey(location),
    ]);
    let entry = cache.get(key);
    if (entry) {
      cache.delete(key);
      cache.set(key, entry);
      return entry.evaluator;
    } else {
      const program = parseCSP(source, entryKind, location);
      const bytes = source.length * 2 + key.length * 2;
      const evaluator = (context: StarContext): unknown => {
        if (disposed) {
          throw cspError("CSP_ENGINE_DISPOSED", "evaluate", source, 0, source.length, location);
        }
        return evaluateCSP(program, source, context, location, () => !disposed);
      };
      entry = Object.freeze({ bytes, evaluator, program });
      if (bytes <= CSP_CACHE_LIMITS.bytes) {
        cache.set(key, entry);
        cacheBytes += bytes;
        while (cache.size > CSP_CACHE_LIMITS.entries || cacheBytes > CSP_CACHE_LIMITS.bytes) {
          const oldest = cache.keys().next().value as string | undefined;
          if (oldest === undefined) break;
          cacheBytes -= cache.get(oldest)!.bytes;
          cache.delete(oldest);
        }
      }
      return evaluator;
    }
  };

  const engine = Object.freeze<StarExpressionEngine>({
    compileValue: (source: string, location?: StarExpressionLocation) =>
      compile("value", source, location) as StarValueEvaluator,
    compileStatement: (source: string, location?: StarExpressionLocation) =>
      compile("statement", source, location) as StarStatementEvaluator,
    clearCache() {
      if (disposed) {
        throw cspError("CSP_ENGINE_DISPOSED", "evaluate", "", 0, 0);
      }
      cache.clear();
      cacheBytes = 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cache.clear();
      cacheBytes = 0;
    },
  });
  cspExpressionEngines.add(engine);
  return engine;
}

export function isCSPExpressionEngine(engine: StarExpressionEngine): boolean {
  return cspExpressionEngines.has(engine);
}
