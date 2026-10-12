import { CalendarRange, RotateCcw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { RANGE_PRESETS, matchPreset } from "@/shared/lib/dateRanges";
import { cn } from "@/shared/lib/utils";

/**
 * بازه‌ی تاریخِ گزارش‌ها و دفترها.
 *
 * دو لایه دارد چون دو جور کاربر دارد: آن‌که «۹۰ روز اخیر» می‌خواهد و با
 * یک کلیک کارش تمام است، و آن‌که بازه‌ی دقیقِ خودش را می‌خواهد. دکمه‌های
 * آماده بالا، تقویم‌ها زیرشان.
 *
 * روی موبایل دکمه‌های آماده در یک ردیفِ افقی‌اسکرول می‌مانند (همان
 * الگوی `DashboardToolbar`) نه `flex-wrap`، تا ارتفاعِ نوار ثابت بماند و
 * تقویم‌ها زیرِ آن تمام‌عرض شوند.
 *
 * @param presets    بازه‌های آماده (`shared/lib/dateRanges`)؛ پیش‌فرض: همه / ماه / ۹۰ روز / سال
 * @param emptyLabel متنِ بازه‌ی خالی — همان چیزی که سرور با «بدونِ تاریخ» برمی‌گرداند
 * @param extra      کنترلِ اضافه کنارِ دکمه‌ی ریست (مثلاً انتخابِ نوعِ دوره)
 */
export default function DateRangeToolbar({
  fromDate,
  toDate,
  onRangeChange,
  onReset,
  presets = RANGE_PRESETS,
  emptyLabel = "همه‌ی سوابق",
  extra,
  className,
}) {
  const activePreset = matchPreset({ fromDate, toDate }, presets);
  const hasRange = Boolean(fromDate || toDate);

  return (
    <div className={cn("space-y-2 rounded-xl border border-border bg-card p-2", className)}>
      <div className="flex items-center gap-2">
        <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 scrollbar-hide">
          <div className="flex w-max gap-1 rounded-lg bg-muted/60 p-1">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={activePreset === preset.id ? "default" : "ghost"}
                onClick={() => onRangeChange(preset.range())}
                className={cn(
                  "h-8 shrink-0 px-3 text-xs",
                  activePreset !== preset.id && "text-muted-foreground",
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="حذف بازه"
          title="حذف بازه"
          disabled={!hasRange}
          onClick={onReset}
        >
          <RotateCcw />
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="flex shrink-0 items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <CalendarRange className="size-3.5" />
          {hasRange
            ? `${fromDate ? gregorianToPersian(fromDate) : "ابتدا"} تا ${
                toDate ? gregorianToPersian(toDate) : "امروز"
              }`
            : emptyLabel}
        </span>

        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          {extra}
          <PersianDatePicker
            value={fromDate}
            onChange={(value) => onRangeChange({ fromDate: value || "", toDate })}
            placeholder="از تاریخ"
            className="min-w-36 flex-1 sm:w-40 sm:flex-none"
          />
          <PersianDatePicker
            value={toDate}
            onChange={(value) => onRangeChange({ fromDate, toDate: value || "" })}
            placeholder="تا تاریخ"
            className="min-w-36 flex-1 sm:w-40 sm:flex-none"
          />
        </div>
      </div>
    </div>
  );
}
