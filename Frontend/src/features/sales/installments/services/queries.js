import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import {
  INSTALLMENT_PLAN_SORT_COLUMNS,
  INSTALLMENT_SORT_COLUMNS,
  fetchInstallmentPlan,
  fetchInstallmentPlans,
  fetchInstallments,
} from "./api-v1";
import { installmentKeys } from "./queryKeys";

/** قراردادِ اقساطیِ یک فروش. `enabled` را صفحه می‌دهد: فروشِ بی‌قرارداد ۴۰۴ می‌گیرد. */
export function useInstallmentPlanQuery(saleId, { enabled = true } = {}) {
  return useQuery({
    queryKey: installmentKeys.planOfSale(saleId),
    queryFn: () => fetchInstallmentPlan({ saleId }),
    enabled: Boolean(saleId) && enabled,
  });
}

export function useInstallmentsQuery(filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: INSTALLMENT_SORT_COLUMNS });
  return useQuery({
    queryKey: installmentKeys.installmentList(params),
    queryFn: () => fetchInstallments(params),
    placeholderData: keepPreviousData,
  });
}

export function useInstallmentPlansQuery(filters, pagination, sorting, { enabled = true } = {}) {
  const params = listQuery({ filters, pagination, sorting, sortColumns: INSTALLMENT_PLAN_SORT_COLUMNS });
  return useQuery({
    queryKey: installmentKeys.planList(params),
    queryFn: () => fetchInstallmentPlans(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** فقط شمارشِ یک فهرستِ اقساط (`take=1`)؛ مثلاً «چند قسطِ سررسیدگذشته». */
export function useInstallmentCountQuery(filters, { enabled = true } = {}) {
  const params = listQuery({ filters, pagination: { pageIndex: 0, pageSize: 1 } });
  return useQuery({
    queryKey: installmentKeys.installmentList(params),
    queryFn: () => fetchInstallments(params),
    select: (data) => data.total ?? 0,
    enabled,
  });
}
