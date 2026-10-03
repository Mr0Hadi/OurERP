import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

/**
 * کارتِ یک بخش از صفحه‌ی سند (خرید/فروش) — همان سرتیترِ ساده‌ی بقیه‌ی برنامه
 * (عنوان، توضیحِ کوتاهِ اختیاری، و کنترلِ انتهای سرتیتر).
 *
 * @param description یک خطِ توضیحِ کوتاه زیرِ عنوان
 * @param action      دکمه/کنترلِ انتهای سرتیتر
 */
export default function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName = "space-y-3",
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold text-card-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
        {action && (
          <CardAction className="flex flex-wrap items-center justify-end gap-2">{action}</CardAction>
        )}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
