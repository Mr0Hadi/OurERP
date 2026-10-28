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
| تست | `vitest` + `@vitest/coverage-v8` — منطقِ خالص، کنارِ فایل (`*.test.js`) | `vitest.config.js` |
| ابزارِ dev | `tools/dev-inspector/` (از صفحه به کد، پایین) روی وصله‌ی `vite-plugin-react-click-to-component`؛ در build نیست | `vite.config.js` |

## چطور کار می‌کند

### اسکریپت‌ها

```bash
pnpm dev        # همان `pnpm d`؛ vite روی PORT یا ۵۱۷۳
pnpm build      # vite build → dist/
pnpm lint       # eslint .
pnpm knip       # فایل/export/وابستگیِ بی‌استفاده
pnpm test       # Vitest یک‌بار (vitest.config.js)؛ test:watch در حالِ کار، test:coverage گزارش در coverage/
pnpm st         # node structure.js — درختِ پوشه‌ها را چاپ می‌کند
```

`scripts/build-label-print-check.js` جداگانه با `node` اجرا می‌شود و یک HTMLِ مستقل برای وارسیِ دستیِ چاپِ برچسب می‌سازد. تستِ واحد فقط منطقِ خالص را می‌سنجد و `vitest.config.js` عمداً از `vite.config.js` جداست (فقط aliasِ `@/` و محیطِ Node؛ بی PWA، dev-inspector و React Compiler)، پس کلِ مجموعه حدودِ دو ثانیه است. چطور تست بنویسید: [13 §۱۵](13-recipes.md).

### `vite.config.js` به ترتیبِ پلاگین‌ها

1. `emitVersionFile()` — دو asset به build اضافه می‌کند: `version.json` و `sw-build-<hash>.js` (شناسه‌ی build برای service worker).
2. `react()`، `devInspector()` (فقط dev، بخشِ بعد)، `tailwindcss()`، `babel({ presets: [reactCompilerPreset()], retainLines })` — یعنی **React Compiler روی همه‌ی کد فعال است**؛ `useMemo`/`useCallback` دستی معمولاً لازم نیست. در dev `retainLines` روشن و `enableFunctionOutlining`ِ Compiler خاموش است تا شماره‌ی خطِ JSX (که بعد از Babel ساخته می‌شود) همان خطِ فایل باشد؛ بی آن، JSXِ درونِ کال‌بک‌هایی مثلِ بدنه‌ی `map` به تهِ فایل منتقل می‌شد و خطِ غلط می‌داد.
3. `VitePWA({ selfDestroying: true, ... })` — `sw.js`ِ خودنابودشونده می‌سازد که workerِ قدیمی را برمی‌دارد. manifest و `runtimeCaching` هنوز تعریف شده‌اند ولی با `selfDestroying` اثری ندارند.

`define.__APP_BUILD__` شیءِ `{ version, commit, builtAt }` را (از `buildInfo()`) در کد می‌گذارد؛ در `eslint.config.js` به‌عنوانِ global اعلام شده است.

`build.rolldownOptions.output.advancedChunks.groups` وابستگی‌ها را به chunkهای `vendor-react`، `vendor-radix`، `vendor-query`، `vendor-form`، `vendor-date`، `vendor-misc` تقسیم می‌کند.

### از صفحه به کد: dev-inspector (فقط dev)

در `pnpm dev` هر چیزِ صفحه را به کدش می‌رساند:

