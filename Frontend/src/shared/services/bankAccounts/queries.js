import { useQuery } from "@tanstack/react-query";

import { fetchBankAccountOptions } from "./api-v1";
import { bankAccountKeys } from "./queryKeys";

/**
 * گزینه‌های انتخابگرِ حساب. حساب‌ها کم و کم‌تغییرند؛ هر فرمِ پرداخت درخواستِ تازه نمی‌زند و نوشتن در
 * صفحه‌ی حساب‌ها (`bankAccountKeys.all`) باطلش می‌کند.
 */
export function useBankAccountOptionsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: bankAccountKeys.options(),
    queryFn: fetchBankAccountOptions,
    staleTime: 60 * 1000,
    enabled,
  });
}
