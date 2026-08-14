import { createRowStatus } from "@/shared/utils/createRowStatus";

/** انتظار = موجودی کالا، واقعیت = تعداد واحدهای برچسب‌خورده‌ی در انبار. */
export const { getRowStatus, ROW_STATUS_CONFIG } = createRowStatus({
  completeLabel: "کامل",
  partialLabel: "ناقص",
  emptyKey: "unlabeled",
  emptyLabel: "بدون برچسب",
});
