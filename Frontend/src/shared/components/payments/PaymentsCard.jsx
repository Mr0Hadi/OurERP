import { useEffect, useState } from "react";
import { Ban, Pencil, Plus, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusBadge from "@/shared/components/status/StatusBadge";
import PaymentMethodEditor from "./PaymentMethodEditor";
import PosPaymentPanel from "./PosPaymentPanel";
import { usePosPayment } from "@/shared/hooks/usePosPayment";
import { PosStatus, canStartPos, holdsMoney, isPosBusy } from "@/shared/domain/pos/posSession";
import { PAYMENT_TYPE_LABELS, PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { PaymentDirectionEnum, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import {
  ROW_PAYMENT_TYPES,
  liveRows,
  methodOf,
  removeMixedRow,
  newPaymentRow,
  resolvedRows,
  rowsTotal,
  updateRow,
} from "@/shared/domain/payments/paymentSplit";
import { gregorianToPersian, toDateOnly } from "@/shared/lib/dateUtils";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

const PENDING_BADGES = {
  add: { tone: "info", label: "ثبت‌نشده" },
  edit: { tone: "warning", label: "اصلاح می‌شود" },
  void: { tone: "danger", label: "باطل می‌شود" },
};

/**
 * پرداخت‌های یک سندِ خرید/فروش — یک کارت برای فاکتورِ تازه، پیش‌فاکتوری که
 * صادر می‌شود و فاکتورِ صادرشده.
 *
 * هیچ چیز همان لحظه ذخیره نمی‌شود: ثبت، اصلاح، ابطال و پول برگشتی در پیش‌نویس
 * (`usePaymentDraft`) می‌مانند و با دکمه‌ی اصلیِ صفحه اعمال می‌شوند. ردیفِ در
 * انتظار برچسب دارد و برگشت‌پذیر است.
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
 * @param posPayment  دریافت با کارتخوان روی ردیفِ «انتقال بانکی»؛ بدونِ آن پنلی نیست. برخلافِ بقیه‌ی
 *                    دریافت‌ها همان لحظه روی سرور ثبت می‌شود، نه در پیش‌نویس (کارت‌کشیدن برگشت‌ناپذیر است):
 *   - `record(result, { terminal, amount, row, rows })` ثبتِ پرداخت؛ `row` تکه‌ی کارتخوان با
 *     `transferRef` و `rows` همه‌ی تکه‌های فرم (برای ثبتِ فاکتورِ تازه). باید ایدمپوتنت باشد.
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
          value={remaining === 0 ? "تسویه" : formatNumber(Math.abs(remaining))}
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
              manageable={
                canManage &&
                !row.voidedAt &&
                (row.purpose ?? PaymentPurposeEnum.NORMAL) === PaymentPurposeEnum.NORMAL
              }
              onEdit={() => setForm({ mode: "edit", row })}
              onVoid={() => draft.void(row.id)}
              onUndo={() => draft.undo(row.id)}
            />
          ))}
        </ul>
      ) : (
        !form && (
          <p className="text-center text-xs text-muted-foreground py-2">
            پرداختی ثبت نشده؛ مانده به‌صورت نسیه می‌ماند.
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
    <div className="px-2 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-semibold tabular-nums", className)}>{value}</dd>
    </div>
  );
}

function PaymentRow({ row, isRefund, manageable, onEdit, onVoid, onUndo }) {
  const voided = Boolean(row.voidedAt) || row.pending === "void";
  const reference = row.checkNumber || row.transferRef;
  const badge = PENDING_BADGES[row.pending];

  return (
    <li className={cn("flex items-center gap-2 px-3 py-2.5 text-sm", row.pending && "bg-primary/3")}>
      <div className={cn("min-w-0 flex-1 space-y-0.5", voided && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("font-semibold tabular-nums", voided && "line-through")}>
            {isRefund && "− "}
            {formatRial(row.amount)}
          </span>
          {isRefund && <StatusBadge tone="info" size="sm">برگشتی</StatusBadge>}
          {(row.purpose ?? PaymentPurposeEnum.NORMAL) !== PaymentPurposeEnum.NORMAL && (
            <StatusBadge tone="special" size="sm">اقساط</StatusBadge>
          )}
          {row.voidedAt && <StatusBadge tone="danger" size="sm">باطل‌شده</StatusBadge>}
          {badge && <StatusBadge tone={badge.tone} size="sm">{badge.label}</StatusBadge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {PAYMENT_TYPE_LABELS[row.type] ?? row.type}
          {" · "}
          {row.paidAt ? gregorianToPersian(row.paidAt) : "امروز"}
          {reference && <span dir="ltr"> · {reference}</span>}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        {row.pending && row.pending !== "add" ? (
          <Button type="button" size="icon-sm" variant="ghost" aria-label="برگرداندنِ تغییر" title="برگرداندنِ تغییر" onClick={onUndo}>
            <RotateCcw className="size-3.5" />
          </Button>
        ) : (
          manageable && (
            <>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="اصلاح" title="اصلاح" onClick={onEdit}>
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={row.pending === "add" ? "حذف" : "ابطال"}
                title={row.pending === "add" ? "حذف" : "ابطال"}
                onClick={onVoid}
              >
                <Ban className="size-3.5" />
              </Button>
            </>
          )
        )}
      </div>
    </li>
  );
}

/**
 * فرمِ درجای پرداخت. ثبتِ تازه همه‌ی روش‌ها (از جمله ترکیبی) را دارد و با
 * باقیمانده پیش‌پر است؛ اصلاح و پولِ برگشتی یک روش.
 */
function PaymentForm({ mode, title, row, remaining, paid, posPayment, onCancel, onSubmit }) {
  const isEdit = mode === "edit";
  const isRefund = mode === "refund";
  // سقفی که «پرداخت کامل» پر می‌کند.
  const payable = isEdit
    ? Math.max(0, remaining) + (Number(row.amount) || 0)
    : isRefund
      ? Math.max(0, -remaining) || Math.max(0, paid)
      : Math.max(0, remaining);

  const [value, setValue] = useState(() =>
    isEdit
      ? {
          method: row.type,
          rows: [
            {
              ...newPaymentRow(row.type, Number(row.amount) || 0),
              paidAt: toDateOnly(row.paidAt) || "",
              checkNumber: row.checkNumber || "",
              transferRef: row.transferRef || "",
            },
          ],
        }
      : { method: PaymentTypeEnum.CASH, rows: [] },
  );
  const [error, setError] = useState(null);

  // ردیف‌های پرداختیِ فرم با مبلغِ نهایی (`null` = باقیمانده حل‌شده)، بی‌ردیفِ صفر.
  const pieces = liveRows(resolvedRows(value, payable));
  const toMoneyRow = (entry) => ({
    type: entry.type,
    amount: entry.amount,
    paidAt: entry.paidAt || undefined,
    checkNumber: entry.checkNumber,
    transferRef: entry.transferRef,
  });

  // کارتخوان: فقط برای دریافتِ تازه، روی ردیفِ «انتقال بانکی» (در ترکیبی اولین ردیفِ انتقال).
  const posRow = pieces.find((entry) => entry.type === PaymentTypeEnum.TRANSFER);
  const [posRowId, setPosRowId] = useState(null); // ردیفی که به دستگاه رفت
  const [preparing, setPreparing] = useState(false);
  const pos = usePosPayment({
    record: (result, context) => {
      const transferRef = result.rrn || result.traceNumber;
      const withRef = pieces.map((entry) => (entry.id === posRowId ? { ...entry, transferRef } : entry));
      const row = withRef.find((entry) => entry.id === posRowId);
      return posPayment.record(result, { ...context, row: toMoneyRow(row), rows: withRef.map(toMoneyRow) });
    },
    onRecorded: (saved) => posPayment.onRecorded?.(saved),
  });
  const posStatus = pos.state.status;
  const posShown = Boolean(posPayment) && mode === "pay" && (Boolean(posRow) || posStatus !== PosStatus.IDLE);
  const posAmount = canStartPos(posStatus) ? (posRow?.amount ?? 0) : pos.state.amount;
  const posBlocked = posAmount > payable ? "مبلغ از مانده‌ی فاکتور بیشتر است." : posPayment?.blockedReason;
  // وسطِ کارتخوان، با پولِ ثبت‌نشده یا رسیدِ باز: فرم و دکمه‌ی اصلیِ صفحه بسته‌اند.
  const posLocked = isPosBusy(posStatus) || holdsMoney(posStatus) || posStatus === PosStatus.RECORDED;
  const onLockChange = posPayment?.onLockChange;
  useEffect(() => {
    onLockChange?.(posLocked);
    return () => onLockChange?.(false);
  }, [posLocked, onLockChange]);

  const confirm = () => {
    if (posLocked) return;
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
      <fieldset disabled={posLocked} className="min-w-0 disabled:opacity-60">
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
      {posShown && (
        <PosPaymentPanel
          pos={pos}
          amount={posAmount}
          blockedReason={posBlocked}
          hint={posPayment.hint}
          doneLabel={posPayment.doneLabel}
          preparing={preparing}
          onStart={async (terminal) => {
            if (preparing) return;
            setPreparing(true);
            try {
              await posPayment.prepare?.();
            } catch {
              return;
            } finally {
              setPreparing(false);
            }
            setPosRowId(posRow.id);
            const { reference } = posPayment;
            pos.start({
              terminal,
              amount: posAmount,
              reference: typeof reference === "function" ? reference() : reference,
            });
          }}
          onDone={() => {
            pos.reset();
            if (posPayment.onDone) return posPayment.onDone();
            // ترکیبی: تکه‌ی کارتخوان ثبت شد و از فرم برداشته می‌شود؛ بقیه می‌مانند.
            if (methodOf(value) === PaymentTypeEnum.MIXED) return setValue(removeMixedRow(value, posRowId));
            onCancel();
          }}
          onManual={() => {
            // پول رفته ولی ثبت نشد: مبلغ و شماره‌ی پیگیری در همان ردیف می‌ماند تا با «افزودن» ثبت شود.
            const { amount, result } = pos.state;
            setValue(updateRow(value, posRowId, { amount, transferRef: result.rrn || result.traceNumber }));
            pos.reset();
          }}
        />
      )}
      {!posLocked && (
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
