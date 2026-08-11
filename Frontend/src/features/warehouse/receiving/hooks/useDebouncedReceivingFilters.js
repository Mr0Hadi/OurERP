import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import useReceivingFilterStore from "../store/receivingFilterStore";

export function useDebouncedReceivingFilters() {
  const globalSearch = useReceivingFilterStore((s) => s.globalSearch);
  const type = useReceivingFilterStore((s) => s.type);
  const counterpartyIds = useReceivingFilterStore((s) => s.counterpartyIds);
  const fromDate = useReceivingFilterStore((s) => s.fromDate);
  const toDate = useReceivingFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    type,
    counterpartyIds,
    fromDate,
    toDate,
  };
}
