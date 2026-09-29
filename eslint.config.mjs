import js from "@eslint/js"
import nextPlugin from "@next/eslint-plugin-next"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/next-env.d.ts", "apps/api/drizzle/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },
  {
    files: ["apps/api/**/*.{ts,mjs}", "scripts/**/*.mjs", "*.mjs", "apps/*/*.{mjs,ts}"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["apps/crm/**/*.{ts,tsx}", "apps/storefront/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["apps/storefront/**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules, ...nextPlugin.configs["core-web-vitals"].rules },
    settings: { next: { rootDir: "apps/storefront" } },
  },
)
