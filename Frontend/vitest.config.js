import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * تستِ واحد برای منطقِ خالص (`src/**\/domain`، `src/shared/lib`، `tools/`) — جدا از `vite.config.js`
 * تا PWA، dev-inspector و React Compiler در تست بار نشوند و اجرا در Node چند صد میلی‌ثانیه باشد.
 * تست کنارِ فایل است: `x.js` → `x.test.js`. راهنما: docs/architecture/13-recipes.md (نوشتنِ تست).
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js", "tools/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/domain/**/*.js", "src/shared/lib/**/*.js", "tools/**/*.js"],
      exclude: ["**/*.test.js", "src/shared/lib/persianProvinces.js", "tools/dev-inspector/client.js"],
      reporter: ["text-summary", "html"],
      reportsDirectory: "coverage",
    },
  },
});
