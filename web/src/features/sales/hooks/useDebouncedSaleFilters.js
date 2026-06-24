import { useState, useEffect } from 'react';
import useSaleFilterStore from '#/features/sales/store/saleFilterStore';

const DEBOUNCE_MS = 400;

export default function useDebouncedSaleFilters() {
  const {
    globalSearch,
    customerIds,
    status,
    paymentType,
    fromDate,
    toDate,
  } = useSaleFilterStore();

  const [debouncedText, setDebouncedText] = useState(globalSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(globalSearch);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  return {
    globalSearch: debouncedText,
    customerIds,
    status,
    paymentType,
    fromDate,
    toDate,
  };
}
