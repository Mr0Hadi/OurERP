/**
 * یک resolve hook برای Node تا ماژول‌های src/ را همان‌طور که Vite
 * می‌بیند بفهمد.
 *
 * دو قرارداد پروژه که Node به‌تنهایی نمی‌شناسد:
 *   ۱. import بدون پسوند  →  `import x from "./foo"`
 *   ۲. alias مسیر ریشه    →  `import x from "@/features/..."`
 *
 * استفاده در هر اسکریپت scripts/:
 *
 *   import { register } from "node:module";
 *   register("./extensionless-resolver.js", import.meta.url);
 *   const mod = await import("../src/...");   // ← باید dynamic باشد
 *
 * فراخوانی register باید *پیش از* بارگذاری ماژول‌های هدف انجام شود، و
 * چون import های ایستا بالا کشیده می‌شوند، هدف‌ها حتماً باید با
 * `await import()` بارگذاری شوند.
 */
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC_DIR = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "src");

export async function resolve(specifier, context, next) {
  let target = specifier;

  // "@/features/x" → مسیر مطلقِ داخل src (باید به file URL تبدیل شود،
  // وگرنه Node آن را یک بسته‌ی npm فرض می‌کند)
  if (target.startsWith("@/")) {
    target = pathToFileURL(resolvePath(SRC_DIR, target.slice(2))).href;
  }

  const hasExtension = /\.[a-z0-9]+$/i.test(target);
  const isPathLike = target.startsWith(".") || target.startsWith("file:");

  if (isPathLike && !hasExtension) {
    return next(`${target}.js`, context);
  }

  // زیرمسیرهای بسته‌های npm هم گاهی بدون پسوند import می‌شوند
  // (مثلاً "react-date-object/calendars/persian"). چون نمی‌شود از
  // پیش دانست کدام‌یک نیاز به پسوند دارد، اول اصل را امتحان می‌کنیم
  // و فقط در صورت شکست پسوند اضافه می‌کنیم.
  if (!isPathLike && !hasExtension && target.includes("/")) {
    try {
      return await next(target, context);
    } catch {
      return next(`${target}.js`, context);
    }
  }

  return next(target, context);
}