| کار | نتیجه |
| --- | --- |
| **Alt** را نگه دارید و ماوس را ببرید | قاب دورِ المان و برچسب با دو هدف: **ساخت** — درونی‌ترین لایه‌ی کدِ برنامه که المان را می‌سازد (`ui/` و `shared/` مثلِ کتابخانه رد می‌شوند) — و اگر فرق دارد، **⇧ صفحه** — لایه‌ای در پوشه‌ی فیچرِ همین صفحه که آن را گذاشته |
| **Alt + کلیک** | هدفِ «ساخت» در ویرایشگر روی همان خط باز می‌شود؛ کلیک به صفحه نمی‌رسد (دکمه اجرا، فرم ارسال یا لینک باز/دانلود نمی‌شود) |
| **Alt + Shift + کلیک** | هدفِ «صفحه» باز می‌شود (مثلاً دکمه‌ی «تاریخچه» در فروش: Alt+کلیک → `AuditHistoryButton.jsx`، Alt+Shift+کلیک → `SaleDetailPage.jsx`) |
| **Alt + کلیکِ راست** | پنل: همه‌ی لایه‌ها از المان تا مسیر با نوع (`ui`، `shared`، `feature`، `page`، `route`؛ لایه‌ی «صفحه» علامت دارد) و محلِ رندر؛ برای لایه‌ی انتخاب‌شده فایل و خطِ تعریف، **همه‌ی جاهای استفاده** (فایل و خطِ `<Name`) و **خط‌هایی از `docs/architecture` و `CLAUDE.md` که نامش را آورده‌اند**؛ هر ردیف با کلیک باز می‌شود |
| در پنل: `↑` `↓`، `Enter`، `C`، `X`، `Esc` | انتخابِ لایه، باز کردن، کپیِ `فایل:خط`، **کپیِ زمینه برای Claude Code** (صفحه، متنِ المان، زنجیره‌ی کامپوننت با مسیرها)، بستن |
| **Alt + Shift + I** | حالتِ ماندگار بی نگه‌داشتنِ Alt (کلیک = باز، کلیکِ راست = پنل، `Esc` = خروج) |

کلیدها با `event.code` خوانده می‌شوند، پس با صفحه‌کلیدِ فارسی هم کار می‌کنند. روی دیالوگ، Sheet و منوهای Radix (پورتال) هم کار می‌کند و آن‌ها را نمی‌بندد؛ `Esc` اول پنل را می‌بندد. برای DOMی که React نساخته (کاشیِ نقشه، درونِ کتابخانه‌ها) نزدیک‌ترین نیای React را نشان می‌دهد. در چاپ پنهان است.

نمونه‌ی «کپی برای Claude Code» روی دکمه‌ی ورود:

```
صفحه: /auth/login
المان: <button> «ورود به سامانه»
زنجیره‌ی کامپوننت (از المان تا صفحه):
- <button> در src/shared/components/ui/button.jsx:53
- <Button> در src/features/auth/pages/LoginPage.jsx:303 (تعریف: src/shared/components/ui/button.jsx)
- <LoginPage> در src/features/auth/routes.jsx:14 (تعریف: src/features/auth/pages/LoginPage.jsx)
```

**چطور کار می‌کند** (`tools/dev-inspector/`):

- **منبعِ هر JSX:** React ۱۹ `_debugSource` را حذف کرد. وصله‌ی `jsx-dev-runtime` از `vite-plugin-react-click-to-component` (نگه‌دارنده: تیمِ Vite) منبع را روی fiber نگه می‌دارد؛ فقط `transform`ِ آن پلاگین استفاده می‌شود و منوی خودش نه. زنجیره از `_debugOwner` است؛ فایلِ تعریفِ هر کامپوننت همان فایلِ لایه‌ی قبلی است (المانی که رندر کرده در فایلِ خودش نوشته شده).
- **خطِ دقیق:** React Compiler گره‌های JSXِ تازه می‌سازد که جای اصلی ندارند و خطشان چند خط پایین‌ترِ همان تگ می‌افتد (`LoginPage.jsx` ۳۱۶ به‌جای ۳۰۳). `GET /__inspector/locate` از آن خط رو به بالا نزدیک‌ترین `<Name` را برمی‌گرداند — نامِ نمایشیِ Radix مثلِ `SelectItem` با `<SelectPrimitive.Item` هم جور می‌شود — و اگر نام نخورد (تگِ متغیر مثلِ `<Comp`)، نزدیک‌ترین تگِ باز. در dev هم `retainLines` روشن و `enableFunctionOutlining`ِ Compiler خاموش است (`vite.config.js`) تا خط‌ها تا حدِ ممکن درست بمانند.
- **جاهای استفاده و سندها:** `GET /__inspector/info?file=&name=` از `sourceIndex.js` (خطِ تعریفِ `function`/`const Name` هم): importهای ایستا و `import()`ِ همه‌ی `src/` (با aliasِ `@/`) و جست‌وجوی مسیر و نامِ فایل در سندها. نمایه بارِ اول ساخته می‌شود (حدودِ ۰٫۳ ثانیه) و با تغییرِ هر فایل در `src/` یا هر `.md` باطل می‌شود. فقط فایل‌های همین پروژه خوانده می‌شوند.
- **باز کردن:** `/__open-in-editor`ِ خودِ Vite (`launch-editor`)؛ ویرایشگرِ در حالِ اجرا از فهرستِ پروسه‌ها پیدا می‌شود (VSCodium، VS Code، Cursor، Zed، WebStorm، …). اگر چند ویرایشگر باز است: `LAUNCH_EDITOR=codium pnpm dev`.
- **رابط:** `client.js` بی React و داخلِ Shadow DOM، با `transformIndexHtml` و `src="/@id/__x00__virtual:dev-inspector-client"` تزریق می‌شود (اسکریپتِ inline به `index.html?html-proxy` تبدیل می‌شد که بعد از راه‌اندازیِ دوباره‌ی سرور ۵۰۰ می‌داد). ویرایشِ `client.js` کشِ ماژول را باطل و صفحه را دوباره بار می‌کند؛ ویرایشِ `index.js`/`sourceIndex.js` سرور را راه‌اندازیِ دوباره می‌کند. رویدادهای pointer/focus درونِ پنل بالا نمی‌روند تا دیالوگِ Radix آن را «بیرون» نفهمد. در build هیچ‌کدام نیست (`dist` را grep کنید).

