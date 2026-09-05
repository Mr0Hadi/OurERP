// features/customers/hooks/useDebouncedFilters.js
import { useState, useEffect } from "react";
import { useCustomerFilterStore } from "../store/customerFilterStore";

export function useDebouncedFilters(delay = 400) {
  const globalSearch = useCustomerFilterStore((s) => s.globalSearch);
  const idSearch = useCustomerFilterStore((s) => s.idSearch);
  const minDebtCredit = useCustomerFilterStore((s) => s.minDebtCredit);
  const maxDebtCredit = useCustomerFilterStore((s) => s.maxDebtCredit);
  const balanceType = useCustomerFilterStore((s) => s.balanceType);

  const [debounced, setDebounced] = useState({
    search: globalSearch,
    id: idSearch,
    minBalance: minDebtCredit,
    maxBalance: maxDebtCredit,
    balanceType,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced({
        search: globalSearch,
        id: idSearch,
        minBalance: minDebtCredit,
        maxBalance: maxDebtCredit,
        balanceType,
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [globalSearch, idSearch, minDebtCredit, maxDebtCredit, balanceType, delay]);

  return debounced;
}