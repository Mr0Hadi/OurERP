import { useState } from "react";
import { Plus, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusBadge from "@/shared/components/status/StatusBadge";
import PaymentForm from "./PaymentForm";
import PaymentRow from "./PaymentRow";
import { isNormalPayment } from "@/shared/domain/payments/paymentRows";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * پرداخت‌های یک سندِ خرید/فروش — یک کارت برای فاکتورِ تازه، پیش‌فاکتوری که
 * صادر می‌شود و فاکتورِ صادرشده.
 *
 * جز کارتخوان، هیچ چیز همان لحظه ذخیره نمی‌شود: ثبت، اصلاح، ابطال و پول برگشتی
 * در پیش‌نویس (`usePaymentDraft`) می‌مانند و با دکمه‌ی اصلیِ صفحه اعمال می‌شوند.
 * ردیفِ در انتظار برچسب دارد و برگشت‌پذیر است. ردیف: `PaymentRow`؛ فرمِ درجا:
 * `PaymentForm`؛ کارتخوان: `useFormPosPayment` + `pos/PosPaymentPanel`.
 *
 * مبلغِ پرداختِ تازه با مانده پر می‌شود؛ «ترکیبی» مبلغ را بینِ چند روش تقسیم
 * می‌کند. بدونِ پرداخت یعنی نسیه.
 *
 * @param draft     خروجیِ `usePaymentDraft`
 * @param side      `{ direction, payLabel, refundLabel }`
 * @param total     جمعِ فاکتور
 * @param payable   بدهیِ واقعیِ طرف (اگر با جمع فرق دارد؛ مثلاً قلمِ بسته‌شده)
 * @param allowRefund `false` برای سندِ تازه
 * @param refundOnly  سندِ لغوشده: فقط پولِ برگشتی
 * @param emptyText   متنِ «هنوز پرداختی نیست» (پیش‌فرض: مانده نسیه می‌ماند)
 * @param posPayment  دریافت با کارتخوان روی ردیفِ «انتقال بانکی»؛ بدونِ آن پنلی نیست. برخلافِ بقیه‌ی
 *                    دریافت‌ها همان لحظه روی سرور ثبت می‌شود، نه در پیش‌نویس (کارت‌کشیدن برگشت‌ناپذیر است):
 *   - `record(result, { terminal, amount, reference, row, rows })` ثبتِ پرداخت؛ `row` تکه‌ی
 *     کارتخوان با `transferRef` و `rows` همه‌ی تکه‌های فرم (برای ثبتِ فاکتورِ تازه). باید
 *     ایدمپوتنت باشد.
 *   - `prepare()` پیش از دستور به دستگاه؛ خطا یعنی کارت نمی‌خورد.
 *   - `reference` شناسه‌ی سفارش برای دستگاه (مقدار یا تابع).
 *   - `onRecorded(saved)`، `onDone()` (با «بستن»ِ رسید؛ پیش‌فرض: بستنِ فرم یا برداشتنِ تکه‌ی ترکیبی)،
 *     `onLockChange(locked)` (تا پایانِ کار، صفحه دکمه‌ی اصلی‌اش را ببندد).
 *   - `blockedReason`، `hint`، `doneLabel` برای پنل.
 */
export default function PaymentsCard({
  title = "پرداخت‌ها",
  draft,
  side,
  total,
  payable,
  canManage = true,
  allowRefund = true,
  refundOnly = false,
  posPayment,
  notice,
  emptyText = "پرداختی ثبت نشده؛ مانده به‌صورت نسیه می‌ماند.",
}) {
  // { mode: "pay" | "refund" | "edit", row? }
  const [form, setForm] = useState(null);

  const due = Number(payable ?? total) || 0;
  const paid = draft.netPaid;
  const remaining = due - paid;
  const refundDirection =
    side.direction === PaymentDirectionEnum.IN ? PaymentDirectionEnum.OUT : PaymentDirectionEnum.IN;

  const rows = [...draft.rows].sort(
    (a, b) =>
      (a.pending === "add") - (b.pending === "add") ||
      String(a.paidAt ?? "").localeCompare(String(b.paidAt ?? "")),
  );

  // `current` پارامتر است نه خواندن از `form`: React Compiler وابستگیِ
  // `form.mode` را بی‌شرط می‌خواند و وقتی `form` خالی است می‌شکند.
  const submit = (current, moneyRows) => {
    if (current.mode === "edit") {
      draft.edit(current.row.id, { ...moneyRows[0], direction: current.row.direction });
    } else {
      const direction = current.mode === "refund" ? refundDirection : side.direction;
      moneyRows.forEach((row) => draft.add({ ...row, direction }));
    }
    setForm(null);
  };

  const canAdd = canManage && !form;
  const formTitle =
    form?.mode === "edit" ? "اصلاحِ پرداخت" : form?.mode === "refund" ? side.refundLabel : side.payLabel;

  return (
    <SectionCard
      title={title}
      action={
        <>
          {draft.hasChanges && (
            <StatusBadge tone="info" size="sm">
              {formatNumber(draft.count)} ثبت‌نشده
            </StatusBadge>
          )}
          {canAdd && !refundOnly && (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setForm({ mode: "pay" })}>
              <Plus className="size-3.5" />
              {side.payLabel}
            </Button>
          )}
        </>
      }
    >
      <dl className="grid grid-cols-3 divide-x divide-x-reverse divide-border rounded-lg border border-border text-center">
        <Stat label={payable != null && Number(payable) !== Number(total) ? "قابل پرداخت" : "مبلغ فاکتور"} value={formatNumber(due)} />
        <Stat label="پرداخت‌شده" value={formatNumber(paid)} />
        <Stat
          label={remaining < 0 ? "اضافه‌پرداخت" : "مانده"}
          // سندِ بی‌مبلغ (هنوز کالایی نیست) «تسویه» نیست.
          value={due === 0 && paid === 0 ? "—" : remaining === 0 ? "تسویه" : formatNumber(Math.abs(remaining))}
          className={toneText(remaining > 0 ? "warning" : remaining < 0 ? "info" : "success")}
        />
      </dl>

      {form && (
        <PaymentForm
          key={form.row?.id ?? form.mode}
          mode={form.mode}
          title={formTitle}
          row={form.row}
          remaining={remaining}
          paid={paid}
          posPayment={posPayment}
          onCancel={() => setForm(null)}
          onSubmit={(moneyRows) => submit(form, moneyRows)}
        />
      )}

      {rows.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <PaymentRow
              key={row.id}
              row={row}
              isRefund={row.direction === refundDirection}
              manageable={canManage && !row.voidedAt && isNormalPayment(row)}
              onEdit={() => setForm({ mode: "edit", row })}
              onVoid={() => draft.void(row.id)}
              onUndo={() => draft.undo(row.id)}
            />
          ))}
        </ul>
      ) : (
        !form && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {refundOnly ? "پرداختی ثبت نشده است." : emptyText}
          </p>
        )
      )}

      {notice && <p className="text-xs leading-5 text-muted-foreground">{notice}</p>}

      {canAdd && allowRefund && paid > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full gap-1.5 text-muted-foreground"
          onClick={() => setForm({ mode: "refund" })}
        >
          <Undo2 className="size-3.5" />
          {side.refundLabel}
        </Button>
      )}
    </SectionCard>
  );
}

function Stat({ label, value, className }) {
  return (
    <div className="min-w-0 px-1.5 py-2 sm:px-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      {/* مبلغِ میلیاردی در ستونِ یک‌سومِ موبایل جا نمی‌شد و از کادر بیرون می‌زد. */}
      <dd className={cn("text-[13px] font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-sm", className)}>
        {value}
      </dd>
    </div>
  );
}
