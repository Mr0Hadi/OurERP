import { useState } from "react";
import { Ban, CalendarClock, Pencil, Plus, RotateCcw, Undo2, Wallet } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import SectionCard from "@/shared/components/documents/SectionCard";
import StatusBadge from "@/shared/components/status/StatusBadge";
import PaymentMethodEditor from "./PaymentMethodEditor";
import { PAYMENT_TYPE_LABELS, PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { PaymentDirectionEnum, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import {
  ROW_PAYMENT_TYPES,
  liveRows,
  newPaymentRow,
  resolvedRows,
  rowsTotal,
} from "@/shared/domain/payments/settlement";
import { gregorianToPersian, toDateOnly } from "@/shared/lib/dateUtils";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

const PENDING_BADGES = {
  add: { tone: "info", label: "ثبت‌نشده" },
  edit: { tone: "warning", label: "اصلاح می‌شود" },
  void: { tone: "danger", label: "باطل می‌شود" },
};

/**
 * پرداخت‌های فاکتورِ صادرشده: فهرست، ثبتِ پرداختِ تازه (با هر روش، از جمله
 * ترکیبی)، اصلاح، ابطال، پولِ برگشتی و سررسید.
 *
 * هیچ چیز همان لحظه ذخیره نمی‌شود: هر کار در پیش‌نویس (`usePaymentDraft`)
 * می‌ماند و با «ثبت تغییرات»ِ صفحه اعمال می‌شود. ردیفِ در انتظار برچسب دارد و
 * برگشت‌پذیر است. جمع و مانده در سرِ صفحه (`DocumentHero`) است، نه اینجا.
 *
 * @param draft          خروجیِ `usePaymentDraft`
 * @param side           `{ direction, payLabel, refundLabel }`
 * @param payable        بدهیِ واقعیِ طرف (برای پیش‌پرکردنِ مبلغ با باقیمانده)
 * @param refundOnly     سندِ لغوشده: فقط پولِ برگشتی
 */
export default function PaymentsLedgerCard({
  draft,
  side,
  payable,
  dueDate,
  onDueDateChange,
  canManage = true,
  refundOnly = false,
  notice,
}) {
  // { mode: "pay" | "refund" | "edit", row? }
  const [form, setForm] = useState(null);

  const paid = draft.netPaid;
  const remaining = (Number(payable) || 0) - paid;
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
      icon={Wallet}
      title="پرداخت‌ها"
      action={
        <>
          {draft.hasChanges && (
            <StatusBadge tone="info" size="sm">
              {formatNumber(draft.count)} ثبت‌نشده
            </StatusBadge>
          )}
          {canAdd && !refundOnly && (
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setForm({ mode: "pay" })}>
              <Plus className="size-3.5" />
              {side.payLabel}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {form && (
          <PaymentForm
            key={form.row?.id ?? form.mode}
            mode={form.mode}
            title={formTitle}
            row={form.row}
            remaining={remaining}
            paid={paid}
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
            <p className="rounded-lg border border-dashed border-border py-5 text-center text-xs text-muted-foreground">
              هنوز پرداختی ثبت نشده است.
            </p>
          )
        )}

        {notice && <p className="text-xs leading-5 text-muted-foreground">{notice}</p>}

        {onDueDateChange && (remaining > 0 || dueDate) && (
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="ledger-due" className="flex flex-1 items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden />
              سررسیدِ مانده
            </Label>
            <div className="w-40">
              <PersianDatePicker
                id="ledger-due"
                value={dueDate || ""}
                onChange={(isoDate) => onDueDateChange(isoDate || null)}
                placeholder="بدون سررسید"
                disabled={!canManage}
              />
            </div>
          </div>
        )}

        {canAdd && paid > 0 && (
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
      </div>
    </SectionCard>
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
function PaymentForm({ mode, title, row, remaining, paid, onCancel, onSubmit }) {
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

  const confirm = () => {
    const moneyRows = liveRows(resolvedRows(value, payable, PaymentTypeEnum.CASH)).map((entry) => ({
      type: entry.type,
      amount: entry.amount,
      paidAt: entry.paidAt || undefined,
      checkNumber: entry.checkNumber,
      transferRef: entry.transferRef,
    }));
    if (moneyRows.length === 0) return setError("مبلغ باید بیشتر از صفر باشد");
    if (isRefund && rowsTotal(moneyRows) > paid) {
      return setError(`پول برگشتی نمی‌تواند بیشتر از ${formatRial(paid)} باشد`);
    }
    onSubmit(moneyRows);
  };

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/3 p-3">
      <p className="text-sm font-medium">{title}</p>
      <PaymentMethodEditor
        value={value}
        onChange={(next) => {
          setValue(next);
          setError(null);
        }}
        payable={payable}
        fallbackMethod={PaymentTypeEnum.CASH}
        methods={isEdit || isRefund ? ROW_PAYMENT_TYPES : [...ROW_PAYMENT_TYPES, PaymentTypeEnum.MIXED]}
        error={error}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" className="flex-1" onClick={confirm}>
          {isEdit ? "اعمالِ اصلاح" : "افزودن به پرداخت‌ها"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  );
}
