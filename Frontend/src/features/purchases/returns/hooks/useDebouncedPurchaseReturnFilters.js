import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { usePurchaseReturnFilterStore } from "../store/purchaseReturnFilterStore";

export function useDebouncedPurchaseReturnFilters() {
  const globalSearch = usePurchaseReturnFilterStore((s) => s.globalSearch);
  const supplierIds = usePurchaseReturnFilterStore((s) => s.supplierIds);
  const status = usePurchaseReturnFilterStore((s) => s.status);
  const reason = usePurchaseReturnFilterStore((s) => s.reason);
  const fromDate = usePurchaseReturnFilterStore((s) => s.fromDate);
  const toDate = usePurchaseReturnFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    supplierIds,
    status,
    reason,
    fromDate,
    toDate,
  };
}
