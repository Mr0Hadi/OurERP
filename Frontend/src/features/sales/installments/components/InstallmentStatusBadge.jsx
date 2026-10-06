import StatusBadge from "@/shared/components/status/StatusBadge";
import {
  INSTALLMENT_PLAN_STATUS_LABELS,
  INSTALLMENT_PLAN_STATUS_TONES,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
  installmentDisplayStatus,
} from "@/shared/domain/enums/saleInstallment";

/**
 * وضعیتِ یک قسط؛ پرداخت‌نشده‌ای که سررسیدش گذشته «سررسید گذشته» نشان داده می‌شود
 * (`installmentDisplayStatus` — سرور `OVERDUE` نمی‌نویسد).
 *
 * @param today "YYYY-MM-DD"؛ یک‌بار در سطحِ جدول گرفته می‌شود تا همه‌ی ردیف‌ها یک «امروز» داشته باشند
 */
export function InstallmentStatusBadge({ installment, today, ...props }) {
  const status = installmentDisplayStatus(installment, today);
  return (
    <StatusBadge tone={INSTALLMENT_STATUS_TONES[status]} {...props}>
      {INSTALLMENT_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  );
}

/** وضعیتِ قرارداد اقساطی (جاری / تسویه شده / ابطال شده). */
export function InstallmentPlanStatusBadge({ status, ...props }) {
  return (
    <StatusBadge tone={INSTALLMENT_PLAN_STATUS_TONES[status]} {...props}>
      {INSTALLMENT_PLAN_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  );
}
