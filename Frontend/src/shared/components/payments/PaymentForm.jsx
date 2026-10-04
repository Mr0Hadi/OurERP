import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import PaymentMethodEditor from "./PaymentMethodEditor";
import PosPaymentPanel from "./pos/PosPaymentPanel";
import { toMoneyRow, useFormPosPayment } from "./useFormPosPayment";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { ROW_PAYMENT_TYPES, liveRows, newPaymentRow, resolvedRows, rowsTotal } from "@/shared/domain/payments/paymentSplit";
import { toDateOnly } from "@/shared/lib/dateUtils";
import { formatRial } from "@/shared/lib/numberFormat";

/** مقدارِ اولیه‌ی فرم: اصلاح از روی همان ردیف، بقیه نقدی با «کلِ مانده». */
function initialValue(mode, row) {
  if (mode !== "edit") return { method: PaymentTypeEnum.CASH, rows: [] };
  return {
    method: row.type,
    rows: [
      {
        ...newPaymentRow(row.type, Number(row.amount) || 0),
        paidAt: toDateOnly(row.paidAt) || "",
        checkNumber: row.checkNumber || "",
        transferRef: row.transferRef || "",
      },
    ],
  };
}

/**
 * فرمِ درجای پرداختِ `PaymentsCard`. ثبتِ تازه همه‌ی روش‌ها (از جمله ترکیبی) را
 * دارد و با باقیمانده پیش‌پر است؛ اصلاح و پولِ برگشتی یک روش. «افزودن» فقط به
 * پیش‌نویس اضافه می‌کند — جز کارتخوان که خودش همان لحظه ثبت می‌کند.
 *
 * @param mode       `"pay" | "refund" | "edit"`
 * @param remaining  مانده‌ی سند (منفی = اضافه‌پرداخت)
 * @param paid       پرداخت‌شده‌ی خالص — سقفِ پولِ برگشتی
 * @param onSubmit   `(moneyRows) => void`
 */
export default function PaymentForm({ mode, title, row, remaining, paid, posPayment, onCancel, onSubmit }) {
  const isEdit = mode === "edit";
  const isRefund = mode === "refund";
  // سقفی که «کلِ مانده» پر می‌کند.
  const payable = isEdit
    ? Math.max(0, remaining) + (Number(row.amount) || 0)
    : isRefund
      ? Math.max(0, -remaining) || Math.max(0, paid)
      : Math.max(0, remaining);

  const [value, setValue] = useState(() => initialValue(mode, row));
  const [error, setError] = useState(null);

  // ردیف‌های پرداختیِ فرم با مبلغِ نهایی (`null` = باقیمانده حل‌شده)، بی‌ردیفِ صفر.
  const pieces = liveRows(resolvedRows(value, payable));
  const pos = useFormPosPayment({ mode, value, setValue, pieces, payable, posPayment, onClose: onCancel });

  const confirm = () => {
    if (pos.locked) return;
    const moneyRows = pieces.map(toMoneyRow);
    if (moneyRows.length === 0) return setError("مبلغ باید بیشتر از صفر باشد");
    if (isRefund && rowsTotal(moneyRows) > paid) {
      return setError(`پول برگشتی نمی‌تواند بیشتر از ${formatRial(paid)} باشد`);
    }
    onSubmit(moneyRows);
  };

  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-3"
      // Enter در فیلدهای همین فرم پرداخت را اضافه می‌کند، نه کلِ سند را ذخیره.
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target.tagName === "INPUT") {
          e.preventDefault();
          confirm();
        }
      }}
    >
      <p className="text-sm font-medium">{title}</p>
      {/* وسطِ کارتخوان، مبلغ و روش نباید عوض شوند. */}
      <fieldset disabled={pos.locked} className="min-w-0 disabled:opacity-60">
        <PaymentMethodEditor
          value={value}
          onChange={(next) => {
            setValue(next);
            setError(null);
          }}
          payable={payable}
          methods={isEdit || isRefund ? ROW_PAYMENT_TYPES : [...ROW_PAYMENT_TYPES, PaymentTypeEnum.MIXED]}
          error={error}
        />
      </fieldset>
      {pos.shown && <PosPaymentPanel {...pos.panelProps} />}
      {!pos.locked && (
        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={confirm}>
            {isEdit ? "اعمالِ اصلاح" : "افزودن"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            انصراف
          </Button>
        </div>
      )}
    </div>
  );
}
