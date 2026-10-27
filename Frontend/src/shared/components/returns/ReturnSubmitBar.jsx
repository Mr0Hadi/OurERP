import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import StickyActionBar from "@/shared/components/layout/StickyActionBar";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * نوارِ پایینِ صفحه‌ی ثبتِ مرجوعی: جمعِ مبلغِ ادعاها، ثبت و انصراف.
 * چسبان است تا با اسکرولِ ادعاها از دید نرود.
 */
export default function ReturnSubmitBar({ total, submitLabel, isBusy, onCancel }) {
  return (
    <StickyActionBar
      className="-mx-4 sm:mx-0"
      actions={
        <>
          <Button type="submit" className="h-10 flex-1 gap-2 sm:h-8 sm:flex-none" disabled={isBusy}>
            <Save className="h-4 w-4" />
            {isBusy ? "در حال ثبت..." : submitLabel}
          </Button>
          <Button type="button" variant="outline" className="h-10 gap-2 sm:h-8" onClick={onCancel} disabled={isBusy}>
            <X className="h-4 w-4" />
            انصراف
          </Button>
        </>
      }
    >
      <span className="text-muted-foreground">جمع مبلغ ادعاها: </span>
      <span className="font-bold text-card-foreground tabular-nums">{formatRial(total)}</span>
    </StickyActionBar>
  );
}
