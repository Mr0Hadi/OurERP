import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import usePurchaseFilterStore from "../store/purchaseFilterStore";

export function useDebouncedPurchaseFilters() {
  const globalSearch = usePurchaseFilterStore((s) => s.globalSearch);
  const supplierIds = usePurchaseFilterStore((s) => s.supplierIds);
  const status = usePurchaseFilterStore((s) => s.status);
  const paymentType = usePurchaseFilterStore((s) => s.paymentType);
  const fromDate = usePurchaseFilterStore((s) => s.fromDate);
  const toDate = usePurchaseFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    supplierIds,
    status,
    paymentType,
    fromDate,
    toDate,
  };
}
