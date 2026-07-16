// features/customers/hooks/useDebouncedFilters.js
import { useState, useEffect } from "react";
import { useCustomerFilterStore } from "../store/customerFilterStore";

export function useDebouncedFilters(delay = 400) {
  const globalSearch = useCustomerFilterStore((s) => s.globalSearch);
  const minDebtCredit = useCustomerFilterStore((s) => s.minDebtCredit);
  const maxDebtCredit = useCustomerFilterStore((s) => s.maxDebtCredit);

  const [debounced, setDebounced] = useState({
    search: globalSearch,
    minBalance: minDebtCredit,
    maxBalance: maxDebtCredit,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced({
        search: globalSearch,
        minBalance: minDebtCredit,
        maxBalance: maxDebtCredit,
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [globalSearch, minDebtCredit, maxDebtCredit, delay]);

  return debounced;
}