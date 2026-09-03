import { readFileSync } from "node:fs";
import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import tseslint from "typescript-eslint";

const metrics = JSON.parse(
  readFileSync(new URL("./quality/metrics.json", import.meta.url), "utf8"),
);
const requestedComplexity = Number(
  process.env.JQS_MAX_COGNITIVE_COMPLEXITY ?? metrics.sonarjs.cognitiveComplexityMaximum,
);
if (!Number.isFinite(requestedComplexity) || requestedComplexity < 0)
  throw new Error("Invalid JQS_MAX_COGNITIVE_COMPLEXITY.");
const cognitiveComplexityMaximum = Math.min(
  metrics.sonarjs.cognitiveComplexityMaximum,
  requestedComplexity,
);

export default tseslint.config(
  {
    ignores: ["coverage/**", "demo-dist/**", "dist/**", "server-dist/**", "node_modules/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ["**/*.{ts,mts}"],
    plugins: { sonarjs },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-arguments": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-conversion": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowBoolean: true, allowNullish: true, allowNumber: true },
      ],
      "@typescript-eslint/unified-signatures": "off",
      "sonarjs/cognitive-complexity": ["error", cognitiveComplexityMaximum],
      "sonarjs/no-duplicated-branches": "error",
      "sonarjs/no-identical-conditions": "error",
      "sonarjs/no-inverted-boolean-check": "error",
      "sonarjs/no-nested-switch": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["test/**/*.ts", "e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-misused-spread": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  {
    files: ["src/expression.ts"],
    rules: { "@typescript-eslint/no-implied-eval": "off" },
  },
  {
    files: ["src/ui/clipboard-write.ts"],
    rules: { "@typescript-eslint/no-deprecated": "off" },
  },
  {
    files: ["bin/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["test/**/*.mjs", "e2e/**/*.mjs", "quality/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["e2e/fixtures/interoperability-recorder.js"],
    languageOptions: { globals: globals.browser },
  },
  prettier,
);
