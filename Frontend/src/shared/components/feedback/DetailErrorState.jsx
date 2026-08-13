import { AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/**
 * وقتی رکوردِ یک صفحه‌ی جزئیات پیدا نشد یا واکشی‌اش خطا داد.
 * برخلاف لیست‌ها اینجا تلاش دوباره معنا ندارد؛ کاربر به لیست برمی‌گردد.
 *
 * message - می‌تواند رشته یا عبارت شرطی باشد
 */
export default function DetailErrorState({ message, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-lg text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onBack}>
        بازگشت به لیست
      </Button>
    </div>
  );
}
