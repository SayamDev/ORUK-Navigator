import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "@/server/**"],
              message: "Browser-capable components must use a server-owned application boundary.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "coverage/**", "playwright-report/**", "test-results/**"]),
]);
