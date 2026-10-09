import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import pkg from "./package.json" with { type: "json" };

/** شناسه‌ی build — در «بروزرسانی برنامه» نشان داده می‌شود تا معلوم باشد کدام نسخه باز است. */
function buildInfo() {
  let commit = "";
  try {
    commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    // بیرون از مخزنِ git (مثلاً build در کانتینر) شناسه‌ی کامیت نداریم.
  }
  return { version: pkg.version, commit, builtAt: new Date().toISOString() };
}

const build = buildInfo();

/**
 * `version.json` کنارِ build — راهنمای بررسیِ بروزرسانی (بدونِ کش)؛ حکمِ نهایی با
 * buildِ خودِ worker است (`sw-build-*.js`)، چون این فایل ممکن است از کشِ پروکسی
 * کهنه بیاید.
 */
const emitVersionFile = () => ({
  name: "emit-version-file",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(build) });
    this.emitFile({ type: "asset", fileName: swBuildFile, source: swBuildSource });
  },
});

/**
 * به service worker می‌گوید کدام buildاست تا صفحه بتواند بپرسد (`GET_BUILD`) و
 * worker منتظر را با buildِ خودش مقایسه کند. نامش با build عوض می‌شود تا
 * نسخه‌ی کهنه‌ی این فایل (کش مرورگر/پروکسی) جای نسخه‌ی تازه را نگیرد.
 */
const swBuildFile = `sw-build-${createHash("md5").update(build.builtAt).digest("hex").slice(0, 8)}.js`;
const swBuildSource =
  'self.addEventListener("message",function(e){' +
  'if(e.data&&e.data.type==="GET_BUILD"&&e.ports[0])e.ports[0].postMessage(' +
  JSON.stringify(build) +
  ")});";

export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(build),
  },
  plugins: [
    emitVersionFile(),
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      // PWA غیرفعال: `sw.js`ِ خودنابودشونده — کارگرِ قدیمیِ نصب‌شده را برمی‌دارد، کش‌ها را پاک
      // می‌کند و دیگر چیزی کش/precache نمی‌شود؛ هر بازشدن آخرین نسخه‌ی سرور را می‌گیرد.
      // برای برگرداندنِ PWA: `selfDestroying` را بردارید و `initAppUpdates` را در main.jsx برگردانید.
      selfDestroying: true,
      registerType: "prompt", // آپدیت خودکار نمی‌کنه، به کاربر اطلاع می‌ده
      includeAssets: [
        "favicon.svg",
        "favicon-32x32.png",
        "favicon-16x16.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        id: "/",
        name: "OurERP",
        short_name: "OurERP",
        description:
          "سامانه انبارداری و مدیریت لوازم یدکی خودرو پاسارگاد موتور پارت",
        lang: "fa-IR",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#4F46E5", // هم‌رنگ با --primary
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // فایل‌های build شده که precache می‌شن (app shell)
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        // شناسه‌ی build را worker با `importScripts` می‌خواند؛ precache نمی‌شود.
        globIgnores: ["sw-build-*.js"],
        importScripts: [swBuildFile],
        navigateFallbackDenylist: [/^\/api\//], // آدرس API آینده رو از fallback مستثنی کن

        runtimeCaching: [
          // پاسخِ API عمداً کش نمی‌شود: داده‌ی مالی و شخصی است، کلیدِ کش توکن را
          // نمی‌شناسد (کاربرِ بعدیِ همان دستگاه پاسخِ کاربرِ قبلی را می‌گرفت)، بعد از
          // خروج می‌ماند، و در کندیِ شبکه مانده/وضعیتِ کهنه‌ی فاکتور را نشان می‌داد.
          // کشِ قدیمیِ `api-cache` را `purgeLegacyApiCache` پاک می‌کند.
          // نقشه (Leaflet / OpenStreetMap tiles)
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("tile.openstreetmap.org"),
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // wasmِ اسکنر بارکد — عمداً precache نشده: حدود یک مگابایت است و
          // فقط مرورگرهای بدونِ `BarcodeDetector` نیتیو (iOS، فایرفاکس)
          // به آن نیاز دارند. با CacheFirst بعد از اولین اسکن آفلاین هم
          // کار می‌کند، ولی به نصبِ هر دستگاهی اضافه نمی‌شود.
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".wasm"),
            handler: "CacheFirst",
            options: {
              cacheName: "wasm-cache",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          // فونت‌ها
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // در dev غیرفعال بمونه بهتره، وگرنه HMR گاهی به‌هم می‌ریزه
      },
    }),
  ],
  // `PORT` را پیش‌نمایشِ Claude می‌دهد وقتی ۵۱۷۳ دستِ سرورِ دیگری است.
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules\/(react|react-dom|react-router-dom|scheduler)\//,
            },
            {
              name: "vendor-radix",
              test: /node_modules\/(radix-ui|@radix-ui)\//,
            },
            { name: "vendor-query", test: /node_modules\/@tanstack\// },
            { name: "vendor-form", test: /node_modules\/(react-hook-form)\// },
            {
              name: "vendor-date",
              test: /node_modules\/(react-multi-date-picker|react-date-object)\//,
            },
            {
              name: "vendor-misc",
              test: /node_modules\/(axios|zustand|clsx|tailwind-merge|class-variance-authority)\//,
            },
          ],
        },
      },
    },
  },
});
