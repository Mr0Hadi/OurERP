import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useCustomerFilterStore } from "../store/customerFilterStore";

/**
 * فقط ورودی‌های متنی تأخیر می‌گیرند؛ Selectها با یک کلیک ست می‌شوند و
 * تأخیرشان فقط حس کندی می‌دهد.
 */
export function useDebouncedCustomerFilters() {
  const globalSearch = useCustomerFilterStore((s) => s.globalSearch);
  const idSearch = useCustomerFilterStore((s) => s.idSearch);
  const minDebtCredit = useCustomerFilterStore((s) => s.minDebtCredit);
  const maxDebtCredit = useCustomerFilterStore((s) => s.maxDebtCredit);
  const balanceType = useCustomerFilterStore((s) => s.balanceType);

  return {
    search: useDebouncedValue(globalSearch),
    id: useDebouncedValue(idSearch),
    minBalance: useDebouncedValue(minDebtCredit),
    maxBalance: useDebouncedValue(maxDebtCredit),
    balanceType,
  };
}
