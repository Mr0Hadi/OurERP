import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useShippingFilterStore } from "../store/shippingFilterStore";

export function useDebouncedShippingFilters() {
  const globalSearch = useShippingFilterStore((s) => s.globalSearch);
  const customerName = useShippingFilterStore((s) => s.customerName);
  const status = useShippingFilterStore((s) => s.status);
  const fromDate = useShippingFilterStore((s) => s.fromDate);
  const toDate = useShippingFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    customerName: useDebouncedValue(customerName),
    status,
    fromDate,
    toDate,
  };
}
