import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";

/**
 * شماره و تاریخ فاکتور، سررسید و توضیحات — در فرم خرید و فروش یکسان است.
 */
export default function OrderInfoSection({
  formData,
  onFormChange,
  errors,
  // شماره فاکتور فروش را بکند می‌سازد؛ ورودی فقط نمایشی است.
  invoiceNumberDisabled = false,
}) {
  const handleChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات فاکتور
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* شماره فاکتور */}
        <div className="space-y-1.5">
          <Label
            htmlFor="invoiceNumber"
            className="text-sm font-medium text-card-foreground"
          >
            شماره فاکتور
          </Label>
          <Input
            id="invoiceNumber"
            placeholder={
              invoiceNumberDisabled
                ? "توسط سیستم ساخته می‌شود"
                : "مثال: INV-1023"
            }
            disabled={invoiceNumberDisabled}
            value={formData.invoiceNumber || ""}
            onChange={(e) => handleChange("invoiceNumber", e.target.value)}
            className={`input-rtl-placeholder h-9 ${
              errors?.invoiceNumber
                ? "border-destructive focus-visible:ring-destructive/30"
                : ""
            }`}
          />
          {errors?.invoiceNumber && (
            <p className="text-xs text-destructive">{errors.invoiceNumber}</p>
          )}
        </div>

        {/* تاریخ فاکتور */}
        <div className="space-y-1.5">
          <Label
            htmlFor="invoiceDate"
            className="text-sm font-medium text-card-foreground"
          >
            تاریخ فاکتور
          </Label>
          <PersianDatePicker
            id="invoiceDate"
            value={formData.invoiceDate}
            onChange={(isoDate) => handleChange("invoiceDate", isoDate)}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
            error={!!errors?.invoiceDate}
          />
          {errors?.invoiceDate && (
            <p className="text-xs text-destructive">{errors.invoiceDate}</p>
          )}
        </div>

        {/* تاریخ سررسید */}
        <div className="space-y-1.5">
          <Label
            htmlFor="paymentDate"
            className="text-sm font-medium text-card-foreground"
          >
            سررسید پرداخت
          </Label>
          <PersianDatePicker
            id="paymentDate"
            value={formData.paymentDate}
            onChange={(isoDate) => handleChange("paymentDate", isoDate)}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
          />
        </div>

        {/* توضیحات */}
        <div className="space-y-1.5 sm:col-span-3">
          <Label
            htmlFor="description"
            className="text-sm font-medium text-card-foreground"
          >
            توضیحات
          </Label>
          <Textarea
            id="description"
            placeholder="یادداشت یا توضیحات اضافه..."
            rows={2}
            value={formData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            className="input-rtl-placeholder resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
