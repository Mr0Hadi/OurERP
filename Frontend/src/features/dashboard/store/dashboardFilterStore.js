// src/features/dashboard/store/dashboardFilterStore.js
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { DEFAULT_REPORT_PERIOD } from "@/shared/domain/enums/reportPeriod";

/**
 * انتخاب‌های داشبورد: سطحِ بزرگ‌نمایی و بازه‌ی تاریخ.
 *
 * از `createFilterStore` استفاده نمی‌کند چون آن استور حولِ صفحه‌بندی و
 * مرتب‌سازیِ جدول ساخته شده و گزارش‌ها هیچ‌کدام را ندارند (بخش ۱۸ سند:
 * این دو endpoint اصلاً `page`/`take` نمی‌گیرند). ارث‌بردنِ آن فیلدها
 * فقط حالتی می‌ساخت که هیچ‌وقت خوانده نمی‌شود.
 *
 * تاریخِ خالی یعنی «به سرور نگو» → پیش‌فرضِ خودِ سرور: ۱۲ ماهِ اخیر.
 */
export const useDashboardFilterStore = create(
  devtools((set) => ({
    periodType: DEFAULT_REPORT_PERIOD,
    fromDate: "",
    toDate: "",

    setPeriodType: (periodType) => set({ periodType: Number(periodType) }),
    setFromDate: (fromDate) => set({ fromDate: fromDate || "" }),
    setToDate: (toDate) => set({ toDate: toDate || "" }),

    resetFilters: () =>
      set({ periodType: DEFAULT_REPORT_PERIOD, fromDate: "", toDate: "" }),
  })),
);
