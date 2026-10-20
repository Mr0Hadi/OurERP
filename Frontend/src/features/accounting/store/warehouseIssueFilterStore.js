import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای صفِ گزارش‌های انبار — نام‌ها همان پارامترهای `GetSaleWarehouseIssueListQuery`. */
export const useWarehouseIssueFilterStore = createFilterStore({
  filters: {
    // پیش‌فرض: فقط گزارش‌های بی‌تصمیم (صفِ کار). «» یعنی همه.
    isOpen: "true",
    reason: "",
    fromDate: "",
    toDate: "",
  },
  defaultSorting: { id: "reportedAt", desc: true },
  actions: ({ applyFilters }) => ({
    setRange: ({ fromDate, toDate }) => applyFilters({ fromDate: fromDate || "", toDate: toDate || "" }),
  }),
});
