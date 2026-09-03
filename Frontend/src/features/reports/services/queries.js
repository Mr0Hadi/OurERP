// src/features/reports/services/queries.js
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchCustomerPurchaseStatistics,
  fetchSalesPerformanceByEmployee,
  fetchSupplierSalesStatistics,
  fetchSupplyPerformanceByEmployee,
} from "./api-v1";
// import {
//   fetchCustomerPurchaseStatistics,
//   fetchSalesPerformanceByEmployee,
//   fetchSupplierSalesStatistics,
//   fetchSupplyPerformanceByEmployee,
// } from "./api-v1";
import { activityKeys } from "./queryKeys";

/**
 * چهار هوکِ گزارشِ فعالیت. همه یک شکل دارند، پس یک سازنده‌ی مشترک
 * دارند — تفاوتشان فقط کلیدِ کش و تابعِ گرفتنِ داده است.
 *
 * `placeholderData` عمدی است: با عوض‌کردنِ بازه یا صفحه، جدول به‌جای
 * پریدن به اسکلتِ خالی، داده‌ی قبلی را نگه می‌دارد و فقط محو می‌شود
 * (`FetchingOverlay` همین حالت را نشان می‌دهد).
 */
function useActivityQuery(keyFn, fetcher, { filters, pagination }) {
  const params = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    fromDate: filters.fromDate || "",
    toDate: filters.toDate || "",
  };

  return useQuery({
    queryKey: keyFn(params),
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

export const useSalesPerformanceByEmployeeQuery = (options) =>
  useActivityQuery(activityKeys.employeeSales, fetchSalesPerformanceByEmployee, options);

export const useSupplyPerformanceByEmployeeQuery = (options) =>
  useActivityQuery(activityKeys.employeeSupply, fetchSupplyPerformanceByEmployee, options);

export const useCustomerPurchaseStatisticsQuery = (options) =>
  useActivityQuery(activityKeys.customers, fetchCustomerPurchaseStatistics, options);

export const useSupplierSalesStatisticsQuery = (options) =>
  useActivityQuery(activityKeys.suppliers, fetchSupplierSalesStatistics, options);
