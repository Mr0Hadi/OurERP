import { groupCounts } from "./permissionSets";

const toFa = (n) => n.toLocaleString("fa-IR");

/** خلاصه‌ی یک مجموعه‌ی دسترسی به شکلِ چیپ‌های «فروش ۴/۶». */
export default function GroupChips({ groups, selected, max = 6 }) {
  const rows = groupCounts(groups, selected);
  const shown = rows.slice(0, max);
  const rest = rows.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((row) => (
        <span
          key={row.group}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
        >
          {row.title}
          <span className="text-muted-foreground tabular-nums">
            {toFa(row.count)}/{toFa(row.total)}
          </span>
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground">
          +{toFa(rest)} بخش دیگر
        </span>
      )}
    </div>
  );
}
