import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/** کمینه‌ی چرخش: پاسخِ سریعِ سرور بدونِ آن هیچ بازخوردی به چشم نمی‌رساند. */
const MIN_SPIN_MS = 600;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** «به‌روز شده ساعتِ ۱۴:۰۵» برای راهنمای دکمه. */
function updatedAtLabel(timestamp) {
  if (!timestamp) return "تازه‌سازی";
  const time = new Date(timestamp).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  return `تازه‌سازی — به‌روز شده ساعتِ ${time}`;
}

/**
 * دکمه‌ی «تازه‌سازی»ِ یک فهرست یا جدول: کوئری را دوباره می‌خواند، در حینِ خواندن می‌چرخد و
 * بسته است، و راهنمایش زمانِ آخرین به‌روزرسانی را می‌گوید.
 *
 * `DataTable` (و از طریقِ آن `ServerTable`) آن را خودش در نوارِ جدول می‌گذارد؛ مستقیم فقط برای
 * فهرست‌هایی که `DataTable` ندارند (`MasterListPane`، دانه‌ها، گزارش‌ها).
 *
 * @param query   خروجیِ `useQuery`ِ همان فهرست (یا هر شیءِ `{ refetch, isFetching, dataUpdatedAt? }`)
 * @param variant `"icon"` مربعِ کنارِ جست‌وجو/سرتیترِ صفحه؛ `"pill"` گردِ نوارِ کارت‌های موبایل؛
 *                `"header"` بی‌قاب و کوچک، برای گوشه‌ی سرتیترِ `DataTable`
 */
export default function RefreshButton({ query, variant = "icon", className }) {
  const [spinning, setSpinning] = useState(false);
  const busy = spinning || query.isFetching;
  const label = updatedAtLabel(query.dataUpdatedAt);

  const refresh = async () => {
    setSpinning(true);
    try {
      await Promise.all([query.refetch(), wait(MIN_SPIN_MS)]);
    } finally {
      setSpinning(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant === "header" ? "ghost" : "outline"}
      size="icon"
      className={cn(
        "disabled:opacity-70",
        variant === "pill" && "size-8 rounded-full bg-muted/40 text-muted-foreground",
        variant === "icon" && "size-9 text-muted-foreground hover:text-foreground",
        variant === "header" && "size-8 text-muted-foreground hover:bg-background/70",
        className,
      )}
      aria-label="تازه‌سازی"
      title={label}
      onClick={refresh}
      disabled={busy}
      aria-busy={busy}
    >
      <RefreshCw className={cn("size-4", busy && "animate-spin")} />
    </Button>
  );
}
