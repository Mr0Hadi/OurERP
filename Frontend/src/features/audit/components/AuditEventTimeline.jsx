import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ExternalLink, UserRound } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneSolid } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { AUDIT_OPERATION_LABELS, actionGroupOf, actionTitleOf } from "../domain/auditEnums";
import { entityLabelOf } from "../domain/auditVocabulary";
import AuditChangeCard from "./AuditChangeCard";

/** «۲ ویرایش · ۱ ایجاد» — خلاصه‌ی تغییراتِ یک رویداد پیش از باز کردنش. */
function changeSummary(changes) {
  const counts = new Map();
  for (const change of changes) {
    const key = `${AUDIT_OPERATION_LABELS[change.operation] ?? ""} ${entityLabelOf(change.entityType)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => (count > 1 ? `${formatNumber(count)} ${label}` : label)).join(" · ");
}

function TimelineItem({ event, defaultOpen, showTarget }) {
  const [open, setOpen] = useState(defaultOpen);
  const changes = event.changes ?? [];
  const group = actionGroupOf(event.action);

  return (
    <li className="relative ps-6">
      <span
        className={cn("absolute start-0 top-1.5 size-3 rounded-full ring-4 ring-popover", toneSolid(group.tone))}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">{actionTitleOf(event)}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="tabular-nums">{gregorianToPersianDateTime(event.occurredAt)}</span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {event.userName || "بدون کاربر"}
            </span>
          </p>
          {!open && changes.length > 0 && (
            <p className="line-clamp-2 text-[11px] text-muted-foreground">{changeSummary(changes)}</p>
          )}
        </div>
        <ChevronDown
          className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {changes.map((change) => (
            <AuditChangeCard key={change.id} change={change} showTarget={showTarget} />
          ))}
          <Button asChild variant="link" size="sm" className="h-auto gap-1 px-0 text-xs">
            <Link to={routeWithId(ROUTES.AUDIT_DETAIL, event.id)}>
              <ExternalLink className="size-3" />
              همه‌ی اثرهای این رویداد
            </Link>
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * رویدادهای تاریخچه‌ی یک سند یا رکورد، جدیدترین بالا، روی یک خطِ زمانی. اولین رویداد باز است.
 *
 * @param events     پاسخِ `GetDocumentHistory`/`GetEntityHistory`
 * @param showTarget پیوندِ هر تغییر به سند/رکوردِ صاحبش (در تاریخچه‌ی سند، ردیف‌ها مالِ خودِ سندند)
 */
export default function AuditEventTimeline({ events, showTarget = false }) {
  return (
    <ol className="relative space-y-5 before:absolute before:inset-y-2 before:start-1.5 before:w-px before:bg-border">
      {events.map((event, index) => (
        <TimelineItem key={event.id} event={event} defaultOpen={index === 0} showTarget={showTarget} />
      ))}
    </ol>
  );
}
