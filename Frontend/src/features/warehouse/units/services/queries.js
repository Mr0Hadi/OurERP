import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { STOCKTAKE_EXPECTED_STATUSES } from "../domain/stocktake";
import {
  fetchProductUnits,
  fetchAllProductUnits,
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

/**
 * دانه‌هایی که شمارش انتظارشان را دارد: همه‌ی دانه‌های «در انبار»ِ یک
 * کالا. شمارش روی همین عکسِ لحظه‌ای انجام می‌شود، پس با فوکوس دوباره
 * خوانده نمی‌شود تا وسطِ کار فهرست زیرِ دستِ انباردار عوض نشود.
 */
export function useStocktakeExpectedQuery(productId) {
  return useQuery({
    queryKey: productUnitKeys.stocktake(productId),
    queryFn: () =>
      fetchAllProductUnits(
        { productId, statuses: STOCKTAKE_EXPECTED_STATUSES },
        { limit: 5000 },
      ),
    enabled: Boolean(productId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
