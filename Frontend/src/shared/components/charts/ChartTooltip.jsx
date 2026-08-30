// src/shared/components/charts/ChartTooltip.jsx
import { cn } from "@/shared/lib/utils";

/**
 * حبابِ مقدارها هنگام هاور.
 *
 * عمداً یک `div` معمولی است نه `<text>` داخلِ SVG: متنِ فارسی با اعداد،
 * چند سطر و راست‌به‌چپ در SVG نه wrap می‌شود و نه جهتش درست درمی‌آید.
 *
 * موقعیت را والد به‌صورت درصدِ عرض می‌دهد (نه پیکسل) تا با
 * `viewBox`ِ کش‌آمده‌ی SVG هم‌خوان بماند؛ نزدیکِ لبه‌ها هم خودش
 * جابه‌جا می‌شود تا از کارت بیرون نزند.
 */
export default function ChartTooltip({ x, title, rows, className }) {
  // نزدیکِ لبه، حباب را به داخل هل می‌دهیم وگرنه نصفش بیرونِ کارت است.
  const anchor = x < 22 ? "0%" : x > 78 ? "-100%" : "-50%";

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 z-10 w-44 max-w-[calc(100%-1rem)] rounded-lg border border-border",
        "bg-popover/95 px-3 py-2 text-popover-foreground shadow-lg backdrop-blur-sm",
        className,
      )}
      style={{ left: `${x}%`, transform: `translateX(${anchor})` }}
    >
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.key ?? row.label}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {row.color ? (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}
              <span className="truncate text-muted-foreground">{row.label}</span>
            </span>
            <span className="shrink-0 font-medium whitespace-nowrap tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
