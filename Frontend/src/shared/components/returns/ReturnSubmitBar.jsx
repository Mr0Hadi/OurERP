import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * نوارِ پایینِ صفحه‌ی ثبتِ مرجوعی: جمعِ مبلغِ ادعاها، ثبت و انصراف.
 * چسبان است تا با اسکرولِ ادعاها از دید نرود.
 */
export default function ReturnSubmitBar({ total, submitLabel, isBusy, onCancel }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t sm:border border-border sm:rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3">
      <div className="text-sm">
        <span className="text-muted-foreground">جمع مبلغ ادعاها: </span>
        <span className="font-bold text-card-foreground tabular-nums">{formatRial(total)}</span>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none gap-2" disabled={isBusy}>
          <Save className="h-4 w-4" />
          {isBusy ? "در حال ثبت..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={onCancel} disabled={isBusy}>
          <X className="h-4 w-4" />
          انصراف
        </Button>
      </div>
    </div>
  );
}
