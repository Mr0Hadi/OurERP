import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useShippingFilterStore } from "../store/shippingFilterStore";

export function useDebouncedShippingFilters() {
  const globalSearch = useShippingFilterStore((s) => s.globalSearch);
  const counterpartyId = useShippingFilterStore((s) => s.counterpartyId);
  const type = useShippingFilterStore((s) => s.type);
  const fromDate = useShippingFilterStore((s) => s.fromDate);
  const toDate = useShippingFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    counterpartyId,
    type,
    fromDate,
    toDate,
  };
}
