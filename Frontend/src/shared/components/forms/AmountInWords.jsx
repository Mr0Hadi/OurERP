import { rialAmountInWords } from "@/shared/lib/numberToPersianWords";
import { cn } from "@/shared/lib/utils";

/**
 * مبلغِ ریالیِ یک فیلد به حروف (به تومان، وقتی بخش‌پذیر است) — راهنمای
 * زیرِ فیلدهای مبلغ تا کاربر صفرها را اشتباه نشمارد. برای مقدارِ خالی یا
 * صفر چیزی رندر نمی‌کند.
 */
export default function AmountInWords({ rial, className }) {
  const words = rialAmountInWords(rial);
  if (!words) return null;
  return <p className={cn("text-xs text-muted-foreground", className)}>{words}</p>;
}
