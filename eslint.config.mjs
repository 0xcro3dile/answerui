import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["next", "next/*", "react", "react-dom", "openai", "openai/*"] },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "public/scene/**",
    "next-env.d.ts",
    "playwright-report/**",
  ]),
]);
