// src/features/purchases/services/returns/queries.js
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  fetchPurchaseReturns,
  fetchPurchaseReturnById,
  fetchReturnablePurchases,
  fetchReturnablePurchaseById,
} from "./api-mockData";
import { purchaseReturnKeys } from "./queryKeys";

export function usePurchaseReturnsQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      supplierIds: filters.supplierIds || [],
      status: filters.status || "",
      reason: filters.reason || "",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      sortBy: sorting?.id ?? "createdAt",
      sortOrder: sorting?.desc ? "desc" : "asc",
    }),
    [filters, pagination, sorting],
  );

  useEffect(() => {
    const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
    queryClient.prefetchQuery({
      queryKey: purchaseReturnKeys.list(nextPageParams),
      queryFn: () => fetchPurchaseReturns(nextPageParams),
      staleTime: 1000 * 60 * 3,
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: purchaseReturnKeys.list(queryParams),
    queryFn: () => fetchPurchaseReturns(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
  });
}

export function usePurchaseReturnQuery(id) {
  return useQuery({
    queryKey: purchaseReturnKeys.detail(id),
    queryFn: () => fetchPurchaseReturnById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useReturnablePurchasesQuery(params = {}) {
  return useQuery({
    queryKey: [...purchaseReturnKeys.returnable(), params],
    queryFn: () => fetchReturnablePurchases(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useReturnablePurchaseQuery(id) {
  return useQuery({
    queryKey: purchaseReturnKeys.returnableDetail(id),
    queryFn: () => fetchReturnablePurchaseById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}