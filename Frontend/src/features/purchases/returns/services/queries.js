import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchPurchaseReturns,
  fetchPurchaseReturnById,
  fetchReturnablePurchases,
  fetchPurchaseForReturn,
} from "./api-v1";
import { purchaseReturnKeys } from "./queryKeys";

export function usePurchaseReturnsQuery(filters, pagination) {
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      supplierId: filters.supplierId || "",
      status: filters.status ?? "",
      problem: filters.problem ?? "",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
    }),
    [filters, pagination],
  );

  return useQuery({
    queryKey: purchaseReturnKeys.list(queryParams),
    queryFn: () => fetchPurchaseReturns(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function usePurchaseReturnQuery(id) {
  return useQuery({
    queryKey: purchaseReturnKeys.detail(id),
    queryFn: () => fetchPurchaseReturnById(id),
    enabled: !!id,
    refetchOnMount: "always",
  });
}

// برای پیکر انتخاب خرید هنگام ثبت مرجوعی جدید
export function useReturnablePurchasesQuery(search) {
  return useQuery({
    queryKey: purchaseReturnKeys.returnablePurchasesSearch(search || ""),
    queryFn: () => fetchReturnablePurchases(search),
  });
}

export function usePurchaseForReturnQuery(purchaseId) {
  return useQuery({
    queryKey: purchaseReturnKeys.purchaseForReturn(purchaseId),
    queryFn: () => fetchPurchaseForReturn(purchaseId),
    enabled: !!purchaseId,
    refetchOnMount: "always",
  });
}

/**
 * بقیه‌ی مرجوعی‌های همین خرید — برای کارتِ «مرجوعی‌های دیگر همین
 * خرید» در صفحه‌ی جزئیات. `GetPurchaseReceivingInfo` (که
 * `usePurchaseForReturnQuery` از آن می‌خواند) چنین فهرستی ندارد؛
 * بک‌اند عمداً همین فیلترِ `purchaseId` روی لیستِ عادی را راه‌حل
 * دانسته، نه یک فیلدِ جداگانه روی پاسخِ خرید.
 */
export function useRelatedPurchaseReturnsQuery(purchaseId, excludeReturnId = null) {
  const params = useMemo(() => ({ purchaseId, limit: 50 }), [purchaseId]);
  return useQuery({
    queryKey: purchaseReturnKeys.list(params),
    queryFn: () => fetchPurchaseReturns(params),
    enabled: !!purchaseId,
    select: (data) =>
      (data.items || []).filter((item) => item.id !== excludeReturnId),
  });
}
