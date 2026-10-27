import { cn } from "@/shared/lib/utils";

/**
 * جای خالیِ یک فهرست — آیکن در دایره، عنوان، یک خط راهنما و یک اقدامِ اختیاری (پاک کردنِ فیلترها، رفتن به صفحه‌ای
 * دیگر). برای `emptyState`ِ `DataTable`/`ServerTable` یا فهرستِ کارتی.
 *
 * @param {React.ComponentType} icon آیکنِ lucide
 * @param {React.ReactNode} title
 * @param {React.ReactNode} [description]
 * @param {React.ReactNode} [action] معمولاً یک `Button` با `size="sm"`
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Icon className="size-6 text-muted-foreground" />
        </span>
      )}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
