import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { needsDocumentList } from "../../shared/queueFilters";
import {
  fetchShippableSales,
  fetchSaleForShipping,
  fetchSaleReturnPendingEffects,
} from "./api-v1";
import { shippingKeys } from "./queryKeys";
import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { SALE_SORT_COLUMNS } from "@/features/sales/orders/services/api-v1";
import { shippingStatusesOf } from "../domain/shippingVocabulary";
import { useShippingFilterStore } from "../store/shippingFilterStore";

/** فیلترهای فعلیِ صفِ ارسال؛ ورودی‌های متنی با تأخیر. */
export function useShippingListFilters() {
  return useDebouncedFilters(useShippingFilterStore, {
    text: ["invoiceNumber"],
    instant: ["customerId", "status", "fromDate", "toDate"],
  });
}

/** صفِ ارسال: فروش‌هایی که کالایشان هنوز کامل نرفته. */
export function useShippableSalesQuery(filters, pagination, sorting) {
  const { status, ...serverFilters } = filters;
  const params = listQuery({
    filters: { ...serverFilters, statuses: shippingStatusesOf(status) },
    pagination,
    sorting,
    sortColumns: SALE_SORT_COLUMNS,
  });

  return useQuery({
    queryKey: shippingKeys.list(params),
    queryFn: () => fetchShippableSales(params),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    // دو حالتِ مرجوعیِ فیلتر از فهرستِ سندها استفاده نمی‌کنند.
    enabled: needsDocumentList(status),
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
