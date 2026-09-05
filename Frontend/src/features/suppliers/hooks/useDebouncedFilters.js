import { useState, useEffect } from "react";
import { useSupplierFilterStore } from "../store/supplierFilterStore";

export function useDebouncedFilters(delay = 400) {
  const globalSearch = useSupplierFilterStore((s) => s.globalSearch);
  const idSearch = useSupplierFilterStore((s) => s.idSearch);
  const minDebtCredit = useSupplierFilterStore((s) => s.minDebtCredit);
  const maxDebtCredit = useSupplierFilterStore((s) => s.maxDebtCredit);
  const balanceType = useSupplierFilterStore((s) => s.balanceType);

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