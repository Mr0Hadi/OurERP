import { createRowStatus } from "@/shared/utils/createRowStatus";

// حالت سوم اینجا «آماده‌نشده» است نه «نرسیده» — یعنی انباردار هنوز چیزی
// از این قلم را برای این محموله جدا نکرده.
export const { getRowStatus, ROW_STATUS_CONFIG } = createRowStatus({
  completeLabel: "کامل",
  partialLabel: "ناقص",
  emptyKey: "pending",
  emptyLabel: "آماده‌نشده",
});
