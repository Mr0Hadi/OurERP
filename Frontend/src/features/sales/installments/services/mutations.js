import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import {
  cancelInstallmentPlan,
  payInstallment,
  settleInstallmentPlan,
  updateInstallmentPlan,
} from "./api-v1";
import { installmentKeys } from "./queryKeys";
import { toApiInstallmentPayment, toApiUpdatePlan } from "../domain/installmentPlan";
import { saleKeys } from "@/features/sales/orders/services/queryKeys";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { dashboardKeys } from "@/features/dashboard/services/queryKeys";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * بعد از هر نوشتنِ قرارداد: سندِ کاملِ برگشتی در کشِ همان فروش می‌نشیند و هرچه از
 * پولِ فروش خوانده می‌شود باطل می‌شود — فهرست‌های اقساط، فروش (`paidAmount` و
 * `installmentSummary`)، مانده‌ی مشتری و شمارنده‌ی «اقساطِ سررسیدگذشته»ی داشبورد.
 *
 * عمداً `invalidateSalesEcosystem` نیست: پرداختِ قسط نه موجودی را تکان می‌دهد، نه صفِ
 * ارسال و نه مرجوعی‌ها را؛ باطل‌کردنِ آن‌ها فقط درخواستِ بی‌فایده بود.
 */
export function applyInstallmentPlan(queryClient, plan) {
  if (plan?.saleId != null) {
    queryClient.setQueryData(installmentKeys.planOfSale(plan.saleId), plan);
    queryClient.invalidateQueries({ queryKey: saleKeys.detail(plan.saleId) });
  }
  queryClient.invalidateQueries({ queryKey: installmentKeys.lists() });
  queryClient.invalidateQueries({ queryKey: saleKeys.lists() });
  queryClient.invalidateQueries({ queryKey: customerKeys.all });
  queryClient.invalidateQueries({ queryKey: [...dashboardKeys.all, "queue", "saleInstallment"] });
}

function usePlanMutation({ mutationFn, success, failure }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (plan) => {
      applyInstallmentPlan(queryClient, plan);
      toast.success(success);
    },
    onError: (error) => toast.error(getErrorMessage(error, failure)),
  });
}

/** `{ installmentId, payment }` — `payment`: `{ paymentType, checkNumber, transferRef, paidAt }`. */
export const usePayInstallmentMutation = () =>
  usePlanMutation({
    // تکرارِ درخواست بی کلید یعنی دو ردیفِ پرداخت برای یک قسط.
    mutationFn: ({ installmentId, payment }) => {
      const body = { saleInstallmentId: installmentId, ...toApiInstallmentPayment(payment) };
      return payInstallment(body, { idempotencyKey: idempotencyKeyFor(body, "installment-pay") });
    },
    success: "پرداختِ قسط ثبت شد",
    failure: "ثبتِ پرداختِ قسط انجام نشد",
  });

/** `{ planId, payment }` — کلِ مانده‌ی قرارداد یکجا. */
export const useSettleInstallmentPlanMutation = () =>
  usePlanMutation({
    mutationFn: ({ planId, payment }) => {
      const body = { planId, ...toApiInstallmentPayment(payment) };
      return settleInstallmentPlan(body, { idempotencyKey: idempotencyKeyFor(body, "installment-settle") });
    },
    success: "قرارداد اقساطی تسویه شد",
    failure: "تسویه‌ی قرارداد انجام نشد",
  });

/** `{ planId, draft }` — درصد سود، تعداد اقساط، اولین سررسیدِ پرداخت‌نشده، جریمه. */
export const useUpdateInstallmentPlanMutation = () =>
  usePlanMutation({
    mutationFn: ({ planId, draft }) => updateInstallmentPlan(toApiUpdatePlan(planId, draft)),
    success: "قرارداد اقساطی بروزرسانی شد",
    failure: "ویرایشِ قرارداد انجام نشد",
  });

export const useCancelInstallmentPlanMutation = () =>
  usePlanMutation({
    mutationFn: (planId) => cancelInstallmentPlan(planId),
    success: "قرارداد اقساطی ابطال شد",
    failure: "ابطالِ قرارداد انجام نشد",
  });
