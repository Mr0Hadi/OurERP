import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchSalesReturns,
  fetchSalesReturnById,
  fetchReturnableSales,
  fetchSaleForReturn,
} from "./api-v1";
import { salesReturnKeys } from "./queryKeys";

export function useSalesReturnsQuery(filters, pagination, sorting) {
  const queryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: filters.globalSearch || "",
      customerId: filters.customerId || "",
      status: filters.status ?? "",
      problem: filters.problem ?? "",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      sorting: sorting?.id ? { id: sorting.id, desc: !!sorting.desc } : null,
    }),
    [filters, pagination, sorting],
  );

  return useQuery({
    queryKey: salesReturnKeys.list(queryParams),
    queryFn: () => fetchSalesReturns(queryParams),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: "always",
  });
}

export function useSalesReturnQuery(id) {
  return useQuery({
    queryKey: salesReturnKeys.detail(id),
    queryFn: () => fetchSalesReturnById(id),
    enabled: !!id,
    refetchOnMount: "always",
  });
}

// برای پیکر انتخاب فروش هنگام ثبت مرجوعی جدید
export function useReturnableSalesQuery(search) {
  return useQuery({
    queryKey: salesReturnKeys.returnableSalesSearch(search || ""),
    queryFn: () => fetchReturnableSales(search),
  });
}

export function useSaleForReturnQuery(saleId, excludeReturnId = null) {
  return useQuery({
    queryKey: salesReturnKeys.saleForReturn(saleId, excludeReturnId),
    queryFn: () => fetchSaleForReturn(saleId, excludeReturnId),
    enabled: !!saleId,
    refetchOnMount: "always",
  });
}

/**
 * بقیه‌ی مرجوعی‌های همین فروش — برای کارتِ «مرجوعی‌های دیگر همین
 * فروش» در صفحه‌ی جزئیات. `GetSaleDetail` (که `useSaleForReturnQuery`
 * از آن می‌خواند) چنین فهرستی ندارد؛ فیلترِ `saleId` روی لیستِ عادیِ
 * مرجوعی فروش (که از اول پشتیبانی می‌شد) همین کار را می‌کند.
 */
export function useRelatedSalesReturnsQuery(saleId, excludeReturnId = null) {
  const params = useMemo(() => ({ saleId, limit: 50 }), [saleId]);
  return useQuery({
    queryKey: salesReturnKeys.list(params),
    queryFn: () => fetchSalesReturns(params),
    enabled: !!saleId,
    select: (data) =>
      (data.items || []).filter((item) => item.id !== excludeReturnId),
  });
}
