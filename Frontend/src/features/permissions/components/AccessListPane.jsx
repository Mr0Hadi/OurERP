import { Link } from "react-router-dom";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { initialsOf } from "./initialsOf";

/**
 * ستونِ فهرستِ صفحه‌های «سطح دسترسی»: جست‌وجو، فیلترهای اختیاری، و ردیف‌هایی
 * که هر کدام لینکِ همان صفحه با `:id` خودشان‌اند.
 *
 * @param items  `[{ id, title, subtitle, to }]`
 */
export default function AccessListPane({
  search,
  onSearchChange,
  searchPlaceholder,
  filters = null,
  items,
  isLoading,
  selectedId,
  emptyText,
  footerText,
  className,
}) {
  return (
    <aside
      className={cn(
        "min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pr-8"
          />
        </div>
        {filters}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {isLoading ? (
          <div className="space-y-1.5 p-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          items.map((item) => {
            const active = String(item.id) === String(selectedId);
            return (
              <Link
                key={item.id}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors",
                  active ? "bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {initialsOf(item.title)}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm",
                      active && "font-semibold text-primary",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  )}
                </span>
              </Link>
            );
          })
        )}
      </nav>

      {footerText && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {footerText}
        </p>
      )}
    </aside>
  );
}
