import { useQuery } from "@tanstack/react-query";
import { customerKeys } from "./queryKeys";
import { fetchCustomers, getCustomerById } from "./api-v1";
import { keepPreviousData } from "@tanstack/react-query";

export function useCustomersQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.search || "",
    id: filters.id || "",
    minBalance: filters.minBalance ?? "",
    maxBalance: filters.maxBalance ?? "",
    balanceType: filters.balanceType !== "all" ? filters.balanceType : "",
    sortBy: sorting?.id ?? "lastName",
    sortOrder: sorting?.desc ? "desc" : "asc",
  };

  return useQuery({
    queryKey: customerKeys.list(queryParams),
    queryFn: () => fetchCustomers(queryParams),
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
const OPTIONS_SORTING = { id: "name", desc: false };
const NO_FILTERS = {};
const NO_CUSTOMERS = [];

/**
 * فهرستِ customerها برای dropdownِ فیلتر و فرم‌ها (حداکثر ۲۰۰ ردیف، مرتب بر اساس نام).
 *
 * TODO(بکند): با رشدِ داده، ۲۰۰ ردیفِ اول کافی نیست؛ جست‌وجوی سمتِ سرور لازم است
 * (سندِ frontend-requests.fa.md).
 */
export function useCustomersOptionsQuery() {
  const { data, isLoading } = useCustomersQuery(NO_FILTERS, OPTIONS_PAGINATION, OPTIONS_SORTING);
  return { customers: data?.items ?? NO_CUSTOMERS, isLoading };
}
