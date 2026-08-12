import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useSaleFilterStore } from "../store/saleFilterStore";

export function useDebouncedSaleFilters() {
  const globalSearch = useSaleFilterStore((s) => s.globalSearch);
  const customerIds = useSaleFilterStore((s) => s.customerIds);
  const status = useSaleFilterStore((s) => s.status);
  const paymentType = useSaleFilterStore((s) => s.paymentType);
  const fromDate = useSaleFilterStore((s) => s.fromDate);
  const toDate = useSaleFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    customerIds,
    status,
    paymentType,
    fromDate,
    toDate,
  };
}
