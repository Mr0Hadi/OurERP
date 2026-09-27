import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";

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

export function useCustomersQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: CUSTOMER_SORT_COLUMNS });
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
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

const OPTIONS_PAGINATION = { pageIndex: 0, pageSize: 200 };
const OPTIONS_SORTING = { id: "fullName", desc: false };
const NO_FILTERS = {};
const NO_CUSTOMERS = [];

/**
 * فهرستِ مشتری‌ها برای dropdownِ فیلتر و فرم‌ها (حداکثر ۲۰۰ ردیف، مرتب بر اساس نام).
 *
 * TODO(بکند): با رشدِ داده، ۲۰۰ ردیفِ اول کافی نیست؛ جست‌وجوی سمتِ سرور لازم است
 * (سندِ frontend-requests.fa.md).
 */
export function useCustomersOptionsQuery() {
  const { data, isLoading } = useCustomersQuery(NO_FILTERS, OPTIONS_PAGINATION, OPTIONS_SORTING);
  return { customers: data?.items ?? NO_CUSTOMERS, isLoading };
}
