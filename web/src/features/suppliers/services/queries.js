import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierKeys } from "./queryKeys";
import { fetchSuppliers, getSupplierById } from "./api";
import { keepPreviousData } from "@tanstack/react-query";

export function useSuppliersQuery(filters, pagination, sorting) {
  const queryClient = useQueryClient();

  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.search || "",
    minBalance: filters.minBalance ?? "",
    maxBalance: filters.maxBalance ?? "",
    sortBy: sorting?.id ?? "companyName",
    sortOrder: sorting?.desc ? "desc" : "asc",
  };

  const nextParams = { ...queryParams, page: queryParams.page + 1 };
  queryClient.prefetchQuery({
    queryKey: supplierKeys.list(nextParams),
    queryFn: () => fetchSuppliers(nextParams),
    staleTime: 1000 * 60 * 3,
  });

  return useQuery({
    queryKey: supplierKeys.list(queryParams),
    queryFn: () => fetchSuppliers(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  });
}

export const useSupplierQuery = (id) => {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => getSupplierById(id),
    enabled: !!id,
  });
};
