import { useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PriceInput } from "@/shared/components/ui/price-input";
import PaymentSummary from "@/shared/components/forms/PaymentSummary";
import MixedPaymentList from "@/shared/components/forms/MixedPaymentList";
import { useSyncedComputedValue } from "@/shared/hooks/useSyncedComputedValue";
import {
  PaymentTypeEnum,
  PAYMENT_TYPE_LABELS,
  DOCUMENT_PAYMENT_TYPES,
} from "@/shared/domain/enums/paymentType";
import { numberToPersianWords } from "@/shared/lib/number-to-persian-words";

/**
 * بخش پرداختِ یک سند خرید یا فروش.
 *
 * خرید و فروش اینجا هیچ تفاوت منطقی ندارند — هر دو یک جمع کل دارند و
 * همان پنج روش پرداخت. قبلاً دو نسخه‌ی جداگانه بود (یکی ردیف‌های
 * ترکیبی را با id می‌شناخت و دیگری با اندیس) و هر اصلاحی باید دو بار
 * انجام می‌شد. حالا یکی است و ردیف‌ها با اندیس شناخته می‌شوند، همان
 * قراردادی که MixedPaymentList مشترک دارد.
 *
 * مبلغ پرداختی برای روش‌های تک‌مرحله‌ای، و برای ترکیبی تا وقتی فقط یک
 * ردیف هست، با جمع کل سند همگام می‌ماند — با هر تغییری در اقلام، نه
 * فقط لحظه‌ی انتخاب نوع پرداخت. به‌محض افزودن ردیف دوم، همگام‌سازی
 * متوقف می‌شود تا تقسیمِ دستیِ کاربر پاک نشود.
 */

const PAYMENT_TYPE_OPTIONS = DOCUMENT_PAYMENT_TYPES.map((value) => ({
  value,
  label: PAYMENT_TYPE_LABELS[value],
}));

// ردیف‌های ترکیبی با همان `PaymentTypeEnum`ِ سند شمرده می‌شوند، پس
// `mixedPayments` بی هیچ تبدیلی همان `paymentDetails`ِ سرور است.
const EMPTY_MIXED_PAYMENT = {
  type: PaymentTypeEnum.CASH,
  amount: "",
  checkNumber: "",
  transferRef: "",
};

const isSingleMethodType = (type) =>
  type !== PaymentTypeEnum.CREDIT && type !== PaymentTypeEnum.MIXED;

