import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import { needsDocumentList } from "../../shared/queueFilters";
import {
  fetchShippableSales,
  fetchSaleForShipping,
  fetchSaleReturnPendingEffects,
} from "./api-v1";
import { shippingKeys } from "./queryKeys";

/** صفِ ارسال: فروش‌هایی که کالایشان هنوز کامل نرفته. */
export function useShippableSalesQuery(filters, pagination, sorting) {
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      customerName: filters.customerName || "",
      status: filters.status ?? "",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      sorting: sorting?.id ? { id: sorting.id, desc: !!sorting.desc } : null,
    }),
    [filters, pagination, sorting],
  );

  return useQuery({
    queryKey: shippingKeys.list(queryParams),
    queryFn: () => fetchShippableSales(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    // دو حالتِ مرجوعیِ فیلتر از فهرستِ سندها استفاده نمی‌کنند.
    enabled: needsDocumentList(filters.status),
  });
}

export function useSaleReturnPendingEffectsQuery(saleId) {
  return useQuery({
    queryKey: shippingKeys.pendingReturnEffects(saleId),
    queryFn: () => fetchSaleReturnPendingEffects(saleId),
    enabled: !!saleId,
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
