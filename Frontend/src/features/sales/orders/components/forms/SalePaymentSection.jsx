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
import PaymentSummary from "@/shared/components/forms/PaymentSummary";
import SaleMixedPaymentList from "./SaleMixedPaymentList";

const PAYMENT_TYPES = [
  { value: "cash", label: "نقدی" },
  { value: "credit", label: "نسیه" },
  { value: "check", label: "چک" },
  { value: "transfer", label: "انتقال بانکی" },
  { value: "mixed", label: "ترکیبی" },
];

const EMPTY_MIXED_PAYMENT = {
  type: "cash",
  amount: "",
  checkNumber: "",
  transferRef: "",
};

/**
 * props: formData, onFormChange, totalAmount, errors
 */
export default function SalePaymentSection({
  formData,
  onFormChange,
  totalAmount = 0,
  errors,
}) {
  const handleChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  const paymentType = formData.paymentType || "cash";
  const mixedPayments = formData.mixedPayments || [];

  const paidAmountMixed = mixedPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );

  const paidAmount =
    paymentType === "mixed"
      ? paidAmountMixed
      : Number(formData.paidAmount) || 0;

  // تغییر نوع پرداخت، فیلدهای مربوط به روش قبلی را پاک می‌کند.
  const handlePaymentTypeChange = (val) => {
    handleChange("paymentType", val);
    onFormChange({
      mixedPayments: val === "mixed" ? [{ ...EMPTY_MIXED_PAYMENT }] : [],
      paidAmount: "",
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

  const updateMixedPayment = (index, field, value) => {
    const updated = [...mixedPayments];
    updated[index] = { ...updated[index], [field]: value };
    onFormChange({ mixedPayments: updated });
  };

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
          isCredit={paymentType === "credit"}
        />

        {/* نوع پرداخت */}
        <div className="space-y-1.5">
          <Label className="text-card-foreground text-sm font-medium">
            نوع پرداخت
          </Label>
          <Select value={paymentType} onValueChange={handlePaymentTypeChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {paymentType === "mixed" && (
          <SaleMixedPaymentList
            mixedPayments={mixedPayments}
            onAdd={addMixedPayment}
            onRemove={removeMixedPayment}
            onChange={updateMixedPayment}
          />
        )}

        {/* مبلغ پرداختی (غیر از نسیه و ترکیبی) */}
        {paymentType !== "credit" && paymentType !== "mixed" && (
          <div className="space-y-1.5">
            <Label
              htmlFor="paidAmount"
              className="text-card-foreground text-sm font-medium"
            >
              مبلغ پرداختی (ریال)
            </Label>
            <Input
              id="paidAmount"
              type="number"
              dir="ltr"
              min={0}
              placeholder="صفر"
              value={formData.paidAmount || ""}
              onChange={(e) => handleChange("paidAmount", e.target.value)}
              className={`h-9 input-rtl-placeholder ${
                errors?.paidAmount
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : ""
              }`}
            />
            {errors?.paidAmount && (
              <p className="text-xs text-destructive">{errors.paidAmount}</p>
            )}
          </div>
        )}

        {/* شماره چک */}
        {paymentType === "check" && (
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

        {/* شماره پیگیری */}
        {paymentType === "transfer" && (
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
