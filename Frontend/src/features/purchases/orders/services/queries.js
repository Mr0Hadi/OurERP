import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";

import { PURCHASE_SORT_COLUMNS, fetchPurchases, fetchPurchaseById } from "./api-v1";
import { usePurchaseFilterStore } from "../store/purchaseFilterStore";
import { purchaseKeys } from "./queryKeys";

/** فیلترهای فعلیِ لیستِ خرید؛ جست‌وجوی متنی با تأخیر. */
export function usePurchaseListFilters() {
  return useDebouncedFilters(usePurchaseFilterStore, {
    text: ["invoiceNumber"],
    instant: ["supplierId", "status", "paymentType", "fromDate", "toDate"],
  });
}

export function usePurchasesQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: PURCHASE_SORT_COLUMNS });
  return useQuery({
    queryKey: purchaseKeys.list(params),
    queryFn: () => fetchPurchases(params),
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

