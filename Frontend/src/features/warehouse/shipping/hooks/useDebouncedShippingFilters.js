import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useShippingFilterStore } from "../store/shippingFilterStore";

export function useDebouncedShippingFilters() {
  const globalSearch = useShippingFilterStore((s) => s.globalSearch);
  const counterpartyIds = useShippingFilterStore((s) => s.counterpartyIds);
  const type = useShippingFilterStore((s) => s.type);
  const fromDate = useShippingFilterStore((s) => s.fromDate);
  const toDate = useShippingFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    counterpartyIds,
    type,
    fromDate,
    toDate,
  };
}
