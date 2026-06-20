import { useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { fetchProducts, fetchProductById } from "./api"; 
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
    sortBy: sorting?.id ?? "name",
    sortOrder: sorting?.desc ? "desc" : "asc",
  };

  // prefetch صفحه بعدی
  const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
  queryClient.prefetchQuery({
    queryKey: productKeys.list(nextPageParams),
    queryFn: () => fetchProducts(nextPageParams),
    staleTime: 1000 * 60 * 3,
  });

  return useQuery({
    queryKey: productKeys.list(queryParams),
    queryFn: () => fetchProducts(queryParams),
    placeholderData: keepPreviousData, // جایگزین keepPreviousData قدیمی در v5
    staleTime: 1000 * 60 * 3,         // 3 دقیقه برای لیست
    gcTime: 1000 * 60 * 10,           // 10 دقیقه cache
  });
}

// اضافه کردن هوک برای یک محصول
export function useProductQuery(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProductById(id), // استفاده از تابع موجود در api.js
    enabled: !!id,
    staleTime: 1000 * 60 * 5, 
  });
}
