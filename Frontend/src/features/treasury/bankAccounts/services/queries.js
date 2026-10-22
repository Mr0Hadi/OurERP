import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchBankAccountStatement, fetchBankAccounts } from "./api-v1";
import { bankAccountKeys } from "@/shared/services/bankAccounts/queryKeys";

/** همه‌ی صندوق‌ها و حساب‌ها با مانده و جمع‌ها؛ حساب‌ها کم‌اند و یک‌جا گرفته می‌شوند. */
export function useBankAccountsQuery({ includeInactive = false } = {}) {
  const params = { includeInactive };
  return useQuery({
    queryKey: bankAccountKeys.list(params),
    queryFn: () => fetchBankAccounts(params),
    placeholderData: keepPreviousData,
  });
}

/** گردشِ یک حساب در بازه‌ی `fromDate`..`toDate` (هر دو اختیاری، "YYYY-MM-DD"). */
export function useBankAccountStatementQuery({ bankAccountId, fromDate, toDate }) {
  const params = { bankAccountId, fromDate, toDate };
  return useQuery({
    queryKey: bankAccountKeys.statement(params),
    queryFn: () => fetchBankAccountStatement(params),
    enabled: Boolean(bankAccountId),
    placeholderData: keepPreviousData,
  });
}
