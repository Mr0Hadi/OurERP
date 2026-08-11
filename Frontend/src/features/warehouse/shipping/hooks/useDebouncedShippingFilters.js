import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import useShippingFilterStore from "../store/shippingFilterStore";

export function useDebouncedShippingFilters() {
  const globalSearch = useShippingFilterStore((s) => s.globalSearch);
  const customerIds = useShippingFilterStore((s) => s.customerIds);
  const type = useShippingFilterStore((s) => s.type);
  const fromDate = useShippingFilterStore((s) => s.fromDate);
  const toDate = useShippingFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    customerIds,
    type,
    fromDate,
    toDate,
  };
}
