// src/features/dashboard/components/DashboardToolbar.jsx
import { RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { cn } from "@/shared/lib/utils";
import { REPORT_PERIOD_OPTIONS } from "@/shared/domain/enums/reportPeriod";

/**
 * نوارِ کنترلِ داشبورد — سطحِ بزرگ‌نمایی و بازه‌ی تاریخ.
 *
 * نوعِ بازه به‌جای `Select` یک ردیفِ دکمه است: شش گزینه‌ی ثابت که کاربر
 * مدام بینشان جابه‌جا می‌شود؛ با `Select` هر تغییر دو کلیک می‌شد.
 *
 * روی موبایل این شش دکمه در یک ردیف جا نمی‌شوند. `flex-wrap` امتحان شد و
 * نتیجه‌اش یک «سالانه»ی تنها در سطرِ دوم بود که شکسته به نظر می‌رسید؛ پس
 * ردیف یکی می‌ماند و افقی اسکرول می‌شود — الگویی که کاربرِ موبایل از
 * تب‌بارها می‌شناسد.
 *
 * برچسبِ «از تاریخ / تا تاریخ» هم حذف شده و جایش را placeholder گرفته:
 * تاریخِ خالی یعنی پیش‌فرضِ سرور (۱۲ ماه اخیر) و همین را خودِ فیلد
 * می‌گوید.
 */
export default function DashboardToolbar({
  periodType,
  onPeriodTypeChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onReset,
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
      <div className="-mx-1 overflow-x-auto px-1 scrollbar-hide lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="flex w-max gap-1 rounded-lg bg-muted/60 p-1">
          {REPORT_PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={periodType === option.value ? "default" : "ghost"}
              onClick={() => onPeriodTypeChange(option.value)}
              className={cn(
                "h-8 shrink-0 px-3 text-xs",
                periodType !== option.value && "text-muted-foreground",
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PersianDatePicker
          value={fromDate}
          onChange={onFromDateChange}
          placeholder="از — ۱۲ ماه اخیر"
          className="lg:w-44"
        />
        <PersianDatePicker
          value={toDate}
          onChange={onToDateChange}
          placeholder="تا — امروز"
          className="lg:w-40"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          title="بازنشانی بازه"
          aria-label="بازنشانی بازه"
          className="shrink-0"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
