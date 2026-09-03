import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import ts from "typescript";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function valueImport(statement) {
  if (!ts.isImportDeclaration(statement)) return true;
  const clause = statement.importClause;
  if (!clause || !clause.isTypeOnly) {
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) return true;
    return (
      clause.name !== undefined || clause.namedBindings.elements.some((item) => !item.isTypeOnly)
    );
  }
  return false;
}

function parsedModule(source, path) {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports = [];
  const violations = [];
  const unwrap = (node) => {
    let current = node;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current)
    ) {
      current = current.expression;
    }
    return current;
  };
  const memberName = (node) => {
    const current = unwrap(node);
    if (ts.isIdentifier(current)) return current.text;
    if (ts.isPropertyAccessExpression(current)) return current.name.text;
    if (
      ts.isElementAccessExpression(current) &&
      current.argumentExpression &&
      (ts.isStringLiteral(current.argumentExpression) ||
        ts.isNoSubstitutionTemplateLiteral(current.argumentExpression))
    ) {
      return current.argumentExpression.text;
    }
    return null;
  };
  const callableName = (node) => {
    const current = unwrap(node);
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.CommaToken) {
      return callableName(current.right);
    }
    const name = memberName(current);
    if (
      (name === "call" || name === "apply") &&
      (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current))
    ) {
      return callableName(current.expression);
    }
    return name;
  };
  const stringValue = (node) => {
    const current = node ? unwrap(node) : null;
    return current && (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current))
      ? current.text
      : null;
  };
  const recordCall = (node) => {
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      violations.push({ kind: "dynamic-import", path, position: node.pos });
      return;
    }
    const callee = callableName(node.expression);
    if (callee === "eval" || callee === "Function") {
      violations.push({ kind: callee, path, position: node.pos });
    }
    if (
      (callee === "setTimeout" || callee === "setInterval") &&
      stringValue(node.arguments[0]) !== null
    ) {
      violations.push({ kind: "string-timer", path, position: node.pos });
    }
    if (callee === "createObjectURL") {
      violations.push({ kind: "blob-url-construction", path, position: node.pos });
    }
    if (
      callee === "setAttribute" &&
      stringValue(node.arguments[0])?.toLowerCase() === "src" &&
      /^(?:blob|data):/i.test(stringValue(node.arguments[1]) ?? "")
    ) {
      violations.push({ kind: "data-script-url", path, position: node.pos });
    }
    if (ts.isIdentifier(node.expression)) {
      if (
        node.expression.text === "require" &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        imports.push(node.arguments[0].text);
      }
    }
    if (
      ts.isPropertyAccessExpression(node.expression) &&
      ["compile", "compileStreaming", "instantiate", "instantiateStreaming"].includes(
        node.expression.name.text,
      ) &&
      memberName(node.expression.expression) === "WebAssembly"
    ) {
      violations.push({ kind: "webassembly-compilation", path, position: node.pos });
    }
    if (
      (callee === "createElement" || callee === "createElementNS") &&
      node.arguments.some((argument) => stringValue(argument)?.toLowerCase() === "script")
    ) {
      violations.push({ kind: "script-element-generation", path, position: node.pos });
    }
  };
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      valueImport(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node)) {
      recordCall(node);
    } else if (ts.isNewExpression(node) && callableName(node.expression) === "Function") {
      violations.push({ kind: "Function", path, position: node.pos });
    } else if (ts.isNewExpression(node) && callableName(node.expression) === "Blob") {
      violations.push({ kind: "blob-construction", path, position: node.pos });
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(unwrap(node.left)) &&
      memberName(node.left) === "src" &&
      /^(?:blob|data):/i.test(stringValue(node.right) ?? "")
    ) {
      violations.push({ kind: "data-script-url", path, position: node.pos });
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(unwrap(node.left)) &&
      ["text", "textContent"].includes(memberName(node.left) ?? "") &&
      ts.isIdentifier(unwrap(node.left).expression) &&
      /script/i.test(unwrap(node.left).expression.text)
    ) {
      violations.push({ kind: "script-text-injection", path, position: node.pos });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { imports, violations };
}

export function cspCodeViolations(source, path = "inline.js") {
  return parsedModule(source, path).violations;
}

async function resolveModule(importer, specifier, profile) {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(importer), specifier);
  const candidates =
    profile === "source"
      ? [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]
      : [base, extname(base) ? base : `${base}.js`, extname(base) ? base : `${base}.cjs`];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error(`CSP ${profile} graph cannot resolve ${specifier} from ${importer}.`);
}

async function inspectGraph(entry, root, profile) {
  const pending = [resolve(entry)];
  const files = new Map();
  const externals = new Set();
  const violations = [];
  while (pending.length > 0) {
    const path = pending.pop();
    if (files.has(path)) continue;
    const source = await readFile(path, "utf8");
    files.set(path, source);
    const parsed = parsedModule(source, path);
    violations.push(...parsed.violations);
    for (const specifier of parsed.imports) {
      const resolved = await resolveModule(path, specifier, profile);
      if (resolved) pending.push(resolved);
      else externals.add(specifier);
    }
  }
  const paths = [...files.keys()].sort();
  const digest = createHash("sha256");
  for (const path of paths) {
    const name = relative(root, path).replaceAll("\\", "/");
    digest.update(name);
    digest.update("\0");
    digest.update(files.get(path));
    digest.update("\0");
  }
  return {
    digest: digest.digest("hex"),
    externals: [...externals].sort(),
    files: paths.map((path) => relative(root, path).replaceAll("\\", "/")),
    violations: violations.map((violation) => ({
      ...violation,
      path: relative(root, violation.path).replaceAll("\\", "/"),
    })),
  };
}

export async function inspectCSPGraphs(repositoryRoot, distributionRoot) {
  const source = await inspectGraph(join(repositoryRoot, "src/csp.ts"), repositoryRoot, "source");
  const esm = await inspectGraph(join(distributionRoot, "csp.js"), distributionRoot, "emitted");
  const commonjs = await inspectGraph(
    join(distributionRoot, "csp.cjs"),
    distributionRoot,
    "emitted",
  );
  const forbiddenSource = source.files.filter(
    (path) => path === "src/expression.ts" || path === "src/trusted-runtime.ts",
  );
  const forbiddenEmitted = [...esm.files, ...commonjs.files].filter(
    (path) => path.startsWith("trusted-runtime-") || path === "core.js" || path === "core.cjs",
  );
  return {
    schema: "jqstar-csp-graph/1",
    source,
    formats: { commonjs, esm },
    forbiddenModules: [...new Set([...forbiddenSource, ...forbiddenEmitted])],
  };
}
