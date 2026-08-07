import { useState, useEffect } from "react";
import useSalesReturnFilterStore from "../store/salesReturnFilterStore";

const DEBOUNCE_MS = 400;

export function useDebouncedSalesReturnFilters() {
  const globalSearch = useSalesReturnFilterStore((s) => s.globalSearch);
  const customerIds = useSalesReturnFilterStore((s) => s.customerIds);
  const status = useSalesReturnFilterStore((s) => s.status);
  const reason = useSalesReturnFilterStore((s) => s.reason);
  const fromDate = useSalesReturnFilterStore((s) => s.fromDate);
  const toDate = useSalesReturnFilterStore((s) => s.toDate);

  const [debouncedText, setDebouncedText] = useState({ globalSearch });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText({ globalSearch }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  return { ...debouncedText, customerIds, status, reason, fromDate, toDate };
}
