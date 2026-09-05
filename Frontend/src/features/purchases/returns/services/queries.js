import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  fetchPurchaseReturns,
  fetchPurchaseReturnById,
  fetchReturnablePurchases,
  fetchPurchaseForReturn,
} from "./api";
import { purchaseReturnKeys } from "./queryKeys";

export function usePurchaseReturnsQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      supplierId: filters.supplierId || "",
      status: filters.status ?? "",
      problem: filters.problem ?? "",
      scope: filters.scope ?? "",
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
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: purchaseReturnKeys.list(queryParams),
    queryFn: () => fetchPurchaseReturns(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function usePurchaseReturnQuery(id) {
  return useQuery({
    queryKey: purchaseReturnKeys.detail(id),
    queryFn: () => fetchPurchaseReturnById(id),
    enabled: !!id,
    refetchOnMount: "always",
  });
}

// برای پیکر انتخاب خرید هنگام ثبت مرجوعی جدید
export function useReturnablePurchasesQuery(search) {
  return useQuery({
    queryKey: purchaseReturnKeys.returnablePurchasesSearch(search || ""),
    queryFn: () => fetchReturnablePurchases(search),
  });
}

export function usePurchaseForReturnQuery(purchaseId, excludeReturnId = null) {
  return useQuery({
    queryKey: purchaseReturnKeys.purchaseForReturn(purchaseId, excludeReturnId),
    queryFn: () => fetchPurchaseForReturn(purchaseId, excludeReturnId),
    enabled: !!purchaseId,
    refetchOnMount: "always",
  });
}
