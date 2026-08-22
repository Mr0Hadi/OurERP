import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { usePurchaseReturnFilterStore } from "../store/purchaseReturnFilterStore";

export function useDebouncedPurchaseReturnFilters() {
  const globalSearch = usePurchaseReturnFilterStore((s) => s.globalSearch);
  const supplierIds = usePurchaseReturnFilterStore((s) => s.supplierIds);
  const status = usePurchaseReturnFilterStore((s) => s.status);
  const problem = usePurchaseReturnFilterStore((s) => s.problem);
  const scope = usePurchaseReturnFilterStore((s) => s.scope);
  const fromDate = usePurchaseReturnFilterStore((s) => s.fromDate);
  const toDate = usePurchaseReturnFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    supplierIds,
    status,
    problem,
    scope,
    fromDate,
    toDate,
  };
}
