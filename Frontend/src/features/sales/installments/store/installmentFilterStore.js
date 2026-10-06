import { createFilterStore } from "@/shared/store/createFilterStore";
import { DEFAULT_INSTALLMENT_VIEW } from "../domain/installmentViews";

/**
 * فیلترهای فهرستِ اقساط. `view` نمای آماده است (`INSTALLMENT_VIEWS`) و به وضعیت و بازه‌ی
 * سررسید ترجمه می‌شود؛ بقیه همان نام‌های `GetSaleInstallmentListQuery`اند.
 */
export const useInstallmentFilterStore = createFilterStore({
  filters: {
    view: DEFAULT_INSTALLMENT_VIEW,
    customerId: "",
    fromDueDate: "",
    toDueDate: "",
  },
  // پیش‌فرضِ سرور: نزدیک‌ترین سررسید اول.
  defaultSorting: { id: "dueDate", desc: false },
});
