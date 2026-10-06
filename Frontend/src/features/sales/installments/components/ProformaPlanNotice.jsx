import { useState } from "react";
import { Ban } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/forms/SectionCard";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import Notice from "@/shared/components/feedback/Notice";
import { useCancelInstallmentPlanMutation } from "../services/mutations";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

/**
 * پیش‌فاکتوری که از قبل قرارداد اقساطِ بدونِ پیش‌پرداخت دارد (`CreateSaleInstallmentPlan`
 * با پیش‌پرداختِ صفر فروش را در پیش‌فاکتور نگه می‌دارد). سرور قراردادِ دوم نمی‌پذیرد و
 * پیش‌پرداختِ قراردادِ موجود را هم نمی‌شود بعداً ثبت کرد؛ پس برای صدور، اول ابطال.
 *
 * @param plan `installmentSummary`ِ پیش‌فاکتور
 */
export default function ProformaPlanNotice({ plan }) {
  const { allows } = usePermission();
  const cancel = useCancelInstallmentPlanMutation();
  const [confirm, setConfirm] = useState(false);

  return (
    <SectionCard title="قرارداد اقساط">
      <Notice tone="warning">
        این پیش‌فاکتور قرارداد اقساطِ بدونِ پیش‌پرداخت دارد ({formatNumber(plan.installmentCount)} قسط، قابل پرداخت{" "}
        {formatRial(plan.totalAmount)}). فاکتور با پیش‌پرداخت صادر می‌شود و آن را نمی‌شود به این قرارداد افزود؛
        قرارداد را ابطال کنید تا قراردادِ تازه با پیش‌پرداخت ثبت شود.
      </Notice>
      {allows("SaleInstallmentManage") && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirm(true)}
        >
          <Ban className="size-3.5" />
          ابطالِ قرارداد
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="ابطالِ قرارداد اقساط"
        description="قراردادِ بدونِ پیش‌پرداختِ این پیش‌فاکتور ابطال می‌شود. بعد از آن قراردادِ تازه را با پیش‌پرداخت ثبت کنید."
        confirmLabel="ابطالِ قرارداد"
        pendingLabel="در حال ابطال..."
        isPending={cancel.isPending}
        onConfirm={() => cancel.mutate(plan.planId, { onSuccess: () => setConfirm(false) })}
      />
    </SectionCard>
  );
}
