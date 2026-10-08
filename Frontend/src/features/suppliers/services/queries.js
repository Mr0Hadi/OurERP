import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAllPages, listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import { SUPPLIER_SORT_COLUMNS, fetchSuppliers, getSupplierById } from "./api-v1";
import { supplierKeys } from "./queryKeys";
import { useSupplierFilterStore } from "../store/supplierFilterStore";

/** فیلترهای فعلیِ لیستِ تامین‌کنندگان؛ ورودی‌های متنی با تأخیر. */
export function useSupplierListFilters() {
  return useDebouncedFilters(useSupplierFilterStore, {
    text: ["companyNameOrContactName", "id", "minBalance", "maxBalance"],
    instant: ["balanceType"],
  });
}

export function useSuppliersQuery(filters, pagination, sorting, { enabled = true } = {}) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: SUPPLIER_SORT_COLUMNS });
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => fetchSuppliers(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export const useSupplierQuery = (id) => {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => getSupplierById(id),
    enabled: !!id,
  });
};

// ─── گزینه‌های انتخاب ───────────────────────────────────────────────────────

const OPTIONS_SORTING = { id: "companyName", desc: false };
const NO_FILTERS = {};
const OPTIONS_PAGE_SIZE = 200;
const NO_SUPPLIERS = [];

/**
 * فهرستِ تامین‌کننده‌ها برای dropdownِ فیلتر و فرم‌ها (همه‌ی ردیف‌ها صفحه‌به‌صفحه، مرتب بر اساس نام).
 *
 * TODO(بکند): با رشدِ داده، جست‌وجوی سمتِ سرور بهتر است (سندِ frontend-requests.fa.md).
 */
/** `enabled: false` تا وقتی انتخاب‌گر واقعاً دیده نمی‌شود. */
export function useSuppliersOptionsQuery({ enabled = true } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: supplierKeys.options(),
    queryFn: () =>
      fetchAllPages(
        (page) =>
          fetchSuppliers(
            listQuery({
              filters: NO_FILTERS,
              pagination: { pageIndex: page - 1, pageSize: OPTIONS_PAGE_SIZE },
              sorting: OPTIONS_SORTING,
              sortColumns: SUPPLIER_SORT_COLUMNS,
            }),
          ),
        { itemsKey: "items" },
      ),
    staleTime: 30_000,
    enabled,
  });
  return { suppliers: data?.items ?? NO_SUPPLIERS, isLoading };
}

const SEARCH_PAGINATION = { pageIndex: 0, pageSize: 20 };

/**
 * جست‌وجوی سمتِ سرور برای انتخابگرِ تامین‌کننده (`companyNameOrContactName`:
 * نام شرکت، نام یا نام خانوادگی). بی‌جست‌وجو، ۲۰ تامینِ اول به ترتیبِ نام.
 */
/** `enabled: false` برای نمایشِ فقط‌خواندنی (فاکتورِ صادرشده) که جست‌وجو ندارد. */
export function useSupplierSearchQuery(term, { enabled = true } = {}) {
  const search = useDebouncedValue(term.trim());
  const filters = useMemo(() => (search ? { companyNameOrContactName: search } : NO_FILTERS), [search]);
  const { data, isFetching } = useSuppliersQuery(filters, SEARCH_PAGINATION, OPTIONS_SORTING, { enabled });
  return {
    results: data?.items ?? NO_SUPPLIERS,
    total: data?.total ?? 0,
    isSearching: isFetching || search !== term.trim(),
  };
}
