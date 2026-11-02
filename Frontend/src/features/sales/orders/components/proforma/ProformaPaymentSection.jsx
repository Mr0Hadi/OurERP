import InstallmentPlanDraftCard from "@/features/sales/installments/components/InstallmentPlanDraftCard";
import ProformaPlanNotice from "@/features/sales/installments/components/ProformaPlanNotice";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { FormSection } from "@/shared/components/forms/DocumentFormLayout";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import { SALE_TERMS_LABEL } from "../../domain/proformaFlow";
import CreditInvoiceAction from "./CreditInvoiceAction";
import CreditLimitNotice from "./CreditLimitNotice";
import { settledNowOf, settlesNow } from "@/features/customers/domain/creditLimit";
import { SALE_PAYMENT_SIDE } from "../../domain/salePayments";

/** «شیوه‌ی پرداخت» هنگامِ دریافت: یکجا (نقد/نسیه) یا اقساطی (قرارداد با پیش‌پرداخت). */
const PAYMENT_TERMS_OPTIONS = [
  { value: false, label: SALE_TERMS_LABEL },
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
  // آنچه این صدور به بدهیِ مشتری اضافه می‌کند: قرارداد (اصل + سود − پیش‌پرداختِ نقدی) یا فاکتور منهای دریافتِ نقد/کارت.
  const credit = payment.isInstallment
    ? {
        payable: Number(payment.planPreview?.totalAmount) || 0,
        settledNow: settlesNow(payment.planDraft?.paymentType) ? Number(payment.planDraft?.downPaymentAmount) || 0 : 0,
      }
    : {
        payable: Number(sale.payableAmount ?? sale.totalAmount) || 0,
        settledNow: settledNowOf(payments.rows, SALE_PAYMENT_SIDE.direction),
      };

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
        {!payment.existingPlan && <CreditLimitNotice customerId={sale.customerId} {...credit} />}
        {!payment.isInstallment ? (
          <>
            <PaymentsCard
              title="دریافت‌ها"
              draft={payments}
              side={SALE_PAYMENT_SIDE}
              allocations={sale.paymentAllocations}
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
            {payment.creditInvoice && (
              <CreditInvoiceAction action={payment.creditInvoice} total={sale.totalAmount} disabled={busy} />
            )}
          </>
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
