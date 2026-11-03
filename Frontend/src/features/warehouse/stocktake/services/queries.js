import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import { STOCKTAKE_SORT_COLUMNS, fetchStocktake, fetchStocktakes } from "./api-v1";
import { stocktakeKeys } from "./queryKeys";

export function useStocktakesQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: STOCKTAKE_SORT_COLUMNS });
  return useQuery({
    queryKey: stocktakeKeys.list(params),
    queryFn: () => fetchStocktakes(params),
    placeholderData: keepPreviousData,
  });
}

export function useStocktakeQuery(id) {
  return useQuery({
    queryKey: stocktakeKeys.detail(id),
    queryFn: () => fetchStocktake(id),
    enabled: Boolean(id),
  });
}
