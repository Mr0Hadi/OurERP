import { cn } from "@/shared/lib/utils";

/**
 * جای خالیِ یک فهرست یا بخش — آیکن، عنوان، یک خط راهنما و یک اقدامِ اختیاری (پاک کردنِ فیلترها، رفتن به
 * صفحه‌ای دیگر). برای `emptyState`ِ `DataTable`/`ServerTable`، فهرستِ کارتی، ویجتِ بی‌داده و ستونِ جزئیاتِ
 * صفحه‌های «فهرست/جزئیات» وقتی چیزی انتخاب نشده یا پیدا نشده.
 *
 * @param {React.ComponentType} icon آیکنِ lucide
 * @param {React.ReactNode} title
 * @param {React.ReactNode} [description]
 * @param {React.ReactNode} [action] معمولاً یک `Button` با `size="sm"` (یا چند دکمه)
 * @param {"sm"|"md"} [size] `sm` برای کارت و ویجت: کم‌ارتفاع، آیکنِ بی‌دایره، متنِ کوچک
 * @param {boolean} [fill] همه‌ی ارتفاعِ والدِ flex را بگیرد (ستونِ جزئیات)
 */
export default function EmptyState({ icon: Icon, title, description, action, size = "md", fill = false, className }) {
  const compact = size === "sm";
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 text-center",
        compact ? "py-8" : "py-14",
        fill && "flex-1 justify-center gap-3 rounded-2xl p-8",
        className,
      )}
    >
      {Icon &&
        (compact ? (
          <Icon className="size-5 text-muted-foreground" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Icon className="size-6 text-muted-foreground" />
          </span>
        ))}
      <p className={compact ? "text-sm text-muted-foreground" : "font-medium"}>{title}</p>
      {description && (
        <p className={cn("max-w-md text-muted-foreground", compact ? "text-xs leading-5" : "text-sm leading-6")}>
          {description}
        </p>
      )}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
