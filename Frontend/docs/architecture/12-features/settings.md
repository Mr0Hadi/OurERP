# فیچرِ `settings`

یک صفحه: تنظیماتِ سیستم.

| مسیر | مجوز | صفحه | API |
| --- | --- | --- | --- |
| `ROUTES.SETTINGS` = `/settings` | `SettingView` یا `SettingManage` | `src/features/settings/pages/SystemSettingsPage.jsx` (`lazy`) | `/Setting/GetSystemSettings`، `/Setting/UpdateSystemSettings` |

فرم از روی پاسخِ سرور ساخته می‌شود؛ ویرایش فقط با `SettingManage`.

نکته‌ها:
- صفحه‌های placeholderِ زیرِ `/settings/...` (عمومی، شرکت، فاکتور، مالیات، کاربران، نقش‌ها، اعلان‌ها، پشتیبان‌گیری) و فیچرهای خالیِ `invoice`، `transactions` و `reports` در ۲۰۲۶-۱۰-۲۵ حذف شدند. برنامه‌ی تنظیماتِ بیشتر در `FEATURE-GAPS.fa.md` است.
- کارِ واقعیِ فاکتور در `src/shared/services/invoice/` و `src/shared/components/invoice/` است (خروجی و پیوستِ سندِ خرید/فروش).
- گزارش‌ها در `src/features/accounting/` هستند؛ نشانی‌های قدیمیِ «گزارش‌ها» در `src/features/accounting/routes.jsx` ریدایرکت می‌شوند ([accounting.md](accounting.md)).
