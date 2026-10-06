import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatNumber } from "@/shared/components/charts/chartUtils";
import { cn } from "@/shared/lib/utils";
import { toneText } from "@/shared/lib/tone";
import { workQueuesFor } from "../../domain/workQueues";
import { useQueueCountsQuery } from "../../services/queries";

// `queue.tone` در domain/workQueues.js نامِ رنگ است؛ اینجا به توکن‌های معنایی
// نگاشت می‌شود (همان معناهای `shared/lib/tone.js`):
//   sky → info (در جریان: دریافتِ خرید)      violet → primary (ارسالِ فروش)
//   amber → warning (در انتظار اقدام)        rose → special (گردشِ مرجوعی)
const TONES = {
  sky: "bg-info/10 text-info",
  violet: "bg-primary/10 text-primary",
  amber: "bg-warning/10 text-warning",
  rose: "bg-special/10 text-special",
};

function QueueTile({ entry }) {
  const { queue, total, parts, isLoading, isError } = entry;
  const Icon = queue.icon;
  const isEmpty = !isLoading && !isError && total === 0;

  return (
    <Link
      to={queue.url}
      title={queue.hint}
      className={cn(
        "group flex min-w-0 flex-col gap-2 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40",
        isEmpty && "opacity-70",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            TONES[queue.tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <ChevronLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
      </div>

      <div className="flex h-8 items-baseline gap-1.5">
        {isLoading ? (
          <Skeleton className="h-7 w-10" />
        ) : isError ? (
          <AlertCircle className="size-5 text-destructive" aria-label="خطا در شمارش" />
        ) : (
          <span className="text-2xl leading-none font-semibold tabular-nums">
            {formatNumber(total)}
          </span>
        )}
      </div>

      <p className="truncate text-sm font-medium">{queue.title}</p>

      {/* جزئیاتِ هر وضعیت فقط وقتی معنا دارد که بیش از یک بخش باشد و
          صف خالی نباشد؛ وگرنه همان عددِ بزرگ را تکرار می‌کرد. */}
      {parts.length > 1 && total > 0 && (
        <p className="truncate text-[11px] text-muted-foreground">
          {parts
            .filter((part) => part.count > 0)
            .map((part) => `${part.label} ${formatNumber(part.count)}`)
            .join(" · ")}
        </p>
      )}
    </Link>
  );
}

/**
 * «چند چیز منتظر است؟» — فقط صف‌هایی که کاربر هم حقِ دیدنِ فهرستشان را
 * دارد و هم حقِ انجامِ کارشان را (`workQueuesFor`).
 *
 * کاشیِ صفر کم‌رنگ می‌شود نه پنهان: «هیچ کالایی منتظرِ دریافت نیست» خودش
 * خبر است، و پنهان‌کردنش کاشی‌ها را هر روز جابه‌جا می‌کرد.
 */
export default function WorkQueuesWidget({ context }) {
  const entries = useQueueCountsQuery(workQueuesFor(context));
  const settled =
    entries.length > 0 &&
    entries.every((e) => !e.isLoading && !e.isError && e.total === 0);

  return (
    <Card className="h-full min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>کارهای منتظر</CardTitle>
        {settled && (
          <span className={cn("flex items-center gap-1 text-xs", toneText("success"))}>
            <CheckCircle2 className="size-3.5" />
            همه‌چیز انجام شده
          </span>
        )}
      </CardHeader>
      {/* ستون‌ها از عرضِ خودِ کارت می‌آیند نه صفحه: وقتی «دسترسی سریع»
          خاموش است این کارت تمام‌عرض می‌شود و شش کاشی در یک ردیف جا
          می‌شوند. */}
      <CardContent className="@container">
        <div className="grid grid-cols-2 gap-2 @md:grid-cols-3 @4xl:grid-cols-6">
          {entries.map((entry) => (
            <QueueTile key={entry.queue.id} entry={entry} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
