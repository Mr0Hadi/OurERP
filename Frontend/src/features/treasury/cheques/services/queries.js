import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import { CHEQUE_SORT_COLUMNS, fetchCheques } from "./api-v1";
import { chequeKeys } from "./queryKeys";

export function useChequesQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: CHEQUE_SORT_COLUMNS });
  return useQuery({
    queryKey: chequeKeys.list(params),
    queryFn: () => fetchCheques(params),
    placeholderData: keepPreviousData,
  });
}
