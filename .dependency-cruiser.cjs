/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Runtime and application layers must remain acyclic.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-unresolved",
      severity: "error",
      comment: "Every static dependency must resolve.",
      from: { pathNot: "^scripts/smoke-built\\.mjs$" },
      to: { couldNotResolve: true },
    },
    {
      name: "no-unresolved-built-smoke",
      severity: "error",
      comment: "The built-package smoke test may reference only its two generated bundle inputs.",
      from: { path: "^scripts/smoke-built\\.mjs$" },
      to: {
        couldNotResolve: true,
        pathNot: "^\\.\\./dist/(?:jquery-star\\.js|jquery-star\\.umd\\.cjs)$",
      },
    },
    {
      name: "no-production-to-tests",
      severity: "error",
      from: { path: "^(src|server|registry/blocks|bin)/" },
      to: { path: "^(test|e2e)/" },
    },
    {
      name: "no-runtime-to-application-source",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^(server|registry|example|test|e2e|bin|scripts)/" },
    },
    {
      name: "no-server-to-ui",
      severity: "error",
      from: { path: "^server/" },
      to: { path: "^src/ui/" },
    },
    {
      name: "no-core-to-ui-except-compatibility-runtime",
      severity: "error",
      from: { path: "^src/(?!ui/|ui\\.ts$|runtime\\.ts$)" },
      to: { path: "^src/ui/" },
    },
    {
      name: "no-ui-to-request-or-expression-internals",
      severity: "error",
      from: { path: "^src/ui/" },
      to: { path: "^src/(fetch|patch|sse|expression|declarative|runtime)\\.ts$" },
    },
    {
      name: "no-production-dev-dependencies",
      severity: "error",
      from: { path: "^(src|server|registry/blocks|bin)/" },
      to: {
        dependencyTypes: ["npm-dev", "npm-optional"],
        pathNot: "^node_modules/jquery/",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "^(dist|demo-dist|server-dist|coverage|playwright-report|test-results)/" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["types", "import", "require", "default"],
    },
  },
};
