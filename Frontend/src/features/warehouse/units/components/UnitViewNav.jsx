import OptionSelect from "@/shared/components/forms/OptionSelect";
import { cn } from "@/shared/lib/utils";

import { UNIT_SEGMENTS, UNIT_SEGMENT_META, segmentNeedsLabels } from "../domain/unitVocabulary";
import { formatNumber } from "@/shared/lib/numberFormat";
import { LABEL_VIEWS, SEGMENT_ICONS } from "./unitViews";

const [ALL_LABELS_VIEW, ...LABEL_FILTER_VIEWS] = LABEL_VIEWS;

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
      <OptionSelect
        dir="rtl"
        value={segment}
        onChange={onSegmentChange}
        aria-label="جایگاه دانه"
        className="h-10 w-full"
        options={Object.values(UNIT_SEGMENTS).map((value) => {
          const count = segmentCount(summary, value);
          return {
            value,
            icon: SEGMENT_ICONS[value],
            label: (
              <>
                {UNIT_SEGMENT_META[value].label}
                {count != null && <span className="text-xs text-muted-foreground">({formatNumber(count)})</span>}
              </>
            ),
          };
        })}
      />
      <OptionSelect
        dir="rtl"
        value={labelsApply ? labelFilter : ""}
        onChange={onLabelFilterChange}
        disabled={!labelsApply}
        aria-label="وضعیت برچسب"
        className="h-10 w-full"
        emptyLabel={
          <>
            <ALL_LABELS_VIEW.icon className="size-4" />
            {ALL_LABELS_VIEW.label}
          </>
        }
        options={LABEL_FILTER_VIEWS}
      />
    </div>
  );
}
