import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { fetchProductUnits } from "./api-v1";
import { productUnitKeys } from "./queryKeys";

export function useProductUnitsQuery(filters, pagination) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    productId: filters.productId || "",
    status: filters.status || "",
    fromSerial: filters.fromSerial || "",
    toSerial: filters.toSerial || "",
  };

  return useQuery({
    queryKey: productUnitKeys.list(queryParams),
    queryFn: () => fetchProductUnits(queryParams),
    placeholderData: keepPreviousData,
  });
}
