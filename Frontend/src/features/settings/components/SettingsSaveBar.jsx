import { Save, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import StickyActionBar from "@/shared/components/layout/StickyActionBar";

/**
 * نوارِ چسبانِ پایینِ صفحه — فقط وقتی تغییرِ ذخیره‌نشده هست. در موبایل تمام‌عرض با
 * دکمه‌های بزرگ؛ در دسکتاپ کارتِ شناور.
 */
export default function SettingsSaveBar({ count, hasErrors, isSaving, onSave, onDiscard }) {
  if (count === 0) return null;
  return (
    <StickyActionBar
      actions={
        <>
          <Button className="h-10 flex-1 gap-2 sm:h-9 sm:flex-none" disabled={hasErrors || isSaving} onClick={onSave}>
            <Save className="size-4" />
            {isSaving ? "در حال ذخیره…" : "ذخیره‌ی تغییرات"}
          </Button>
          <Button variant="outline" className="h-10 gap-2 sm:h-9" disabled={isSaving} onClick={onDiscard}>
            <Undo2 className="size-4" />
            انصراف
          </Button>
        </>
      }
    >
      {hasErrors ? (
        <span className="text-destructive">پیش از ذخیره، مقدارهای نادرست را اصلاح کنید.</span>
      ) : (
        <>
          <span className="font-semibold tabular-nums">{count}</span>
          <span className="text-muted-foreground"> تغییرِ ذخیره‌نشده</span>
        </>
      )}
    </StickyActionBar>
  );
}
