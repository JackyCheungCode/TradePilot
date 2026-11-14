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
    files: ["src/components/common/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            "@/shared/ui/primitives",
            "@/shared/ui/data-views",
            "@/shared/ui/page-layout",
            "@/shared/lib/utils",
            "clsx",
            "tailwind-merge",
          ],
          patterns: ["@/shared/ui/*"],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='className'] > Literal[value=/\\b(?:flex|grid|block|inline-flex|items-|justify-|gap-|space-|p-|px-|py-|m-|mx-|my-|w-|h-|rounded-|shadow-|bg-|text-|border-)/]",
          message: "公共 Carbon 封装不得使用 Tailwind utility class；布局与视觉必须由 Carbon 官方组件及主题负责。",
        },
      ],
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
