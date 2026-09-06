import { readdirSync } from "node:fs";
import { expect, it } from "vitest";
import ts from "typescript";
import { runtimePrivateProperties } from "../config/runtime-private-properties";

it("restricts property minification to private members of the shared runtime", () => {
  const names = new Set<string>(runtimePrivateProperties);
  const declared = new Set<string>();
  const owners = new Set([
    "src/kernel.ts",
    "src/observation.ts",
    "src/runtime.ts",
    "src/declarative.ts",
  ]);
  const violations: string[] = [];
  const paths = readdirSync("src", { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts"))
    .map((path) => "src/" + path);
  const program = ts.createProgram(paths, { noResolve: true, noLib: true });
  const checker = program.getTypeChecker();
  const isSelf = (expression: ts.Expression): boolean => {
    if (expression.kind === ts.SyntaxKind.ThisKeyword) return true;
    if (!ts.isIdentifier(expression)) return false;
    const declarations = checker.getSymbolAtLocation(expression)?.declarations;
    const declaration = declarations?.length === 1 ? declarations[0] : undefined;
    return (
      declaration !== undefined &&
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer?.kind === ts.SyntaxKind.ThisKeyword &&
      (declaration.parent.flags & ts.NodeFlags.Const) !== 0
    );
  };
  for (const path of paths) {
    const source = program.getSourceFile(path)!;
    const visit = (node: ts.Node): void => {
      if (
        (ts.isPropertyDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isPropertyAccessExpression(node) ||
          ts.isPropertySignature(node) ||
          ts.isMethodSignature(node) ||
          ts.isPropertyAssignment(node)) &&
        node.name &&
        names.has(
          ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
            ? node.name.text
            : node.name.getText(source),
        )
      ) {
        const name =
          ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
            ? node.name.text
            : node.name.getText(source);
        if (ts.isPropertyAccessExpression(node) && !isSelf(node.expression))
          violations.push(`${path}: ${name} is accessed through a non-private receiver`);
        if (!owners.has(path)) violations.push(`${path}: property ${name} escaped the runtime`);
        if (ts.isPropertyDeclaration(node) || ts.isMethodDeclaration(node)) {
          if (!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword))
            violations.push(`${path}: ${name} is not private`);
          declared.add(name);
        }
        if (
          ts.isPropertySignature(node) ||
          ts.isMethodSignature(node) ||
          ts.isPropertyAssignment(node)
        )
          violations.push(`${path}: ${name} appears in an interface or data object`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(violations).toEqual([]);
  expect([...declared].sort()).toEqual([...names].sort());
});
