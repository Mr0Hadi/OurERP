// src/features/warehouse/receiving/services/queries.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchReceivingPurchases, fetchReceivingPurchaseById } from "./api-mockData";
import { receivingKeys } from "./queryKeys";

export function useReceivingPurchasesQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    supplierIds: filters.supplierIds || [],
    status: filters.status || "",
    paymentType: filters.paymentType || "",
    fromDate: filters.fromDate || "",
    toDate: filters.toDate || "",
    sortBy: sorting?.id ?? "createdAt",
    sortOrder: sorting?.desc ? "desc" : "asc",
  }), [filters, pagination, sorting]);

  useEffect(() => {
    const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
    queryClient.prefetchQuery({
      queryKey: receivingKeys.list(nextPageParams),
      queryFn: () => fetchReceivingPurchases(nextPageParams),
      staleTime: 1000 * 60 * 3,
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: receivingKeys.list(queryParams),
    queryFn: () => fetchReceivingPurchases(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function useReceivingPurchaseQuery(id) {
  return useQuery({
    queryKey: receivingKeys.detail(id),
    queryFn: () => fetchReceivingPurchaseById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    // این صفحه دقیقاً همان صفحه‌ای است که کاربر گزارش داد «باید یک‌بار
    // خارج و دوباره وارد شود تا اطلاعات درست را ببیند» — با این
    // گزینه، هر بار که صفحه mount می‌شود، حتماً یک واکشیِ تازه انجام
    // می‌شود، فارغ از این‌که کش قبلاً stale علامت خورده یا نه.
    refetchOnMount: "always",
  });
}