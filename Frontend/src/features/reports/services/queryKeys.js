// src/features/reports/services/queryKeys.js

/**
 * گزارش‌های «فعالیت» فقط با بازه‌ی تاریخ و صفحه شناخته می‌شوند — نه id.
 * جدا از `dashboard/services/queryKeys` است چون آن‌ها بازه‌محورند
 * (`periods`) و این‌ها فهرستِ صفحه‌بندی‌شده.
 */
export const activityKeys = {
  all: ["report-activity"],
  employeeSales: (params) => [...activityKeys.all, "employee-sales", { ...params }],
  employeeSupply: (params) => [...activityKeys.all, "employee-supply", { ...params }],
  customers: (params) => [...activityKeys.all, "customers", { ...params }],
  suppliers: (params) => [...activityKeys.all, "suppliers", { ...params }],
};
