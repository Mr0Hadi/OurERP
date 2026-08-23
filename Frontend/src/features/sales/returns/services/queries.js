import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  fetchSalesReturns,
  fetchSalesReturnById,
  fetchReturnableSales,
  fetchSaleForReturn,
} from "./api";
import { salesReturnKeys } from "./queryKeys";

export function useSalesReturnsQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      customerIds: filters.customerIds || [],
      status: filters.status || "",
      problem: filters.problem || "",
      scope: filters.scope || "",
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
      queryKey: salesReturnKeys.list(nextPageParams),
      queryFn: () => fetchSalesReturns(nextPageParams),
      staleTime: 1000 * 60 * 3,
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: salesReturnKeys.list(queryParams),
    queryFn: () => fetchSalesReturns(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function useSalesReturnQuery(id) {
  return useQuery({
    queryKey: salesReturnKeys.detail(id),
    queryFn: () => fetchSalesReturnById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });
}

// برای پیکر انتخاب فروش هنگام ثبت مرجوعی جدید
export function useReturnableSalesQuery(search) {
  return useQuery({
    queryKey: salesReturnKeys.returnableSalesSearch(search || ""),
    queryFn: () => fetchReturnableSales(search),
    staleTime: 1000 * 30,
  });
}

export function useSaleForReturnQuery(saleId, excludeReturnId = null) {
  return useQuery({
    queryKey: salesReturnKeys.saleForReturn(saleId, excludeReturnId),
    queryFn: () => fetchSaleForReturn(saleId, excludeReturnId),
    enabled: !!saleId,
    staleTime: 1000 * 30,
    refetchOnMount: "always",
  });
}
