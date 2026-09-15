import { createRowStatus } from "@/shared/lib/createRowStatus";

export const { getRowStatus, ROW_STATUS_CONFIG } = createRowStatus({
  completeLabel: "کامل",
  partialLabel: "ناقص",
  emptyKey: "missing",
  emptyLabel: "نرسیده",
});