**محدودیت‌ها:** منو فقط المانِ کلیک‌شده و *کامپوننت‌ها* را نشان می‌دهد، نه هر `div`ِ میانی؛ استایلی که روی والدِ همان فایل است چند خط بالاتر است. جاهای استفاده از روی importها است: کامپوننتی که با نامِ دیگری دوباره export شود یا به‌صورتِ prop پاس داده شود (`table={X}`) فقط با import شمرده می‌شود. در محیطِ دسکتاپی که Alt+کلیک را برای جابه‌جاییِ پنجره برمی‌دارد (KDE ۵، بعضی GNOME/Xfce)، کلیدِ پنجره را Super کنید؛ Plasma ۶ پیش‌فرض Super است.

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
- **فایلِ پیکربندیِ Tailwind وجود ندارد.** Tailwind 4 تنظیماتش را از `@theme`/`@import` در `src/index.css` می‌گیرد؛ `tailwind.config` در `components.json` خالی است.

## برای تغییرِ X، به Y بروید

| می‌خواهم… | فایل |
| --- | --- |
| آدرسِ API یا timeout را عوض کنم | `.env` (الگو: `.env.example`) — خوانده‌شده در `src/shared/services/api/axios.js` |
| کتابخانه‌ی سنگینی را در chunkِ جدا بگذارم | `advancedChunks.groups` در `vite.config.js` |
| PWA را برگردانم | `selfDestroying` را در `vite.config.js` بردارید و ثبتِ service worker و اعلانِ نسخه‌ی تازه را بسازید (سیستمِ قبلی در ۲۰۲۶-۱۰-۲۵ حذف شد؛ در تاریخچه‌ی git هست) |
| قاعده‌ی lint اضافه/استثنا کنم | `eslint.config.js` |
| پورتِ dev را عوض کنم | متغیرِ `PORT` یا `server.port` در `vite.config.js` |
| کامپوننتِ shadcn اضافه کنم | CLIِ shadcn (تنظیم: `components.json`) |

## سؤال‌های باز / بدهی

- `.env.example` `VITE_API_BASE_URL=https://localhost:5083/api` (https) است ولی پیش‌فرضِ کد `http://localhost:5083/api` است.
- `public/favicon.svg` وجود ندارد ولی دو جا به آن ارجاع شده: `index.html` خطِ ۵ (`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`) و `vite.config.js` خطِ ۶۷ (آرایه‌ی `includeAssets` در `VitePWA`). یا فایل را اضافه کنید یا هر دو ارجاع را بردارید.
- `version` در `package.json` همیشه `0.0.0` است؛ پس `__APP_BUILD__.version` اطلاعاتی نمی‌دهد و فقط `commit`/`builtAt` معنا دارند.
- هیچ تست و هیچ type-checkی وجود ندارد؛ تنها دروازه‌ی کیفیت `pnpm lint` و `pnpm build` است.

<!-- docs-paths-ignore: public/favicon.svg -->
