export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["coverage/**", "demo-dist/**", "dist/**", "server-dist/**", "node_modules/**"],
  overrides: [
    {
      files: ["test/fixtures/navigation-decision/style.css"],
      rules: { "at-rule-empty-line-before": null, "rule-empty-line-before": null },
    },
    {
      files: ["e2e/fixtures/jquery-ui-migration/style.css"],
      rules: { "media-feature-range-notation": "prefix" },
    },
  ],
  rules: {
    "alpha-value-notation": "number",
    "at-rule-no-unknown": [true, { ignoreAtRules: ["apply", "theme"] }],
    "color-function-notation": "modern",
    "custom-property-pattern": null,
    "declaration-block-no-redundant-longhand-properties": null,
    "declaration-empty-line-before": null,
    "declaration-block-no-duplicate-properties": true,
    "hue-degree-notation": null,
    "import-notation": null,
    "lightness-notation": null,
    "no-descending-specificity": null,
    "property-no-deprecated": null,
    "selector-class-pattern": null,
    "value-keyword-case": null,
  },
};
