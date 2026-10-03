import { useState } from "react";
import { Ban, Pencil, Plus, RotateCcw, Undo2, Wallet } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import StatusBadge from "@/shared/components/status/StatusBadge";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import {
  PaymentTypeEnum,
  PAYMENT_TYPE_LABELS,
  PAYMENT_REFERENCE_FIELDS,
} from "@/shared/domain/enums/paymentType";
import {
  PaymentDirectionEnum,
  PaymentPurposeEnum,
} from "@/shared/domain/enums/paymentDirection";
import { gregorianToPersian, toDateOnly } from "@/shared/lib/dateUtils";
import { formatRial } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * روش‌هایی که یک *ردیفِ* پرداخت می‌تواند داشته باشد — هر ردیف پولی است که
 * واقعاً جابه‌جا شد. «نسیه» یعنی ردیفی نیست؛ «ترکیبی» یعنی چند ردیف.
 */
const ROW_TYPES = [PaymentTypeEnum.CASH, PaymentTypeEnum.CHECK, PaymentTypeEnum.TRANSFER];

const PENDING_BADGES = {
  add: { tone: "info", label: "ثبت می‌شود" },
  edit: { tone: "warning", label: "اصلاح می‌شود" },
  void: { tone: "danger", label: "باطل می‌شود" },
};

/**
 * پرداخت‌ها و مهلتِ پرداختِ یک سند در یک کارت — جای «پرداخت‌ها» و «مهلت
 * پرداخت»ِ جدا.
 *
 * هیچ چیز همان لحظه ذخیره نمی‌شود: افزودن، اصلاح و ابطال در پیش‌نویس
 * (`usePaymentDraft`) می‌مانند و با دکمه‌ی «ثبت تغییرات»ِ صفحه اعمال
 * می‌شوند. ردیفِ در انتظار برچسب دارد و برگشت‌پذیر است.
 *
 * مبلغِ پرداختِ تازه با باقیمانده پر می‌شود (پول برگشتی: با اضافه‌پرداخت).
 *
 * @param draft          خروجیِ `usePaymentDraft`
 * @param side           `{ direction, payLabel, refundLabel }`
 * @param payableAmount  بدهیِ واقعیِ طرف (خرید: منهای قلم‌های بسته‌شده؛ اقساطی: با سود)
 * @param dueDate/onDueDateChange  مهلتِ پرداخت؛ بی `onDueDateChange` دیده نمی‌شود
 * @param refundOnly     سندِ لغوشده: فقط پولِ برگشتی
 * @param allowRefund    `false` برای سندِ تازه
 */
