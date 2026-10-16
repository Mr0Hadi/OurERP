# ۰۱ — پشته‌ی فناوری و ابزارها

## هدف

بدانید با چه کتابخانه‌ای کار می‌کنید، برنامه چطور اجرا و build می‌شود، و برای تغییرِ تنظیماتِ build/lint/env کدام فایل را باز کنید.

## فایل‌های کلیدی

| فایل | نقش |
| --- | --- |
| `package.json` | وابستگی‌ها و اسکریپت‌ها (مدیرِ بسته: pnpm، `pnpm-lock.yaml`) |
| `vite.config.js` | build، پلاگین‌ها، alias، PWA، تقسیمِ chunk |
| `jsconfig.json` | فقط aliasِ `@/*` → `./src/*` برای ادیتور |
| `eslint.config.js` | قواعدِ lint (flat config) |
| `knip.json` | تنظیمِ تشخیصِ کدِ مرده |
| `components.json` | تنظیمِ CLIِ shadcn |
| `index.html` | `lang="fa-IR" dir="rtl"`، splash (`#app-splash`) |
| `.env.example` | الگوی متغیرهای محیطی (`.env` در git نیست) |
| `public/web.config` | استقرار روی IIS: MIME و SPA fallback به `/index.html` |

## پشته (از `package.json`)

| حوزه | کتابخانه | کجا دیده می‌شود |
| --- | --- | --- |
| UI | `react` / `react-dom` ۱۹ | `src/main.jsx` |
| کامپایلر | `babel-plugin-react-compiler` از طریقِ `reactCompilerPreset` | `vite.config.js` |
| زبان | **JavaScript/JSX، بدونِ TypeScript** (`@types/*` فقط برای ادیتور) | — |
| مسیریابی | `react-router-dom` ۷ (`createBrowserRouter`) | `src/app/routes/routers.jsx` |
| state سرور | `@tanstack/react-query` ۵ (+ devtools) | `src/app/providers/QueryProvider.jsx` |
| state کلاینت | `zustand` ۵ | `src/shared/store/`، `src/features/*/store/` |
| HTTP | `axios` | `src/shared/services/api/axios.js` |
| فرم | `react-hook-form` | فرم‌های ساده؛ فرم‌های سند با Zustand (فایل ۰۸) |
| جدول | `@tanstack/react-table` | `src/shared/components/table/` |
| لیستِ مجازی | `react-virtuoso` | فقط `src/shared/components/ui/combobox.jsx` |
| استایل | `tailwindcss` ۴ با `@tailwindcss/vite`، `tw-animate-css`، `tailwind-scrollbar-hide` | `src/index.css` |
| کامپوننتِ پایه | `shadcn` (سبکِ `radix-nova`) روی `radix-ui` و `@base-ui/react`؛ `class-variance-authority`، `clsx`، `tailwind-merge` | `src/shared/components/ui/` |
| آیکن | `lucide-react`؛ `@persianlabs/icons` (مثلاً `src/shared/components/ui/bank-input.jsx`) | — |
| فونت | `@fontsource-variable/vazirmatn` | `@import` در `src/index.css` |
| تاریخ شمسی | `react-multi-date-picker`، `react-date-object` | `src/shared/lib/dateUtils.js` |
| اعلان | `react-hot-toast` | `src/app/providers/ToastProvider.jsx` |
| نقشه | `leaflet`، `react-leaflet` | `src/shared/components/map/` |
| بارکد | `react-barcode` (تولید، `src/shared/components/print/BarcodeGraphic.jsx`)، `@zxing/library` و `zxing-wasm` (اسکن، `src/shared/domain/barcode/frameReader.js`) | `src/shared/components/barcode/` |
| PWA | `vite-plugin-pwa`، `workbox-window` — **عملاً غیرفعال** (پایین) | `vite.config.js` |

## چطور کار می‌کند

### اسکریپت‌ها

```bash
pnpm dev        # همان `pnpm d`؛ vite روی PORT یا ۵۱۷۳
pnpm build      # vite build → dist/
pnpm lint       # eslint .
pnpm knip       # فایل/export/وابستگیِ بی‌استفاده
pnpm st         # node structure.js — درختِ پوشه‌ها را چاپ می‌کند
```

`scripts/build-label-print-check.js` جداگانه با `node` اجرا می‌شود و یک HTMLِ مستقل برای وارسیِ دستیِ چاپِ برچسب می‌سازد. هیچ اسکریپتِ تستی در `package.json` نیست.

### `vite.config.js` به ترتیبِ پلاگین‌ها

1. `emitVersionFile()` — دو asset به build اضافه می‌کند: `version.json` و `sw-build-<hash>.js` (شناسه‌ی build برای service worker).
2. `react()`، `tailwindcss()`، `babel({ presets: [reactCompilerPreset()] })` — یعنی **React Compiler روی همه‌ی کد فعال است**؛ `useMemo`/`useCallback` دستی معمولاً لازم نیست.
3. `VitePWA({ selfDestroying: true, ... })` — `sw.js`ِ خودنابودشونده می‌سازد که workerِ قدیمی را برمی‌دارد. manifest و `runtimeCaching` هنوز تعریف شده‌اند ولی با `selfDestroying` اثری ندارند.

