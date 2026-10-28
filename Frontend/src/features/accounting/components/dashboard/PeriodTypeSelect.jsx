import OptionSelect from "@/shared/components/forms/OptionSelect";
import { REPORT_PERIOD_OPTIONS } from "@/shared/domain/enums/reportPeriod";

/**
 * اندازه‌ی دوره‌های نمودار/جدول (`ReportPeriodTypeEnum`). یک Selectِ کوچک کنارِ تقویم‌ها، نه
 * ردیفِ شش‌دکمه‌ای: اینجا بازه مهم‌تر است و نوارِ بازه دکمه‌های آماده‌ی خودش را دارد.
 */
export default function PeriodTypeSelect({ value, onChange, label = "دوره" }) {
  return (
    <OptionSelect
      value={value}
      onChange={onChange}
      options={REPORT_PERIOD_OPTIONS}
      numeric
      aria-label={label}
      prefix={<span className="text-xs text-muted-foreground">{label}:</span>}
      className="h-9 min-w-28 flex-1 sm:w-32 sm:flex-none"
    />
  );
}
