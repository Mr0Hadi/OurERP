import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchReceivablePurchases, fetchPurchaseReceivingInfo } from "./api-v1";
import { receivingKeys } from "./queryKeys";

/** صفِ دریافت: خریدهایی که کالایشان هنوز کامل نرسیده. */
export function useReceivablePurchasesQuery(filters, pagination) {
  const queryClient = useQueryClient();

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

  useEffect(() => {
    const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
    queryClient.prefetchQuery({
      queryKey: receivingKeys.list(nextPageParams),
      queryFn: () => fetchReceivablePurchases(nextPageParams),
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: receivingKeys.list(queryParams),
    queryFn: () => fetchReceivablePurchases(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
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
