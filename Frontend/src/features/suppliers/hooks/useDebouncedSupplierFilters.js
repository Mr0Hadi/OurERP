import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useSupplierFilterStore } from "../store/supplierFilterStore";

/**
 * فقط ورودی‌های متنی تأخیر می‌گیرند؛ Selectها با یک کلیک ست می‌شوند و
 * تأخیرشان فقط حس کندی می‌دهد.
 */
export function useDebouncedSupplierFilters() {
  const globalSearch = useSupplierFilterStore((s) => s.globalSearch);
  const idSearch = useSupplierFilterStore((s) => s.idSearch);
  const minDebtCredit = useSupplierFilterStore((s) => s.minDebtCredit);
  const maxDebtCredit = useSupplierFilterStore((s) => s.maxDebtCredit);
  const balanceType = useSupplierFilterStore((s) => s.balanceType);

  return {
    search: useDebouncedValue(globalSearch),
    id: useDebouncedValue(idSearch),
    minBalance: useDebouncedValue(minDebtCredit),
    maxBalance: useDebouncedValue(maxDebtCredit),
    balanceType,
  };
}
