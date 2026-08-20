import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

/**
 * ساختار این اسکلتون صفحه‌ی جزئیات مرجوعی را دنبال می‌کند:
 * ستون بزرگ = اقلام گزارش‌شده + پیگیری و هماهنگی،
 * ستون باریک = اطلاعات مرجوعی + دکمه‌های اقدام.
 */
export default function PurchaseReturnDetailLoading() {
  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ستون اصلی */}
        <div className="lg:col-span-2 space-y-4">
          {/* اقلام گزارش‌شده */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted h-10 w-full" />
                <div className="divide-y divide-border">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-10 mr-auto" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* پیگیری و هماهنگی */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
              <Skeleton className="h-9 w-40" />
            </CardContent>
          </Card>
        </div>

        {/* ستون کناری */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
              <div className="border-t border-border pt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
