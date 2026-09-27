// Frontend\src\features\suppliers\services\queries.js
import { useQuery } from "@tanstack/react-query";
import { supplierKeys } from "./queryKeys";
import { fetchSuppliers, getSupplierById } from "./api-v1";
import { keepPreviousData } from "@tanstack/react-query";

export function useSuppliersQuery(filters, pagination, sorting) {
  const queryParams = {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: filters.search || "",
    id: filters.id || "",
    minBalance: filters.minBalance ?? "",
    maxBalance: filters.maxBalance ?? "",
    balanceType: filters.balanceType !== "all" ? filters.balanceType : "",
    sortBy: sorting?.id ?? "companyName",
    sortOrder: sorting?.desc ? "desc" : "asc",
  };

  return useQuery({
    queryKey: supplierKeys.list(queryParams),
    queryFn: () => fetchSuppliers(queryParams),
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
const OPTIONS_SORTING = { id: "name", desc: false };
const NO_FILTERS = {};
const NO_SUPPLIERS = [];

/**
 * فهرستِ supplierها برای dropdownِ فیلتر و فرم‌ها (حداکثر ۲۰۰ ردیف، مرتب بر اساس نام).
 *
 * TODO(بکند): با رشدِ داده، ۲۰۰ ردیفِ اول کافی نیست؛ جست‌وجوی سمتِ سرور لازم است
 * (سندِ frontend-requests.fa.md).
 */
export function useSuppliersOptionsQuery() {
  const { data, isLoading } = useSuppliersQuery(NO_FILTERS, OPTIONS_PAGINATION, OPTIONS_SORTING);
  return { suppliers: data?.items ?? NO_SUPPLIERS, isLoading };
}
