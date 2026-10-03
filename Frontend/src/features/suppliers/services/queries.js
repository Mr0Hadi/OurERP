import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
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

export function useSuppliersQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: SUPPLIER_SORT_COLUMNS });
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => fetchSuppliers(params),
    placeholderData: keepPreviousData,
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

const OPTIONS_PAGINATION = { pageIndex: 0, pageSize: 200 };
const OPTIONS_SORTING = { id: "companyName", desc: false };
const NO_FILTERS = {};
const NO_SUPPLIERS = [];

/**
 * فهرستِ تامین‌کننده‌ها برای dropdownِ فیلتر و فرم‌ها (حداکثر ۲۰۰ ردیف، مرتب بر اساس نام).
 *
 * TODO(بکند): با رشدِ داده، ۲۰۰ ردیفِ اول کافی نیست؛ جست‌وجوی سمتِ سرور لازم است
 * (سندِ frontend-requests.fa.md).
 */
export function useSuppliersOptionsQuery() {
  const { data, isLoading } = useSuppliersQuery(NO_FILTERS, OPTIONS_PAGINATION, OPTIONS_SORTING);
  return { suppliers: data?.items ?? NO_SUPPLIERS, isLoading };
}

const SEARCH_PAGINATION = { pageIndex: 0, pageSize: 20 };

/**
 * جست‌وجوی سمتِ سرور برای انتخابگرِ تامین‌کننده (`companyNameOrContactName`:
 * نام شرکت، نام یا نام خانوادگی). بی‌جست‌وجو، ۲۰ تامینِ اول به ترتیبِ نام.
 */
export function useSupplierSearchQuery(term) {
  const search = useDebouncedValue(term.trim());
  const filters = useMemo(() => (search ? { companyNameOrContactName: search } : NO_FILTERS), [search]);
  const { data, isFetching } = useSuppliersQuery(filters, SEARCH_PAGINATION, OPTIONS_SORTING);
  return {
    results: data?.items ?? NO_SUPPLIERS,
    total: data?.total ?? 0,
    isSearching: isFetching || search !== term.trim(),
  };
}
