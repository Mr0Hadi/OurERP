// src/features/purchases/services/queries.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchPurchases, fetchPurchaseById } from "./api-mockData";
import { purchaseKeys } from "./queryKeys";
import { useMemo } from "react";

export function usePurchasesQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = useMemo(
    () => ({
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
    }),
    [filters, pagination, sorting],
  );

  // انتقال به effect
  useEffect(() => {
    const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
    queryClient.prefetchQuery({
      queryKey: purchaseKeys.list(nextPageParams),
      queryFn: () => fetchPurchases(nextPageParams),
      staleTime: 1000 * 60 * 3,
    });
  }, [queryClient, queryParams]);

  return useQuery({
    queryKey: purchaseKeys.list(queryParams),
    queryFn: () => fetchPurchases(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
  });
}

export function usePurchaseQuery(id) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: () => fetchPurchaseById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// بقیه بدون تغییر
export function usePurchaseStatsQuery(params = {}) {
  const queryParams = {
    ...params,
    page: 1,
    limit: 1000,
  };

  return useQuery({
    queryKey: [...purchaseKeys.all, "stats", queryParams],
    queryFn: async () => {
      const data = await fetchPurchases(queryParams);

      const stats = {
        total: 0,
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        byStatus: {},
        byPaymentType: {},
      };

      if (data?.items) {
        stats.total = data.items.length;

        data.items.forEach((purchase) => {
          stats.totalAmount += purchase.totalAmount;
          stats.paidAmount += purchase.paidAmount;

          if (!stats.byStatus[purchase.status]) {
            stats.byStatus[purchase.status] = { count: 0, amount: 0 };
          }
          stats.byStatus[purchase.status].count++;
          stats.byStatus[purchase.status].amount += purchase.totalAmount;

          if (!stats.byPaymentType[purchase.paymentType]) {
            stats.byPaymentType[purchase.paymentType] = { count: 0, amount: 0 };
          }
          stats.byPaymentType[purchase.paymentType].count++;
          stats.byPaymentType[purchase.paymentType].amount +=
            purchase.totalAmount;
        });

        stats.remainingAmount = stats.totalAmount - stats.paidAmount;
      }

      return stats;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
