import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";

import {
  PRODUCT_SORT_COLUMNS,
  fetchProducts,
  fetchProductById,
  fetchProductByBarcode,
} from "./api-v1";
import { useProductFilterStore } from "../store/productFilterStore";
import { productKeys } from "./queryKeys";

/** فیلترهای فعلیِ لیستِ کالا؛ ورودی‌های متنی و قیمت با تأخیر. */
export function useProductListFilters() {
  return useDebouncedFilters(useProductFilterStore, {
    text: ["name", "fromPrice", "toPrice"],
    instant: ["brand", "productCategoryId", "isLowOnStock", "isIncomplete"],
  });
}

export function useProductsQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: PRODUCT_SORT_COLUMNS });
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
  });
}

export function useProductQuery(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });
}

// اسکن یک اقدامِ لحظه‌ای است، نه چیزی که باید در کش بماند — برای همین
// خودِ تابع را مستقیم صادر می‌کنیم، نه یک هوکِ کوئری.
export { fetchProductByBarcode };

// ─── گزینه‌های انتخاب ───────────────────────────────────────────────────────

const OPTIONS_PAGINATION = { pageIndex: 0, pageSize: 200 };
const OPTIONS_SORTING = { id: "name", desc: false };
const NO_FILTERS = {};
const NO_PRODUCTS = [];

/**
 * فهرستِ کالاها برای انتخابگرها و نگاشتِ شناسه به کالا در فرم‌ها
 * (حداکثر ۲۰۰ ردیف، مرتب بر اساس نام).
 *
 * TODO(بکند): با رشدِ داده، ۲۰۰ ردیفِ اول کافی نیست؛ جست‌وجوی سمتِ سرور لازم است
 * (سندِ frontend-requests.fa.md).
 */
export function useProductsOptionsQuery() {
  const { data, isLoading } = useProductsQuery(NO_FILTERS, OPTIONS_PAGINATION, OPTIONS_SORTING);
  return { products: data?.items ?? NO_PRODUCTS, isLoading };
}
