import { createFilterStore } from "@/shared/store/createFilterStore";
import { ChequeStatusEnum } from "@/shared/domain/enums/chequeStatus";

/** فیلترهای فهرستِ چک‌ها، با همان نام‌های `GetCheckListQuery`. پیش‌فرض: چک‌های در جریان، نزدیک‌ترین سررسید اول. */
export const useChequeFilterStore = createFilterStore({
  filters: {
    search: "",
    direction: "",
    statuses: [ChequeStatusEnum.PENDING],
    fromDueDate: "",
    toDueDate: "",
    customerId: "",
    supplierId: "",
    bankAccountId: "",
    includeVoided: false,
  },
  defaultSorting: { id: "checkDueDate", desc: false },
});
