import { Input } from "@/shared/components/ui/input";
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
import FormField from "./FormField";

const KIND_OPTIONS = [
  { value: "proforma", label: "پیش‌فاکتور" },
  { value: "invoice", label: "فاکتور" },
];

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
 * @param showInvoiceDate تاریخِ فاکتور پیش از صدور (پیش‌فرض بله). فروش آن را نمی‌خواهد: سرور با صدور
 *   تاریخ می‌گذارد.
 * @param showDueDate سررسید حتی روی پیش‌فاکتور (پیش‌فرض فقط فاکتور) — در فروش جزوِ شرایطِ پیش‌فاکتور است.
 * @param status `{ value, options: [{ value, label }], onChange, hint? }` — با یک گزینه (فقط وضعیتِ
 *   فعلی) به‌جای منو فقط‌خواندنی است. `hint` (متن یا عنصر) زیرِ فیلد: قدمِ بعدی.
 * @param children انتخاب‌های اضافه‌ی هر سمت زیرِ «نوع سند» (فروش: شیوه‌ی پرداخت)
 */
export default function OrderInfoCard({
  issued = false,
  kind,
  onKindChange,
  kindNote,
  showInvoiceDate = true,
  showDueDate,
  withNumber = false,
  formData,
  onFormChange,
  errors = {},
  status,
  headerAction,
  children,
}) {
  const isInvoice = issued || kind === "invoice";
  const dueDateVisible = showDueDate ?? isInvoice;
  const invoiceDateVisible = isInvoice && (issued || showInvoiceDate);
  const showStatus = Boolean(status);
  const statusLabel = status?.options.find((option) => Number(option.value) === Number(status.value))?.label;

  return (
    <SectionCard title="اطلاعات فاکتور" action={headerAction}>
      {onKindChange && (
        <div className="space-y-1">
          <StatusChoice label="نوع سند" options={KIND_OPTIONS} value={kind} onChange={onKindChange} disabled={Boolean(kindNote)} />
          {kindNote && <p className="text-xs text-muted-foreground">{kindNote}</p>}
        </div>
      )}
      {children}

      {(isInvoice || dueDateVisible) && (
        <div className="grid grid-cols-2 gap-3">
          {(withNumber || issued) && (
            <FormField size="sm" label="شماره فاکتور" required={!issued} htmlFor="invoiceNumber" error={errors.invoiceNumber} className={issued ? undefined : "space-y-1.5 col-span-2"}>
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
            </FormField>
          )}
          {invoiceDateVisible && (
          <FormField size="sm" label="تاریخ فاکتور" required={!issued} htmlFor="invoiceDate" error={errors.invoiceDate}>
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
          </FormField>
          )}
          {dueDateVisible && (
          <FormField size="sm" label="سررسید پرداخت" htmlFor="paymentDate" className={invoiceDateVisible ? undefined : "space-y-1.5 col-span-2"}>
            <PersianDatePicker
              id="paymentDate"
              value={formData.paymentDate || ""}
              onChange={(isoDate) => onFormChange({ paymentDate: isoDate || null })}
              placeholder="بدون سررسید"
              disabled={!onFormChange}
            />
          </FormField>
          )}
          {showStatus && (
            <FormField size="sm" label="وضعیت" className="space-y-1.5 col-span-2">
              {status.options.length > 1 ? (
                // `key`: وقتی وضعیت و گزینه‌ها با هم عوض می‌شوند (مثلاً پس از ارسالِ انبار) منو از نو ساخته
                // شود — Radix برچسبِ گزینه‌ی تازه را پیدا نمی‌کرد و فیلد خالی می‌ماند. برچسب صریح هم داده می‌شود.
                <Select
                  key={status.options.map((option) => option.value).join(",")}
                  value={String(status.value)}
                  onValueChange={(next) => status.onChange(Number(next))}
                >
                  <SelectTrigger className="h-9! w-full">
                    <SelectValue>{statusLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {status.options.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <ReadOnlyValue>{statusLabel}</ReadOnlyValue>
              )}
              {status.hint && <div className="text-xs leading-5 text-muted-foreground">{status.hint}</div>}
            </FormField>
          )}
        </div>
      )}

      {issued ? (
        formData.description && (
          <FormField size="sm" label="توضیحات">
            <p className="whitespace-pre-line text-sm text-muted-foreground">{formData.description}</p>
          </FormField>
        )
      ) : (
        <FormField size="sm" label="توضیحات" htmlFor="description">
          <Textarea
            id="description"
            placeholder="اختیاری"
            rows={2}
            value={formData.description || ""}
            onChange={(e) => onFormChange({ description: e.target.value })}
            className="input-rtl-placeholder resize-none text-sm"
          />
        </FormField>
      )}
    </SectionCard>
  );
}
