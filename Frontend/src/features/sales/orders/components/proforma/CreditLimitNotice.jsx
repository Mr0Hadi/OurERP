import { ShieldAlert } from "lucide-react";

import Notice from "@/shared/components/feedback/Notice";
import { useFeatureFlags } from "@/features/auth/hooks/useFeatureFlags";
import { useCustomerQuery } from "@/features/customers/services/queries";
import { creditCheck } from "@/features/customers/domain/creditLimit";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * هشدارِ زنده‌ی سقفِ اعتبار در گامِ دریافت (GAP-06): نسیه‌ی این فاکتور (= قابل پرداخت − نقد/کارتِ همین فرم؛ چک نسیه
 * است) با اعتبارِ ماندهٔ مشتری. فقط UX است؛ تصمیم با سرور. با سوییچِ خاموش (`Sale.CreditLimitEnforced`) چیزی نمی‌گوید.
 *
 * @param payable    مبلغی که این فاکتور (یا قرارداد) به بدهیِ مشتری اضافه می‌کند
 * @param settledNow نقد/کارتی که همین فرم دریافت می‌کند
 */
export default function CreditLimitNotice({ customerId, payable, settledNow }) {
  const { isOn } = useFeatureFlags();
  const enforced = isOn("Sale.CreditLimitEnforced");
  const { data: customer } = useCustomerQuery(enforced ? customerId : null);
  const check = enforced ? creditCheck({ customer, payable, settledNow }) : null;
  if (!check) return null;

  return (
    <Notice tone="danger" icon={ShieldAlert}>
      {check.cashOnly ? (
        <>این مشتری فقط نقدی خرید می‌کند. برای ثبت، {formatRial(check.minCash)} دیگر نقد یا با کارت دریافت کنید.</>
      ) : (
        <>
          نسیه‌ی این فاکتور ({formatRial(check.credit)}) از اعتبارِ ماندهٔ مشتری ({formatRial(Math.max(0, check.available))})
          بیشتر است. برای ثبت، دست‌کم {formatRial(check.minCash)} دیگر نقد یا با کارت دریافت کنید.
        </>
      )}
    </Notice>
  );
}
