// src/features/dashboard/services/queryKeys.js

/**
 * گزارش‌ها فقط با «پارامترهای بازه» شناخته می‌شوند — نه id و نه
 * صفحه‌بندی. پس کلید یک سطح کمتر از بقیه‌ی فیچرها دارد.
 */
export const reportKeys = {
  all: ["reports"],
  sale: (params) => [...reportKeys.all, "sale", { ...params }],
  purchase: (params) => [...reportKeys.all, "purchase", { ...params }],
};
