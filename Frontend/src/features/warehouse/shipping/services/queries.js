import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchShippableSales, fetchSaleForShipping } from "./api-v1";
import { shippingKeys } from "./queryKeys";

/** صفِ ارسال: فروش‌هایی که کالایشان هنوز کامل نرفته. */
export function useShippableSalesQuery(filters, pagination) {
  const queryClient = useQueryClient();

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      customerName: filters.customerName || "",
      status: filters.status ?? "",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
    }),
    [filters, pagination],
  );

  useEffect(() => {
    const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
    queryClient.prefetchQuery({
      queryKey: shippingKeys.list(nextPageParams),
      queryFn: () => fetchShippableSales(nextPageParams),
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: shippingKeys.list(queryParams),
    queryFn: () => fetchShippableSales(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function useSaleForShippingQuery(saleId) {
  return useQuery({
    queryKey: shippingKeys.detail(saleId),
    queryFn: () => fetchSaleForShipping(saleId),
    enabled: !!saleId,
    refetchOnMount: "always",
  });
}
