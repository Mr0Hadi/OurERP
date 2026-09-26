import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

import {
  LABEL_FILTERS,
  UNIT_SEGMENTS,
  UNIT_SEGMENT_META,
  fa,
  segmentNeedsLabels,
} from "../domain/unitVocabulary";
import { LABEL_VIEWS, SEGMENT_VIEWS } from "./unitViews";

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

/** ردیفِ منو — همان شکلِ ردیف‌های «دسترسی کارمندان». */
function NavItem({ active, disabled, icon: Icon, label, hint, count, onClick }) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-right transition-colors disabled:pointer-events-none disabled:opacity-40",
        active ? "bg-primary/10" : "hover:bg-muted/60",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", active && "font-semibold text-primary")}>{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      {count != null && (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs tabular-nums",
            active ? "bg-primary/15 text-primary" : "text-muted-foreground",
          )}
        >
          {fa(count)}
        </span>
      )}
    </button>
  );
}

function GroupTitle({ children }) {
  return <p className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground">{children}</p>;
}

/**
 * نماهای فهرستِ دانه‌ها — جایگاه (در انبار، قرنطینه…) و وضعیتِ برچسب.
 *
 * `pane`: ستونِ کناری به شکلِ صفحه‌ی «دسترسی کارمندان» (`AccessListPane`):
 * بالا انتخابِ کالا (شمارش‌ها هم روی همان کالا می‌روند)، وسط نماها و پایین
 * شمارِ نتیجه. `select`: همان نماها در دو انتخاب‌گرِ ساده برای عرضِ کم.
 */
export default function UnitViewNav({
  variant = "pane",
  segment,
  labelFilter,
  summary,
  onSegmentChange,
  onLabelFilterChange,
  header = null,
  footerText,
  className,
}) {
  const labelsApply = segmentNeedsLabels(segment);

  if (variant === "select") {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <Select value={segment} onValueChange={onSegmentChange}>
          <SelectTrigger className="h-10 w-full" aria-label="جایگاه دانه">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {Object.values(UNIT_SEGMENTS).map((value) => {
              const Icon = SEGMENT_VIEWS[value].icon;
              const count = segmentCount(summary, value);
              return (
                <SelectItem key={value} value={value}>
                  <Icon className="size-4" />
                  {UNIT_SEGMENT_META[value].label}
                  {count != null && <span className="text-xs text-muted-foreground">({fa(count)})</span>}
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
                {value ? label : "برچسب: همه"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <aside
      className={cn("min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card", className)}
    >
      {header && <div className="space-y-2 border-b border-border p-3">{header}</div>}

      <nav aria-label="نماهای دانه‌ها" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-1.5">
        <div>
          <GroupTitle>جایگاه</GroupTitle>
          {Object.values(UNIT_SEGMENTS).map((value) => (
            <NavItem
              key={value}
              active={segment === value}
              icon={SEGMENT_VIEWS[value].icon}
              label={UNIT_SEGMENT_META[value].label}
              hint={SEGMENT_VIEWS[value].hint}
              count={segmentCount(summary, value)}
              onClick={() => onSegmentChange(value)}
            />
          ))}
        </div>

        <div className="border-t border-border pt-2">
          <GroupTitle>برچسب</GroupTitle>
          {LABEL_VIEWS.map(({ value, icon, label, hint }) => (
            <NavItem
              key={value || ALL}
              active={labelsApply && (labelFilter || "") === value}
              disabled={!labelsApply}
              icon={icon}
              label={label}
              hint={hint}
              count={value === LABEL_FILTERS.UNPRINTED && labelsApply ? (summary?.unprintedCount ?? null) : null}
              onClick={() => onLabelFilterChange(value)}
            />
          ))}
          {!labelsApply && (
            <p className="px-2 pt-1 text-xs text-muted-foreground">
              دانه‌های این جایگاه دیگر برچسب لازم ندارند.
            </p>
          )}
        </div>
      </nav>

      {footerText && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{footerText}</p>
      )}
    </aside>
  );
}
