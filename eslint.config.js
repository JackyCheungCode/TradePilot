import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".wrangler/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },
  {
    files: ["worker/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.worker, ...globals.es2022 },
    },
  },
  {
    files: ["src/features/**/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "zod", "@supabase/supabase-js"],
          patterns: [
            "@cloudflare/*",
            "**/application/**",
            "**/infrastructure/**",
            "**/presentation/**",
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "@supabase/supabase-js"],
          patterns: [
            "@cloudflare/*",
            "**/infrastructure/**",
            "**/presentation/**",
          ],
        },
      ],
    },
  },
  prettier,
);
