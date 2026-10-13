import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { REPORT_PERIOD_OPTIONS } from "@/shared/domain/enums/reportPeriod";

/**
 * اندازه‌ی دوره‌های نمودار/جدول (`ReportPeriodTypeEnum`). یک Selectِ کوچک کنارِ تقویم‌ها، نه
 * ردیفِ شش‌دکمه‌ای: اینجا بازه مهم‌تر است و نوارِ بازه دکمه‌های آماده‌ی خودش را دارد.
 */
export default function PeriodTypeSelect({ value, onChange, label = "دوره" }) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className="h-9 min-w-28 flex-1 sm:w-32 sm:flex-none" aria-label={label}>
        <span className="text-xs text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REPORT_PERIOD_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
