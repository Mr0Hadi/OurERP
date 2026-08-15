// src/features/warehouse/units/services/queries.js
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import {
  fetchProductUnits,
  fetchPendingLabelProducts,
  fetchUnitLabelSummary,
} from "./api-mockData";
import { productUnitKeys, pendingLabelKeys } from "./queryKeys";

export function useUnitLabelSummaryQuery() {
  return useQuery({
    queryKey: productUnitKeys.summary(),
    queryFn: fetchUnitLabelSummary,
    staleTime: 1000 * 30,
  });
}

export function usePendingLabelProductsQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    category: filters.category || "",
    onlyPending: filters.onlyPending !== false,
    sortBy: sorting?.id ?? "missingCount",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "desc",
  };

  return useQuery({
    queryKey: pendingLabelKeys.list(queryParams),
    queryFn: () => fetchPendingLabelProducts(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}

export function useProductUnitsQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    productId: filters.productId || "",
    status: filters.status || "",
    printState: filters.printState || "",
    sortBy: sorting?.id ?? "createdAt",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "desc",
  };

  return useQuery({
    queryKey: productUnitKeys.list(queryParams),
    queryFn: () => fetchProductUnits(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}
