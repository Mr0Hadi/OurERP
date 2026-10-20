import { Save, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * نوارِ چسبانِ پایینِ صفحه — فقط وقتی تغییرِ ذخیره‌نشده هست. در موبایل تمام‌عرض با
 * دکمه‌های بزرگ؛ در دسکتاپ کارتِ شناور.
 */
export default function SettingsSaveBar({ count, hasErrors, isSaving, onSave, onDiscard }) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-0 z-20 rounded-t-xl border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg md:bottom-4 md:rounded-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          {hasErrors ? (
            <span className="text-destructive">پیش از ذخیره، مقدارهای نادرست را اصلاح کنید.</span>
          ) : (
            <>
              <span className="font-semibold tabular-nums">{count}</span>
              <span className="text-muted-foreground"> تغییرِ ذخیره‌نشده</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button className="h-10 flex-1 gap-2 sm:h-9 sm:flex-none" disabled={hasErrors || isSaving} onClick={onSave}>
            <Save className="size-4" />
            {isSaving ? "در حال ذخیره…" : "ذخیره‌ی تغییرات"}
          </Button>
          <Button variant="outline" className="h-10 gap-2 sm:h-9" disabled={isSaving} onClick={onDiscard}>
            <Undo2 className="size-4" />
            انصراف
          </Button>
        </div>
      </div>
    </div>
  );
}
