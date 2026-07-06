// src/features/warehouse/receiving/components/forms/ReceivingDetailLoading.jsx
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

export default function ReceivingDetailLoading() {
  return (
    <div className="container max-w-6xl mx-auto px-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ستون اصلی */}
        <div className="lg:col-span-2 space-y-4">
          {/* ReceivingItemsSection */}
          <Card>
            <CardHeader className="flex flex-col items-start gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-5 w-24" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-full" />

              {/* جدول دسکتاپ */}
              <div className="hidden sm:block border border-border rounded-lg overflow-hidden">
                <div className="bg-muted h-10 w-full" />
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                      <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-10 mr-auto" />
                      <Skeleton className="h-8 w-28" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                  ))}
                </div>
              </div>

              {/* کارت‌های موبایل */}
              <div className="space-y-2 sm:hidden">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-28" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ReceivingTransporterSection */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-14 w-64" />
                <Skeleton className="h-3 w-72" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ستون کناری */}
        <div className="space-y-4">
          {/* ReceivingSummaryCard */}
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>

              <div className="space-y-3 border-t border-border pt-3">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-full" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* دکمه‌های اقدام */}
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
