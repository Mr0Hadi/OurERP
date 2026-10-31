import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import Notice from "@/shared/components/feedback/Notice";
import InstallmentPlanTermsFields from "./InstallmentPlanTermsFields";
import { useUpdateInstallmentPlanMutation } from "../services/mutations";
import { planDraftErrors, planEditDraftOf } from "../domain/installmentPlan";
import { formatNumber } from "@/shared/lib/numberFormat";
import DialogActions from "@/shared/components/feedback/DialogActions";

function EditBody({ plan, mutation, onClose }) {
  const [draft, setDraft] = useState(() => planEditDraftOf(plan));
  const [showErrors, setShowErrors] = useState(false);
  const errors = planDraftErrors(draft);
  const paidCount = Number(plan.paidInstallmentCount) || 0;
  if (Number(draft.installmentCount) < paidCount) {
    errors.installmentCount = `دست‌کم ${formatNumber(paidCount)} قسط پرداخت شده است`;
  }

  const submit = () => {
    if (Object.keys(errors).length > 0) return setShowErrors(true);
    mutation.mutate({ planId: plan.id, draft }, { onSuccess: onClose });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>ویرایشِ قرارداد اقساط</DialogTitle>
        <DialogDescription>
          فقط اقساطِ پرداخت‌نشده از نو ساخته می‌شوند؛ اقساطِ پرداخت‌شده، پیش‌پرداخت و جمعِ فاکتور عوض نمی‌شوند.
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={mutation.isPending} className="min-w-0">
        <InstallmentPlanTermsFields
          value={draft}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          errors={showErrors ? errors : {}}
          idPrefix="edit-plan"
          firstDueLabel="سررسیدِ اولین قسطِ پرداخت‌نشده"
          countHint={
            paidCount > 0 ? `تعدادِ کل، با ${formatNumber(paidCount)} قسطِ پرداخت‌شده` : undefined
          }
        />
      </fieldset>

      <Notice tone="info">
        مبلغِ قابل پرداخت و اقساطِ تازه را سرور از درصدِ سودِ جدید حساب می‌کند و مانده روی اقساطِ پرداخت‌نشده پخش می‌شود.
      </Notice>

      <DialogActions
        onCancel={onClose}
        onSubmit={submit}
        isPending={mutation.isPending}
        pendingLabel="در حال ذخیره..."
        submitLabel="ذخیره‌ی قرارداد"
      />
    </>
  );
}

/** ویرایشِ قراردادِ جاری (`UpdateSaleInstallmentPlan`). `plan` = سندِ کاملِ قرارداد. */
export default function InstallmentPlanEditDialog({ plan, open, onOpenChange }) {
  const mutation = useUpdateInstallmentPlanMutation();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && mutation.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent dir="rtl" className="max-h-[90svh] overflow-y-auto sm:max-w-lg" showCloseButton={!mutation.isPending}>
        {open && <EditBody plan={plan} mutation={mutation} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
