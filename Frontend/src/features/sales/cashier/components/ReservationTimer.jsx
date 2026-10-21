import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { formatCountdown } from "@/features/sales/orders/hooks/useReservationCountdown";
import StatusBadge from "@/shared/components/status/StatusBadge";

/**
 * شمارشِ معکوسِ رزروِ یک ردیفِ صف، از `reservationSecondsLeft`ِ همان پاسخ. برای ردیف‌های فهرست
 * کافی است (با هر خواندنِ دوباره‌ی فهرست از نو می‌شود؛ `key` را با عدد بدهید). `null` ⇒ بی مهلت.
 */
export default function ReservationTimer({ secondsLeft }) {
  const [left, setLeft] = useState(secondsLeft);

  useEffect(() => {
    if (secondsLeft == null) return undefined;
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  if (left == null) return <span className="text-xs text-muted-foreground">بی مهلت</span>;
  return (
    <StatusBadge size="sm" tone={left === 0 ? "danger" : left < 120 ? "caution" : "info"} icon={Clock}>
      <span dir="ltr" className="tabular-nums">
        {left === 0 ? "تمام شد" : formatCountdown(left)}
      </span>
    </StatusBadge>
  );
}
