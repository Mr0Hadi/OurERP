import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

/**
 * پوسته‌ی مشترک کارت‌های فرم — سرتیترِ آیکون‌دار روی زمینه‌ی muted و بدنه.
 *
 * این ترکیب (کارت گرد، هدر با چیپِ آیکون، بدنه‌ی `px-6 py-5`) در فرم‌های
 * مشتری، تامین‌کننده، خرید و فروش کلمه‌به‌کلمه تکرار شده بود. چون فقط
 * *ظاهر* است و هیچ معنای دامنه‌ای ندارد، جایش اینجاست؛ هر فیچر فقط آیکون
 * و عنوانش را می‌دهد.
 *
 * icon  - کامپوننت آیکون lucide (نه المنتِ ساخته‌شده)
 * title - عنوان فارسی بخش
 * action- المنت اختیاری در انتهای هدر (مثلاً یک سوییچ یا دکمه‌ی کوچک)
 */
export default function FormSectionCard({
  icon: Icon,
  title,
  action,
  children,
  className = "",
  contentClassName = "px-6 py-5",
}) {
  return (
    <Card className={`overflow-hidden shadow-md rounded-2xl pt-0 gap-0 ${className}`}>
      <CardHeader className="border-b bg-muted/30 py-4 px-6">
        <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
          )}
          {title}
          {action && <div className="mr-auto">{action}</div>}
        </CardTitle>
      </CardHeader>

      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
