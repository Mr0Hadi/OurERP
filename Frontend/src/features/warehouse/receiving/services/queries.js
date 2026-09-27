import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { needsDocumentList } from "../../shared/queueFilters";
import {
  fetchReceivablePurchases,
  fetchPurchaseReceivingInfo,
  fetchPurchaseReturnPendingEffects,
} from "./api-v1";
import { receivingKeys } from "./queryKeys";
import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { PURCHASE_SORT_COLUMNS } from "@/features/purchases/orders/services/api-v1";
import { receivingStatusesOf } from "../domain/receivingVocabulary";
import { useReceivingFilterStore } from "../store/receivingFilterStore";

/** فیلترهای فعلیِ صفِ دریافت؛ جست‌وجوی متنی با تأخیر. */
export function useReceivingListFilters() {
  return useDebouncedFilters(useReceivingFilterStore, {
    text: ["invoiceNumber"],
    instant: ["supplierId", "status", "fromDate", "toDate"],
  });
}

/** صفِ دریافت: خریدهایی که کالایشان هنوز کامل نرسیده. */
export function useReceivablePurchasesQuery(filters, pagination, sorting) {
  const { status, ...serverFilters } = filters;
  const params = listQuery({
    filters: { ...serverFilters, statuses: receivingStatusesOf(status) },
    pagination,
    sorting,
    sortColumns: PURCHASE_SORT_COLUMNS,
  });

  return useQuery({
    queryKey: receivingKeys.list(params),
    queryFn: () => fetchReceivablePurchases(params),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    // دو حالتِ مرجوعیِ فیلتر از فهرستِ سندها استفاده نمی‌کنند.
    enabled: needsDocumentList(status),
  });
}

export function usePurchaseReturnPendingEffectsQuery(purchaseId) {
  return useQuery({
    queryKey: receivingKeys.pendingReturnEffects(purchaseId),
    queryFn: () => fetchPurchaseReturnPendingEffects(purchaseId),
    enabled: !!purchaseId,
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
