// src/features/warehouse/units/services/queries.js
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { fetchProductUnits } from "./api-mockData";
import { productUnitKeys } from "./queryKeys";

export function useProductUnitsQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.globalSearch || "",
    productId: filters.productId || "",
    status: filters.status || "",
    sortBy: sorting?.id ?? "createdAt",
    sortOrder: sorting ? (sorting.desc ? "desc" : "asc") : "desc",
  };

  return useQuery({
    queryKey: productUnitKeys.list(queryParams),
    queryFn: () => fetchProductUnits(queryParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}
