import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";

/**
 * کوئری‌های مرجوعی — یک تعریف برای هر دو سمت، قرینه‌ی `createReturnMutations`.
 * فایل‌های `queries.js`ِ مرجوعیِ خرید و فروش جز نامِ تابع‌ها و کلیدها یکی بودند.
 *
 * @param config.api           `{ list(params), detail(id), returnable(search), source(documentId) }`
 * @param config.keys          `{ list(params), detail(id), returnable(search), source(documentId) }`
 * @param config.filterStore   storeِ فیلترهای فهرست (`createFilterStore`)
 * @param config.partyFilter   نامِ فیلترِ طرف‌حساب (`supplierId`/`customerId`)
 * @param config.sortColumns   نگاشتِ ستونِ جدول به `*ReturnListSortEnum`
 * @param config.documentParam نامِ پارامترِ سندِ مبدا روی فهرست (`purchaseId`/`saleId`)
 */
export function createReturnQueries({ api, keys, filterStore, partyFilter, sortColumns, documentParam }) {
  return {
    /** فیلترهای فعلیِ فهرست؛ جست‌وجوی متنی با تأخیر. */
    useListFilters() {
      return useDebouncedFilters(filterStore, {
        text: ["search"],
        instant: [partyFilter, "status", "problem", "fromDate", "toDate"],
      });
    },

    useList(filters, pagination, sorting) {
      const params = listQuery({ filters, pagination, sorting, sortColumns });
      return useQuery({
        queryKey: keys.list(params),
        queryFn: () => api.list(params),
        placeholderData: keepPreviousData,
        gcTime: 1000 * 60 * 10,
        refetchOnMount: "always",
      });
    },

    useDetail(id) {
      return useQuery({
        queryKey: keys.detail(id),
        queryFn: () => api.detail(id),
        enabled: !!id,
        refetchOnMount: "always",
      });
    },

    /** سندهای قابلِ مرجوع برای انتخابگرِ صفحه‌ی ثبت؛ فهرستِ قبلی تا رسیدنِ نتیجه‌ی تازه می‌ماند. */
    useReturnable(search) {
      return useQuery({
        queryKey: keys.returnable(search || ""),
        queryFn: () => api.returnable(search),
        placeholderData: keepPreviousData,
      });
    },

    /** سندِ مبدا با سقف‌های ادعا — پایه‌ی فرمِ ثبت و کارتِ فاکتور در جزئیات. */
    useSource(documentId) {
      return useQuery({
        queryKey: keys.source(documentId),
        queryFn: () => api.source(documentId),
        enabled: !!documentId,
        refetchOnMount: "always",
      });
    },

    /**
     * بقیه‌ی مرجوعی‌های همان سند (کارتِ «مرجوعی‌های دیگر» و «قبلاً در مرجوعی»).
     * پاسخِ سندِ مبدا چنین فهرستی ندارد؛ فیلترِ سند روی فهرستِ عادیِ مرجوعی همین کار را می‌کند.
     */
    useRelated(documentId, excludeReturnId = null) {
      const params = useMemo(() => ({ [documentParam]: documentId, take: 50 }), [documentId]);
      return useQuery({
        queryKey: keys.list(params),
        queryFn: () => api.list(params),
        enabled: !!documentId,
        select: (data) => (data.items || []).filter((item) => item.id !== excludeReturnId),
      });
    },
  };
}
