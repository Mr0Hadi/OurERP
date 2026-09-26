import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getErrorMessage } from "@/shared/lib/errorMessage";

/**
 * وقتی رکوردِ یک صفحه‌ی جزئیات پیدا نشد یا واکشی‌اش خطا داد.
 *
 * «پیدا نشد» و «واکشی شکست خورد» دو وضعیتِ متفاوت‌اند: اولی (بدون خطا یا
 * ۴۰۴) یعنی رکورد وجود ندارد و کاربر باید به لیست برگردد؛ دومی (قطع شبکه،
 * خطای سرور) موقتی است و دکمه‌ی «تلاش دوباره» دارد. قبلاً هر دو «یافت نشد»
 * نشان داده می‌شدند و کاربر در قطعیِ شبکه فکر می‌کرد سند حذف شده است.
 *
 * @param {object} props
 * @param {unknown} [props.error] خطای کوئری (`error` از React Query)
 * @param {string} props.notFoundMessage متنِ «پیدا نشد»، مثل «خرید مورد نظر یافت نشد.»
 * @param {() => void} [props.onRetry] معمولاً `refetch` همان کوئری
 * @param {() => void} props.onBack بازگشت به لیست
 */
export default function DetailErrorState({ error, notFoundMessage, onRetry, onBack }) {
  const isNotFound = !error || error.response?.status === 404;
  const message = isNotFound
    ? (error?.serverMessage ?? notFoundMessage)
    : getErrorMessage(error, "دریافت اطلاعات انجام نشد.");

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-lg text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        {!isNotFound && onRetry && (
          <Button onClick={() => onRetry()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تلاش دوباره
          </Button>
        )}
        <Button variant="outline" onClick={onBack}>
          بازگشت به لیست
        </Button>
      </div>
    </div>
  );
}
