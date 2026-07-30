// src\features\sales\services\queries.js

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { fetchSales, fetchSaleById } from './api-mockData';
import { saleKeys } from './queryKeys';

export function useSalesQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || '',
    customerIds: filters.customerIds || [],
    status: filters.status || '',
    paymentType: filters.paymentType || '',
    fromDate: filters.fromDate || '',
    toDate: filters.toDate || '',
    sortBy: sorting?.id ?? 'createdAt',
    sortOrder: sorting?.desc ? 'desc' : 'asc',
  };

  const nextPageParams = { ...queryParams, page: queryParams.page + 1 };
  queryClient.prefetchQuery({
    queryKey: saleKeys.list(nextPageParams),
    queryFn: () => fetchSales(nextPageParams),
    staleTime: 1000 * 60 * 3,
  });

  return useQuery({
    queryKey: saleKeys.list(queryParams),
    queryFn: () => fetchSales(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
  });
}

export function useSaleQuery(id) {
  return useQuery({
    queryKey: saleKeys.detail(id),
    queryFn: () => fetchSaleById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}
