// src/features/reports/components/ActivityRangeToolbar.jsx
import { RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";

/**
 * بازه‌ی تاریخِ گزارش‌های فعالیت.
 *
 * تنها فیلترِ این چهار گزارش همین است — نه جست‌وجو دارند، نه فیلترِ
 * وضعیت. پس به‌جای `FilterPanel` (که برای نوارِ چندردیفه‌ی فهرست‌هاست)
 * یک نوارِ تک‌ردیفه‌ی جمع‌وجور، هم‌شکلِ `DashboardToolbar`.
 *
 * تاریخِ خالی یعنی «همه‌ی سوابق» — همان کاری که سرور با نبودِ
 * `fromDate`/`toDate` می‌کند؛ برای همین placeholder همین را می‌گوید و
 * برچسبِ جدا لازم نیست.
 */
export default function ActivityRangeToolbar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onReset,
  hint,
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      {hint ? (
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : (
        <span />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <PersianDatePicker
          value={fromDate}
          onChange={onFromDateChange}
          placeholder="از — همه‌ی سوابق"
          className="min-w-40 flex-1 sm:w-44 sm:flex-none"
        />
        <PersianDatePicker
          value={toDate}
          onChange={onToDateChange}
          placeholder="تا — امروز"
          className="min-w-40 flex-1 sm:w-44 sm:flex-none"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="حذف بازه"
          title="حذف بازه"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
