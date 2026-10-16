# فیچرهای خالی/placeholder: `invoice`، `transactions`، `settings`، `reports`

این چهار پوشه در `src/features/` هستند ولی کارِ واقعی‌ای انجام نمی‌دهند. پیش از کار رویشان این را بدانید.

| فیچر | چه هست | مسیر | منو |
| --- | --- | --- | --- |
| `src/features/invoice/` | `routes.jsx` با مسیرِ نسبیِ `"invoice"` → `pages/InvoicePage.jsx` (۶ خط، `<div>InvoicePage</div>`)؛ بدونِ `lazy()` و `handle.permission` | `/invoice` | نیست |
| `src/features/transactions/` | همان الگو: `"transactions"` → `pages/TransactionsPage.jsx` (placeholder) | `/transactions` | نیست |
| `src/features/settings/` | `routes.jsx` با ۹ مسیر (`ROUTES.SETTINGS`، `SETTINGS_GENERAL`، `SETTINGS_COMPANY`، `SETTINGS_INVOICE`، `SETTINGS_TAX`، `SETTINGS_USERS`، `SETTINGS_ROLES`، `SETTINGS_NOTIFICATIONS`، `SETTINGS_BACKUP`) به ۹ صفحه‌ی ۶خطیِ placeholder در `pages/`؛ بدونِ `lazy()` و مجوز | `/settings/...` | نیست |
| `src/features/reports/` | پوشه‌ی خالی؛ ثبت نشده | — | — |

نکته‌ها:
- کارِ واقعیِ فاکتور در `src/shared/services/invoice/` و `src/shared/components/invoice/` است (خروجی و پیوستِ سندِ خرید/فروش)، نه در `features/invoice`.
- گزارش‌ها در `src/features/accounting/` هستند؛ نشانی‌های قدیمیِ «گزارش‌ها» در `src/features/accounting/routes.jsx` ریدایرکت می‌شوند ([accounting.md](accounting.md)).
- `ROUTE_TITLES` در `src/shared/components/layout/AppBreadcrumb.jsx` برای `INVOICE_LIST`، `INVOICE_NEW`، `TRANSACTIONS_BUY_SELL`، `TRANSACTIONS_PAYMENTS`، `TRANSACTIONS_RETURNS` عنوان دارد ولی هیچ مسیری برایشان ثبت نشده.
- برنامه: فقط `settings` در `FEATURE-GAPS.fa.md` (بخشِ مربوط به تنظیمات) برنامه دارد — تبدیلِ placeholderها به فرمِ واقعی؛ برای `invoice`، `transactions` و `reports` برنامه‌ای در کد یا اسناد پیدا نشد.

بدهی و پیشنهاد: [14-dependency-graph-and-health.md](../14-dependency-graph-and-health.md).
