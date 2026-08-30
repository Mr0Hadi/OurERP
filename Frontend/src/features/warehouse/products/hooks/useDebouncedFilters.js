import { useState, useEffect } from "react";
import { useProductFilterStore } from "../store/productFilterStore";

const DEBOUNCE_MS = 400;

export function useDebouncedFilters() {
  const globalSearch = useProductFilterStore((s) => s.globalSearch);
  const minPrice = useProductFilterStore((s) => s.minPrice);
  const maxPrice = useProductFilterStore((s) => s.maxPrice);
  const brand = useProductFilterStore((s) => s.brand);
  const productCategoryId = useProductFilterStore((s) => s.productCategoryId);
  const stockStatus = useProductFilterStore((s) => s.stockStatus);

  const [debouncedText, setDebouncedText] = useState({
    globalSearch,
    minPrice,
    maxPrice,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText({ globalSearch, minPrice, maxPrice });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [globalSearch, minPrice, maxPrice]);

  return {
    ...debouncedText,
    brand,
    productCategoryId,
    stockStatus,
  };
}
