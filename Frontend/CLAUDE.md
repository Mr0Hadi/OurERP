# OurERP Frontend — راهنمای کار

SPAِ فارسی و راست‌به‌چپ برای انبار و فروشِ لوازم یدکی، روی بکندِ ASP.NET در `../Backend-Net/`.
مستندِ کاملِ معماری: [`docs/architecture/README.md`](docs/architecture/README.md).

> **قاعده: هر تغییرِ ساختاری (فیچر یا زیرماژولِ تازه، جابه‌جاییِ پوشه، الگو یا قراردادِ تازه) باید فایلِ مربوط در `docs/architecture/` را به‌روز کند.** نسخه‌ی تعاملیِ `docs/architecture/architecture-map.html` را هم به‌روز نگه دارید. بعد `node scripts/check-docs-paths.mjs` را اجرا کنید.

## پشته

- React 19 + Vite 8 (rolldown)، **JavaScript/JSX بدونِ TypeScript**، React Compiler روشن (`vite.config.js`).
- مسیریابی: `react-router-dom` 7 (`createBrowserRouter`) — `src/app/routes/routers.jsx`.
- state سرور: TanStack Query 5 — `src/app/providers/QueryProvider.jsx` (`staleTime: 0`).
- state کلاینت: Zustand 5 — `src/shared/store/`، `src/features/*/store/`.
- HTTP: یک نمونه‌ی axios — `src/shared/services/api/axios.js`.
- UI: Tailwind 4 + shadcn (Radix، `rtl: true`) در `src/shared/components/ui/`؛ فونت Vazirmatn؛ تاریخِ شمسی با `react-date-object`.
- فرم: react-hook-form برای موجودیت‌های ساده؛ Zustand (`createDocumentFormStore`) برای سندِ خرید/فروش.
- PWA غیرفعال (`selfDestroying: true`). i18n وجود ندارد؛ متن‌ها فارسیِ مستقیم‌اند.

## دستورها

```bash
pnpm dev
```

```bash
pnpm lint
```

```bash
pnpm build
```

```bash
pnpm knip
```

```bash
node scripts/check-docs-paths.mjs
```

تست و type-check وجود ندارد؛ قبل از commit: `pnpm lint` بدونِ خطا و `pnpm build` موفق. آدرسِ API از `VITE_API_BASE_URL` در `.env` (الگو: `.env.example`).

## ساختار

- `src/app/` — فقط سیم‌کشی: providerها، پوسته‌ها (`AppLayout`، `AuthLayout`)، روتر، `protectedLoader`، `PermissionGate`.
- `src/features/<f>/` — یک حوزه‌ی کسب‌وکار: `routes.jsx`، `pages/`، `components/`، `hooks/`، `services/` (`api-v1.js`، `queryKeys.js`، `queries.js`، `mutations.js`)، `store/`، `domain/`. فیچرهای بزرگ زیرماژول دارند (`sales/orders`، `warehouse/receiving`، …).
- `src/shared/` — بی‌مالک و چندبارمصرف: `components/`، `domain/` (enum و منطقِ خالص)، `services/`، `hooks/`، `lib/`، `store/`، `constants/` (`routes.js`، `navigationData.js`).
- import با aliasِ `@/` (= `src/`). `shared/` نباید از `features/` import کند (۶ استثنای فعلی در `docs/architecture/14-dependency-graph-and-health.md`).

جای کدِ تازه: `docs/architecture/02-folder-structure.md`. فهرستِ فیچرها: `docs/architecture/12-features/README.md`.

## قراردادهای کلیدی

**داده و API**
- کامپوننت `api-v1` یا `useQuery` را مستقیم صدا نمی‌زند؛ هوکِ `queries.js`/`mutations.js` را.
- همیشه `axiosInstance` از `@/shared/services/api/axios`، هرگز axiosِ خام. interceptor پوششِ `{ Data, Message }` را باز می‌کند، توکن می‌گذارد و ۴۰۱ را با refresh جواب می‌دهد.
- آدرس‌ها `/<Controller>/<Action>` هستند؛ شناسه در query یا بدنه، نه در مسیر.
- **نامِ فیلدها همان نامِ بکند**؛ adapterِ تغییرِ نام نسازید. فیلترهای store هم با نامِ پارامترِ سرورند.
- فهرست: `listQuery` + `normalizeListResponse` (`src/shared/services/api/contract.js`). هر کلیدِ فیلتر باید در `text`/`instant`ِ `useDebouncedFilters` باشد، وگرنه فرستاده نمی‌شود.
- نوشتنِ مالی/موجودی: `idempotencyKeyFor(payload)` در mutation + `idempotent(key)` در api.
- بعد از نوشتن invalidate کنید؛ در خرید/فروش/انبار/مرجوعی از `invalidatePurchaseEcosystem`/`invalidateSalesEcosystem`.
- پیامِ خطا همیشه با `getErrorMessage(error, "متنِ فارسیِ عملیات")` (`src/shared/lib/errorMessage.js`).

