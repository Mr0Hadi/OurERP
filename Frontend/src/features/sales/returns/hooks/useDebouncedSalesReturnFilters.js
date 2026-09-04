import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useSalesReturnFilterStore } from "../store/salesReturnFilterStore";

export function useDebouncedSalesReturnFilters() {
  const globalSearch = useSalesReturnFilterStore((s) => s.globalSearch);
  const customerId = useSalesReturnFilterStore((s) => s.customerId);
  const status = useSalesReturnFilterStore((s) => s.status);
  const problem = useSalesReturnFilterStore((s) => s.problem);
  const scope = useSalesReturnFilterStore((s) => s.scope);
  const fromDate = useSalesReturnFilterStore((s) => s.fromDate);
  const toDate = useSalesReturnFilterStore((s) => s.toDate);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    customerId,
    status,
    problem,
    scope,
    fromDate,
    toDate,
  };
}
