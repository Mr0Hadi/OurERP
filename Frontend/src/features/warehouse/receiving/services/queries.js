import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchReceivablePurchases,
  fetchPurchaseReceivingInfo,
  fetchPurchaseReturnPendingEffects,
} from "./api-v1";
import { receivingKeys } from "./queryKeys";

/** صفِ دریافت: خریدهایی که کالایشان هنوز کامل نرسیده. */
export function useReceivablePurchasesQuery(filters, pagination) {
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      supplierId: filters.supplierId || "",
      status: filters.status ?? "",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
    }),
    [filters, pagination],
  );

  return useQuery({
    queryKey: receivingKeys.list(queryParams),
    queryFn: () => fetchReceivablePurchases(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function usePurchaseReturnPendingEffectsQuery(purchaseId) {
  return useQuery({
    queryKey: receivingKeys.pendingReturnEffects(purchaseId),
    queryFn: () => fetchPurchaseReturnPendingEffects(purchaseId),
    enabled: !!purchaseId,
    refetchOnMount: "always",
  });
}

export function usePurchaseReceivingInfoQuery(purchaseId) {
  return useQuery({
    queryKey: receivingKeys.detail(purchaseId),
    queryFn: () => fetchPurchaseReceivingInfo(purchaseId),
    enabled: !!purchaseId,
    refetchOnMount: "always",
  });
}
