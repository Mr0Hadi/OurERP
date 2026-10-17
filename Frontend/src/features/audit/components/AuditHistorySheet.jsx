import { History } from "lucide-react";

import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatNumber } from "@/shared/lib/numberFormat";
import { useAuditHistoryQuery } from "../services/queries";
import AuditEventTimeline from "./AuditEventTimeline";

function TimelineSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((key) => (
        <div key={key} className="flex gap-3">
          <Skeleton className="mt-1 size-3 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * شیتِ «تاریخچه‌ی تغییرات» یک سند (`documentKind` + `documentId`) یا یک رکوردِ بی‌سند
 * (`entityType` + `entityKey`). داده فقط وقتی شیت باز است خوانده می‌شود.
 */
export default function AuditHistorySheet({ open, onOpenChange, target, title }) {
  const query = useAuditHistoryQuery(target, { enabled: open });
  const events = query.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b pe-12">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            تاریخچه‌ی تغییرات
          </SheetTitle>
          <SheetDescription>
            {title}
            {query.isSuccess && events.length > 0 && ` · ${formatNumber(events.length)} رویداد`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 custom-scroll">
          {query.isLoading ? (
            <TimelineSkeleton />
          ) : query.isError ? (
            <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : events.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">هنوز تغییری ثبت نشده است.</p>
          ) : (
            <AuditEventTimeline events={events} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
