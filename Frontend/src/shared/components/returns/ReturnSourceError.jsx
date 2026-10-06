import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * سندِ مبدای انتخاب‌شده خوانده نشد (یا مرجوعی نمی‌پذیرد) — با راهِ برگشت
 * به انتخابِ سندِ دیگر.
 */
export default function ReturnSourceError({ error, fallback, retryLabel, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-lg">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-sm text-muted-foreground text-center px-4">{getErrorMessage(error, fallback)}</p>
      <Button type="button" variant="outline" onClick={onReset}>
        {retryLabel}
      </Button>
    </div>
  );
}
