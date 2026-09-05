import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { fetchOutgoingQueue, fetchShippingSaleById } from "./api";
import { shippingKeys, outgoingQueueKeys } from "./queryKeys";

export function useOutgoingQueueQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      type: filters.type ?? "",
      counterpartyId: filters.counterpartyId || "",
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
      queryKey: outgoingQueueKeys.list(nextPageParams),
      queryFn: () => fetchOutgoingQueue(nextPageParams),
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: outgoingQueueKeys.list(queryParams),
    queryFn: () => fetchOutgoingQueue(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function useShippingSaleQuery(id) {
  return useQuery({
    queryKey: shippingKeys.detail(id),
    queryFn: () => fetchShippingSaleById(id),
    enabled: !!id,
    refetchOnMount: "always",
  });
}