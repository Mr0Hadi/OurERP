// src/features/purchases/hooks/useDebouncedPurchaseFilters.js
import { useState, useEffect } from 'react';
import usePurchaseFilterStore from '../store/purchaseFilterStore';

const DEBOUNCE_MS = 400;

export function useDebouncedPurchaseFilters() {
  const globalSearch = usePurchaseFilterStore((s) => s.globalSearch);
  const supplierIds = usePurchaseFilterStore((s) => s.supplierIds);
  const status = usePurchaseFilterStore((s) => s.status);
  const paymentType = usePurchaseFilterStore((s) => s.paymentType);
  const fromDate = usePurchaseFilterStore((s) => s.fromDate);
  const toDate = usePurchaseFilterStore((s) => s.toDate);

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
