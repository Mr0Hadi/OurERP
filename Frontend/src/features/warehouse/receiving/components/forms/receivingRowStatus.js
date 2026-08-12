import { createRowStatus } from "@/shared/utils/createRowStatus";

export const { getRowStatus, ROW_STATUS_CONFIG } = createRowStatus({
  completeLabel: "کامل",
  partialLabel: "ناقص",
  emptyKey: "missing",
  emptyLabel: "نرسیده",
});
