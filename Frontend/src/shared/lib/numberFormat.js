/**
 * نمایشِ عدد با رقم و جداکننده‌ی فارسی («۱۲٬۵۰۰»).
 *
 * قبلاً همین یک خط با نام‌های `fa` و `toFa` در حدود ۳۰ فایل کپی شده بود.
 * ورودیِ خالی/نامعتبر صفر نمایش داده می‌شود تا جدول و کارت‌ها «NaN» نشان ندهند.
 * (نمودارها نسخه‌ی گردشده‌ی خودشان را در `charts/chartUtils.js` دارند.)
 */
export const formatNumber = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/** مبلغِ ریالی با واحد: «۱۲٬۵۰۰ ریال». */
export const formatRial = (value) => `${formatNumber(value)} ریال`;
