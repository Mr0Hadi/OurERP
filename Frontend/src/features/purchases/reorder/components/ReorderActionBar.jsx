import { Loader2, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import StickyActionBar from "@/shared/components/layout/StickyActionBar";
import { formatNumber } from "@/shared/lib/numberFormat";

/** نوارِ پایینِ پیشنهادِ خرید: چند کالا انتخاب شده، جمعِ تقریبی یا مشکل، لغوِ انتخاب و ساختِ پیش‌فاکتورها. */
export default function ReorderActionBar({ summary, onSubmit, onClear, isPending }) {
  return (
    <StickyActionBar
      className="-mx-4 mt-3 sm:mx-0"
      actions={
        <>
          <Button
            className="h-10 flex-1 gap-2 sm:h-9 sm:flex-none"
            disabled={summary.hasProblem || isPending}
            onClick={onSubmit}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {summary.supplierCount > 1
              ? `ساخت ${formatNumber(summary.supplierCount)} پیش‌فاکتور`
              : "ساخت پیش‌فاکتور"}
          </Button>
          <Button variant="outline" className="h-10 gap-2 sm:h-9" disabled={isPending} onClick={onClear}>
            <X className="size-4" />
            لغو انتخاب
          </Button>
        </>
      }
    >
      <span className="font-semibold tabular-nums">{formatNumber(summary.count)}</span> کالا
      <span className={summary.problem ? "block text-xs text-destructive" : "block text-xs text-muted-foreground"}>
        {summary.problem ?? `حدود ${formatNumber(summary.total)} ریال`}
      </span>
    </StickyActionBar>
  );
}
