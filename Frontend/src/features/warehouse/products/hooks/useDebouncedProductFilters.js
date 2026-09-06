import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useProductFilterStore } from "../store/productFilterStore";

/**
 * فقط ورودی‌های متنی تأخیر می‌گیرند؛ Selectها با یک کلیک ست می‌شوند و
 * تأخیرشان فقط حس کندی می‌دهد.
 */
export function useDebouncedProductFilters() {
  const globalSearch = useProductFilterStore((s) => s.globalSearch);
  const minPrice = useProductFilterStore((s) => s.minPrice);
  const maxPrice = useProductFilterStore((s) => s.maxPrice);
  const brand = useProductFilterStore((s) => s.brand);
  const productCategoryId = useProductFilterStore((s) => s.productCategoryId);
  const stockStatus = useProductFilterStore((s) => s.stockStatus);

  return {
    globalSearch: useDebouncedValue(globalSearch),
    minPrice: useDebouncedValue(minPrice),
    maxPrice: useDebouncedValue(maxPrice),
    brand,
    productCategoryId,
    stockStatus,
  };
}