`define.__APP_BUILD__` شیءِ `{ version, commit, builtAt }` را (از `buildInfo()`) در کد می‌گذارد؛ در `eslint.config.js` به‌عنوانِ global اعلام شده است.

`build.rolldownOptions.output.advancedChunks.groups` وابستگی‌ها را به chunkهای `vendor-react`، `vendor-radix`، `vendor-query`، `vendor-form`، `vendor-date`، `vendor-misc` تقسیم می‌کند.

### متغیرهای محیطی

فقط این‌ها واقعاً در `src/` خوانده می‌شوند (جست‌وجوی `import.meta.env`):

| متغیر | کجا | پیش‌فرض |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `src/shared/services/api/axios.js` | `http://localhost:5083/api` |
| `VITE_API_TIMEOUT` | همان | `15000` میلی‌ثانیه |
| `import.meta.env.DEV` / `PROD` | مثلاً `devRoutes` در `src/app/routes/routers.jsx` | — |

## قراردادها و نکته‌ها

- **alias:** همیشه `@/...` به جای `../../..` برای عبور از مرزِ فیچر. alias در `vite.config.js` و `jsconfig.json` هر دو تعریف شده؛ اگر یکی را عوض کردید دیگری را هم عوض کنید.
- **ESLint** (`eslint.config.js`): `js.configs.recommended` + `react-hooks` + `react-refresh`. `no-unused-vars` فقط هشدار است. `react-refresh/only-export-components` برای `**/routes.jsx` و چند فایلِ shadcn (`badge`، `button`، `direction`، `sidebar`، `tabs` در `src/shared/components/ui/`) خاموش است.
- **knip** (`knip.json`) پوشه‌ی `src/shared/components/ui/**` را نادیده می‌گیرد چون تولیدِ shadcn است.
- **shadcn:** `components.json` با `rtl: true` و aliasهای `@/shared/components/ui`، `@/shared/lib/utils`، `@/shared/hooks`. کامپوننتِ جدید با CLIِ shadcn به `src/shared/components/ui/` اضافه می‌شود؛ ویرایشِ دستیِ این فایل‌ها با `shadcn add` بعدی بازنویسی می‌شود.
- **`tailwind.config.js` خالی است (۰ بایت).** Tailwind 4 تنظیماتش را از `@theme`/`@import` در `src/index.css` می‌گیرد؛ `components.json` هنوز به این فایل اشاره می‌کند.

## برای تغییرِ X، به Y بروید

| می‌خواهم… | فایل |
| --- | --- |
| آدرسِ API یا timeout را عوض کنم | `.env` (الگو: `.env.example`) — خوانده‌شده در `src/shared/services/api/axios.js` |
| کتابخانه‌ی سنگینی را در chunkِ جدا بگذارم | `advancedChunks.groups` در `vite.config.js` |
| PWA را برگردانم | `selfDestroying` را در `vite.config.js` بردارید؛ کامنتِ همان‌جا در `vite.config.js` می‌گوید `initAppUpdates` باید در `src/main.jsx` برگردد (از `src/shared/services/appUpdate.js`) (فایل ۱۴) |
| قاعده‌ی lint اضافه/استثنا کنم | `eslint.config.js` |
| پورتِ dev را عوض کنم | متغیرِ `PORT` یا `server.port` در `vite.config.js` |
| کامپوننتِ shadcn اضافه کنم | CLIِ shadcn (تنظیم: `components.json`) |

## سؤال‌های باز / بدهی

- `.env.example` هفت متغیر دارد که هیچ‌جای `src/` خوانده نمی‌شوند (جست‌وجوی `import.meta.env`): `VITE_APP_NAME` (خطِ ۱۲)، `VITE_APP_VERSION` (۱۳)، `VITE_APP_ENV` (۱۴)، `VITE_ACCESS_TOKEN_KEY` (۱۹)، `VITE_REFRESH_TOKEN_KEY` (۲۰)، `VITE_TOKEN_REFRESH_ENDPOINT` (۲۱)، `VITE_ENABLE_DEBUG_LOGS` (۲۶). مسیرِ refresh در `src/shared/services/api/axios.js` ثابت است (`/Account/RefreshToken`) و توکن‌ها با persistِ `authStore` ذخیره می‌شوند، نه با این کلیدها. یا خطوط را حذف کنید یا واقعاً به کار ببرید.
- `.env.example` خطِ ۶ `VITE_API_BASE_URL=https://localhost:5083/api` (https) است ولی پیش‌فرضِ کد `http://localhost:5083/api` است.
- `public/favicon.svg` وجود ندارد ولی دو جا به آن ارجاع شده: `index.html` خطِ ۵ (`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`) و `vite.config.js` خطِ ۶۷ (آرایه‌ی `includeAssets` در `VitePWA`). یا فایل را اضافه کنید یا هر دو ارجاع را بردارید.
- `tailwind.config.js` خالی ولی در `components.json` ارجاع‌شده.
- `version` در `package.json` همیشه `0.0.0` است؛ پس `__APP_BUILD__.version` اطلاعاتی نمی‌دهد و فقط `commit`/`builtAt` معنا دارند.
- هیچ تست و هیچ type-checkی وجود ندارد؛ تنها دروازه‌ی کیفیت `pnpm lint` و `pnpm build` است.

<!-- docs-paths-ignore: public/favicon.svg -->
