import { Skeleton } from "@/shared/components/ui/skeleton";

/** اسکلتِ بارگذاری به شکلِ همان چیزی که می‌آید: ردیف‌های جدول یا کارت‌های موبایل. */
export default function TableLoadingSkeleton({ cards = false, rows = 6 }) {
  if (cards) {
    return (
      <div className="space-y-2">
        <Skeleton className="ms-auto h-8 w-32" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-3">
            <div className="flex justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Skeleton className="h-11 w-full rounded-none" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t px-4 py-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}
