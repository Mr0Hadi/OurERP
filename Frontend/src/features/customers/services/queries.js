// src\features\customers\services\queries.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customerKeys } from "./queryKeys";
import { fetchCustomers, getCustomerById } from "./api-v1";
import { keepPreviousData } from "@tanstack/react-query";

export function useCustomersQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.search || "",
    minBalance: filters.minBalance ?? "",
    maxBalance: filters.maxBalance ?? "",
    balanceType: filters.balanceType !== "all" ? filters.balanceType : "",
    sortBy: sorting?.id ?? "lastName",
    sortOrder: sorting?.desc ? "desc" : "asc",
  };

  const nextParams = { ...queryParams, page: queryParams.page + 1 };
  queryClient.prefetchQuery({
    queryKey: customerKeys.list(nextParams),
    queryFn: () => fetchCustomers(nextParams),
  });

  return useQuery({
    queryKey: customerKeys.list(queryParams),
    queryFn: () => fetchCustomers(queryParams),
    placeholderData: keepPreviousData,
  });
}

export const useCustomerQuery = (id) => {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomerById(id),
    enabled: !!id,
  });
};