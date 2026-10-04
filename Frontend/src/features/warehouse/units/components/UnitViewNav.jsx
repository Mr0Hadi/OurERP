import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

import { UNIT_SEGMENTS, UNIT_SEGMENT_META, segmentNeedsLabels } from "../domain/unitVocabulary";
import { formatNumber } from "@/shared/lib/numberFormat";
import { LABEL_VIEWS, SEGMENT_ICONS } from "./unitViews";

/** Radix مقدارِ خالی نمی‌پذیرد. */
const ALL = "all";

/** شمارِ هر جایگاه از `GetProductUnitSummary`؛ تا نیامده عددی نشان داده نمی‌شود. */
function segmentCount(summary, segment) {
  if (!summary) return null;
  const status = UNIT_SEGMENT_META[segment].status;
  if (!status) {
    return Object.values(summary.byStatus ?? {}).reduce((sum, row) => sum + (row.count || 0), 0);
  }
  return summary.byStatus?.[status]?.count ?? 0;
}

/**
 * نماهای فهرستِ دانه‌ها در دو انتخاب‌گر: جایگاه (در انبار، قرنطینه…، با شمارش)
 * و وضعیتِ برچسب. برچسب در جایگاهی که دانه‌هایش دیگر در انبار نیستند بسته است.
 */
export default function UnitViewNav({
  segment,
  labelFilter,
  summary,
  onSegmentChange,
  onLabelFilterChange,
  className,
}) {
  const labelsApply = segmentNeedsLabels(segment);

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Select value={segment} onValueChange={onSegmentChange}>
        <SelectTrigger className="h-10 w-full" aria-label="جایگاه دانه">
          <SelectValue />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {Object.values(UNIT_SEGMENTS).map((value) => {
            const Icon = SEGMENT_ICONS[value];
            const count = segmentCount(summary, value);
            return (
              <SelectItem key={value} value={value}>
                <Icon className="size-4" />
                {UNIT_SEGMENT_META[value].label}
                {count != null && <span className="text-xs text-muted-foreground">({formatNumber(count)})</span>}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Select
        value={labelsApply ? labelFilter || ALL : ALL}
        onValueChange={(value) => onLabelFilterChange(value === ALL ? "" : value)}
        disabled={!labelsApply}
      >
        <SelectTrigger className="h-10 w-full" aria-label="وضعیت برچسب">
          <SelectValue />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {LABEL_VIEWS.map(({ value, icon: Icon, label }) => (
            <SelectItem key={value || ALL} value={value || ALL}>
              <Icon className="size-4" />
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