export default function DocumentPaymentsEditor({
  draft,
  side,
  totalAmount,
  payableAmount,
  dueDate,
  onDueDateChange,
  canManage = true,
  refundOnly = false,
  // سندِ تازه پولی نگرفته که برگردد.
  allowRefund = true,
  notice,
  disabled = false,
}) {
  // { mode: "pay" | "refund" | "edit", row? }
  const [form, setForm] = useState(null);

  const total = Number(totalAmount) || 0;
  const payable = payableAmount != null ? Number(payableAmount) || 0 : total;
  const paid = draft.netPaid;
  const remaining = payable - paid;
  const refundDirection =
    side.direction === PaymentDirectionEnum.IN ? PaymentDirectionEnum.OUT : PaymentDirectionEnum.IN;

  const sorted = [...draft.rows].sort(
    (a, b) =>
      (a.pending === "add") - (b.pending === "add") ||
      String(a.paidAt ?? "").localeCompare(String(b.paidAt ?? "")),
  );

  const submitForm = (values) => {
    if (form?.mode === "edit") draft.edit(form.row.id, { ...values, direction: form.row.direction });
    else draft.add({ ...values, direction: form?.mode === "refund" ? refundDirection : side.direction });
    setForm(null);
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          پرداخت‌ها
        </CardTitle>
        {draft.hasChanges && (
          <CardAction>
            <StatusBadge tone="info" size="sm">
              {draft.count.toLocaleString("fa-IR")} تغییرِ ثبت‌نشده
            </StatusBadge>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 border border-border p-3 text-sm">
          <dt className="text-muted-foreground">جمع فاکتور</dt>
          <dd className="text-left tabular-nums">{formatRial(total)}</dd>
          {payable !== total && (
            <>
              <dt className="text-muted-foreground">قابل پرداخت</dt>
              <dd className="text-left tabular-nums">{formatRial(payable)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">پرداخت‌شده</dt>
          <dd className="text-left tabular-nums">{formatRial(paid)}</dd>
          <dt className="font-medium">{remaining < 0 ? "اضافه پرداخت" : "مانده"}</dt>
          <dd
            className={cn(
              "text-left tabular-nums font-semibold",
              toneText(remaining > 0 ? "danger" : "success"),
            )}
          >
            {formatRial(Math.abs(remaining))}
          </dd>
        </dl>

        {onDueDateChange && (
          <div className="flex items-center gap-2">
            <Label htmlFor="payment-due-date" className="text-xs text-muted-foreground shrink-0">
              سررسید پرداخت
            </Label>
            <PersianDatePicker
              id="payment-due-date"
              value={dueDate || ""}
              onChange={(isoDate) => onDueDateChange(isoDate || null)}
              placeholder="بدون سررسید"
              disabled={!canManage || disabled}
            />
          </div>
        )}

        {sorted.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.map((row) => (
              <PaymentRow
                key={row.id}
                row={row}
                isRefund={row.direction === refundDirection}
                manageable={
                  canManage &&
                  !disabled &&
                  !row.voidedAt &&
                  (row.purpose ?? PaymentPurposeEnum.NORMAL) === PaymentPurposeEnum.NORMAL
                }
                onEdit={() => setForm({ mode: "edit", row })}
                onVoid={() => draft.void(row.id)}
                onUndo={() => draft.undo(row.id)}
              />
            ))}
          </ul>
        )}

        {notice && <p className="text-xs text-muted-foreground">{notice}</p>}

        {form ? (
          <PaymentRowForm
            key={form.row?.id ?? form.mode}
            title={
              form.mode === "edit" ? "اصلاحِ پرداخت" : form.mode === "refund" ? side.refundLabel : side.payLabel
            }
            initial={
              form.mode === "edit"
                ? form.row
                : {
                    type: PaymentTypeEnum.CASH,
                    amount:
                      form.mode === "refund"
                        ? Math.max(0, -remaining) || null
                        : Math.max(0, remaining) || null,
                  }
            }
            maxAmount={form.mode === "refund" ? Math.max(0, paid) : undefined}
            onCancel={() => setForm(null)}
            onSubmit={submitForm}
          />
        ) : (
          canManage &&
          !disabled && (
            <div className="flex flex-wrap gap-2">
              {!refundOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => setForm({ mode: "pay" })}
                >
                  <Plus className="h-4 w-4" />
                  {side.payLabel}
                </Button>
              )}
              {allowRefund && paid > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="flex-1 gap-1.5"
                  onClick={() => setForm({ mode: "refund" })}
                >
                  <Undo2 className="h-4 w-4" />
                  {side.refundLabel}
                </Button>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

function PaymentRow({ row, isRefund, manageable, onEdit, onVoid, onUndo }) {
  const voided = Boolean(row.voidedAt) || row.pending === "void";
  const reference = row.checkNumber || row.transferRef;
  const badge = PENDING_BADGES[row.pending];

  return (
    <li className={cn("flex items-center gap-2 px-3 py-2 text-sm", row.pending && "bg-primary/3")}>
      <div className={cn("flex-1 min-w-0 space-y-0.5", voided && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("font-medium tabular-nums", voided && "line-through")}>
            {formatRial(row.amount)}
          </span>
          <span className="text-xs text-muted-foreground">
            {PAYMENT_TYPE_LABELS[row.type] ?? row.type}
          </span>
          {isRefund && <StatusBadge tone="info" size="sm">برگشتی</StatusBadge>}
          {(row.purpose ?? PaymentPurposeEnum.NORMAL) !== PaymentPurposeEnum.NORMAL && (
            <StatusBadge tone="special" size="sm">اقساط</StatusBadge>
          )}
          {row.voidedAt && <StatusBadge tone="danger" size="sm">باطل‌شده</StatusBadge>}
          {badge && <StatusBadge tone={badge.tone} size="sm">{badge.label}</StatusBadge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {row.paidAt ? gregorianToPersian(row.paidAt) : "همان روزِ ثبت"}
          {reference && <span dir="ltr"> · {reference}</span>}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        {row.pending && row.pending !== "add" ? (
          <Button type="button" size="icon-sm" variant="ghost" aria-label="برگرداندنِ تغییر" onClick={onUndo}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        ) : (
          manageable && (
            <>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="اصلاح پرداخت" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                aria-label={row.pending === "add" ? "حذفِ این ردیف" : "ابطال پرداخت"}
                onClick={onVoid}
              >
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </>
          )
        )}
      </div>
    </li>
  );
}

/** فرمِ درجای یک ردیفِ پرداخت (افزودن یا اصلاح). */
function PaymentRowForm({ title, initial, maxAmount, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => ({
    type: initial?.type ?? PaymentTypeEnum.CASH,
    amount: initial?.amount ?? null,
    paidAt: toDateOnly(initial?.paidAt) || "",
    checkNumber: initial?.checkNumber || "",
    transferRef: initial?.transferRef || "",
  }));
  const [showErrors, setShowErrors] = useState(false);
  const set = (patch) => setValues((current) => ({ ...current, ...patch }));

  const amount = Number(values.amount) || 0;
  const reference = PAYMENT_REFERENCE_FIELDS[values.type];
  const amountError =
    amount <= 0
      ? "مبلغ باید بیشتر از صفر باشد"
      : maxAmount != null && amount > maxAmount
        ? `مبلغ نمی‌تواند بیشتر از ${formatRial(maxAmount)} باشد`
        : null;

  const submit = () => {
    if (amountError) {
      setShowErrors(true);
      return;
    }
    onSubmit({ ...values, amount, paidAt: values.paidAt || undefined });
  };

  return (
    <div className="space-y-2.5 rounded-lg border border-primary/30 bg-primary/3 p-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">روش</Label>
          <Select value={String(values.type)} onValueChange={(next) => set({ type: Number(next) })}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROW_TYPES.map((type) => (
                <SelectItem key={type} value={String(type)}>
                  {PAYMENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">تاریخ</Label>
          <PersianDatePicker
            value={values.paidAt}
            onChange={(isoDate) => set({ paidAt: isoDate || "" })}
            placeholder="امروز"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">مبلغ (ریال)</Label>
          <PriceInput
            min={0}
            value={values.amount}
            onValueChange={(next) => set({ amount: next })}
            className="h-9"
          />
          {showErrors && amountError ? (
            <p className="text-xs text-destructive">{amountError}</p>
          ) : (
            <AmountInWords rial={values.amount} />
          )}
        </div>
        {reference && (
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">{reference.label}</Label>
            <Input
              dir="ltr"
              value={values[reference.field]}
              onChange={(e) => set({ [reference.field]: e.target.value })}
              className="h-9"
            />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="flex-1" onClick={submit}>
          {initial?.id ? "اعمالِ اصلاح" : "افزودن"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </div>
  );
}
