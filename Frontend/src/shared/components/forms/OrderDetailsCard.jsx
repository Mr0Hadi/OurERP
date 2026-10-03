import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import SectionCard from "@/shared/components/documents/SectionCard";
import FileUploadList from "@/shared/components/files/FileUploadList";

function FieldError({ children }) {
  return children ? <p className="text-xs text-destructive">{children}</p> : null;
}

/**
 * مشخصاتِ سند و پیوست — یک کارت به‌جای «اطلاعات فاکتور» و «ضمیمه»ی جدا.
 *
 * فیلدی که در این مرحله معنا ندارد اصلاً دیده نمی‌شود (قبلاً غیرفعال با متنِ
 * «در پیش‌فاکتور ثبت نمی‌شود» می‌ماند): پیش‌فاکتور فقط توضیحات و پیوست دارد؛
 * فاکتور تاریخ (و در خرید شماره‌ی فاکتورِ تامین‌کننده) هم دارد.
 *
 * @param isInvoice     فاکتور یا پیش‌فاکتور
 * @param withNumber    شماره‌ی فاکتور را کاربر وارد می‌کند (خرید)؛ در فروش سیستم می‌سازد
 * @param extra         کنترلِ اضافه کنارِ تاریخ (وضعیتِ ارسالِ خرید)
 * @param attachments   خروجیِ `useInvoiceAttachments`
 */
export default function OrderDetailsCard({
  step,
  isInvoice,
  withNumber = false,
  formData,
  onFormChange,
  errors = {},
  extra,
  attachments,
  attachmentsLabel,
}) {
  return (
    <SectionCard
      step={step}
      title={isInvoice ? "مشخصاتِ فاکتور" : "توضیحات و پیوست"}
      description={
        isInvoice
          ? withNumber
            ? "شماره و تاریخِ فاکتوری که تامین‌کننده صادر کرده."
            : "شماره‌ی فاکتور را سیستم می‌سازد."
          : undefined
      }
    >
      <div className="space-y-4">
        {isInvoice && (
          <div className="grid gap-3 sm:grid-cols-2">
            {withNumber && (
              <div className="space-y-1.5">
                <Label htmlFor="invoiceNumber" className="text-xs">
                  شماره فاکتور <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invoiceNumber"
                  placeholder="شماره‌ی روی فاکتورِ تامین‌کننده"
                  value={formData.invoiceNumber || ""}
                  onChange={(e) => onFormChange({ invoiceNumber: e.target.value })}
                  aria-invalid={Boolean(errors.invoiceNumber)}
                  className="input-rtl-placeholder h-9"
                />
                <FieldError>{errors.invoiceNumber}</FieldError>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="invoiceDate" className="text-xs">
                تاریخ فاکتور <span className="text-destructive">*</span>
              </Label>
              <PersianDatePicker
                id="invoiceDate"
                value={formData.invoiceDate || ""}
                onChange={(isoDate) => onFormChange({ invoiceDate: isoDate })}
                placeholder="انتخاب تاریخ"
                error={Boolean(errors.invoiceDate)}
              />
              <FieldError>{errors.invoiceDate}</FieldError>
            </div>
            {extra && <div className="sm:col-span-2">{extra}</div>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs">
            توضیحات
          </Label>
          <Textarea
            id="description"
            placeholder="یادداشت برای این سند (اختیاری)"
            rows={2}
            value={formData.description || ""}
            onChange={(e) => onFormChange({ description: e.target.value })}
            className="input-rtl-placeholder resize-none text-sm"
          />
        </div>

        {attachments && (
          <FileUploadList
            list={attachments}
            title={attachmentsLabel}
            withNotes={false}
            emptyLabel="تصویر یا PDFِ برگه را اینجا اضافه کنید."
          />
        )}
      </div>
    </SectionCard>
  );
}
