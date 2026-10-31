import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import {
  PARTY_PAYMENT_SORT_COLUMNS,
  fetchAllocatableDocuments,
  fetchPartyPayment,
  fetchPartyPayments,
} from "./api-v1";
import { partyPaymentKeys } from "./queryKeys";

export function usePartyPaymentsQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: PARTY_PAYMENT_SORT_COLUMNS });
  return useQuery({
    queryKey: partyPaymentKeys.list(params),
    queryFn: () => fetchPartyPayments(params),
    placeholderData: keepPreviousData,
  });
}

export function usePartyPaymentQuery(id) {
  return useQuery({
    queryKey: partyPaymentKeys.detail(id),
    queryFn: () => fetchPartyPayment(id),
    enabled: Boolean(id),
  });
}

/** فاکتورهای قابلِ تخصیصِ یک شخص؛ `party` = `{ customerId }` یا `{ supplierId }`. */
export function useAllocatableDocumentsQuery(party, { enabled = true } = {}) {
  const hasParty = Boolean(party?.customerId || party?.supplierId);
  return useQuery({
    queryKey: partyPaymentKeys.allocatable(party),
    queryFn: () => fetchAllocatableDocuments(party),
    enabled: hasParty && enabled,
  });
}
