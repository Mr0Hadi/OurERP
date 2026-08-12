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
 *
 * props: formData, onFormChange, errors
 */
export default function OrderInfoSection({
  formData,
  onFormChange,
  errors,
}) {
  const handleChange = (field, value) => {
    onFormChange({ [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات فاکتور
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            placeholder="مثال: INV-1023"
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
            htmlFor="dueDate"
            className="text-sm font-medium text-card-foreground"
          >
            تاریخ سررسید
          </Label>
          <PersianDatePicker
            id="dueDate"
            value={formData.dueDate}
            onChange={(isoDate) => handleChange("dueDate", isoDate)}
            placeholder="مثال: ۱۴۰۵/۰۵/۰۲"
          />
        </div>

        {/* توضیحات */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label
            htmlFor="description"
            className="text-sm font-medium text-card-foreground"
          >
            توضیحات
          </Label>
          <Textarea
            id="description"
            placeholder="یادداشت یا توضیحات اضافه..."
            rows={3}
            value={formData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            className="input-rtl-placeholder resize-none text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
