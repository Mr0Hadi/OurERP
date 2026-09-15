import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useReceivingFilterStore } from "../store/receivingFilterStore";

export function useDebouncedReceivingFilters() {
  const globalSearch = useReceivingFilterStore((s) => s.globalSearch);
  const supplierId = useReceivingFilterStore((s) => s.supplierId);
  const status = useReceivingFilterStore((s) => s.status);
  const fromDate = useReceivingFilterStore((s) => s.fromDate);
  const toDate = useReceivingFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    supplierId,
    status,
    fromDate,
    toDate,
  };
}
