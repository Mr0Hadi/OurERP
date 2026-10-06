# معماری فرانت‌اند OurERP

> سندِ مرجعِ معماری، ساختار و قراردادهای کدِ فرانت (`Frontend/`).
> مخاطب: توسعه‌دهنده‌ای که تازه به پروژه آمده یا می‌خواهد قبل از تغییر، تصویرِ کامل داشته باشد.
> این سند از روی کدِ برنچ `refactor/frontend-cleanup` نوشته شده؛ هر جا قراردادی از بکند می‌آید،
> مرجعش `Backend-Net/docs/` است. وضعیتِ ریفکتور در [`REFACTOR.md`](./REFACTOR.md) است.

## فهرست

1. [نمای کلی](#1-نمای-کلی)
2. [پشته‌ی فناوری](#2-پشتهی-فناوری)
3. [اجرا، build و ابزارها](#3-اجرا-build-و-ابزارها)
4. [ساختار پوشه‌ها](#4-ساختار-پوشهها)
5. [راه‌اندازی برنامه (Bootstrap)](#5-راهاندازی-برنامه-bootstrap)
6. [مسیریابی، لودر و گاردها](#6-مسیریابی-لودر-و-گاردها)
7. [احراز هویت و نشست](#7-احراز-هویت-و-نشست)
8. [مجوزها (Permissions)](#8-مجوزها-permissions)
9. [لایه‌ی شبکه (axios)](#9-لایهی-شبکه-axios)
10. [لایه‌ی داده: React Query](#10-لایهی-داده-react-query)
11. [مدیریت state: Zustand](#11-مدیریت-state-zustand)
12. [ساختار استانداردِ یک فیچر](#12-ساختار-استانداردِ-یک-فیچر)
13. [الگوهای کلیدی](#13-الگوهای-کلیدی)
14. [لایه‌ی دامنه (`domain/`)](#14-لایهی-دامنه-domain)
15. [کتابخانه‌ی کامپوننت‌های مشترک](#15-کتابخانهی-کامپوننتهای-مشترک)
16. [سیستم طراحی، تم و RTL](#16-سیستم-طراحی-تم-و-rtl)
17. [فیچرها (ماژول‌های کسب‌وکار)](#17-فیچرها-ماژولهای-کسبوکار)
18. [PWA و بروزرسانی برنامه](#18-pwa-و-بروزرسانی-برنامه)
19. [فایل، تصویر، بارکد، چاپ، نقشه](#19-فایل-تصویر-بارکد-چاپ-نقشه)
20. [کارتخوان (POS)](#20-کارتخوان-pos)
21. [قراردادهای کدنویسی](#21-قراردادهای-کدنویسی)
22. [رابطه با بکند](#22-رابطه-با-بکند)
23. [پرفرمنس](#23-پرفرمنس)
24. [وضعیت فعلی، بدهی‌ها و نقاط ضعف](#24-وضعیت-فعلی-بدهیها-و-نقاط-ضعف)
25. [راهنمای کار: چطور X را اضافه کنم؟](#25-راهنمای-کار-چطور-x-را-اضافه-کنم)

---

## 1. نمای کلی

OurERP یک **SPA** (تک‌صفحه‌ای) برای مدیریتِ انبار و فروشگاهِ لوازم یدکی خودرو است
(در manifest: «سامانه انبارداری و مدیریت لوازم یدکی خودرو پاسارگاد موتور پارت»).
کاملاً **فارسی، راست‌به‌چپ (RTL)** و تاریخ **شمسی** است و به‌صورت **PWA** نصب می‌شود.

دامنه‌ی کسب‌وکار:

| حوزه | چه می‌کند |
|---|---|
| خرید / فروش | پیش‌فاکتور ← فاکتور، پرداختِ ترکیبی (نقد/حواله/چک/کارتخوان/اقساط)، پیوست، لغو |
| انبار | کالا، دسته‌بندی، **دانه‌ی فیزیکی** (هر عدد کالا برچسب/بارکد دارد)، صف دریافت و ارسال، قرنطینه، اسقاط، چاپ برچسب |
| مرجوعی | مرجوعی خرید و فروش با «ادعا ← تصمیم ← اثر» (کالا/پول وارد یا خارج) |
| طرف‌حساب | مشتری، تامین‌کننده، دفتر حساب و صورت‌حساب |
| سازمان | کارمند، واحد، تیم، نقش سازمانی |
| دسترسی | مجوز هر کارمند + الگوی پیشنهادیِ هر واحد |
| داشبورد/گزارش | ویجت‌های شخصی‌سازی‌شده بر اساس نقش، گزارش فعالیت و مالی |

اندازه‌ی کد (تقریبی): ۶۲۴ فایل زیر `src`، حدود ۶۵ هزار خط JS/JSX، حدود ۵۴۰ کامیت در تاریخچه.

**اصل‌های بنیادینِ معماری** (این‌ها را در همه‌ی بخش‌ها می‌بینید):

1. **فرانت فقط فرانت است.** به `Backend-Net` دست نمی‌زنیم؛ هر چیزی که باید در سرور باشد در
   `Backend-Net/docs/frontend-requests.fa.md` به‌صورت بندِ شماره‌دار ثبت می‌شود.
2. **سرور منبعِ حقیقت است.** مبلغ، وضعیت، مجوز و قواعدِ کسب‌وکار از سرور می‌آیند؛
   فرانت فقط نمایش/پیش‌نمایش می‌دهد (مثلاً `lineMath.js` فقط پیش‌نمایشِ فرم است).
3. **بدون لایه‌ی ترجمه‌ی نام.** فیلد/پارامتر/enum در فرانت با **همان نامِ بکند** نگه داشته می‌شود
   (adapterهای فقط-تغییرنام حذف شده‌اند).
4. **بدون mock.** هیچ داده‌ی ساختگی یا API جعلی وجود ندارد؛ توسعه روی سرور تست
   (`https://api-test.pasargadmp.ir/api`) انجام می‌شود.
5. **معنا، نه رنگ.** رنگِ وضعیت را «معنا» (tone) تعیین می‌کند، نه کلاسِ خام Tailwind.

---

## 2. پشته‌ی فناوری

| لایه | انتخاب | نکته |
|---|---|---|
| UI | **React 19** + **React Compiler** (`babel-plugin-react-compiler`) | بدون `useMemo/useCallback` دستی در بیشترِ جاها؛ کامپایلر مدیریت می‌کند |
| Build | **Vite 8** (Rolldown) + `@vitejs/plugin-react` | `advancedChunks` برای vendorها |
| زبان | **JavaScript (JSX)** | بدون TypeScript؛ `jsconfig.json` فقط برای alias `@/` |
| روتر | **react-router-dom 7** (`createBrowserRouter`، data router) | `loader`، `handle`، `useBlocker`، `useMatches` |
| داده‌ی سرور | **TanStack Query 5** | کش، invalidation، retry |
| state کلاینت | **Zustand 5** | `persist` و `devtools` |
| HTTP | **axios** | اینترسپتور برای توکن، refresh، باز کردن envelope |
| فرم | **react-hook-form** (فرم‌های ساده) + **Zustand** (فرم‌های سند) | بخش ۱۳ |
| جدول | **@tanstack/react-table 8** + `DataTable` اختصاصی | سرور-ساید |
| UI پایه | **shadcn/ui** روی `radix-ui` و `@base-ui/react` | `components/ui/*` تولید CLI است |
| استایل | **Tailwind CSS 4** (`@tailwindcss/vite`)، `tw-animate-css`، `tailwind-merge`، `cva` | توکن‌ها در `index.css` |
| آیکن | `lucide-react` | |
| تاریخ | `react-multi-date-picker` + `react-date-object` (تقویم شمسی) | |
| نقشه | `leaflet` + `react-leaflet` (lazy) | OSM + Nominatim |
| بارکد | `barcode-detector`, `@zxing/library`, `zxing-wasm`, `react-barcode` | |
| لیست بلند | `react-virtuoso` | |
| Toast | `react-hot-toast` | |
| PWA | `vite-plugin-pwa` + `workbox-window` | `registerType: "prompt"` |
| فونت | Vazirmatn Variable (`@fontsource-variable`) | |
| کیفیت | ESLint 10 (`react-hooks`، `react-refresh`)، **knip** (کد مرده) | |

> **تست خودکار وجود ندارد** (هیچ فایلِ `*.test.*` نیست). اعتبارسنجی با lint + build + تست دستی/E2E
> روی سرور تست انجام می‌شود (نگاه کنید به بخش ۲۴).

---

## 3. اجرا، build و ابزارها

```bash
pnpm install
pnpm dev          # vite روی ۵۱۷۳ (یا مقدار PORT)
pnpm build        # خروجی در dist/
pnpm preview
pnpm lint         # eslint .
pnpm knip         # کد/export/وابستگی مرده
pnpm st           # node structure.js — چاپ درخت پوشه‌ها
```

- **متغیرهای محیطی** (`.env`، نمونه در `.env.example`):
  `VITE_API_BASE_URL` (پیش‌فرض در کد: `http://localhost:5083/api`)، `VITE_API_TIMEOUT`.
- **`__APP_BUILD__`**: در `vite.config.js` با `define` تزریق می‌شود
  (`{ version, commit, builtAt }`) و در دیالوگ «بروزرسانی برنامه» نشان داده می‌شود.
- **alias**: `@` ← `src` (هم در Vite هم `jsconfig.json`).
- **`/dev/ui`**: راهنمای زنده‌ی استایل (`app/dev/StyleGuidePage.jsx`)؛ فقط وقتی
  `import.meta.env.DEV` است ثبت می‌شود و وارد باندل تولید نمی‌شود.
- **استقرار**: `public/web.config` برای IIS است (MIME صحیح برای `webmanifest/woff2`،
  فشرده‌سازی، و fallback به `index.html` برای مسیرهای SPA).
- **chunking** (`vite.config.js`): `vendor-react`، `vendor-radix`، `vendor-query`،
  `vendor-form`، `vendor-date`، `vendor-misc`. سقف اخطار ۶۰۰KB.
- **قاعده‌ی قبل از commit**: `pnpm lint` بدون خطا و `pnpm build` موفق.

---

## 4. ساختار پوشه‌ها

```
Frontend/
├─ index.html · vite.config.js · eslint.config.js · knip.json · components.json (shadcn)
├─ public/                 آیکن‌های PWA، favicon، لوگو، web.config
├─ scripts/                build-label-print-check.js (بررسی هندسه‌ی چاپ برچسب)
├─ REFACTOR.md             ردیاب فازهای ریفکتور
└─ src/
   ├─ main.jsx             نقطه‌ی ورود: SW، DirectionProvider(rtl)، render
   ├─ App.jsx              منتظر hydrate شدن auth، سپس Providers + Router
   ├─ index.css            Tailwind + توکن‌های تم (۳۶۰ خط)
   ├─ app/                 «پوسته‌ی» برنامه — مستقل از فیچرها
   │  ├─ providers/        QueryProvider، ToastProvider، AppProviders (+Theme)
   │  ├─ routes/           routers.jsx، protectedLoader، PermissionGate
   │  ├─ layouts/          AppLayout، AuthLayout، NotFound، Forbidden
   │  └─ dev/              StyleGuidePage (فقط dev)
   ├─ features/            ماژول‌های کسب‌وکار (۱۵ فیچر) — بخش ۱۷
   └─ shared/              هرچه بین فیچرها مشترک است
      ├─ components/       ui/ (shadcn) + کامپوننت‌های دامنه‌ای مشترک
      ├─ domain/           enumها و قواعدِ خالصِ دامنه (بی React)
      ├─ hooks/            هوک‌های مشترک
      ├─ lib/              توابع خالص و کمکی
      ├─ services/         axios، قرارداد API، فایل، POS، بروزرسانی
      ├─ store/            factoryهای Zustand + استورهای سراسری
      └─ constants/        routes.js و navigationData.js
```

### قاعده‌ی وابستگی (جهتِ import)

```
app  ──►  features  ──►  shared
              │            ▲
              └─ (محدود) ──┘ فیچر به فیچر: فقط services/queryKeys و domain/vocabulary
```

- `shared/` **هیچ‌وقت** از `features/` import نمی‌کند — با دو استثنای شناخته‌شده که ریشه‌ی تاریخی دارند:
  `shared/components/layout/AppSidebar` به `features/auth/hooks/usePermission` وابسته است
  و `shared/services/api/axios.js` به `features/auth/store/authStore` (هر دو منطقی‌اند چون auth زیرساخت است).
- `features/warehouse/shared/useQueueRows.js` به سرویس‌های خرید/فروش وابسته است؛ فیچرها
  برای **invalidation** به `queryKeys`ِ همدیگر دسترسی دارند (بخش ۱۰.۴).
- `features/warehouse/*/` و `features/purchases|sales/*/` خودشان زیرفیچر دارند.

---

## 5. راه‌اندازی برنامه (Bootstrap)

```
main.jsx
 ├─ onUpdateAvailable → toast.custom(UpdateAvailableToast)   // شناسه‌ی ثابت: اعلان تکراری انباشته نمی‌شود
 ├─ initAppUpdates({ onOfflineReady })                       // ثبت service worker
 ├─ purgeLegacyApiCache()                                    // پاک‌کردن کش قدیمیِ پاسخ‌های API
 └─ <StrictMode><DirectionProvider direction="rtl"><App/>
        │
        App.jsx
         ├─ hasHydrated (authStore) === false → return null   // جلوگیری از «فلشِ» داشبورد/لاگین
         └─ <AppProviders>                // QueryProvider → ThemeProvider(dark پیش‌فرض) → ToastProvider
               <RouterProvider router/>
               <AppUpdateDialog/>
```

نکات:

- `App` تا وقتی `auth-storage` از `localStorage` rehydrate نشده چیزی رندر نمی‌کند؛ وگرنه
  `protectedLoader` نمی‌تواند تشخیص دهد کاربر واردشده است یا نه.
- تم پیش‌فرض **dark** است (`ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme"`).
- `ReactQueryDevtools` در `QueryProvider` همیشه mount است (در build تولید tree-shake می‌شود).

---

## 6. مسیریابی، لودر و گاردها

### 6.1 درخت مسیرها (`app/routes/routers.jsx`)

```
/auth            → AuthLayout        → authRoutes (login)
/                → AppLayout         → loader: protectedLoader
                                      errorElement: NotFoundPage
   ├ dashboardRoutes, customersRoutes, employeesRoutes, organizationRoutes,
   │ permissionsRoutes, purchasesRoutes, warehouseRoutes, invoiceRoutes,
   │ salesRoutes, suppliersRoutes, reportsRoutes, settingsRoutes, transactionsRoutes
/dev/ui          → (فقط DEV)
*                → NotFoundPage
```

هر فیچر یک `routes.jsx` دارد که آرایه‌ای از route objectها export می‌کند. **همه‌ی صفحه‌ها `lazy()`** هستند
(code-splitting در سطح route).

مسیرها **یک‌جا** در `shared/constants/routes.js` تعریف شده‌اند (`ROUTES.PURCHASES_DETAIL = "/purchases/:id"`)
و آدرس رکورد با `routeWithId(pattern, id)` ساخته می‌شود — هرگز template-string دستی یا
`.replace(":id", ...)` در کد نباشد.

### 6.2 لایه‌های محافظت (سه لایه، هر کدام یک مسئولیت)

| لایه | کجا | چه چیزی را چک می‌کند |
|---|---|---|
| `protectedLoader` | loader روتِ `/` | فقط پرچمِ `isAuthenticated` در localStorage (**نه** اعتبار واقعی توکن). اگر نبود → `redirect` به `/auth/login?from=...` |
| تأیید نشست در `AppLayout` | رندر | `useUserInfoQuery` (که ۴۰۱ را از اینترسپتور به refresh واقعی می‌رساند). تا نتیجه‌ی قطعی نیست `null` رندر می‌شود |
| `PermissionGate` | دورِ `<Outlet/>` | `handle.permission` عمیق‌ترین route (با `useMatches().findLast`) در برابر مجوزهای کاربر |

سه حالتِ مهمِ `AppLayout`:

1. `!isAuthenticated` یا `۴۰۱` از `GetUserInfo` → `<Navigate to=/auth/login?from=...>` (و در صورت لزوم `logout()`).
2. خطای دیگر (شبکه/۵۰۰) → صفحه‌ی «ارتباط با سرور برقرار نشد» با دکمه‌ی «تلاش دوباره» / «ورود دوباره»
   (کاربر **خارج نمی‌شود**).
3. موفق → سایدبار + هدر + `PermissionGate` + `Outlet`.

### 6.3 `handle.permission`

```jsx
{ path: ROUTES.PURCHASES_NEW, handle: { permission: "PurchaseCreate" }, element: <PurchasesNewPage /> }
```

- مقدار: یک نام یا **آرایه** (هرکدام کافی است — any-of). route بدون `handle.permission` برای هر کاربرِ واردشده باز است.
- `PermissionGate`: تا وقتی مجوزها نیامده `null` رندر می‌کند؛ اگر دریافت مجوزها **خطا** داد،
  صفحه را **باز می‌گذارد** (سرور خودش ۴۰۳ می‌دهد) — «خطای شبکه» ≠ «دسترسی ندارید».
- این فقط **UX** است؛ اعتبارسنجی واقعی روی endpointهای سرور است.

### 6.4 اسپینر ناوبری (`router.navigate` patch)

انتهای `routers.jsx`، `router.navigate` پَچ می‌شود تا لحظه‌ی **کلیک** (نه تغییر آدرس) سیگنال
`notifyNavigationStart()` برود (`shared/lib/routeTransitionBus`). `RouteLoadingOverlay` از آن لحظه روشن
می‌شود و وقتی خاموش می‌شود که: (۱) آدرس عوض شده (chunk lazy بار شده) **و** (۲) هیچ کوئریِ بدون داده‌ی اولیه در جریان نیست
(با `SETTLE_DELAY_MS=150` و سقف ایمنی ۱۵ ثانیه). اگر مقصد همان مسیر فعلی باشد اسپینر نشان داده نمی‌شود.

> برنامه `<Suspense>` صریح دورِ صفحه‌های lazy ندارد؛ ناوبریِ data-router داخل transition انجام می‌شود،
> پس صفحه‌ی قبلی تا آماده‌شدنِ chunk می‌ماند و `RouteLoadingOverlay` بازخوردِ بصری می‌دهد.

### 6.5 ریدایرکت‌ها

- `/warehouse` صفحه‌ی خودش را ندارد → `Navigate` به لیست کالاها.
- `/warehouse/unit-labels` (نشانی قدیمی) → `RedirectKeepingSearch` به `/warehouse/units` با حفظ `?query`.

### 6.6 ناوبری به زیرصفحه و بازگشت (`useReturnTo` / `useSubPageNavigation`)

مسئله: کاربر وسطِ فرم خرید می‌خواهد «تامین‌کننده/کالای جدید» بسازد و بعد برگردد **بدون** از دست دادنِ فرم.
راه‌حل:

- `openSubPage(route)` روی ورودیِ فعلیِ history پرچم `keepDraft` می‌گذارد و با `state: { returnTo, returnVia: "back" }` ناوبری می‌کند.
- صفحه‌ی مقصد با `useReturnTo(fallback)` بعد از ثبت/انصراف `navigate(-1)` می‌کند و داده (مثلاً `{ newProductId }`)
  را در `formDraftStore` با کلید `returned:<path>` می‌گذارد.
- صفحه‌ی مبدأ با `useSubPageNavigation().returned` آن را **یک‌بار** می‌خواند و پاک می‌شود.
- اگر مقصد مستقیم باز شده باشد، به `fallback` می‌رود.

---

## 7. احراز هویت و نشست

### 7.1 `authStore` (Zustand + persist → `localStorage["auth-storage"]`)

فقط **توکن‌ها** و پرچم‌ها را نگه می‌دارد: `accessToken`, `refreshToken`, `isAuthenticated`, `hasHydrated`.

> ⚠️ هویتِ کاربر (نام، واحد، تیم، مجوز) **عمداً** در این استور نیست. پاسخ `POST /Account/Login` فقط
> `TokenDto` است؛ هویت از `GET /User/GetUserInfo` می‌آید و در **React Query** زندگی می‌کند
> (`useUserInfoQuery`). کپیِ آن در localStorage بعد از هر `UpdateUser` کهنه می‌ماند.

- **همگام‌سازی چندتب**: listener روی رویداد `storage` → `persist.rehydrate()`. بدونِ آن، تبِ دوم با refreshTokenِ
  قدیمی (که سرور rotate کرده) refresh می‌زند و کاربر را از نشستِ معتبر بیرون می‌اندازد.

### 7.2 جریان ورود/خروج

- ورود: `useLoginMutation` → `loginSuccess({accessToken, refreshToken})`. بعد `from` در query برای بازگشت.
- خروج: `useLogoutMutation` با **`onSettled`** (نه `onSuccess`) → `clearAuth()` + `queryClient.clear()`؛
  حتی اگر درخواست خروج شکست بخورد کاربر از دستگاه خارج می‌شود.
- `leaveSession()` (`sessionCleanup.js`): با `window.location.replace` (بارگذاری کامل) به لاگین می‌رود تا همه‌ی
  stateهای درون‌حافظه‌ای (پیش‌نویس فاکتور، پرداخت‌های ثبت‌نشده، فیلترها) برای کاربر بعدی پاک شود.

### 7.3 توکن‌ها

access token هم **امضا** و هم **رمزنگاری** می‌شود (JWE پنج‌بخشی)؛ بنابراین فرانت نمی‌تواند `exp` را از روی توکن بخواند.
فقط سرور می‌گوید توکن منقضی است (۴۰۱). منطقِ refresh در اینترسپتور axios است (بخش ۹.۳).

---

## 8. مجوزها (Permissions)

- نام‌ها رشته‌ی خوانا و ثابتِ `PermissionEnum` سرورند (`"SaleView"`, `"PurchaseReturnCreate"`, …) — **نه عدد**.
- `useMyPermissionsQuery` (`GET /Permission/GetMyPermissions`) → `usePermission()`:

```js
const { can, canAny, allows, names, isPending, isError } = usePermission();
can("SaleCreate");                    // تا isPending است همیشه false
can(["SaleView", "PurchaseView"]);    // any-of
allows("SaleCreate");                 // اگر isError باشد true — برای دکمه‌های داخل صفحه
```

- `satisfies(names, required)`: `null` → true؛ آرایه → any-of؛ رشته → عضویت.
- **سه مصرف‌کننده**: منوی سایدبار (`filterNav` با `permission` هر آیتم)، `PermissionGate`، و دکمه‌های داخل صفحه.
- والدِ منو دسترسیِ خودش را ندارد؛ وقتی دیده می‌شود که حداقل یک فرزندش دیده شود.
- `allows` در مقابل `can`: اگر لیست مجوزها نیامد، دکمه می‌ماند و سرور ۴۰۳ می‌دهد
  (بهتر از پنهان‌کردن کار از کسی که دسترسی دارد).

صفحه‌های مدیریت مجوز (`features/permissions`): ویرایش دسترسی هر کارمند (با پیشنهاد الگوی واحد) و الگوهای واحدها؛
`usePermissionDraft` نسخه‌ی در حال ویرایش را در برابر نسخه‌ی ذخیره‌شده نگه می‌دارد و **refetch پس‌زمینه** تیک‌های
ذخیره‌نشده را پاک نمی‌کند؛ `UnsavedChangesDialog` + `useUnsavedChangesGuard` جلوی ترکِ صفحه را می‌گیرد.

---

## 9. لایه‌ی شبکه (axios)

فایل‌ها: `shared/services/api/{axios,contract,sorting}.js`.

### 9.1 نمونه‌ی axios

`baseURL = VITE_API_BASE_URL || "http://localhost:5083/api"`، `timeout: 15000`،
`paramsSerializer: { indexes: null }` (آرایه‌ها به شکل `statuses=2&statuses=3` که ASP.NET برای `List<>` می‌خواند).

### 9.2 Request interceptor

- افزودن `Authorization: Bearer <token>`.
- برای `FormData`، هدر `Content-Type` حذف می‌شود تا axios خودش boundary درست بگذارد (وگرنه `application/json`
  پیش‌فرض بدنه را به JSON تبدیل و فایل را از بین می‌برد).

### 9.3 Response interceptor

**موفق**: باز کردنِ envelope. بکند همه‌چیز را در `{ Data, Message, ResponseMessageType }` می‌پیچد؛ اینترسپتور فقط
وقتی هر دو کلید (`Data` و `Message`) هست `response.data = Data` می‌کند. فایل‌های `api-v1` هرگز envelope را نمی‌بینند.

**خطا** — به ترتیب:

1. `releaseKeyIfSettled`: کلید ایدمپوتنسی فقط با پاسخ **قطعی** آزاد می‌شود (نه تایم‌اوت، نه ۵xx، نه ۴۰۹).
2. **۴۰۱ و غیر refresh**:
   - بدون refreshToken → `logout()`.
   - اگر درخواست با توکنی رفته که دیگر توکن فعلی نیست (تب/درخواست دیگر refresh کرده) → فقط با توکن فعلی **دوباره بفرست**
     (refresh دوباره ۴۰۰ می‌گیرد و کاربر را بی‌دلیل بیرون می‌اندازد).
   - اگر `isRefreshing` → درخواست در صف `refreshSubscribers` می‌ماند و بعد از refresh با توکن جدید ارسال می‌شود
     (رفع race چند درخواستِ هم‌زمان).
   - در غیر این صورت `POST /Account/RefreshToken` با **آخرین توکن‌های ذخیره‌شده** (نه کپی کهنه).
   - شکست refresh:
     - ۴۰۰ و توکن عوض شده = تبِ دیگر refresh کرده → با توکن تازه دوباره بفرست.
     - پاسخِ صریح از سرور (refresh token باطل/منقضی) → `logout()` + رفتن به لاگین.
     - **بدون response** (قطع شبکه/تایم‌اوت) → کاربر خارج **نمی‌شود**.
     - ۴۰۰ با «توکن منقضی نشده» وقتی توکن عوض نشده (مثلاً ری‌استارت سرور و خالی‌شدن cache داخلی) → بن‌بست، خروج.
3. ۴۲۲ در DEV → هشدار کنسول: `Idempotency-Key` برای دو درخواستِ متفاوت استفاده شده (نشانه‌ی باگ فرانت).
4. `attachUserMessage`: `error.serverMessage` (پیام فارسی سرور) و `error.message` **همیشه فارسی** می‌شود.

### 9.4 `contract.js` — قراردادِ مشترکِ لایه‌ی API

| export | کار |
|---|---|
| `normalizeListResponse(data, {itemsKey})` | هر پاسخ فهرست را به `{ items, total, page, totalPages }` تبدیل می‌کند (بکند: `{ XList, Page:{Page,PageCount,Take,Total} }`، camel/Pascal هر دو) |
| `compactParams` | مقادیر `""/null/undefined/"all"` را حذف می‌کند (سرور «خالی» را فیلترِ صفر می‌فهمد، نه «بدون فیلتر») |
| `listQuery({filters, pagination, sorting, sortColumns})` | پارامترهای استاندارد: `page`, `take`, فیلترها، `sortBy`, `sortDirection` |
| `idempotencyKeyFor(variables, scope)` | کلید پایدار برای یک «قصدِ کاربر» (بخش ۱۳.۴) |
| `releaseIdempotencyKey`, `idempotent(key)` | آزادسازی و ساختِ `{ headers: {"Idempotency-Key": key} }` |
| `documentVersion(doc)` | کلید نسخه‌ی سند برای تشخیص «داده‌ی سرور عوض شده، فرم را دوباره پر کن» (`updatedAt` یا اثرانگشت محتوایی) |
| `toApiAttachments` | `[ {objectKey, fileName?, note?} ]` |

`sorting.js`: `SortDirectionEnum {ASC:0, DESC:1}` و `toApiSort(sorting, columns)`؛ ستونی که در نقشه نیست یعنی ترتیب پیش‌فرض سرور.

### 9.5 الگوی `api-v1.js` در هر فیچر

- فقط **توابع async خام** (`fetchX`, `createX`, `updateX`…)؛ هیچ React/Query/toast.
- الگوی بکند RPC‌گونه است: `api/{Controller}/{Action}` (نه REST) — مثلاً `/Purchase/GetPurchaseList`.
- فقط تبدیل‌های **واقعاً لازم**: `fromApiX` (بریدن ساعتِ تاریخ، پرکردنِ آرایه‌های نیامده، فیلد مشتق)
  و `toApiXPayload` (انتخابِ فیلدهای مجاز بدنه). تبدیل نام‌به‌نام حذف شده.
- ثابت‌های `*_SORT_COLUMNS` که ستونِ جدول را به عددِ `*ListSortEnum` سرور می‌نگارند.

---

## 10. لایه‌ی داده: React Query

### 10.1 تنظیمات سراسری (`QueryProvider`)

| گزینه | مقدار | چرا |
|---|---|---|
| `staleTime` | `0` | چند کاربر هم‌زمان روی یک داده کار می‌کنند؛ هر mount/focus از سرور می‌خواند |
| `gcTime` | ۵ دقیقه | |
| `refetchOnWindowFocus` | `true` | کاربران چندساعته |
| `retry` (query) | ۴xx → هرگز؛ بقیه حداکثر ۱ بار | خطای ۴xx با تکرار درست نمی‌شود |
| `retry` (mutation) | **فقط ۴۰۹** تا ۳ بار، فاصله ۱ ثانیه | ۴۰۹ یعنی «درخواستِ اولِ همین کلید ایدمپوتنسی هنوز در جریان است» |

استثنا: `useUserInfoQuery` با `staleTime: 10 دقیقه` و `retry: false` (هویت کم‌تغییر است و ۴۰۱ باید سریع به refresh برسد).

### 10.2 سه فایل برای هر سرویس

```
services/
 ├─ api-v1.js      توابع خام HTTP
 ├─ queryKeys.js   کارخانه‌ی کلید
 ├─ queries.js     هوک‌های useQuery
 └─ mutations.js   هوک‌های useMutation (toast + invalidation)
```

**queryKeys سلسله‌مراتبی** (الگوی ثابت):

```js
export const purchaseKeys = {
  all:     ['purchases'],
  lists:   () => [...purchaseKeys.all, 'list'],
  list:    (filters) => [...purchaseKeys.lists(), { ...filters }],
  details: () => [...purchaseKeys.all, 'detail'],
  detail:  (id) => [...purchaseKeys.details(), String(id)],   // id همیشه String
};
```

**queries**: `placeholderData: keepPreviousData` برای لیست‌ها (جدول هنگام عوض‌شدن صفحه خالی نمی‌شود)،
`refetchOnMount: "always"` برای جزئیات، `enabled: !!id`.

**mutations**: هر `onSuccess` یک toast فارسی و یک مسیر invalidation دارد؛ `onError` با `getErrorMessage(error, "ثبت خرید انجام نشد")`.

### 10.3 «سندِ کامل در پاسخ»

نوشتن روی خرید/فروش **سندِ کامل** (شکل `GetXDetail`) برمی‌گرداند. mutation آن را مستقیم در کش می‌نشاند
(`setQueryData(detail(id), doc)`) و بقیه‌ی اکوسیستم را invalidate می‌کند. `freshPurchase: true` یعنی «detail را دوباره نخوان».

### 10.4 Invalidation مرکزی (`sharedInvalidation.js`)

خرید، دریافت انبار و مرجوعی سه ماژول به‌هم‌گره‌خورده‌اند. به‌جای پراکندگی، همه از یک تابع استفاده می‌کنند:
`invalidatePurchaseEcosystem(queryClient, purchaseId, {freshReturnId, freshPurchase})` که کلیدهای
خرید، دریافت، مرجوعی‌ها، «خریدهای قابل‌مرجوعی»، **کالاها** (`productKeys.all`) و **دانه‌ها** (`productUnitKeys.all`) را
باطل می‌کند (چون دریافت موجودی را بالا می‌برد). قرینه‌ی آن برای فروش وجود دارد. همچنین `supplierKeys.all`/`customerKeys.all`
(مانده‌ی حساب طرف‌حساب با صدور/پرداخت/لغو تکان می‌خورد).

> قاعده: هر mutation جدیدی که روی خرید/فروش/مرجوعی/موجودی اثر دارد باید از همین توابع استفاده کند، نه invalidation دستی.

### 10.5 `runDocumentChanges` — «ثبت تغییرات»

بکند برای هر بخش سند endpointِ جدا دارد؛ صفحه‌ی سند یک دکمه‌ی «ثبت تغییرات» دارد. `services/documentChanges.js`
به **ترتیب امن** اعمال می‌کند: ۱) خودِ سند (فقط پیش‌فاکتور) ← ۲) پرداخت‌ها (ابطال ← اصلاح ← ثبت) ← ۳) سررسید ← ۴) پیوست‌ها ← ۵) وضعیت (آخر؛ لغو بعد از هر چیز).
هر پرداختِ موفق همان لحظه از پیش‌نویس برداشته می‌شود؛ اگر وسط کار خطا بیاید `error.partiallySaved = true` و
`partialSaveMessage` به کاربر می‌گوید «بخشی ذخیره شد» (تا پرداخت را دوباره وارد نکند).

---

## 11. مدیریت state: Zustand

اصل: **داده‌ی سرور → React Query؛ state رابط/پیش‌نویس → Zustand**. هیچ داده‌ی سروری در Zustand کپی نمی‌شود
(به‌جز توکن‌ها).

| استور | نوع | محتوا | ماندگاری |
|---|---|---|---|
| `useAuthStore` | سراسری | توکن‌ها، `isAuthenticated`, `hasHydrated` | localStorage |
| `useHeaderStore` | سراسری | عنوان/بازگشت هدر (`usePageHeader`) | حافظه |
| `useFormDraftStore` | سراسری | پیش‌نویس **یک‌بارمصرف** فرم‌های کوچک + داده‌ی بازگشتی | حافظه |
| `useDashboardLayoutStore` | فیچر | `{[userId]: {order, hidden}}` | localStorage (جدا برای هر کاربر؛ با logout پاک نمی‌شود) |
| `*FilterStore` | فیچر | فیلتر/صفحه‌بندی/مرتب‌سازی لیست | حافظه |
| `*FormStore` | فیچر | پیش‌نویس فرم سند (خرید، فروش، دریافت، ارسال، مرجوعی) | حافظه |
| `useLabelTemplateStore` | فیچر | قالب برچسب (پرینتر/اسکنر مستقل از دسته) | persist |

### 11.1 `createFilterStore({ filters, defaultSorting, defaultPageSize, actions })`

- هر فیلد خودکار یک اکشن `set<Field>` می‌گیرد که مقدار را می‌گذارد **و به صفحه‌ی اول برمی‌گرداند**.
- `setSorting` هم به صفحه‌ی اول؛ «تعداد در صفحه» دست نمی‌خورد (انتخاب صریح کاربر).
- `resetFilters`, `setPagination`, اکشن‌های ترکیبی (`actions({set, applyFilters})`)، و `devtools`.
- **نام فیلدها همان پارامترهای سرورند** (`invoiceNumber`, `supplierId`, `fromDate`…) — بدون ترجمه.

`useDebouncedFilters(useStore, { text, instant })`: فقط ورودی‌های متنی debounce می‌شوند؛ Select و تاریخ فوری‌اند.
خروجی مستقیم به `listQuery` می‌رود.

### 11.2 `createDocumentFormStore({ emptyForm, formFromDocument })`

پیش‌نویس فرم سند (خرید/فروش و…) **در استور است نه state کامپوننت**، تا رفتن به «کالا/مشتریِ جدید» و برگشتن آن را پاک نکند.

- `initializedForId`: `"new"` یا `"id:updatedAt"` — فرم فقط وقتی از سرور پر می‌شود که سند یا نسخه‌اش عوض شود.
- `setFormData`, `setItems`, `setPaymentDraft(next|fn)`, `initializeForNew`, `initializeFrom(doc)`, `resetForm`.
- هوک `useDocumentFormDraft(doc, store)` چرخه را مدیریت می‌کند و `ready` برمی‌گرداند؛ تا `ready` نشده فرم رندر نمی‌شود.
  تصمیم «پاک‌کردن پیش‌نویس» فقط **لحظه‌ی ورود** گرفته می‌شود (مقاوم در برابر دوبار اجرای StrictMode).

### 11.3 `usePageHeader({ title, showBack, onBack })`

عنوان و دکمه‌ی بازگشت هدرِ `AppLayout` را تنظیم می‌کند. دو تفاوت عمدی با الگوی قدیمی: پاک‌کردن فقط هنگام **خروج** است
(عنوان هنگام لودینگ چشمک نمی‌زند) و `onBack` در `ref` نگه داشته می‌شود تا هر رندر store را آپدیت نکند.

---

## 12. ساختار استانداردِ یک فیچر

```
features/<feature>/
 ├─ routes.jsx            آرایه‌ی route (lazy + handle.permission)
 ├─ pages/                صفحه‌ها (orchestration؛ نازک)
 ├─ components/
 │   ├─ forms/            اجزای فرم
 │   └─ table/            تعریف ستون‌ها، فیلترها (…Table, …Filters)
 ├─ hooks/                منطق فرم/UI مخصوص فیچر (use<X>Form)
 ├─ domain/               قواعد/واژگان خالص (بی React، بی شبکه)
 ├─ services/             api-v1 · queryKeys · queries · mutations (· sharedInvalidation)
 └─ store/                filterStore · formStore
```

فیچرهای پیچیده زیرفیچر دارند: `purchases/{orders,returns}`، `sales/{orders,returns}`،
`warehouse/{products,categories,units,receiving,shipping}`، `organization/{departments,teams}`.

---

## 13. الگوهای کلیدی

### 13.1 صفحه‌ی لیست

`ListPageLayout` (کارت + عنوان + دکمه‌ی ایجاد) ← فیلترها ← `ServerTable` ← `DataTable`.

```jsx
const filters = usePurchaseListFilters();                         // debounce + نام‌های سرور
const { pagination, sorting, setPagination, setSorting } = usePurchaseFilterStore();
const query = usePurchasesQuery(filters, pagination, sorting);   // listQuery + keepPreviousData
<ServerTable query={query} listState={store} table={PurchaseTable} />
```

- `ServerTable`: خطا با «تلاش دوباره»، `FetchingOverlay` هنگام واکشی صفحه‌ی بعد، محاسبه‌ی صفحه‌ی فعلی
  (`page` سرور از ۱؛ `pageIndex` جدول از ۰)، `transform` برای افزودن ردیف‌های ترکیبی.
- `DataTable`: پوسته‌ی TanStack Table با `manualPagination/manualSorting`؛ مرتب‌سازی **تک‌ستونی** `{id, desc}|null`؛
  props: `sortable`, `emptyMessage`, `emptyState`, `rowClassName`, `getRowKey`.
- ستون «جزئیات» (`detailsColumn`/`DetailsLink`) یک **لینک واقعی** است (باز کردن در تب جدید کار می‌کند).
- جدول مشتری/تامین‌کننده/کالا فقط **تعریف ستون** هستند.

### 13.2 صفحه‌ی جزئیات

`usePageHeader` ← `useXQuery(id)` ← حالت‌ها: اسکلتون (`…DetailLoading`) / `DetailErrorState`
(تفکیک «۴۰۴ = یافت نشد» از «خطای موقت با دکمه‌ی تلاش دوباره») / محتوا.

### 13.3 فرم‌ها — دو شیوه

| | فرم ساده (`react-hook-form`) | فرم سند (Zustand) |
|---|---|---|
| کجا | کالا، مشتری، تامین‌کننده، کارمند، واحد، تیم، لاگین | خرید، فروش، دریافت، ارسال، مرجوعی |
| state | `useForm` داخل `use<X>Form` | `createDocumentFormStore` |
| پیش‌نویس بین صفحه‌ها | `useFormDraft` (یک‌بارمصرف، `formDraftStore`) | ذاتی (استور) |
| قفل ترک صفحه | `useUnsavedChangesGuard` + `useBlocker` + `beforeunload` | همان |

اعتبارسنجی‌های ایرانی در `shared/lib`: `nationalId.js`، `iranianMobile.js`، `iranian-bank.js`، `plate.js`، `validationRules.js`.
ورودی‌های اختصاصی در `components/ui`: `price-input`, `national-id-input`, `mobile-number-input`, `plate-input`,
`bank-input`, `persian-date-picker`, `city-selector`.

`reportFormProblem` / `scrollToSection`: وقتی اعتبارسنجی شکست بخورد، به بخش مشکل‌دار اسکرول و پیام نشان داده می‌شود.

### 13.4 ایدمپوتنسی (Idempotency-Key)

مسئله: ثبت پرداخت/سند/مرجوعی **تجمعی** است؛ تکرارِ درخواست (قطع شبکه، دوبار کلیک) یعنی دوبار اعمال شدن
(برای کارتخوان: پولی که یک‌بار کشیده شده و دوبار ثبت شود).

راه‌حل:
- `idempotencyKeyFor(variables, scope)`: کلید به **محتوای** درخواست (`JSON.stringify`) گره خورده، نه شیء variables. تکرارِ
  همان محتوا ⇒ همان کلید؛ `scope` برای دو قصدِ جدا با محتوای یکسان (دو پرداخت نقدیِ هم‌مبلغ).
- فقط در **لایه‌ی mutation** ساخته می‌شود (نه کامپوننت، نه api-v1) و به `api-v1` به‌صورت `{ idempotencyKey }` می‌رسد؛
  `idempotent(key)` هدر را می‌سازد.
- کلید با **پاسخِ قطعی** سرور (موفق یا ۴xx، نه ۵xx/۴۰۹/بی‌پاسخ) آزاد می‌شود (اینترسپتور). بعد از موفقیت، دو سندِ عیناً یکسان پشت‌سرهم دو سند می‌شوند.
- سمت سرور: ۴۰۹ = همان کلید در جریان است (React Query تا ۳ بار retry می‌کند)، ۴۲۲ = کلید برای درخواستِ متفاوت (باگ فرانت).

### 13.5 پیام‌های خطا

`getErrorMessage(error, fallback)` ترتیب: ۱) `error.serverMessage` فارسی ۲) علت مشخص‌تر (شبکه/تایم‌اوت/۴۰۳) ۳) `fallback` اختصاصیِ عملیات
۴) پیام عمومیِ کد وضعیت. پیام سرور فقط وقتی نشان داده می‌شود که **حرف فارسی** داشته باشد (متن فنیِ exception به کاربر نمی‌رسد).
هرگز `error.message || "..."` ننویسید.

### 13.6 ConfirmDialog

تا پایان درخواست **باز می‌ماند** (متن «در حال حذف...»)، با Esc/کلیک بیرون وسط درخواست بسته نمی‌شود. فراخوان در `onSuccess` می‌بندد؛
اگر شکست بخورد کاربر همان‌جاست و می‌تواند دوباره تلاش کند. پیش‌فرض `destructive` (قرمز).

### 13.7 ساختار «پیش‌فاکتور ← فاکتور» در خرید/فروش

- **قفل پیش‌فاکتور**: خرید/فروش فقط تا وقتی `PROFORMA` است با `Update*` ویرایش می‌شود. بعد از صدور فقط چهار چیز باز است و هر کدام
  endpoint خودش را دارد: پرداخت‌ها، وضعیت، پیوست‌ها، مهلت پرداخت.
- `totalAmount/paidAmount` فرستاده نمی‌شود؛ سرور از اقلام/مالیات و ردیف‌های پرداخت حساب می‌کند.
- صفحه‌ها: `…Form` (ثبت/ویرایش پیش‌فاکتور) و `…IssuedView` (فاکتور صادرشده) با `DocumentFormLayout` (ستون اصلی + ستون کناری چسبان با جمع و ثبت).
- اقلام: `DocumentItemsSection` + `ProductPicker`/`ProductSearchPanel` + `invoice/lineMath.js` (پیش‌نمایش؛ بعد از ذخیره عدد سرور).

---

## 14. لایه‌ی دامنه (`domain/`)

فایل‌های **خالص**: بی React، بی شبکه، قابل import از سرویس و store.
دو جا: `shared/domain/*` (مشترک) و `features/*/domain/*` (مخصوص فیچر).

### 14.1 Enumها (`shared/domain/enums`)

`Object.freeze({ NAME: number })` که **دقیقاً هم‌شماره** با enum بکند است (روی سیم عدد است)، همراه `*_LABELS` فارسی،
و نگاشتِ **وضعیت ← tone** کنار همان labelها:

`purchaseStatus` (PROFORMA 0 … CANCELLED 5)، `saleStatus`، `paymentType` (CASH، …، CHECK، INSTALLMENT…)،
`paymentDirection`، `unitStatus` (IN_STOCK 1، SOLD 2، RETURNED_TO_SUPPLIER 3، SCRAPPED 4، **QUARANTINED 9**؛ ۵–۸ عمداً خالی)،
`productUnit`, `taxCategory`, `balanceType`, `orgRole`, `department`, `reportPeriod`, `imageFolder`, `barcodeReferenceKind`.

> قاعده: فرانت از بکند جلو نمی‌زند. مقدارِ ناشناس یا هرگز نمی‌آید یا هنگام ارسال رد می‌شود.

### 14.2 دامنه‌ی مرجوعی (`shared/domain/returns`) — مشترک خرید/فروش

مدل «**ادعا ← تصمیم ← اثر**»:

- **ادعا (claim)**: چه چیزی مشکل دارد. دامنه (`scopes.js`): `ON_ORDER` (روی خط سند، سقف = مقدار واقعاً جابه‌جاشده)،
  `OFF_ORDER` (`EXCESS` مازادِ یک قلم، `UNLISTED` کالای سفارش‌نداده). مشکل (`problems.js`) یک‌بار تعریف و فقط **برچسب** هر سمت فرق می‌کند.
- **اثر (effect)** (`effects.js`): ترکیبی از چهار حرکتِ جهت‌دار نسبت به **ما**:
  `GOODS_IN`, `GOODS_OUT`, `MONEY_IN`, `MONEY_OUT` + دو اثرِ قرنطینه‌ای فقط‌خرید: `GOODS_RELEASE`, `GOODS_SCRAP`.
  «بازگشت وجه» و «تعویض» فقط نام ترکیب‌های پرتکرارند.
- **تصمیم (resolution)** (`resolutions.js`): ترکیب محورها، بسط به اثر، اعتبارسنجی و ماشین وضعیت.
- **وضعیت** (`statuses.js`): `OPEN 0 → IN_PROGRESS 1 → SETTLED 2` **مشتق از اثرها** در سرور (`RecomputeReturnStatus`)؛
  `REJECTED/CANCELLED` اکشن صریح‌اند. فرانت فقط می‌خواند.
- `claimDrafts.js`: توابع خالص روی پیش‌نویس ادعا (افزودن/تغییر/حذف، `lines` + `offScopeClaims`)؛ هوک فرم هر سمت نتیجه را در store می‌گذارد.
- `claimsApi.js`: تنها نگاشت عددیِ ادعا ↔ API برای هر دو سمت. `sides.js`: برچسب‌های هر سمت (فروش/خرید).
- `receivingReport.js`, `observations.js`, `carryOverClaims.js`: گزارش دریافت، مشاهده‌ی انباردار، انتقال ادعا بین مرجوعی‌های زنجیره‌ای.

### 14.3 پرداخت (`shared/domain/payments`)

`paymentRows.js`: تبدیل‌های خالص پیش‌نویس فرم ↔ بدنه‌ی API؛ `EMPTY_PAYMENT_DRAFT = { changes:{[paymentId]:…}, added:[{id,values}] }`
(پرداخت‌های ثبت‌نشده بدون ساخت رکورد سرور)؛ `paymentSplit.js` تقسیم مبلغ بین روش‌ها.

### 14.4 سایر

- `invoice/lineMath.js`: همان قاعده‌ی `InvoiceLineMath` سرور (gross، discount%، net، tax%، گرد کردن نیم‌به‌بالا **برای هر قلم**، کالای معاف). پرچم `taxKnown` می‌گوید مالیات واقعاً محاسبه شده یا صفر فرض شده (لیست کالا نرخ مالیات نمی‌دهد).
- `pos/posSession.js`: ماشین وضعیت کارتخوان (بخش ۲۰).
- `barcode/*`: پیکربندی نمادگذاری (CODE128 پیش‌فرض + QR مکمل با **محتوای یکسان**)، شناساگر، کد محصول.

### 14.5 Vocabulary

هر زیرفیچر فایل `*Vocabulary.js` دارد (مثلاً `receivingVocabulary`, `unitVocabulary`, `salesReturnVocabulary`) برای **نام‌گذاری بدون محاسبه**؛
جدا از سرویس تا کامپوننت‌های جدول بدون وابستگی به API از آن بخوانند.

---

## 15. کتابخانه‌ی کامپوننت‌های مشترک

`shared/components` (حدود ۱۷۱ فایل). دسته‌بندی:

| پوشه | محتوا |
|---|---|
| `ui/` | primitiveهای **shadcn** (تولید CLI، فقط در صورت نیاز واقعی دست بخورند) + ورودی‌های ایرانی (قیمت، کد ملی، موبایل، پلاک، بانک، تقویم شمسی، شهر) |
| `layout/` | `AppSidebar`, `NavMain/NavUser/NavTools/NavSecondary/NavWorkspace`, `AppBreadcrumb`, `ListPageLayout`, `RouteLoadingOverlay` |
| `table/` | `DataTable`, `ServerTable`, `DataTablePagination`, `columns` (`detailsColumn`), `DetailsLink`, `SortIcon`, `PaymentProgress`, `TableLoadingSkeleton` |
| `filters/` | `FilterPanel`, `FilterSearchInput`, `FilterSelect`, `FilterDateInput`, `EntitySelect` |
| `forms/` | `DocumentFormLayout`, `FormField`, `FormSectionCard`, `OrderInfoCard`, `PartyPickerCard`, `ProductSearchPanel`, `SelectedItemsTable/Cards`, `QuantityStepper`, `AmountInWords`, `MixedPaymentList`, `TransporterSection`… |
| `status/` | `StatusBadge`, `StatusText`, `PurchaseStatusBadge`, `SaleStatusBadge`, `PaymentTypeBadge`, `statusIcons` |
| `feedback/` | `ConfirmDialog`, `DetailErrorState`, `QueryErrorState`, `FetchingOverlay`, `Notice`, `ProgressStat` |
| `payments/` | `PaymentsCard`, `PaymentRow`, `PaymentForm`, `PaymentMethodEditor`, `PaymentTotals`, `useFormPosPayment`, `pos/*` (کارتخوان) |
| `products/` | `DocumentItemsSection`, `ProductPicker`, `useReturnedNewProduct` |
| `returns/` | ~۲۹ کامپوننت مرجوعی مشترک خرید/فروش (`ReturnTable`, `ReturnItemsSection`, `ResolutionComposer`, `ClaimRow`, `ReturnStatusBar`, `ReturnChain`, …) |
| `invoice/` | سند و پیوست فاکتور (`InvoiceDocumentSection`, `useInvoiceAttachments`, `IssuedInvoiceNotice`) |
| `files/` | `FileUploadList`, `ImageUploadField`, `ImageLightbox`, `RemoteImage` |
| `barcode/` | `BarcodeScanField`, `CameraScanButton`, `CameraScanner`, `UnitBarcodeScanList` |
| `print/` | `usePrint`, `LabelSheet`, `BarcodeGraphic`, `QrCodeGraphic`, `sheetPresets`, `print.css` |
| `map/` | `LocationPickerMap` (lazy) ← `MapCanvas` (**تنها فایل Leaflet**) + `MapSearchBar` + `nominatim.js` |
| `charts/` | `TrendChart`, `DonutChart`, `GroupedBarChart`, `Sparkline`, `ChartCard`, … (SVG اختصاصی، بدون کتابخانه‌ی چارت) |
| `theme/` | `ThemeProvider`, `ThemeToggle`, `themeContext` |
| `app-update/` | `AppUpdateDialog`, `UpdateAvailableToast` |
| `skeletons/` | `OrderFormSkeleton`, `WarehouseFormSkeleton` |

### هوک‌های مشترک (`shared/hooks`)

`useDebouncedFilters/useDebouncedValue`, `useDocumentFormDraft`, `useFormDraft`, `useGoodsRoundForm`, `useIssuedDocumentDraft`,
`usePaymentDraft`, `usePosPayment`, `useFileUploadList`, `useImageUpload`, `useIsMobile` (`matchMedia`)، `usePageHeader`, `useGoBack`,
`useReturnTo`, `useSubPageNavigation`, `useUnsavedChangesGuard`, `useClaimsInOtherReturns`, `useControllableState`, `useSyncedComputedValue`.

### `shared/lib`

`numberFormat` (`formatNumber`, `formatRial`, `formatDigits` برای سریال/شناسه)، `numberToPersianWords` (مبلغ به حروف)، `persianDigits`, `dateUtils` (میلادی↔شمسی، `toDateOnly`, `nowLocalIso`)،
`errorMessage`, `tone`, `plate`, `quantityUtils`, `createRowStatus`, `draftId`, `routeTransitionBus`, `syncThemeColor`, `scrollToSection`, `utils` (`cn`)،
`persianProvinces` (داده‌ی بزرگ؛ فقط در chunk مربوط به `city-selector`).

---

## 16. سیستم طراحی، تم و RTL

### 16.1 RTL / فارسی
`DirectionProvider direction="rtl"` در ریشه؛ فونت Vazirmatn؛ سایدبار سمت راست (`side="right"`)؛ ارقام فارسی با `formatNumber`/`toLocaleString("fa-IR")`.
برای متن‌های دوجهته (مثل `۳۳×۶۲`) از جداکننده‌های LRI/PDI استفاده می‌شود (`formatLabelSize`).

### 16.2 تم‌ها (`index.css`)
چهار+ تم با **کلاس روی `<html>`**: `light`، `dark` (پیش‌فرض)، `theme-accessible`، `theme-rose`، `theme-forest`؛ هرکدام همه‌ی توکن‌ها را تعریف می‌کنند
(رنگ‌ها `oklch`). `@custom-variant dark (&:is(.dark *))`. `syncThemeColor` رنگ `<meta theme-color>` را همگام می‌کند.

### 16.3 سیستم tone (قانون سخت‌گیرانه)

رنگِ وضعیت **هرگز** مستقیم از پالت Tailwind (`amber-50`, `green-700`) یا `oklch(...)` نوشته نمی‌شود. «معنا» انتخاب می‌شود
و ظاهر از توکن‌ها می‌آید (`shared/lib/tone.js`):

| tone | معنا |
|---|---|
| `neutral` | پیش‌نویس/غیرفعال (پیش‌فاکتور) |
| `primary` | رنگ برند |
| `info` | در جریان (ارسال‌شده، چک) |
| `success` | کامل/فعال (دریافت‌شده، در انبار) |
| `warning` | در انتظار/نیازمند اقدام |
| `caution` | ناقص/مسئله‌دار (دریافت ناقص، قرنطینه) |
| `special` | گردش‌های خاص (مرجوعی، نسیه) |
| `danger` | لغو/رد/اسقاط/خطا |

مصرف: وضعیت → `StatusBadge` (یا `PurchaseStatusBadge`, `SaleStatusBadge`, `PaymentTypeBadge`, `ReturnStatusBadge`)؛
متن رنگی → `StatusText`؛ باکس هشدار/توضیح → `Notice`؛ پیشرفت شمارشی → `ProgressStat`؛ ردیف جدول → `toneRow`.
نگاشت «وضعیت→tone» کنار labelها در `shared/domain/enums/*`، آیکن‌ها در `status/statusIcons.js`.
کلاس `dark:` برای رنگ لازم نیست (توکن‌ها در هر تم تعریف شده‌اند). کلاس‌ها باید **رشته‌ی کامل و ثابت** باشند تا Tailwind پیدایشان کند.

### 16.4 تایپوگرافی و `cn`
`cn()` (`clsx` + `tailwind-merge`) در `shared/lib/utils`. واریانت‌ها با `cva`.

---

## 17. فیچرها (ماژول‌های کسب‌وکار)

| فیچر | فایل | مسیرها | مجوز اصلی | توضیح |
|---|---|---|---|---|
| **auth** | 8 | `/auth/login` | — | لاگین (RHF)، استور توکن، `useUserInfoQuery`, `useMyPermissionsQuery`, `usePermission`, `useCurrentUser` |
| **dashboard** | 31 | `/dashboard` | — | ویجت‌های نقش‌محور؛ پایین‌تر |
| **customers** | 13 | `/customers…` | `CustomerView/Create` | CRUD مشتری، فرم آدرس (نقشه)، صورت‌حساب |
| **suppliers** | 14 | `/suppliers…` | `SupplierView/Create` | هم‌ساختار مشتری |
| **partyAccount** | 10 | — (مشترک) | — | دفتر حساب اشخاص: `PartyStatementCard`, `LedgerBalanceBadge`, `PartyListFilters`, `PartyAddressForm`, `createPartyFilterStore`, `partyBalance` |
| **employees** | 20 | `/employees…` | `UserView/Create/Update` | کارمند، واحد/تیم/نقش، ریست رمز |
| **organization** | 33 | `/organization/{departments,teams}` | `Department/Team View/Manage` | واحدها و تیم‌ها، تعیین مدیر/جانشین |
| **permissions** | 20 | `/access/{users,templates}` | `PermissionView` | ویرایش دسترسی کارمند، الگوی هر واحد |
| **purchases** | 33 | `/purchases…` | `Purchase*`, `PurchaseReturn*` | `orders` + `returns` |
| **sales** | 33 | `/sales…` | `Sale*`, `SaleReturn*`, `SaleInstallment*` | `orders` + `returns` (قرینه‌ی خرید) + `installments` |
| **warehouse** | 93 | `/warehouse…` | `Product*`, `PurchaseReceive`, `SaleShip`, `ProductUnitView`, … | کالا، دسته، دانه‌ها، دریافت، ارسال |
| **reports** | 21 | `/reports…` | `ReportView` | فعالیت کارمند/مشتری/تامین‌کننده، فروش، خرید، مالی، سود و زیان، انبار |
| **settings** | 10 | `/settings…` | — | **placeholder** (هر صفحه ~۶ خط) |
| **invoice** | 2 | `/invoice` | — | **placeholder** |
| **transactions** | 2 | `/transactions` | — | **placeholder** |

### 17.1 purchases / sales
دو سمتِ قرینه (تامین‌کننده ↔ مشتری). `orders`: لیست، ثبت جدید، جزئیات، `…Form` (پیش‌فاکتور)، `…IssuedView` (صادرشده)، `domain/…Rules|…Payments|…Pricing`.
`returns`: لیست/ثبت/جزئیات؛ بدنه‌ی منطق در `shared/domain/returns` و `shared/components/returns`، و هر سمت فقط **vocabulary**، store و سرویس خودش را دارد.
فروش علاوه بر خرید: `useSaleFormPos` (کارتخوان در فرم)، `salePricing`، صدور خودکار فاکتور با اولین دریافت.
`sales/installments`: فروشِ اقساطی روی `api/SaleInstallment` — قرارداد با پیش‌پرداخت هنگامِ صدورِ فاکتور (`InstallmentPlanDraftCard` در `SaleForm`)،
`InstallmentPlanCard` در فاکتورِ صادرشده (جدولِ اقساط، دریافتِ قسط، تسویه، ویرایش، ابطال)، صفحه‌ی `/sales/installments`، `CustomerInstallmentsCard`
و کاشیِ «اقساطِ سررسیدگذشته»ی داشبورد. مبالغ از سرور؛ `domain/installmentPlan.js` فقط پیش‌نمایشِ فرم است و دیرکرد از `dueDate` تشخیص داده می‌شود
(سرور `OVERDUE` نمی‌نویسد). کمبودهای بکند: بخش ۱۷ سندِ درخواست‌ها.

### 17.2 warehouse
- **products**: لیست/جزئیات/جدید، `useProductForm` (RHF، با **همان نام‌های بکند**: `retailPrice`، `wholeSalePrice`، `tax`، `stock`، `barCode`)، تصویر، بارکد/QR محصول، `CategoryManager` (با همان `CategoryFormDialog`ِ صفحه‌ی دسته‌ها). در ویرایش، تغییرِ «موجودی» اصلاحِ دستی است و دانه می‌سازد/کم می‌کند.
- **categories**: `ListPageLayout` + جدولِ ساده (بی صفحه‌بندی) + دیالوگ ایجاد/ویرایش + `ConfirmDialog` حذف (حذفِ نرم).
- **units** («دانه‌ها و برچسب‌ها»): ردیابی هر دانه‌ی فیزیکی (انبار/قرنطینه/نزد مشتری/برگشتی/اسقاط)، دو انتخاب‌گرِ نما (`UnitViewNav`: جایگاه با شمارش و وضعیتِ برچسب)، عملیات گروهی (`UnitBulkBar`, `unitOperations`)، **طراح چاپ برچسب** (`LabelPrintDesigner`, `labelTemplate`, `UnitLabel`). برگه‌ی جزئیات و طراحِ چاپ `lazy`‌اند (JSِ صفحه ~۴۴KB). سریال و شناسه با `formatDigits` (بی جداکننده). فهرستِ طرف‌حساب‌ها فقط با باز شدنِ «فیلترهای بیشتر».
- **receiving / shipping**: «صف» خرید/فروشِ منتظرِ دریافت/ارسال با `QueueTable` و `QueueFilters` مشترک (`warehouse/shared`). `useQueueRows` سه حالت فیلتر (`AWAITING`, `RETURNS`, `REPLACEMENTS`) را ترکیب می‌کند: ردیف خرید/فروش + ردیف‌های **کالای مرجوعی** (`__return: true`، کلید جدا). فرم دریافت/ارسال: کارت هر قلم، اسکن دانه، کسری/خرابی/مازاد (قرنطینه)، کالای سفارش‌نداده، حمل‌کننده. `useGoodsRoundForm` منطقِ «دور» کالای مرجوعی.
- **`warehouse/shared`**: `applyShipmentResult` (پاسخِ محموله در کش)، `withProductInfo`/`trackedLookup`، `WarehouseSubmitBar`، `NothingPending`، `QueueTable`، `QueueFilters`.
- اطلاعاتِ کالاهای یک سند (تصویر، برند، `requiresUnitTracking`) با `useDocumentProducts` (فقط کالاهای همان سند، با کشِ جزئیات) — نه فهرستِ ۲۰۰ کالای اول. حذفِ این درخواست‌ها منتظرِ بندِ ۱۵.۱ سندِ بکند است.

### 17.3 dashboard (معماری ویجت)
سه لایه (`widgetRegistry.js`):
1. **در دسترس** (`isAvailable`) از روی نقش سازمانی + مجوز — ویجتی که سرور داده‌اش را نمی‌دهد اصلاً وجود ندارد.
2. **پیش‌فرض** (`defaultLayout`) بر اساس نقش.
3. **انتخاب کاربر** در `dashboardLayoutStore` به تفکیک `userId` (`resolveLayout` هر بار با مجوزهای امروز تطبیقش می‌دهد؛ ذخیره‌ی ویجت از‌دست‌رفته بی‌خطر است).

`dashboardContext` تنها ورودی تصمیم: `GetUserInfo` + `GetMyPermissions` → `scopes` (ME / TEAM / DEPARTMENT از `ReportScopeEnum`)؛ سازمان به `ReportView` بسته است نه نقش.
گروه‌ها: کار روزانه، عملکرد من، تیم من، واحد من، نمای کل سازمان. `span` عرض در گرید ۳ستونه؛ `periodic` یعنی به بازه‌ی تاریخ نوار بالا گوش می‌دهد؛ `locked` غیرقابل‌خاموش.
ویجت‌ها: Welcome، QuickActions، WorkQueues، ScopePerformance، TopSellers، MemberRankList، OrgWidgets. فعلاً چیدمان فقط در مرورگر ذخیره می‌شود (بین دستگاه‌ها sync نیست؛ `frontend-requests` بخش ۶.۳).

### 17.4 permissions / organization / employees
- مدل سازمانی: هر کاربر **دقیقاً یک واحد** و حداکثر یک تیم؛ نقش (`OrgRoleEnum` MEMBER/DEPARTMENT_HEAD/DEPUTY/TEAM_HEAD/DEPUTY) از `headId/deputyId` در سرور مشتق می‌شود.
- `UserAccessPage`/`DepartmentTemplatesPage`: `AccessListPane` + `PermissionEditor` + `GroupChips` + `SaveBar` + `TemplateBar`.

---

## 18. PWA و بروزرسانی برنامه

- `vite-plugin-pwa` با **`registerType: "prompt"`**: نسخه‌ی جدید دانلود می‌شود ولی تا تأیید کاربر فعال نمی‌شود (کار نیمه‌تمام فرم از بین نرود).
- **سه راه رسیدن به نسخه‌ی تازه** (`shared/services/appUpdate.js` — تنها جای ثبت SW): ۱) بررسی خودکار هر ۱۵ دقیقه و با دیده‌شدن مجدد برگه ۲) دستی از منوی کاربر (`AppUpdateDialog`) ۳) هنگام ورود (کسی که تازه وارد شده کاری ندارد، پس نسخه‌ی آماده بی‌پرسش فعال می‌شود).
- **کش runtime**: tile‌های نقشه (CacheFirst، ۲۰۰ مورد/۳۰ روز)، فونت‌ها (۱ سال)، `*.wasm` اسکنر بارکد (CacheFirst؛ عمداً precache نیست چون ~۱MB و فقط مرورگرهای بدون `BarcodeDetector` نیتیو نیاز دارند).
- **پاسخ API عمداً کش نمی‌شود**: داده‌ی مالی/شخصی است، کلید کش توکن را نمی‌شناسد (کاربر بعدی همان دستگاه پاسخ قبلی را می‌دید)، و در کندی شبکه داده‌ی کهنه نشان می‌داد. `purgeLegacyApiCache` کش قدیمی `api-cache` را پاک می‌کند.
- `devOptions.enabled: false` (HMR به‌هم نریزد). precache حدود ۳.۹MB (مبنا قبل از ریفکتور).
- manifest: `lang: fa-IR`, `dir: rtl`, `display: standalone`, `orientation: portrait`, آیکن maskable.

---

## 19. فایل، تصویر، بارکد، چاپ، نقشه

### 19.1 فایل و تصویر (`shared/services/files`, `api/File`)
قرارداد سه‌گانه: ۱) آپلود **جدا** از ثبت موجودیت است و فقط `objectKey` می‌گیرد؛ همان کلید در `imageUrl` دستور Create/Update می‌رود.
۲) `url` آدرس **ثابت** خودِ API است (`/api/File/GetImage?objectKey=…`، منقضی نمی‌شود چون باکت Liara به User-Agent مرورگر ۴۰۴ می‌دهد)؛ ولی چیزی که **ذخیره** می‌شود `objectKey` است نه URL (URL با هاست عوض می‌شود).
۳) سرور هنگام تعویض، فایل قبلی را **پاک نمی‌کند** — پاک‌سازی یتیم‌ها کار فرانت است (`useImageUpload`).

- `objectKey.js`: توابع خالص «کلید ↔ آدرس»؛ کلید در **query string** است نه مسیر؛ آدرس نسبی نسبت به origin API حل می‌شود.
- `useImageUpload` (یک تصویر برای موجودیت) و `useFileUploadList` (چند فایل برای **سند**: `[{objectKey, fileName, note}]`) عمداً جدا هستند چون قرارداد فرق دارد؛ هر فایل چرخه‌ی مستقل دارد (یکی شکست می‌خورد، بقیه دست‌نخورده).
- `useImageUrlQuery`: `staleTime: Infinity`؛ `useSeedImageUrl` آدرس آپلودشده را در کش می‌ریزد.
- آزادسازی blob URLها بعد از چاپ تصاویر ضمیمه.

### 19.2 بارکد
تولید: `react-barcode` (CODE128) + QR با **محتوای یکسان** (وگرنه یک برچسب بسته به ابزار اسکن دو جواب می‌دهد؛ بکند هم همین را رندر می‌کند).
خواندن: `BarcodeDetector` نیتیو، fallback به ZXing-wasm. `BarcodeScanField` = **یک فیلد** برای جست‌وجو و اسکنر دستی، با دکمه‌ی دوربین (`CameraScanButton`، lazy). `UnitBarcodeScanList` اسکن دانه‌ها هنگام دریافت/ارسال.

### 19.3 چاپ
`usePrint`: «مسیر خروجی» مرورگر؛ محتوای داخل `[data-print-root]` چاپ می‌شود (`@page` پویا + کلاس `printing` روی body، پاک‌سازی روی `afterprint`).
مسیر دوم (PDF برای پرینتر حرارتی) قرار است با همان امضا اضافه شود. `sheetPresets`: هندسه‌ی A4 (مثلاً ۳×۸ = ۲۴ برچسب ۶۲×۳۳mm) با قید ریاضی
`columns×w + (columns−1)×gap ≤ عرضِ مفید` — وگرنه ستون/ردیف آخر بی‌صدا بیرون می‌افتد؛ `perPage` از `columns×rows` محاسبه می‌شود.
`scripts/build-label-print-check.js` این هندسه را بررسی می‌کند. قالب برچسب (`labelTemplate`) رول (پرینتر برچسب) یا ورق A4.

### 19.4 نقشه
`LocationPickerMap` lazy است؛ Leaflet فقط در `MapCanvas`. جست‌وجو/معکوس‌یابی با Nominatim (`nominatim.js`). «تأیید موقعیت» تا پیدا شدن آدرس غیرفعال است. فرم آدرس مشتری/تامین‌کننده = `PartyAddressForm`.

---

## 20. کارتخوان (POS)

**هنوز پیاده‌سازی نشده** در سطح ارتباط با دستگاه؛ فرانت آماده و پشت یک قرارداد (`services/pos/posTransport.js`) است:
سه تابع `sale` (ارسال مبلغ و انتظار برای نتیجه)، `cancel` (لغو تراکنشِ منتظرِ کارت) و `inquire` (استعلامِ نتیجه با مرجع و مبلغ) که از `getPosTransport()` گرفته می‌شوند و هر PSP با `terminal.vendor` پیاده می‌کند؛ خطاها با `PosTransportError("unreachable" | "lost")`.

محدودیت مرورگر: برنامه روی HTTPS است و به `http://192.168.x.x` درخواست نمی‌فرستد (mixed content / Private Network Access) ⇒ ارتباط باید از راه یک **برنامه‌ی واسط** روی همان کامپیوتر (`http://127.0.0.1:<port>`) باشد که نتیجه را با کلید خودش امضا کند تا سرور اعتماد کند (بخش ۱۲.۱ سند درخواست‌ها).

**ماشین وضعیت خالص** (`domain/pos/posSession.js`) — مهم‌ترین قاعده: **کارت‌کشیدن برگشت‌ناپذیر است** (`holdsMoney`: کاربر نباید بتواند صفحه را ببندد یا دوباره مبلغ بزند):

```
idle ─start─▶ starting ─sent─▶ waitingCard ─result─▶ approved ─▶ recording ─▶ recorded
                 │                │                  ├─▶ declined
                 │                │                  └─▶ cancelled
                 └─unreachable─▶ failed (چیزی نرسید؛ تلاش دوباره امن)
                                  └─lost──▶ unknown ─result─▶ …   (شاید کارت کشیده شده)
recording ─خطا─▶ recordFailed ─retry─▶ recording
```

`usePosPayment` فقط رویداد می‌فرستد؛ کامپوننت‌های `payments/pos/*` (`PosPaymentPanel`, `PosReadyForm`, `PosResultViews`) فقط state می‌خوانند. دستگاه انتخابی هر کاربر در `localStorage["pos.terminalId"]`. لوگوی بانک (~۴۳۰KB) lazy است و فقط با رسید کارت ماسک‌شده بار می‌شود.

---

## 21. قراردادهای کدنویسی

### 21.1 زبان و کامنت
- **کامنت‌ها فارسی**، مثل بقیه‌ی کد. برای export‌ها JSDoc کوتاه: «چه می‌کند و *چرا*»، نه تکرار کد.
- کد تازه باید از نظر چگالی کامنت/نام‌گذاری/idiom شبیه اطرافش باشد.
- پیام‌های کاربر فارسی، با لحن و املای یکسان («پیش‌فاکتور»، «تامین‌کننده»، «دانه»).

### 21.2 نام‌گذاری
- فایل کامپوننت `PascalCase.jsx`؛ هوک `useX.js`؛ سرویس‌ها `api-v1.js/queries.js/mutations.js/queryKeys.js`.
- enum: `XxxEnum` + `XXX_LABELS`؛ ثابت‌ها `UPPER_SNAKE`.
- **فیلد = نام بکند**. اگر نام بکند غلط/ناهمنام است (`FisrtName`, `RefferalCode`, `OrderLineId`) تنها نگاشت‌های مجاز همان‌هاست و توضیح دارد.

### 21.3 قواعد سخت‌گیرانه (از REFACTOR.md)
1. بدون adapter فقط-تغییرنام.
2. بدون mock/داده‌ی ساختگی.
3. بدون رنگ خام Tailwind برای وضعیت؛ فقط tone.
4. بدون `error.message || "..."`؛ فقط `getErrorMessage`.
5. بدون template-string برای مسیر؛ فقط `routeWithId`.
6. بدون جدول/لیستِ کپی؛ از `DataTable`/`ServerTable`/`ListPageLayout`.
7. بدون هوک تکراریِ `setHeader`/`clearHeader`؛ فقط `usePageHeader`.
8. بدون کپی منطق بین خرید و فروش؛ منطق مشترک به `shared/` می‌رود و هر سمت فقط *برچسب/واژگان* خودش را می‌دهد.
9. هر تغییر رفتاریِ برنامه (غیر از رفع باگ) ممنوع در فاز ریفکتور؛ باگ در پیام commit ذکر شود.
10. `components/ui/*` را دستی ویرایش نکنید (مگر نیاز واقعی).

### 21.4 ESLint
`react-hooks` (v7، با قواعد React Compiler)، `react-refresh/only-export-components` (غیرفعال برای `routes.jsx` و چند فایل shadcn)، `no-unused-vars: warn`. گلوبال `__APP_BUILD__` تعریف شده. فایل‌های Node جدا کانفیگ شده‌اند. هشدارهای «Compilation Skipped» باقی‌مانده مربوط به `useReactTable` و `watch` در RHF است.

### 21.5 Commit
پیام‌ها با پیشوند فاز (`Returns 3.6: …`, `Purchase/sale 2.8: …`)، و قبل از هر commit: lint + build.

---

## 22. رابطه با بکند

- بکند: ASP.NET (`Backend-Net/`) با الگوی `api/{Controller}/{Action}`؛ پاسخ در envelope `{Data, Message, ResponseMessageType}`.
- مرجع قرارداد: `Backend-Net/docs/api-guide.fa.md` (شماره‌ی بخش‌ها در کامنت‌های کد می‌آید، مثلاً «بخش ۱۵ = enumها»، «بخش ۱۷ = File»).
- اسناد مرتبط در `Backend-Net/docs/`: `frontend-requests.fa.md` (درخواست‌های فرانت از بکند)، `frontend-enum-contract.fa.md`، `permission-frontend-guide.fa.md`، `org-structure-contract.fa.md`، `payment-enum-unification.fa.md`، `invoice-attachment-requirements.fa.md`، `image-serving-guide.{fa,en}.md`، `frontend-sync-followup.fa.md`.
- **فرانت به بکند دست نمی‌زند.** هر منطقی که در فرانت تکرار شده و باید در سرور باشد (مثلاً پرچم «مجاز بودن کار» روی سند، فیلتر صف‌ها، ادعاهای مرجوعی‌های دیگر روی سند مبدأ) به‌صورت بند شماره‌دار در `frontend-requests.fa.md` ثبت می‌شود و فرانت تا پیاده‌سازی با بهترین تقریب کار می‌کند.
- سرور تست: `https://api-test.pasargadmp.ir/api`؛ تولید: `https://api.pasargadmp.ir/api` (کامنت در `.env.example`).
- ناهمگونی camel/Pascal: بعضی پاسخ‌ها Pascal هستند؛ توابعی مثل `normalizeListResponse` و `pick()` در files هر دو را می‌خوانند (محافظه‌کاری عمدی).

---

## 23. پرفرمنس

مبنا (قبل از ریفکتور، `main`): کل JS ‏۲.۶۵MB (gzip ‏۸۰۴KB)، JS بارگذاری اولیه ‏۹۷۰KB (gzip ‏۲۹۷KB)، CSS ‏۱۹۶KB، precache PWA ‏۳.۹MB.

تکنیک‌های فعلی:
- **Code-splitting**: همه‌ی صفحه‌ها `lazy`؛ vendor chunkها؛ کامپوننت‌های سنگین lazy (`LocationPickerMap`, `CameraScanButton`, `BankLogo`, `QrCodeGraphic`).
- **React Compiler** به‌جای memo دستی.
- `keepPreviousData` برای لیست‌ها؛ `setQueryData` از پاسخ نوشتن (بدون رفت‌وبرگشتِ اضافه)؛ `staleTime: Infinity` برای آدرس تصویر.
- debounce فقط برای متن؛ `useIsMobile` با `matchMedia` (رندر فقط روی عبور از breakpoint).
- `react-virtuoso` برای لیست‌های بلند؛ نمودارهای SVG اختصاصی (بدون کتابخانه‌ی چارت).
- کاهش درخواست‌ها: مرجوعی‌ها (فاز ۳.۶) — «ادعاهای مرجوعی‌های دیگر» روی سند مبدأ به‌جای N درخواست جزئیات؛ صفحه‌ی جزئیات سبک‌تر.
- ماژول‌های سنگین جدا: `persianProvinces` (~۴۱۳KB) در chunk `city-selector`؛ Leaflet فقط با فرم آدرس.

مرحله‌ی ۴ ریفکتور («پرفرمنس — مقایسه با جدول مبنا») هنوز انجام نشده.

---

## 24. وضعیت فعلی، بدهی‌ها و نقاط ضعف

### 24.1 وضعیت ریفکتور (`REFACTOR.md`)
- ✅ آماده‌سازی؛ لایه‌ی مشترک (پیام خطا، سرویس/lib/hook/store، سیستم tone، جدول‌ها، نقشه، پرداخت، ConfirmDialog)؛ حذف adapterها؛ E2E سرتاسری خرید→فروش→مرجوعی روی سرور تست؛ امنیت POS؛ **خرید، فروش، مرجوعی‌ها** (فاز ۲.x و ۳.x)؛ **انبار** (۴.۱ تا ۴.۶).
- ⏳ باقی: **auth، customers+suppliers، employees+organization+permissions، partyAccount+invoice+transactions، dashboard+reports+settings**، سند بکند، و فاز پرفرمنس.

### 24.2 بدهی‌های شناخته‌شده
| مورد | شدت | توضیح |
|---|---|---|
| **نبودِ تست خودکار** | بالا | صفر فایل تست. منطق خالص (`domain/*`, `contract.js`, `resolutions.js`, `posSession.js`, `lineMath.js`) کاندید اولِ unit test (Vitest) است |
| **بدون TypeScript** | متوسط | قراردادها (شکل DTO، enumها) فقط در JSDoc/کامنت‌اند. حداقل: `// @ts-check` + JSDoc typedef برای DTOهای اصلی |
| ۳ فیچر placeholder | متوسط | `settings` (۹ صفحه ~۶ خط)، `invoice`، `transactions` — در routes/منو هستند اما محتوا ندارند. یا باید پیاده یا از منو/route حذف شوند |
| فرم‌های هنوز-نرفتن‌ بر الگوی جدید | متوسط | بخش‌های باقی‌مانده‌ی REFACTOR (مهاجرتِ دیالوگ‌ها به `ConfirmDialog`، حذف adapter در فیچرهای باقی) |
| وابستگی‌های معکوس `shared → features` | کم | `AppSidebar`→`usePermission`، `axios`→`authStore`، `useQueueRows`→سرویس خرید/فروش (فیچر→فیچر). می‌شود با انتقال `auth` به `shared/auth` یا `app/` رفع کرد |
| `staleTime: 0` سراسری | کم/عمدی | بیشترین تازگی، ولی روی صفحه‌های پرکوئری درخواست زیاد می‌سازد؛ برای داده‌های مرجع (دسته‌ها، واحدها) می‌توان `staleTime` بلند گذاشت |
| لایه‌ی چاپ فقط مرورگر | کم | مسیر خروجی PDF/حرارتی «بعداً» است |
| کارتخوان بدون پیاده‌سازی transport | وابسته به PSP | قرارداد و ماشین وضعیت آماده؛ نیازمند برنامه‌ی واسط و امضا (بند ۱۲.۱ سند درخواست‌ها) |
| چیدمان داشبورد فقط محلی | کم | بین دستگاه‌ها sync نمی‌شود (درخواست بکند ۶.۳) |
| ESLint: هشدارهای Compiler | کم | ۴ هشدار «Compilation Skipped» (`useReactTable`, `watch`) |
| دو سبک ناهمگون در QueryProvider/ThemeProvider | کم | بعضی فایل‌ها با `;` و `"` و بعضی بدون (`main.jsx`, `ThemeProvider`). یک Prettier/EditorConfig یکدست‌شان می‌کند |

### 24.3 ریسک‌هایی که باید در طراحی مراقبشان بود
- **ایدمپوتنسی**: هر mutation مالیِ جدید باید `idempotencyKeyFor` بگیرد و هیچ‌گاه کلید در کامپوننت ساخته نشود.
- **Invalidation**: mutation جدید روی خرید/فروش/مرجوعی/موجودی ⇒ توابع `invalidate…Ecosystem`، وگرنه صفحه‌ی کالاها/دانه‌ها کهنه می‌ماند.
- **انقضای نشست**: هیچ‌وقت `window.location` یا `logout` دستی در سرویس‌ها نگذارید؛ مرکزش اینترسپتور و `AppLayout` است.
- **StrictMode**: effectهای ورود (reset پیش‌نویس) باید دوبار اجرا شدن را تحمل کنند (الگوی `keepDraft` و `initializedForId`).

---

## 25. راهنمای کار: چطور X را اضافه کنم؟

### 25.1 یک صفحه‌ی لیست جدید
1. `services/api-v1.js`: `fetchX(params)` با `normalizeListResponse`؛ `X_SORT_COLUMNS`.
2. `services/queryKeys.js` (الگوی سلسله‌مراتبی) و `queries.js` (`useXQuery` با `listQuery` + `keepPreviousData`).
3. `store/xFilterStore.js` با `createFilterStore` (نام فیلد = نام پارامتر سرور).
4. `components/table/XTable.jsx` (فقط ستون‌ها، `detailsColumn`) و `XFilters.jsx`.
5. `pages/XPage.jsx`: `usePageHeader` + `ListPageLayout` + `ServerTable`.
6. route در `routes.jsx` با `lazy` و `handle.permission`؛ ثابت در `ROUTES`؛ آیتم منو در `navigationData.js` با `permission`.

### 25.2 یک mutation جدید
`api-v1` (تابع خام، اگر مالی: `{idempotencyKey}` + `idempotent()`) ← `mutations.js` (`useMutation` + `idempotencyKeyFor` + toast موفق/`getErrorMessage` + invalidation مرکزی) ← صفحه فقط `mutate`/`isPending` را مصرف می‌کند.

### 25.3 یک enum/وضعیت جدید
`shared/domain/enums/x.js`: `XEnum` هم‌شماره با بکند + `X_LABELS` + نگاشت tone؛ در صورت نیاز یک `XStatusBadge` که `StatusBadge` را wrap می‌کند.

### 25.4 یک فرم سند جدید
`createDocumentFormStore` ← `useDocumentFormDraft` ← `DocumentFormLayout` + `DocumentItemsSection` + `PaymentsCard`/`usePaymentDraft` ← `run…Changes`/`use…ChangesSaver` ← `useUnsavedChangesGuard`.

### 25.5 یک فرم ساده
`use<X>Form` با `react-hook-form`، `useFormDraft` اگر باید بین صفحه‌ها بماند، ورودی‌های `components/ui` ایرانی، `getErrorMessage` در `onError`.

### 25.6 بررسی قبل از commit
```bash
pnpm lint && pnpm build      # هر دو باید موفق باشد
pnpm knip                    # کد/export مرده
```
و تست دستی روی سرور تست (برای قطع شبکه: پیکربندی `ourerp-offline` در `.claude/launch.json` که API را روی پورت بسته می‌گذارد).

---

*آخرین بروزرسانی: ۲۰۲۶-۱۰-۰۵ — بر اساس برنچ `refactor/frontend-cleanup` (تا گامِ ۴.۶، انبار).*
