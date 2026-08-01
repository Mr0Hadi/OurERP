// src/features/warehouse/receiving/services/queries.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchReceivingPurchaseById } from "./api-mockData";
import { fetchIncomingQueue } from "./incomingQueueApi";
import { receivingKeys, incomingQueueKeys } from "./queryKeys";

/**
 * صف یکپارچه‌ی صفحه‌ی لیست دریافت انبار: هم خریدهای در انتظار دریافت،
 * هم مرجوعی‌های فروش در انتظار بررسی فیزیکی.
 */
export function useIncomingQueueQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      type: filters.type || "",
      // این فیلد قبلاً اینجا فراموش شده بود؛ بدون آن، انتخاب کاربر در
      // select مشتری/تامین‌کننده هرگز به درخواست واقعی نمی‌رسید.
      counterpartyIds: filters.counterpartyIds || [],
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
      queryKey: incomingQueueKeys.list(nextPageParams),
      queryFn: () => fetchIncomingQueue(nextPageParams),
      staleTime: 1000 * 60 * 3,
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: incomingQueueKeys.list(queryParams),
    queryFn: () => fetchIncomingQueue(queryParams),
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
    refetchOnMount: "always",
  });
}