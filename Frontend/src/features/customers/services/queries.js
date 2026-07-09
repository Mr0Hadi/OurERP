import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customerKeys } from "./queryKeys";
import { fetchCustomers, getCustomerById } from "./api";
import { keepPreviousData } from "@tanstack/react-query";

export function useCustomersQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.search || "",
    minBalance: filters.minBalance ?? "",
    maxBalance: filters.maxBalance ?? "",
    sortBy: sorting?.id ?? "lastName",
    sortOrder: sorting?.desc ? "desc" : "asc",
  };

  // prefetch صفحه بعدی
  const nextParams = { ...queryParams, page: queryParams.page + 1 };
  queryClient.prefetchQuery({
    queryKey: customerKeys.list(nextParams),
    queryFn: () => fetchCustomers(nextParams),
    staleTime: 1000 * 60 * 3,
  });

  return useQuery({
    queryKey: customerKeys.list(queryParams),
    queryFn: () => fetchCustomers(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  });
}

export const useCustomerQuery = (id) => {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomerById(id),
    enabled: !!id,
  });
};