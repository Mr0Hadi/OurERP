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

const PROFORMA_PLACEHOLDER = "در پیش‌فاکتور ثبت نمی‌شود";

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      {" "}*
    </span>
  );
}

/**
 * شماره و تاریخ فاکتور و توضیحات — در فرم خرید و فروش یکسان است.
 *
 * پیش‌فاکتور شماره و تاریخِ فاکتور ندارد (`proforma`: هر دو غیرفعال)؛ در
 * فاکتور تاریخ الزامی است و شماره فقط در خرید (شماره‌ی فاکتورِ تامین‌کننده) —
 * شماره‌ی فاکتورِ فروش را بکند می‌سازد (`invoiceNumberDisabled`).
 * سررسیدِ پرداخت در کارتِ پرداخت‌هاست.
 */
export default function OrderInfoSection({
  formData,
  onFormChange,
  errors,
  proforma = false,
  invoiceNumberDisabled = false,
}) {
  const handleChange = (field, value) => onFormChange({ [field]: value });
  const numberRequired = !proforma && !invoiceNumberDisabled;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-card-foreground">
          اطلاعات فاکتور
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="invoiceNumber" className="text-sm font-medium text-card-foreground">
            شماره فاکتور
            {numberRequired && <RequiredMark />}
          </Label>
          <Input
            id="invoiceNumber"
            placeholder={
              proforma
                ? PROFORMA_PLACEHOLDER
                : invoiceNumberDisabled
                  ? "توسط سیستم ساخته می‌شود"
                  : "شماره‌ی فاکتورِ تامین‌کننده"
            }
            disabled={proforma || invoiceNumberDisabled}
            value={proforma ? "" : formData.invoiceNumber || ""}
            onChange={(e) => handleChange("invoiceNumber", e.target.value)}
            aria-invalid={Boolean(errors?.invoiceNumber)}
            className={`input-rtl-placeholder h-9 ${
              errors?.invoiceNumber ? "border-destructive focus-visible:ring-destructive/30" : ""
            }`}
          />
          {errors?.invoiceNumber && (
            <p className="text-xs text-destructive">{errors.invoiceNumber}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoiceDate" className="text-sm font-medium text-card-foreground">
            تاریخ فاکتور
            {!proforma && <RequiredMark />}
          </Label>
          <PersianDatePicker
            id="invoiceDate"
            value={proforma ? "" : formData.invoiceDate}
            onChange={(isoDate) => handleChange("invoiceDate", isoDate)}
            placeholder={proforma ? PROFORMA_PLACEHOLDER : "مثال: ۱۴۰۵/۰۵/۰۲"}
            disabled={proforma}
            error={Boolean(errors?.invoiceDate)}
          />
          {errors?.invoiceDate && (
            <p className="text-xs text-destructive">{errors.invoiceDate}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description" className="text-sm font-medium text-card-foreground">
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
