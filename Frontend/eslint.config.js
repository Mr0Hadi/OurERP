import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
  {
    // جدول‌های مسیر: کنارِ هم بودنِ `lazy()`ها و آرایه‌ی مسیرها عمدی است.
    // مرزِ Fast Refresh اینجا معنا ندارد — این فایل‌ها کامپوننت رندر
    // نمی‌کنند، فقط نگاشتِ مسیر به صفحه‌اند.
    files: ["**/routes.jsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // کامپوننت‌های پایه‌ی shadcn: این فایل‌ها با CLI تولید/به‌روز می‌شوند و طبق
    // قرارداد shadcn، `*Variants` و هوک‌ها را کنار کامپوننت export می‌کنند.
    // جابه‌جا کردنشان با هر `shadcn add` دوباره بازنویسی می‌شود.
    files: [
      "src/shared/components/ui/badge.jsx",
      "src/shared/components/ui/button.jsx",
      "src/shared/components/ui/direction.jsx",
      "src/shared/components/ui/sidebar.jsx",
      "src/shared/components/ui/tabs.jsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // فایل‌هایی که در Node اجرا می‌شوند، نه در مرورگر.
    files: ["vite.config.js", "structure.js", "scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
