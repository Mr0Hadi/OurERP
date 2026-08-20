import { createFilterStore } from "@/shared/store/createFilterStore";

// supplierIds تا لایه‌ی API پشتیبانی می‌شود ولی هنوز کنترلی در نوار فیلترها
// برای آن وجود ندارد؛ عمداً نگه داشته شده تا آن مسیر قطع نشود.
export const usePurchaseReturnFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    supplierIds: [],
    status: "",
    reason: "",
    fromDate: "",
    toDate: "",
  },
});
