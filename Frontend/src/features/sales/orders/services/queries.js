import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { listQuery } from '@/shared/services/api/contract';
import { useDebouncedFilters } from '@/shared/hooks/useDebouncedFilters';

import {
  SALE_SORT_COLUMNS,
  WAREHOUSE_ISSUE_SORT_COLUMNS,
  fetchSales,
  fetchSaleById,
  fetchSaleWarehouseIssues,
} from './api-v1';
import { useSaleFilterStore } from '../store/saleFilterStore';
import { saleKeys, warehouseIssueKeys } from './queryKeys';

/** فیلترهای فعلیِ لیستِ فروش؛ جست‌وجوی متنی با تأخیر. */
export function useSaleListFilters() {
  return useDebouncedFilters(useSaleFilterStore, {
    text: ["invoiceNumber"],
    instant: ["customerId", "status", "proformaStages", "paymentType", "fromDate", "toDate"],
  });
}

export function useSalesQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: SALE_SORT_COLUMNS });
  return useQuery({
    queryKey: saleKeys.list(params),
    queryFn: () => fetchSales(params),
    placeholderData: keepPreviousData,
    gcTime: 1000 * 60 * 10,
  });
}

export function useSaleQuery(id) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: () => fetchSaleById(id),
    enabled: !!id,
  });
}

/** صفِ حسابداری: دانه‌های معیوب/مفقودِ گزارش‌شده در بررسیِ انبار (`GetSaleWarehouseIssueList`). */
export function useSaleWarehouseIssuesQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: WAREHOUSE_ISSUE_SORT_COLUMNS });
  return useQuery({
    queryKey: warehouseIssueKeys.list(params),
    queryFn: () => fetchSaleWarehouseIssues(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * صفِ پیش‌فاکتورهای یک مرحله (`GetSaleList` با `proformaStages`) — صفِ انبار (`CUSTOMER_APPROVED`) و
 * صفِ صندوق (`WAREHOUSE_CHECKED`). کلیدِ کش زیرِ فهرست‌های فروش است تا هر نوشتنِ فروش باطلش کند.
 */
/** فیلترهای فعلیِ یک صفِ پیش‌فاکتور (`createProformaQueueFilterStore`)؛ نامِ مشتری با تأخیر. */
export function useProformaQueueFilters(useStore) {
  return useDebouncedFilters(useStore, {
    text: ["customerName"],
    instant: ["customerId", "paymentType", "fromPaymentDate", "toPaymentDate"],
  });
}

export function useProformaQueueQuery(stage, filters, pagination, sorting) {
  const params = listQuery({
    filters: { ...filters, proformaStages: stage },
    pagination,
    sorting,
    sortColumns: SALE_SORT_COLUMNS,
  });
  return useQuery({
    queryKey: saleKeys.list(params),
    queryFn: () => fetchSales(params),
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
    // صف زنده است: پیش‌فاکتورِ تازه و مهلت‌های گذشته بی‌رفرش دیده شوند.
    refetchInterval: 30_000,
  });
}
