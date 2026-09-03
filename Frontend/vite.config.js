import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
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
        navigateFallbackDenylist: [/^\/api\//], // آدرس API آینده رو از fallback مستثنی کن

        runtimeCaching: [
          // API — وقتی بکند اضافه شد، این‌ها فعال می‌شن
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // ۱ ساعت
            },
          },
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
