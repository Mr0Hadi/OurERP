import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { reorderPage } from "../domain/reorderList";
import { fetchReorderSuggestions } from "./api-v1";
import { reorderKeys } from "./queryKeys";

/**
 * پیشنهادهای خرید با فیلترهای صفحه (نام‌های پارامترِ سرور). سرور صفحه‌بندی و مرتب‌سازی ندارد؛
 * `select` همان‌ها را سمتِ کاربر می‌سازد (`reorderPage`)، پس عوض‌کردنِ صفحه یا مرتب‌سازی درخواستِ تازه نمی‌زند.
 */
export function useReorderSuggestionsQuery(filters, pagination, sorting) {
  return useQuery({
    queryKey: reorderKeys.suggestions(filters),
    queryFn: ({ signal }) => fetchReorderSuggestions(filters, { signal }),
    select: (rows) => reorderPage(rows, pagination, sorting),
    placeholderData: keepPreviousData,
  });
}
