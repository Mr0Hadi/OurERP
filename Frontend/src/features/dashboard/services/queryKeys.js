/**
 * گزارش‌ها فقط با «پارامترهای بازه» شناخته می‌شوند — نه id و نه
 * صفحه‌بندی. پس کلید یک سطح کمتر از بقیه‌ی فیچرها دارد.
 */
export const reportKeys = {
  all: ["reports"],
  sale: (params) => [...reportKeys.all, "sale", { ...params }],
  purchase: (params) => [...reportKeys.all, "purchase", { ...params }],
  scope: (scope, params) => [...reportKeys.all, "scope", scope, { ...params }],
};

/**
 * شمارنده‌های صف‌ها زیرِ کلیدِ همان فیچری نیستند که فهرست مالِ آن است
 * (`saleKeys`، `purchaseKeys`، ...)، چون آن فیچرها بعد از هر ثبت کلِ
 * `lists()`ِ خودشان را باطل می‌کنند و شکلِ پارامترِ ما را نمی‌شناسند.
 * لازم هم نیست: `staleTime: 0` و `refetchOnWindowFocus`ِ سراسری یعنی کسی
 * که از صفحه‌ی دریافت به داشبورد برمی‌گردد، عددِ تازه را می‌بیند.
 */
export const dashboardKeys = {
  all: ["dashboard"],
  queue: (source, status) => [...dashboardKeys.all, "queue", source, status],
};
