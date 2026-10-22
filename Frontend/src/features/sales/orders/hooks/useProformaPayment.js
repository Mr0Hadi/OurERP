import { useRef, useState } from "react";

import { usePermission } from "@/features/auth/hooks/usePermission";
import {
  EMPTY_PLAN_DRAFT,
  addMonthsIso,
  planDraftErrors,
  previewInstallmentPlan,
  toApiCreatePlan,
} from "@/features/sales/installments/domain/installmentPlan";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { newPosReference } from "@/shared/domain/pos/posSession";
import { todayIso } from "@/shared/lib/dateUtils";
import { reportFormProblem } from "@/shared/lib/scrollToSection";
import { isInPersonProforma, proformaPaymentType } from "../domain/proformaFlow";
import { useSalePosActions, useSettleProformaMutation } from "../services/mutations";

const newPlanDraft = () => ({ ...EMPTY_PLAN_DRAFT, firstDueDate: addMonthsIso(todayIso(), 1) });

/**
 * گامِ دریافتِ پیش‌فاکتورِ «آماده‌ی پرداخت» — مشترکِ صفحه‌ی فروش و صندوق (`ProformaPaymentSection`):
 * شیوه‌ی پرداخت (نقد/نسیه ⇄ اقساطی، فقط همین‌جا انتخاب می‌شود)، پیش‌نویسِ قرارداد، و ثبت. شیوه‌ی انتخاب‌شده
 * پیش از هر پولی ثبت می‌شود (`ensureProformaPaymentType`). فروشِ حضوری با دریافتِ کلِ مبلغ یا قرارداد همان‌جا
 * تحویل می‌شود.
 *
 * دو کارتخوان: دریافتِ عادی (`paymentPos`، روی ردیفِ «انتقال بانکی»ِ دریافت‌ها) و پیش‌پرداختِ قرارداد
 * (`downPaymentPos`). هیچ‌کدام تا «بستن»ِ رسید کش را عوض نمی‌کنند.
 *
 * @param sale        پیش‌فاکتورِ «آماده‌ی پرداخت» (خالی در فروشِ تازه — هوک بی‌اثر است و فقط صدا زده می‌شود)
 * @param payments    خروجیِ `usePaymentDraft` روی دریافت‌های همین سند
 * @param installment `[value, setValue]` اختیاری — شیوه در storeِ صفحه؛ وگرنه state (پیش‌فرض: شیوه‌ی ذخیره‌شده)
 * @param plan        `[draft, setDraft]` اختیاری — پیش‌نویسِ قرارداد در storeِ صفحه؛ وگرنه state
 * @param info        `() => ({ update?, attachments? })` — تغییرهای بی‌اثرِ صفحه که پیش از دریافت ذخیره می‌شوند
 * @param dueDate     سررسیدِ تازه (`undefined` ⇒ تغییری نیست)؛ پس از صدور روی فاکتور
 * @param blockedReason چرا الان نمی‌شود کارت کشید (مثلاً بارگذاریِ پیوست)
 * @param onDone      `() => void` — پس از ثبتِ موفق (دکمه یا «بستن»ِ رسیدِ کارتخوان)
 * @param doneLabel   برچسبِ «بستن»ِ رسید
 */
