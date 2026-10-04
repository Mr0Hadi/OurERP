import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  SALE_RETURN_SORT_COLUMNS,
  fetchSalesReturns,
  fetchSalesReturnById,
  fetchReturnableSales,
  fetchSaleForReturn,
} from "./api-v1";
import { salesReturnKeys } from "./queryKeys";
import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { useSalesReturnFilterStore } from "../store/salesReturnFilterStore";

/** فیلترهای فعلیِ لیستِ مرجوعی؛ جست‌وجوی متنی با تأخیر. */
export function useSalesReturnListFilters() {
  return useDebouncedFilters(useSalesReturnFilterStore, {
    text: ["search"],
    instant: ["customerId", "status", "problem", "fromDate", "toDate"],
  });
}

export function useSalesReturnsQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: SALE_RETURN_SORT_COLUMNS });
  return useQuery({
    queryKey: salesReturnKeys.list(params),
    queryFn: () => fetchSalesReturns(params),
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

export function useSaleForReturnQuery(saleId) {
  return useQuery({
    queryKey: salesReturnKeys.saleForReturn(saleId),
    queryFn: () => fetchSaleForReturn(saleId),
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
  const params = useMemo(() => ({ saleId, take: 50 }), [saleId]);
  return useQuery({
    queryKey: salesReturnKeys.list(params),
    queryFn: () => fetchSalesReturns(params),
    enabled: !!saleId,
    select: (data) =>
      (data.items || []).filter((item) => item.id !== excludeReturnId),
  });
}
