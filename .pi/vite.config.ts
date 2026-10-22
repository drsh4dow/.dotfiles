import type { DummyRuleMap } from "vite-plus/lint";
import { defineConfig } from "vite-plus";

const ignorePatterns = [
  ".agent/**",
  ".agents/**",
  ".claude/**",
  ".codex/**",
  ".continue/**",
  ".cursor/**",
  ".gemini/**",
  ".opencode/**",
  ".pi/**",
  ".roo/**",
  ".windsurf/**",
  "tools/oxlint/anti-slop/**",
];

const esnextRuntime: DummyRuleMap = {
  "oxc/no-async-await": "off",
  "oxc/no-optional-chaining": "off",
  "oxc/no-rest-spread-properties": "off",
};

const ruleConflictResolutions: DummyRuleMap = {
  "eslint/init-declarations": "off",
  "eslint/no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
  "eslint/no-ternary": "off",
  "eslint/no-undefined": "off",
  "eslint/prefer-destructuring": ["error", { array: false, object: true }, {}],
  "eslint/require-await": "off",
  "typescript/require-await": "off",
};

const effectConventions: DummyRuleMap = {
  "eslint/id-length": ["error", { checkGeneric: false }],
  "eslint/new-cap": ["error", { capIsNewExceptionPattern: "^(Config|Data|Schema)\\." }],
  "eslint/no-redeclare": "off",
};

const sdkInterop: DummyRuleMap = {
  "eslint/class-methods-use-this": ["error", { ignoreClassesWithImplements: "all" }],
  "typescript/prefer-readonly-parameter-types": [
    "error",
    {
      allow: [
        { from: "lib", name: "RegExp" },
        { from: "file", name: ["RecordingUI", "SdkSession"] },
        { from: "package", name: "TestContext", package: "node:test" },
        { from: "package", name: "Effect", package: "effect" },
        {
          from: "package",
          name: ["FauxProviderHandle", "Model"],
          package: "@earendil-works/pi-ai",
        },
        {
          from: "package",
          name: [
            "BashOperations",
            "BuildSystemPromptOptions",
            "ExtensionAPI",
            "ExtensionCommandContext",
            "ExtensionContext",
            "NormalizedBuildSystemPromptOptions",
            "SessionManager",
            "SessionMessageEntry",
            "Settings",
            "SettingsManager",
            "Theme",
          ],
          package: "@earendil-works/pi-coding-agent",
        },
      ],
      ignoreInferredTypes: true,
      treatMethodsAsReadonly: true,
    },
  ],
  "unicorn/no-useless-undefined": ["error", { checkArrowFunctionBody: false }],
};

const houseStyle: DummyRuleMap = {
  "eslint/capitalized-comments": ["error", "always", { ignoreConsecutiveComments: true }],
  "eslint/func-style": ["error", "declaration", { allowArrowFunctions: true }],
  "eslint/no-magic-numbers": [
    "error",
    {
      ignore: [-1, 0, 1],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      ignoreNumericLiteralTypes: true,
      ignoreTypeIndexes: true,
    },
  ],
  "eslint/one-var": ["error", "never"],
};

export default defineConfig({
  fmt: {
    // Pi rewrites settings.json with JSON.stringify(_, null, 2) whenever settings change.
    ignorePatterns: [...ignorePatterns, "agent/settings.json"],
  },
  lint: {
    categories: {
      correctness: "error",
      pedantic: "error",
      perf: "error",
      restriction: "error",
      style: "error",
      suspicious: "error",
    },
    ignorePatterns,
    jsPlugins: [
      { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
      {
        name: "anti-slop-effect",
        specifier: "./tools/oxlint/anti-slop/effect/index.ts",
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      ...esnextRuntime,
      ...ruleConflictResolutions,
      ...effectConventions,
      ...sdkInterop,
      ...houseStyle,
      "anti-slop-effect/no-manual-effect-error-tag": "error",
      "anti-slop-effect/no-manual-tag-comparison": "error",
      "anti-slop-effect/no-manual-tagged-construction": "error",
      "anti-slop-effect/no-service-constructor-imports": "error",
      "anti-slop-effect/prefer-effect-match": "error",
      "anti-slop/no-array-filter-map": "error",
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reduce-accumulator-copy": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-runtime-typeof": "error",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-readable-spacing": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "error",
      "oxc/no-accumulating-spread": "error",
      "typescript/await-thenable": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/no-array-delete": "error",
      "typescript/no-base-to-string": "error",
      "typescript/no-confusing-void-expression": "error",
      "typescript/no-deprecated": "error",
      "typescript/no-duplicate-type-constituents": "error",
      "typescript/no-dynamic-delete": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-extraneous-class": "error",
      "typescript/no-floating-promises": [
        "error",
        {
          allowForKnownSafeCalls: [
            { from: "package", name: ["test", "it", "suite", "describe"], package: "node:test" },
          ],
        },
      ],
      "typescript/no-for-in-array": "error",
      "typescript/no-implied-eval": "error",
      "typescript/no-invalid-void-type": ["error", { allowAsThisParameter: true }],
      "typescript/no-meaningless-void-operator": "error",
      "typescript/no-misused-promises": "error",
      "typescript/no-misused-spread": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/no-redundant-type-constituents": "error",
      "typescript/no-unnecessary-boolean-literal-compare": "error",
      "typescript/no-unnecessary-condition": "error",
      "typescript/no-unnecessary-template-expression": "error",
      "typescript/no-unnecessary-type-arguments": "error",
      "typescript/no-unnecessary-type-assertion": "error",
      "typescript/no-unnecessary-type-conversion": "error",
      "typescript/no-unnecessary-type-parameters": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-enum-comparison": "error",
      "typescript/no-unsafe-function-type": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-unsafe-type-assertion": "error",
      "typescript/no-unsafe-unary-minus": "error",
      "typescript/only-throw-error": "error",
      "typescript/prefer-nullish-coalescing": "error",
      "typescript/prefer-optional-chain": "error",
      "typescript/prefer-promise-reject-errors": "error",
      "typescript/prefer-reduce-type-parameter": "error",
      "typescript/prefer-return-this-type": "error",
      "typescript/related-getter-setter-pairs": "error",
      "typescript/restrict-plus-operands": "error",
      "typescript/restrict-template-expressions": "error",
      "typescript/return-await": "error",
      "typescript/strict-boolean-expressions": ["error", { allowNullableBoolean: true }],
      "typescript/strict-void-return": "error",
      "typescript/switch-exhaustiveness-check": "error",
      "typescript/unbound-method": "error",
      "typescript/use-unknown-in-catch-callback-variable": "error",
    },
  },
});
