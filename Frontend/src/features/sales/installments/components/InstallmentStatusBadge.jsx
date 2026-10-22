import StatusBadge from "@/shared/components/status/StatusBadge";
import {
  INSTALLMENT_PLAN_STATUS_LABELS,
  INSTALLMENT_PLAN_STATUS_TONES,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_TONES,
} from "@/shared/domain/enums/saleInstallment";

/** وضعیتِ یک قسط، همان‌طور که سرور نوشته (`OVERDUE` را سرویسِ پس‌زمینه‌ی سرور می‌نویسد). */
export function InstallmentStatusBadge({ status, ...props }) {
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