export function useProformaPayment({
  sale,
  payments,
  installment,
  plan,
  info = () => ({}),
  dueDate,
  blockedReason,
  onDone,
  doneLabel,
}) {
  const { allows } = usePermission();
  const settle = useSettleProformaMutation(sale);
  const posActions = useSalePosActions();
  const [posLocked, setPosLocked] = useState(false);
  const [showPlanErrors, setShowPlanErrors] = useState(false);
  // سندِ صادرشده با کارتخوان، تا «بستن»ِ رسید.
  const posOutcomeRef = useRef(null);

  const ownInstallment = useState(null);
  const ownPlan = useState(newPlanDraft);
  const [installmentChoice, setInstallmentChoice] = installment ?? ownInstallment;
  const [planDraft, setPlanDraft] = plan ?? ownPlan;

  const total = Number(sale?.totalAmount) || 0;
  const isInstallment = installmentChoice ?? Number(sale?.paymentType) === PaymentTypeEnum.INSTALLMENT;
  const inPerson = isInPersonProforma(sale);
  // حضوری و کلِ مبلغ (یا قرارداد با پیش‌پرداخت) ⇒ تحویلِ همین‌جا؛ کمتر ⇒ فاکتور و ارسالِ انبار.
  const deliverNow = inPerson && (isInstallment || payments.netPaid === total);

  // قراردادِ بی‌پیش‌پرداختی که از قبل روی پیش‌فاکتور است: شیوه قفل است تا ابطالش (صفحه‌ی فروش).
  const existingPlan =
    sale?.installmentSummary?.status === SaleInstallmentPlanStatusEnum.ACTIVE ? sale.installmentSummary : null;
  // چرا قراردادِ تازه را نمی‌شود ثبت کرد: دسترسی، یا پیش‌فاکتوری که از قراردادِ ابطال‌شده‌ی قبلی پول گرفته
  // (سرور قراردادِ تازه را با کلِ جمع می‌سازد — `frontend-requests.fa.md` ۱۷.۷).
  const planBlockedReason = !allows("SaleInstallmentManage")
    ? "ثبتِ قرارداد اقساط دسترسیِ «مدیریت قرارداد اقساطی» می‌خواهد."
    : Number(sale?.paidAmount) > 0
      ? "از این پیش‌فاکتور قبلاً با قراردادِ اقساطِ دیگری پول گرفته شده و قراردادِ تازه کلِ جمع را دوباره می‌خواهد (محدودیتِ فعلیِ سرور). شیوه‌ی پرداخت را «نقد / نسیه» کنید و مانده را با دریافتِ عادی بگیرید."
      : null;
  const canChooseTerms = !existingPlan && (isInstallment || allows("SaleInstallmentManage"));

  const planPreview = isInstallment ? previewInstallmentPlan(total, planDraft) : null;
  const planErrors = isInstallment
    ? planDraftErrors(planDraft, { payable: planPreview?.totalAmount, withDownPayment: true })
    : {};
  const planInvalid = Object.keys(planErrors).length > 0;

  const setInstallment = (value) => {
    setInstallmentChoice(value);
    setShowPlanErrors(false);
    if (value && !planDraft.firstDueDate) setPlanDraft({ ...planDraft, firstDueDate: addMonthsIso(todayIso(), 1) });
  };
  const updatePlanDraft = (patch) => setPlanDraft({ ...planDraft, ...patch });

  const canSubmit = isInstallment ? !existingPlan && !planBlockedReason : allows("SalePayment");
  const submitLabel = isInstallment
    ? deliverNow
      ? "ثبت قرارداد و تحویل"
      : "ثبت قرارداد و صدور فاکتور"
    : deliverNow
      ? "دریافت و تحویل"
      : "دریافت و صدور فاکتور";

  /** ثبت با دکمه‌ی اصلی؛ کمبودِ فرم به بخشِ دریافت اسکرول می‌کند. */
  const submit = () => {
    if (!canSubmit || settle.isPending || posLocked) return;
    if (isInstallment && planInvalid) {
      setShowPlanErrors(true);
      return reportFormProblem(["قرارداد اقساط کامل نیست.", "payment"]);
    }
    if (!isInstallment && !(payments.netPaid > 0 && payments.hasChanges)) {
      return reportFormProblem(["فاکتور با اولین دریافت صادر می‌شود؛ دریافت را ثبت کنید.", "payment"]);
    }
    settle.mutate(
      {
        paymentType: proformaPaymentType(isInstallment, sale),
        info: info(),
        plan: isInstallment ? toApiCreatePlan(planDraft) : null,
        payments,
        deliver: deliverNow,
        paymentDate: deliverNow ? undefined : dueDate,
      },
      { onSuccess: () => onDone() },
    );
  };

  const posCommon = {
    onLockChange: setPosLocked,
    reference: () => newPosReference(`sale-${sale.id}`),
    doneLabel,
  };

  // دریافتِ عادی با کارتخوان (`PaymentsCard.posPayment`). سررسیدِ تغییرکرده و دریافت‌های ثبت‌نشده مانع‌اند.
  const paymentPos = allows("PosCharge")
    ? {
        ...posCommon,
        prepare: () => posActions.prepare(sale, { paymentType: proformaPaymentType(false, sale), info: info() }),
        record: (_result, context) => posActions.recordPayment(sale.id, context),
        onRecorded: (latest) => {
          posOutcomeRef.current = latest;
        },
        onDone: () => {
          onDone();
          posActions.apply(posOutcomeRef.current);
        },
        blockedReason:
          dueDate !== undefined
            ? "سررسیدِ تازه را با دکمه‌ی اصلی (همراهِ دریافت) ثبت کنید، یا آن را برگردانید."
            : payments.hasChanges
              ? "دریافت‌های ثبت‌نشده را اول ثبت کنید؛ بعد با کارتخوان دریافت کنید."
              : blockedReason,
        hint: "با تأییدِ کارتخوان فاکتور صادر می‌شود.",
      }
    : undefined;

  // پیش‌پرداختِ قرارداد با کارتخوان (`InstallmentPlanDraftCard.posPayment`، روشِ «انتقال بانکی»).
  const downPaymentPos = allows("PosCharge")
    ? {
        ...posCommon,
        prepare: async () => {
          if (planInvalid) {
            setShowPlanErrors(true);
            throw new Error("قرارداد اقساط کامل نیست.");
          }
          await posActions.prepare(sale, { paymentType: proformaPaymentType(true, sale), info: info() });
        },
        record: (_result, { transferRef }) =>
          posActions.recordPlan(
            sale.id,
            toApiCreatePlan({ ...planDraft, paymentType: PaymentTypeEnum.TRANSFER, transferRef, paidAt: "" }),
            { deliver: inPerson },
          ),
        onDone: () => {
          onDone();
          posActions.refresh(sale.id);
        },
        blockedReason,
      }
    : undefined;

  return {
    inPerson,
    deliverNow,
    isInstallment,
    setInstallment,
    canChooseTerms,
    existingPlan,
    planBlockedReason,
    planDraft,
    updatePlanDraft,
    planPreview,
    planErrors: showPlanErrors ? planErrors : {},
    paymentPos,
    downPaymentPos,
    canSubmit,
    submitLabel,
    submit,
    isPending: settle.isPending,
    posLocked,
  };
}
