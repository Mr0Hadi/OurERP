import { useState, useEffect } from 'react';
import useReceivingFilterStore from '../store/receivingFilterStore';

const DEBOUNCE_MS = 400;

export function useDebouncedReceivingFilters() {
  const globalSearch = useReceivingFilterStore((s) => s.globalSearch);
  const type = useReceivingFilterStore((s) => s.type);
  const counterpartyIds = useReceivingFilterStore((s) => s.counterpartyIds);
  const fromDate = useReceivingFilterStore((s) => s.fromDate);
  const toDate = useReceivingFilterStore((s) => s.toDate);

  const [debouncedText, setDebouncedText] = useState({ globalSearch });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText({ globalSearch }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  return { ...debouncedText, type, counterpartyIds, fromDate, toDate };
}