**مسیر و مجوز**
- مسیرِ تازه: `ROUTES` در `src/shared/constants/routes.js` → `routes.jsx`ِ فیچر با `lazy()` و `handle: { permission }` → (فیچرِ تازه) `src/app/routes/routers.jsx` → منو در `navigationData.js` → breadcrumb در `src/app/layouts/AppBreadcrumb.jsx`.
- نامِ مجوز عضوِ `PermissionEnum` در `../Backend-Net/Domain/Enums/PermissionEnum.cs` است؛ آرایه یعنی «هر کدام کافی است».
- دکمه‌ها: `const { allows } = usePermission()` از `@/features/auth/hooks/usePermission`. همه‌ی بررسی‌های فرانت فقط UX است.
- هویتِ کاربر در store نیست؛ `useCurrentUser()` / `useUserInfoQuery()`.

**UI**
- رنگِ پالتِ Tailwind برای معنا ننویسید؛ tone (`src/shared/lib/tone.js`) و `StatusBadge`؛ نگاشتِ وضعیت → tone در `src/shared/domain/enums/*` (`*_TONES`).
- `dark:` برای رنگ لازم نیست؛ هر تم توکن‌های خودش را دارد (`src/index.css`، `src/shared/styles/themes/`).
- enum: شیءِ عددیِ `Object.freeze` با همان اعدادِ بکند + `_LABELS` + `_TONES`.
- صفحه‌ی لیست: `ListPageLayout` + `ResponsiveFilters` + `ServerTable`؛ جزئیات: `DetailErrorState`؛ حذف: `ConfirmDialog`؛ عنوانِ هدر: `usePageHeader`.
- دکمه کنارِ عنوانِ هدر: `PageHeaderActions`؛ تاریخچه‌ی یک سند/رکورد: `AuditHistoryButton` از `src/features/audit/components/` (خودش `AuditLogView` را می‌سنجد).
- قبل از ساختنِ کامپوننت `docs/architecture/10-shared-components-catalog.md` را ببینید. فایل‌های `src/shared/components/ui/` تولیدِ shadcn هستند.
- راهنمای زنده: `pnpm dev` → `/dev/ui`.

**کدنویسی**
- کامنت‌ها فارسی؛ JSDocِ کوتاهِ «چه و چرا» برای exportها. نام‌ها: کامپوننت `PascalCase.jsx`، هوک `useX.js`، store `use<X>Store` در `<x>Store.js`.
- به `Backend-Net/` دست نزنید؛ نیازِ سمتِ سرور را در `Backend-Net/docs/frontend-requests.fa.md` بنویسید و در کد `TODO(بکند)` بگذارید.

## از کجا شروع کنم

| کار | سند |
| --- | --- |
| دستورالعملِ گام‌به‌گام (لیست، فرم، mutation، enum، فیچر، ویجت، تاریخچه) | `docs/architecture/13-recipes.md` |
| ورود، توکن، refresh | `docs/architecture/04-auth-and-session.md` |
| مجوزها | `docs/architecture/05-permissions.md` |
| لایه‌ی API و ایدمپوتنسی | `docs/architecture/06-api-layer.md` |
| React Query و invalidation | `docs/architecture/07-server-state-react-query.md` |
| Zustand و فرم‌ها | `docs/architecture/08-client-state-zustand.md` |
| تم، RTL، فارسی‌سازی | `docs/architecture/09-ui-system-theming-rtl.md` |
| enumها و منطقِ مرجوعی/پرداخت | `docs/architecture/11-domain-layer.md` |
| بدهی‌ها و باگ‌های شناخته‌شده | `docs/architecture/14-dependency-graph-and-health.md` |

`FEATURE-GAPS.fa.md` کمبودهای فیچری و جدولِ پیگیریِ آن‌هاست.
