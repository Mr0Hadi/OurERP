import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { fetchPurchases, fetchPurchaseById } from "./api-v1";
import { purchaseKeys } from "./queryKeys";
import { useMemo } from "react";

export function usePurchasesQuery(filters, pagination) {
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      supplierId: filters.supplierId || "",
      status: filters.status ?? "",
      paymentType: filters.paymentType ?? "",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
    }),
    [filters, pagination],
  );

  return useQuery({
    queryKey: purchaseKeys.list(queryParams),
    queryFn: () => fetchPurchases(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
  });
}

export function usePurchaseQuery(id) {
  return useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn: () => fetchPurchaseById(id),
    enabled: !!id,
    refetchOnMount: "always",
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
    gcTime: 1000 * 60 * 10,
  });
}
