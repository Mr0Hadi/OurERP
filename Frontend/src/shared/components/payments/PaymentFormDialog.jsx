import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import FormField from "@/shared/components/forms/FormField";
import { Input } from "@/shared/components/ui/input";
import { PriceInput } from "@/shared/components/ui/price-input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import {
  PaymentTypeEnum,
  PAYMENT_TYPE_LABELS,
  PAYMENT_REFERENCE_FIELDS,
} from "@/shared/domain/enums/paymentType";
import { toDateOnly } from "@/shared/lib/dateUtils";
import { numberToPersianWords } from "@/shared/lib/numberToPersianWords";

/**
 * روش‌هایی که یک *ردیفِ* پرداخت می‌تواند داشته باشد. «ترکیبی» و «اقساطی»
 * روی ردیف ۴۰۰ می‌گیرند؛ پرداختِ ترکیبی یعنی چند ردیف.
 */
const PAYMENT_ROW_TYPES = [
  PaymentTypeEnum.CASH,
  PaymentTypeEnum.CREDIT,
  PaymentTypeEnum.CHECK,
  PaymentTypeEnum.TRANSFER,
];

const emptyValues = (initial) => ({
  type: initial?.type ?? PaymentTypeEnum.CASH,
  amount: initial?.amount ?? null,
  paidAt: toDateOnly(initial?.paidAt) || "",
  checkNumber: initial?.checkNumber || "",
  transferRef: initial?.transferRef || "",
});

/**
 * ثبت یا اصلاحِ یک ردیفِ پرداخت.
 *
 * `initial` پر یعنی اصلاح: سرور ردیفِ قبلی را باطل و ردیفِ تازه‌ای با
 * همان جهت ثبت می‌کند، پس جهت اینجا قابل تغییر نیست. عنوان و توضیح
 * (پرداخت یا پولِ برگشتی) را فراخوان می‌دهد.
 *
 * دیالوگ فقط بعد از موفقیتِ درخواست بسته می‌شود (`onSubmit(values, close)`)
 * تا اگر سرور رد کرد، ورودیِ کاربر از دست نرود.
 */
export default function PaymentFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  maxAmount,
  isPending,
  onSubmit,
}) {
  const [values, setValues] = useState(() => emptyValues(initial));
  const [showErrors, setShowErrors] = useState(false);

  // هر بار که دیالوگ با ردیفِ دیگری باز می‌شود، فرم از نو پر می‌شود.
  const [openedFor, setOpenedFor] = useState(null);
  const key = open ? (initial?.id ?? "new") : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    setValues(emptyValues(initial));
    setShowErrors(false);
  }

  const set = (patch) => setValues((prev) => ({ ...prev, ...patch }));
  const amount = Number(values.amount) || 0;
  const reference = PAYMENT_REFERENCE_FIELDS[values.type];

  const amountError = !showErrors
    ? null
    : amount <= 0
      ? "مبلغ باید بیشتر از صفر باشد"
      : maxAmount != null && amount > maxAmount
        ? `مبلغ نمی‌تواند بیشتر از ${maxAmount.toLocaleString("fa-IR")} ریال باشد`
        : null;

  const close = () => onOpenChange(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isPending) return;
    if (amount <= 0 || (maxAmount != null && amount > maxAmount)) {
      setShowErrors(true);
      return;
    }
    onSubmit(
      {
        type: values.type,
        amount,
        paidAt: values.paidAt || undefined,
        checkNumber:
          values.type === PaymentTypeEnum.CHECK
            ? values.checkNumber || undefined
            : undefined,
        transferRef:
          values.type === PaymentTypeEnum.TRANSFER
            ? values.transferRef || undefined
            : undefined,
      },
      close,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !isPending && onOpenChange(next)}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
            <FormField label="روش پرداخت" htmlFor="payment-type" required>
              <Select
                value={String(values.type)}
                onValueChange={(value) => set({ type: Number(value) })}
                disabled={isPending}
              >
                <SelectTrigger id="payment-type" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_ROW_TYPES.map((type) => (
                    <SelectItem key={type} value={String(type)}>
                      {PAYMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="تاریخ"
              htmlFor="payment-paid-at"
              hint="خالی یعنی همین حالا"
            >
              <PersianDatePicker
                id="payment-paid-at"
                value={values.paidAt}
                onChange={(isoDate) => set({ paidAt: isoDate || "" })}
                disabled={isPending}
              />
            </FormField>

            <FormField
              label="مبلغ (ریال)"
              htmlFor="payment-amount"
              required
              error={amountError ? { message: amountError } : undefined}
              hint={
                amount > 0
                  ? numberToPersianWords(amount / 10, { suffix: "تومان" })
                  : undefined
              }
              className="space-y-1.5 sm:col-span-2"
            >
              <PriceInput
                id="payment-amount"
                min={0}
                value={values.amount}
                onValueChange={(next) => set({ amount: next ?? null })}
                disabled={isPending}
                className="h-9"
              />
            </FormField>

            {reference && (
              <FormField
                label={reference.label}
                htmlFor="payment-reference"
                className="space-y-1.5 sm:col-span-2"
              >
                <Input
                  id="payment-reference"
                  dir="ltr"
                  className="h-9"
                  value={values[reference.field]}
                  onChange={(event) =>
                    set({ [reference.field]: event.target.value })
                  }
                  disabled={isPending}
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isPending}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "در حال ثبت..." : initial ? "ثبت اصلاح" : "ثبت"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
