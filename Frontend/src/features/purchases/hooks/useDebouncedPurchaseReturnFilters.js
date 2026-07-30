import { useState, useEffect } from "react";
import usePurchaseReturnFilterStore from "../store/purchaseReturnFilterStore";

const DEBOUNCE_MS = 400;

export function useDebouncedPurchaseReturnFilters() {
  const globalSearch = usePurchaseReturnFilterStore((s) => s.globalSearch);
  const status = usePurchaseReturnFilterStore((s) => s.status);
  const reason = usePurchaseReturnFilterStore((s) => s.reason);
  const fromDate = usePurchaseReturnFilterStore((s) => s.fromDate);
  const toDate = usePurchaseReturnFilterStore((s) => s.toDate);

  const [debouncedText, setDebouncedText] = useState({ globalSearch });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText({ globalSearch }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  return { ...debouncedText, status, reason, fromDate, toDate };
}