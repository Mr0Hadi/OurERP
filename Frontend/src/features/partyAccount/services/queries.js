import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchPartyStatement } from "./api-v1";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { supplierKeys } from "@/features/suppliers/services/queryKeys";

/**
 * کلید زیرِ `customers`/`suppliers` است تا هر نوشتنی که کشِ طرف حساب را
 * باطل می‌کند (پرداخت، صدور، لغو) گردش حسابش را هم تازه کند.
 */
export const partyStatementKey = ({
  customerId,
  supplierId,
  fromDate,
  toDate,
}) =>
  customerId
    ? [
        ...customerKeys.all,
        "statement",
        String(customerId),
        { fromDate, toDate },
      ]
    : [
        ...supplierKeys.all,
        "statement",
        String(supplierId),
        { fromDate, toDate },
      ];

export function usePartyStatementQuery(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: partyStatementKey(params),
    queryFn: () => fetchPartyStatement(params),
    enabled: enabled && Boolean(params.customerId || params.supplierId),
    placeholderData: keepPreviousData,
  });
}
