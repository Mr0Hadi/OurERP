import { ChevronDown, History } from "lucide-react";
import { useState } from "react";

import StatusBadge from "@/shared/components/status/StatusBadge";
import { SALE_PROFORMA_EVENT_TONES } from "@/shared/domain/enums/saleProforma";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/**
 * تاریخچه‌ی چرخه‌ی تأییدِ پیش‌فاکتور (`proformaEvents`)، جدیدترین اول، جمع‌شده تا کاربر بازش کند: چه کسی،
 * کِی، روی کدام نسخه و با چه یادداشتی (دلیلِ کسری یا تغییرِ انبار). رویدادِ سرویسِ پس‌زمینه «سامانه» است.
 */
export default function ProformaEventHistory({ events }) {
  const [open, setOpen] = useState(false);
  if (events.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <History className="size-3.5" />
        تاریخچه‌ی تأییدها ({formatNumber(events.length)})
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-2 space-y-2 border-s ps-3">
          {[...events].reverse().map((event) => (
            <li key={event.id} className="space-y-0.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge size="sm" tone={SALE_PROFORMA_EVENT_TONES[event.kind] ?? "neutral"}>
                  {event.kindTitle}
                </StatusBadge>
                <span className="text-muted-foreground">
                  {event.userName ?? "سامانه"} · {gregorianToPersianDateTime(event.occurredAt)} · نسخه‌ی{" "}
                  {formatNumber(event.revision)}
                </span>
              </div>
              {event.note && <p className="leading-5 text-muted-foreground">{event.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
