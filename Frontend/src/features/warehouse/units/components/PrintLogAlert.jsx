// src/features/warehouse/units/components/PrintLogAlert.jsx
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * هشدار ماندگار برای «چاپ شد ولی ثبت نشد».
 *
 * تا وقتی انباردار دوباره تلاش نکرده و ثبت موفق نشده، از صفحه نمی‌رود؛
 * کدهای واحد را هم نشان می‌دهد تا معلوم باشد کدام برچسب‌ها روی جنس
 * چسبیده‌اند ولی سیستم هنوز «چاپ‌نشده» می‌داندشان.
 */
export default function PrintLogAlert({ batches, onRetry, retryingId }) {
  if (!batches.length) return null;

  return (
    <div className="space-y-2">
      {batches.map((batch) => (
        <div
          key={batch.id}
          className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {batch.units.length} برچسب چاپ شد ولی وضعیت چاپشان ثبت نشد.
            </p>
            <p className="mt-0.5 text-xs">
              این واحدها هنوز «چاپ‌نشده» نشان داده می‌شوند. تا ثبت نشده، دوباره
              برایشان برچسب نزنید.
            </p>
            <p className="mt-1 truncate font-mono text-[11px] opacity-80">
              {batch.units.map((unit) => unit.unitCode).join("، ")}
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="gap-2"
            disabled={retryingId === batch.id}
            onClick={() => onRetry(batch)}
          >
            <RefreshCw
              className={`h-4 w-4 ${retryingId === batch.id ? "animate-spin" : ""}`}
            />
            {retryingId === batch.id ? "در حال ثبت…" : "ثبت دوباره"}
          </Button>
        </div>
      ))}
    </div>
  );
}
