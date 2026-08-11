import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "apps/web/.next/**",
      "apps/api/dist/**",
      "packages/*/dist/**",
      "packages/database/generated/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        React: "readonly",
        URL: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
