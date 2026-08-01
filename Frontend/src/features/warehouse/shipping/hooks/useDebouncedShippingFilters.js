import { useState, useEffect } from 'react';
import useShippingFilterStore from '../store/shippingFilterStore';

const DEBOUNCE_MS = 400;

export function useDebouncedShippingFilters() {
  const globalSearch = useShippingFilterStore((s) => s.globalSearch);
  const customerIds = useShippingFilterStore((s) => s.customerIds);
  const type = useShippingFilterStore((s) => s.type);
  const fromDate = useShippingFilterStore((s) => s.fromDate);
  const toDate = useShippingFilterStore((s) => s.toDate);

  const [debouncedText, setDebouncedText] = useState({ globalSearch });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText({ globalSearch }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  return { ...debouncedText, customerIds, type, fromDate, toDate };
}