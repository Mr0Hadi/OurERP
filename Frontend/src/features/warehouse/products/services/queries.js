// src/features/warehouse/products/services/queries.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { fetchProducts, fetchProductById, fetchProductByBarcode } from "./api-mockData";
import { productKeys } from "./queryKeys";

export function useProductsQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    brand: filters.brand || "",
    category: filters.category || "",
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    stockStatus: filters.stockStatus,
    // وقتی کاربر مرتب‌سازی ستون را کامل برمی‌دارد، به همان پیش‌فرض
    // «تازه‌ترین اول» برمی‌گردیم، نه به مرتب‌سازی بر اساس نام.
    sortBy: sorting?.id ?? "createdAt",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "desc",
  };

  const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
  queryClient.prefetchQuery({
    queryKey: productKeys.list(nextPageParams),
    queryFn: () => fetchProducts(nextPageParams),
    staleTime: 1000 * 60 * 3,
  });

  return useQuery({
    queryKey: productKeys.list(queryParams),
    queryFn: () => fetchProducts(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
  });
}

export function useProductQuery(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProductById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// اسکن یک اقدامِ لحظه‌ای است، نه چیزی که باید در کش بماند — برای همین
// خودِ تابع را مستقیم صادر می‌کنیم، نه یک هوکِ کوئری.
export { fetchProductByBarcode };