export default function OrderPaymentSection({
  formData,
  onFormChange,
  totalAmount = 0,
  errors,
  isProforma = false,
}) {
  const handleChange = (field, value) => onFormChange({ [field]: value });

  const paymentType = formData.paymentType ?? PaymentTypeEnum.CASH;
  const mixedPayments = formData.mixedPayments || [];

  const paidAmountMixed = mixedPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );

  const paidAmount =
    paymentType === PaymentTypeEnum.MIXED
      ? paidAmountMixed
      : Number(formData.paidAmount) || 0;

  useSyncedComputedValue(
    totalAmount,
    (value) => handleChange("paidAmount", String(value)),
    isSingleMethodType(paymentType) && !isProforma,
  );

  // پیش‌فاکتور هیچ پرداختی ندارد: مبلغ پرداختی صفر و قفل می‌شود. با خروج
  // از پیش‌فاکتور، مبلغ دوباره با جمع کل پر می‌شود — هوکِ همگام‌سازی فقط
  // با تغییرِ جمع کل اجرا می‌شود، نه با روشن‌شدنِ دوباره‌اش.
  const wasProforma = useRef(isProforma);
  useEffect(() => {
    if (isProforma) {
      if (formData.paidAmount !== "0") handleChange("paidAmount", "0");
    } else if (wasProforma.current && isSingleMethodType(paymentType)) {
      handleChange("paidAmount", String(totalAmount));
    }
    wasProforma.current = isProforma;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProforma]);

  useSyncedComputedValue(
    totalAmount,
    (value) =>
      onFormChange({
        mixedPayments: mixedPayments.map((part, i) =>
          i === 0 ? { ...part, amount: String(value) } : part,
        ),
      }),
    paymentType === PaymentTypeEnum.MIXED && mixedPayments.length === 1,
  );

  // تغییر نوع پرداخت، فیلدهای مربوط به روش قبلی را پاک می‌کند.
  const handlePaymentTypeChange = (rawValue) => {
    const value = Number(rawValue);
    const singleMethod = isSingleMethodType(value);
    onFormChange({
      paymentType: value,
      mixedPayments:
        value === PaymentTypeEnum.MIXED
          ? [{ ...EMPTY_MIXED_PAYMENT, amount: String(totalAmount) }]
          : [],
      paidAmount: isProforma ? "0" : singleMethod ? String(totalAmount) : "",
      checkNumber: "",
      transferRef: "",
    });
  };

  const addMixedPayment = () =>
    onFormChange({
      mixedPayments: [...mixedPayments, { ...EMPTY_MIXED_PAYMENT }],
    });

  const removeMixedPayment = (index) =>
    onFormChange({
      mixedPayments: mixedPayments.filter((_, i) => i !== index),
    });

  const updateMixedPayment = (index, field, value) =>
    onFormChange({
      mixedPayments: mixedPayments.map((part, i) =>
        i === index ? { ...part, [field]: value } : part,
      ),
    });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات پرداخت
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PaymentSummary
          totalAmount={totalAmount}
          paidAmount={paidAmount}
          isCredit={paymentType === PaymentTypeEnum.CREDIT}
        />

        <div className="space-y-1.5">
          <Label className="text-card-foreground text-sm font-medium">
            نوع پرداخت
          </Label>
          <Select value={String(paymentType)} onValueChange={handlePaymentTypeChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={String(t.value)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {paymentType === PaymentTypeEnum.MIXED && (
          <MixedPaymentList
            payments={mixedPayments}
            onAdd={addMixedPayment}
            onRemove={removeMixedPayment}
            onChange={updateMixedPayment}
          />
        )}

        {/* مبلغ پرداختی (غیر از نسیه و ترکیبی) */}
        {isSingleMethodType(paymentType) && (
          <div className="space-y-1.5">
            <Label
              htmlFor="paidAmount"
              className="text-card-foreground text-sm font-medium"
            >
              مبلغ پرداختی (ریال)
            </Label>
            <PriceInput
              id="paidAmount"
              min={0}
              placeholder="صفر"
              value={formData.paidAmount === "" || formData.paidAmount == null ? null : Number(formData.paidAmount)}
              onValueChange={(next) => handleChange("paidAmount", next ?? "")}
              disabled={isProforma}
              className={`h-9 ${
                errors?.paidAmount
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : ""
              }`}
            />
            {errors?.paidAmount ? (
              <p className="text-xs text-destructive">{errors.paidAmount}</p>
            ) : isProforma ? (
              <p className="text-xs text-muted-foreground">
                در وضعیت پیش‌فاکتور هیچ مبلغی پرداخت نشده است.
              </p>
            ) : (
              formData.paidAmount !== "" && formData.paidAmount != null && Number(formData.paidAmount) !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {numberToPersianWords(Number(formData.paidAmount) / 10, { suffix: "تومان" })}
                </p>
              )
            )}
          </div>
        )}

        {paymentType === PaymentTypeEnum.CHECK && (
          <div className="space-y-1.5">
            <Label
              htmlFor="checkNumber"
              className="text-card-foreground text-sm font-medium"
            >
              شماره چک
            </Label>
            <Input
              id="checkNumber"
              placeholder="شماره چک را وارد کنید"
              value={formData.checkNumber || ""}
              onChange={(e) => handleChange("checkNumber", e.target.value)}
              className="input-rtl-placeholder h-9"
              dir="ltr"
            />
          </div>
        )}

        {paymentType === PaymentTypeEnum.TRANSFER && (
          <div className="space-y-1.5">
            <Label
              htmlFor="transferRef"
              className="text-card-foreground text-sm font-medium"
            >
              شماره پیگیری
            </Label>
            <Input
              id="transferRef"
              placeholder="شماره پیگیری انتقال"
              value={formData.transferRef || ""}
              onChange={(e) => handleChange("transferRef", e.target.value)}
              className="input-rtl-placeholder h-9"
              dir="ltr"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
