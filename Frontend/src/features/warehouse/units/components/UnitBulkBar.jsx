// src/features/warehouse/units/components/UnitBulkBar.jsx
import { Printer, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * نوار کارهای دسته‌ای؛ فقط وقتی چیزی انتخاب شده باشد دیده می‌شود تا
 * در حالت عادی جای صفحه را نگیرد.
 */
export default function UnitBulkBar({ count, onPrint, onClear }) {
  if (!count) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2">
      <span className="px-2 text-sm font-medium tabular-nums">
        {count} واحد انتخاب شده
      </span>

      <div className="ms-auto flex flex-wrap items-center gap-2">
        <Button type="button" size="lg" className="gap-2" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          چاپ {count} برچسب
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="gap-1"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
