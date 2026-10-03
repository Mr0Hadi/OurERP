import { RotateCcw, Save } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * نوارِ چسبانِ پایینِ صفحه‌ی سندِ صادرشده: «ثبت تغییرات» برای همه‌ی تغییرهای
 * جمع‌شده (وضعیت، پرداخت‌ها، سررسید، پیوست‌ها) با یک دکمه. فقط وقتی تغییری
 * هست دیده می‌شود.
 */
export default function PendingChangesBar({ count, isSaving, onSave, onDiscard }) {
  if (!count) return null;

  return (
    <div className="sticky bottom-0 z-30 -mx-4 sm:mx-0 mt-4 border-t sm:border border-border sm:rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 min-w-0 text-sm">
          <span className="font-medium tabular-nums">{count.toLocaleString("fa-IR")}</span>{" "}
          تغییرِ ذخیره‌نشده
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          disabled={isSaving}
          onClick={onDiscard}
        >
          <RotateCcw className="h-4 w-4" />
          بازگردانی
        </Button>
        <Button type="button" size="sm" className="gap-1.5" disabled={isSaving} onClick={onSave}>
          <Save className="h-4 w-4" />
          {isSaving ? "در حال ذخیره..." : "ثبت تغییرات"}
        </Button>
      </div>
    </div>
  );
}
