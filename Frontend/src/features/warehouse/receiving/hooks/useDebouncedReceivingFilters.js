import { useState, useEffect } from 'react';
import useReceivingFilterStore from '../store/receivingFilterStore';

const DEBOUNCE_MS = 400;

export function useDebouncedReceivingFilters() {
  const globalSearch = useReceivingFilterStore((s) => s.globalSearch);
  const supplierIds = useReceivingFilterStore((s) => s.supplierIds);
  const status = useReceivingFilterStore((s) => s.status);
  const paymentType = useReceivingFilterStore((s) => s.paymentType);
  const fromDate = useReceivingFilterStore((s) => s.fromDate);
  const toDate = useReceivingFilterStore((s) => s.toDate);

  const [debouncedText, setDebouncedText] = useState({ globalSearch });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText({ globalSearch });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  return {
    ...debouncedText,
    supplierIds,
    status,
    paymentType,
    fromDate,
    toDate,
  };
}
