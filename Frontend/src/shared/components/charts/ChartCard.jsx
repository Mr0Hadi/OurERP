// src/shared/components/charts/ChartCard.jsx
import { Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

/**
 * پوسته‌ی مشترکِ کارت‌های نمودار: عنوان، یک آیکونِ توضیح، و ناحیه‌ی رسم.
 *
 * گزارش‌های این سیستم چند تعریفِ ظریف دارند (درآمد بر اساس تاریخِ ارسال،
 * مبلغ فاکتور بر اساس تاریخِ فاکتور) و بدونِ توضیح، خواننده دو عددِ
 * متفاوت را باگ می‌بیند. ولی چاپِ آن توضیح زیرِ *هر* عنوان، دو سه سطرِ
 * متن به هر کارت اضافه می‌کرد و صفحه را شلوغ‌تر از خودِ نمودارها.
 *
 * پس توضیح می‌ماند اما پشتِ یک ⓘ: در دسترسِ کسی که سؤال دارد، نامرئی
 * برای کسی که ندارد.
 */
export default function ChartCard({
  title,
  description,
  action,
  isLoading,
  height = 240,
  className,
  children,
}) {
  return (
    <Card className={cn("h-full min-w-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle className="truncate">{title}</CardTitle>
          {description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`درباره‌ی ${title}`}
                  className="shrink-0 cursor-help text-muted-foreground hover:text-foreground"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-xs leading-5">
                {description}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="w-full" style={{ height }} />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
