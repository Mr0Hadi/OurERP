/**
 * سنی‌بندیِ بدهی‌ها (`AgingDto`): مانده‌ی اسنادِ باز و اقساطِ پرداخت‌نشده، بر اساسِ
 * چند روز از سررسیدشان گذشته. سرور جمع‌ها (`overdue`، `total`) را هم می‌فرستد.
 *
 * ترتیبِ این فهرست همان ترتیبِ نمایش است: از «هنوز سررسید نشده» تا «بیش از ۹۰ روز».
 * رنگ با دیرکرد تندتر می‌شود؛ معنا از tone می‌آید نه از پالتِ خام.
 */
export const AGING_BUCKETS = Object.freeze([
  { key: "notDue", label: "سررسیدنشده", shortLabel: "جاری", tone: "success" },
  { key: "days1To30", label: "۱ تا ۳۰ روز", shortLabel: "۱–۳۰", tone: "warning" },
  { key: "days31To60", label: "۳۱ تا ۶۰ روز", shortLabel: "۳۱–۶۰", tone: "caution" },
  { key: "days61To90", label: "۶۱ تا ۹۰ روز", shortLabel: "۶۱–۹۰", tone: "special" },
  { key: "over90Days", label: "بیش از ۹۰ روز", shortLabel: "+۹۰", tone: "danger" },
]);

/** جمعِ سنی‌بندی؛ سرور `total` می‌دهد، ولی ردیفِ بی‌سند ممکن است `aging` نداشته باشد. */
export function agingTotal(aging) {
  if (!aging) return 0;
  if (aging.total != null) return Number(aging.total) || 0;
  return AGING_BUCKETS.reduce((sum, bucket) => sum + (Number(aging[bucket.key]) || 0), 0);
}

/** سررسیدگذشته = چهار سطلِ آخر. */
export function agingOverdue(aging) {
  if (!aging) return 0;
  if (aging.overdue != null) return Number(aging.overdue) || 0;
  return agingTotal(aging) - (Number(aging.notDue) || 0);
}
