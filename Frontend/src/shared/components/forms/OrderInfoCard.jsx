import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import SectionCard from "@/shared/components/forms/SectionCard";
import StatusChoice from "./StatusChoice";
import { gregorianToPersian } from "@/shared/lib/dateUtils";

const KIND_OPTIONS = [
  { value: "proforma", label: "پیش‌فاکتور" },
  { value: "invoice", label: "فاکتور" },
];

function Field({ label, required, htmlFor, error, children, className }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ReadOnlyValue({ children }) {
  return <p className="flex h-9 items-center text-sm font-medium">{children || "—"}</p>;
}

/**
 * اطلاعاتِ فاکتور — نوعِ سند، شماره، تاریخ، سررسید، وضعیت و توضیحات؛ یک کارت
 * در ثبتِ تازه، ویرایشِ پیش‌فاکتور و فاکتورِ صادرشده.
 *
 *  - پیش‌فاکتور: شماره، تاریخ و سررسید ندارد (دیده نمی‌شوند).
 *  - فاکتور: تاریخ الزامی؛ در خرید شماره‌ی فاکتورِ تامین‌کننده هم (`withNumber`)،
 *    در فروش شماره را سیستم می‌سازد.
 *  - صادرشده (`issued`): شماره، تاریخ و توضیحات فقط نمایش؛ سررسید و وضعیت
 *    عوض می‌شوند (تا دکمه‌ی اصلی ذخیره نمی‌شوند).
 *
 * @param kind/onKindChange «پیش‌فاکتور / فاکتور» (فقط پیش از صدور)
 * @param status `{ value, options: [{ value, label }], onChange }` — با یک گزینه
 *   (فقط وضعیتِ فعلی) فیلد دیده نمی‌شود.
 */
export default function OrderInfoCard({
  issued = false,
  kind,
  onKindChange,
  kindNote,
  withNumber = false,
  formData,
  onFormChange,
  errors = {},
  status,
  headerAction,
}) {
  const isInvoice = issued || kind === "invoice";
  const showStatus = status && status.options.length > 1;

  return (
    <SectionCard title="اطلاعات فاکتور" action={headerAction}>
      {onKindChange && (
        <div className="space-y-1">
          <StatusChoice label="نوع سند" options={KIND_OPTIONS} value={kind} onChange={onKindChange} disabled={Boolean(kindNote)} />
          {kindNote && <p className="text-xs text-muted-foreground">{kindNote}</p>}
        </div>
      )}

      {isInvoice && (
        <div className="grid grid-cols-2 gap-3">
          {(withNumber || issued) && (
            <Field label="شماره فاکتور" required={!issued} htmlFor="invoiceNumber" error={errors.invoiceNumber} className={issued ? undefined : "col-span-2"}>
              {issued ? (
                <ReadOnlyValue>{formData.invoiceNumber}</ReadOnlyValue>
              ) : (
                <Input
                  id="invoiceNumber"
                  placeholder="شماره‌ی فاکتورِ تامین‌کننده"
                  value={formData.invoiceNumber || ""}
                  onChange={(e) => onFormChange({ invoiceNumber: e.target.value })}
                  aria-invalid={Boolean(errors.invoiceNumber)}
                  className="input-rtl-placeholder h-9"
                />
              )}
            </Field>
          )}
          <Field label="تاریخ فاکتور" required={!issued} htmlFor="invoiceDate" error={errors.invoiceDate}>
            {issued ? (
              <ReadOnlyValue>{gregorianToPersian(formData.invoiceDate)}</ReadOnlyValue>
            ) : (
              <PersianDatePicker
                id="invoiceDate"
                value={formData.invoiceDate || ""}
                onChange={(isoDate) => onFormChange({ invoiceDate: isoDate })}
                placeholder="انتخاب تاریخ"
                error={Boolean(errors.invoiceDate)}
              />
            )}
          </Field>
          <Field label="سررسید پرداخت" htmlFor="paymentDate">
            <PersianDatePicker
              id="paymentDate"
              value={formData.paymentDate || ""}
              onChange={(isoDate) => onFormChange({ paymentDate: isoDate || null })}
              placeholder="بدون سررسید"
              disabled={!onFormChange}
            />
          </Field>
          {showStatus && (
            <Field label="وضعیت" className="col-span-2">
              <Select value={String(status.value)} onValueChange={(next) => status.onChange(Number(next))}>
                <SelectTrigger className="h-9! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {status.options.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {status.hint && <p className="text-xs text-muted-foreground">{status.hint}</p>}
            </Field>
          )}
        </div>
      )}

      {issued ? (
        formData.description && (
          <Field label="توضیحات">
            <p className="whitespace-pre-line text-sm text-muted-foreground">{formData.description}</p>
          </Field>
        )
      ) : (
        <Field label="توضیحات" htmlFor="description">
          <Textarea
            id="description"
            placeholder="اختیاری"
            rows={2}
            value={formData.description || ""}
            onChange={(e) => onFormChange({ description: e.target.value })}
            className="input-rtl-placeholder resize-none text-sm"
          />
        </Field>
      )}
    </SectionCard>
  );
}
