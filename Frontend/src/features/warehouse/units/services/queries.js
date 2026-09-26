import { useQuery, keepPreviousData } from "@tanstack/react-query";

import {
  fetchProductUnits,
  fetchProductUnitSummary,
  fetchProductUnitHistory,
} from "./api-v1";
import { productUnitKeys } from "./queryKeys";

export function useProductUnitsQuery(filters, pagination, sorting, { enabled = true } = {}) {
  const params = {
    filters,
    page: pagination.pageIndex + 1,
    take: pagination.pageSize,
    sorting,
  };

  return useQuery({
    queryKey: productUnitKeys.list(params),
    queryFn: () => fetchProductUnits(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** کارت‌های بالای صفحه — با کالای انتخاب‌شده در فیلتر هم‌سو. */
export function useProductUnitSummaryQuery(productId) {
  return useQuery({
    queryKey: productUnitKeys.summary(productId),
    queryFn: () => fetchProductUnitSummary({ productId }),
    placeholderData: keepPreviousData,
  });
}

/** تاریخچه‌ی یک دانه — فقط وقتی برگه‌ی جزئیاتش باز است خوانده می‌شود. */
export function useProductUnitHistoryQuery(productUnitId, { enabled = true } = {}) {
  return useQuery({
    queryKey: productUnitKeys.history(productUnitId),
    queryFn: () => fetchProductUnitHistory({ productUnitId }),
    enabled: Boolean(productUnitId) && enabled,
  });
}
