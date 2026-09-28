import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * هر صفحه‌ی گزارش استورِ خودش را دارد تا بازه‌ی تاریخِ یکی روی دیگری
 * ننشیند (کاربر می‌تواند «مشتریانِ امسال» و «کارمندانِ این ماه» را
 * هم‌زمان باز داشته باشد).
 *
 * `sorting` عمداً `null` است: این endpointها همیشه نزولی بر اساس مبلغ
 * کل مرتب می‌کنند و پارامترِ مرتب‌سازی نمی‌گیرند — سرتیترِ قابل‌کلیک فقط
 * به کاربر دروغ می‌گفت.
 */
const activityFilters = {
  filters: { fromDate: "", toDate: "" },
  defaultSorting: null,
};

// رتبه‌بندیِ کارمندان می‌تواند به کارمندانِ امروزِ یک تیم/واحد محدود شود.
export const useEmployeeActivityFilterStore = createFilterStore({
  ...activityFilters,
  filters: { ...activityFilters.filters, departmentId: "", teamId: "" },
});
export const useCustomerActivityFilterStore = createFilterStore(activityFilters);
export const useSupplierActivityFilterStore = createFilterStore(activityFilters);
