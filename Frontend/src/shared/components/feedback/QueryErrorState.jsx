import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * خطای واکشی یک لیست، با دکمه‌ی تلاش دوباره.
 * جای جدول در صفحات لیست می‌نشیند.
 */
export default function QueryErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-sm text-muted-foreground">
        {getErrorMessage(error, "دریافت اطلاعات انجام نشد.")}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        تلاش مجدد
      </Button>
    </div>
  );
}
