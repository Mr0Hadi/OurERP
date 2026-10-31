import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { iranianBanks } from "@/shared/lib/iranian-bank";
import { cn } from "@/shared/lib/utils";

const BANK_LIST_ID = "cheque-bank-names";

/**
 * فیلدهای تکمیلیِ یک چک: تاریخِ روی چک (سررسید)، بانک و صاحب حساب — همه اختیاری؛ سررسیدِ خالی یعنی همان روزِ
 * ثبت. شماره‌ی چک جای خودش را در فرم دارد (`PAYMENT_REFERENCE_FIELDS`). نامِ بانک متنِ آزاد است با پیشنهادِ بانک‌ها.
 *
 * @param value    `{ checkDueDate, checkBankName, checkDrawerName }`
 * @param onChange `(patch) => void`
 * @param compact  بی برچسب (ردیفِ «ترکیبی»)؛ placeholder جای برچسب
 */
export default function ChequeFields({ value, onChange, idPrefix = "cheque", compact = false, className }) {
  const field = (id, label, control) =>
    compact ? (
      control
    ) : (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        {control}
      </div>
    );

  return (
    <div className={cn("contents", className)}>
      {field(
        `${idPrefix}-due`,
        "تاریخِ چک (سررسید)",
        <PersianDatePicker
          id={`${idPrefix}-due`}
          value={value.checkDueDate || ""}
          onChange={(isoDate) => onChange({ checkDueDate: isoDate || "" })}
          placeholder={compact ? "سررسیدِ چک" : "همان روز"}
        />,
      )}
      {field(
        `${idPrefix}-bank`,
        "بانک",
        <Input
          id={`${idPrefix}-bank`}
          list={BANK_LIST_ID}
          value={value.checkBankName || ""}
          onChange={(e) => onChange({ checkBankName: e.target.value })}
          maxLength={100}
          placeholder={compact ? "بانکِ چک" : undefined}
          aria-label={compact ? "بانکِ چک" : undefined}
          className="h-9"
        />,
      )}
      {field(
        `${idPrefix}-drawer`,
        "صاحب حساب",
        <Input
          id={`${idPrefix}-drawer`}
          value={value.checkDrawerName || ""}
          onChange={(e) => onChange({ checkDrawerName: e.target.value })}
          maxLength={100}
          placeholder={compact ? "صاحب حسابِ چک" : undefined}
          aria-label={compact ? "صاحب حسابِ چک" : undefined}
          className="h-9"
        />,
      )}
      <datalist id={BANK_LIST_ID}>
        {iranianBanks.map((bank) => (
          <option key={bank.id} value={bank.name} />
        ))}
      </datalist>
    </div>
  );
}
