import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAllPages, listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import { CUSTOMER_SORT_COLUMNS, fetchCustomers, getCustomerById } from "./api-v1";
import { customerKeys } from "./queryKeys";
import { useCustomerFilterStore } from "../store/customerFilterStore";

/** فیلترهای فعلیِ لیستِ مشتریان؛ ورودی‌های متنی با تأخیر. */
export function useCustomerListFilters() {
  return useDebouncedFilters(useCustomerFilterStore, {
    text: ["fullName", "id", "minBalance", "maxBalance"],
    instant: ["balanceType"],
  });
}

export function useCustomersQuery(filters, pagination, sorting, { enabled = true } = {}) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: CUSTOMER_SORT_COLUMNS });
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export const useCustomerQuery = (id) => {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomerById(id),
    enabled: !!id,
  });
};

// ─── گزینه‌های انتخاب ───────────────────────────────────────────────────────

const OPTIONS_SORTING = { id: "fullName", desc: false };
const NO_FILTERS = {};
const OPTIONS_PAGE_SIZE = 200;
const NO_CUSTOMERS = [];

/**
 * فهرستِ مشتری‌ها برای dropdownِ فیلتر و فرم‌ها (همه‌ی ردیف‌ها صفحه‌به‌صفحه، مرتب بر اساس نام).
 *
 * TODO(بکند): با رشدِ داده، جست‌وجوی سمتِ سرور بهتر است (سندِ frontend-requests.fa.md).
 */
/** `enabled: false` تا وقتی انتخاب‌گر واقعاً دیده نمی‌شود. */
export function useCustomersOptionsQuery({ enabled = true } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: customerKeys.options(),
    queryFn: () =>
      fetchAllPages(
        (page) =>
          fetchCustomers(
            listQuery({
              filters: NO_FILTERS,
              pagination: { pageIndex: page - 1, pageSize: OPTIONS_PAGE_SIZE },
              sorting: OPTIONS_SORTING,
              sortColumns: CUSTOMER_SORT_COLUMNS,
            }),
          ),
        { itemsKey: "items" },
      ),
    staleTime: 30_000,
    enabled,
  });
  return { customers: data?.items ?? NO_CUSTOMERS, isLoading };
}

const SEARCH_PAGINATION = { pageIndex: 0, pageSize: 20 };

/**
 * جست‌وجوی سمتِ سرور برای انتخابگرِ مشتری. `fullName`ِ سرور فقط نام *یا*
 * نام خانوادگی را جدا می‌گردد، پس «علی رضایی» هیچ‌چیز نمی‌آورد؛ کلمه‌ی اول
 * به سرور می‌رود و بقیه‌ی کلمه‌ها همین‌جا روی نتیجه اعمال می‌شوند
 * (frontend-requests.fa.md، بندِ ۹.۱۲).
 */
/** `enabled: false` برای نمایشِ فقط‌خواندنی (فاکتورِ صادرشده) که جست‌وجو ندارد. */
export function useCustomerSearchQuery(term, { enabled = true } = {}) {
  const search = useDebouncedValue(term.trim());
  const words = search.split(/\s+/).filter(Boolean);
  const filters = useMemo(() => (search ? { fullName: search.split(/\s+/)[0] } : NO_FILTERS), [search]);
  const { data, isFetching } = useCustomersQuery(filters, SEARCH_PAGINATION, OPTIONS_SORTING, { enabled });
  const items = data?.items ?? NO_CUSTOMERS;
  const results =
    words.length > 1
      ? items.filter((customer) => {
          const name = `${customer.firstName} ${customer.lastName}`;
          return words.every((word) => name.includes(word));
        })
      : items;
  return {
    results,
    total: words.length > 1 ? results.length : (data?.total ?? 0),
    isSearching: isFetching || search !== term.trim(),
  };
}
