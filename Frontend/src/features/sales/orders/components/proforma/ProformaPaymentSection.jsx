import InstallmentPlanDraftCard from "@/features/sales/installments/components/InstallmentPlanDraftCard";
import ProformaPlanNotice from "@/features/sales/installments/components/ProformaPlanNotice";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { FormSection } from "@/shared/components/forms/DocumentFormLayout";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import { SALE_PAYMENT_SIDE } from "../../domain/salePayments";

/** «شیوه‌ی پرداخت» هنگامِ دریافت: یکجا (نقد/نسیه) یا اقساطی (قرارداد با پیش‌پرداخت). */
const PAYMENT_TERMS_OPTIONS = [
  { value: false, label: "نقد / نسیه" },
  { value: true, label: "اقساطی", hint: "پیش‌پرداخت و قرارداد اقساط همین‌جا ثبت و فاکتور صادر می‌شود." },
];

/**
 * بخشِ دریافتِ پیش‌فاکتورِ «آماده‌ی پرداخت»: شیوه‌ی پرداخت، و دریافت‌ها (با کارتخوان) یا قرارداد اقساط (با
 * کارتخوانِ پیش‌پرداخت). وضعیت و ثبت از `useProformaPayment`؛ دکمه‌ی ثبت مالِ صفحه است.
 *
 * @param payment  خروجیِ `useProformaPayment`
 * @param payments خروجیِ `usePaymentDraft`
 */
export default function ProformaPaymentSection({ sale, payment, payments }) {
  const { allows } = usePermission();
  const busy = payment.isPending || payment.posLocked;

  return (
    <>
      {payment.canChooseTerms && (
        <SectionCard title="شیوه‌ی پرداخت">
          <StatusChoice
            label="شیوه‌ی پرداخت"
            options={PAYMENT_TERMS_OPTIONS}
            value={payment.isInstallment}
            onChange={payment.setInstallment}
            disabled={busy}
          />
        </SectionCard>
      )}
      <FormSection name="payment">
        {!payment.isInstallment ? (
          <PaymentsCard
            title="دریافت‌ها"
            draft={payments}
            side={SALE_PAYMENT_SIDE}
            total={sale.totalAmount}
            payable={sale.payableAmount}
            canManage={allows("SalePayment")}
            allowRefund={false}
            posPayment={payment.paymentPos}
            emptyText="هنوز دریافتی ثبت نشده است."
            notice={
              payment.inPerson
                ? "فروشِ حضوری: با دریافتِ کلِ مبلغ کالا همین‌جا تحویل می‌شود؛ با دریافتِ کمتر فاکتور صادر و کالا برای ارسالِ انبار رزرو می‌ماند."
                : "فاکتورِ فروش با اولین دریافت صادر می‌شود؛ مانده بدهیِ مشتری است."
            }
          />
        ) : payment.existingPlan ? (
          <ProformaPlanNotice plan={payment.existingPlan} />
        ) : (
          <InstallmentPlanDraftCard
            draft={payment.planDraft}
            onChange={payment.updatePlanDraft}
            preview={payment.planPreview}
            errors={payment.planErrors}
            blockedReason={payment.planBlockedReason}
            posPayment={payment.downPaymentPos}
          />
        )}
      </FormSection>
    </>
  );
}
