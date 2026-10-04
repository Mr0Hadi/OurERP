import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

/**
 * اسکلتونِ صفحه‌های مرجوعی (جزئیات و ثبت) — همان چیدمانِ یک‌ستونه‌ی خودِ
 * صفحه: نوارِ بالا، کارتِ بسته‌ی فاکتور، و کارتِ ادعاها.
 *
 * جای دو اسکلتونِ جدای خرید و فروش که هنوز چیدمانِ دو‌ستونه‌ی قدیمی
 * (`max-w-6xl` با ستونِ کناری) را نشان می‌دادند و صفحه بعد از بارگذاری می‌پرید.
 */
export default function ReturnPageSkeleton() {
  return (
    <div className="container max-w-3xl mx-auto px-4 space-y-3" aria-busy="true">
      <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      <Skeleton className="h-16 w-full rounded-lg" />

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
