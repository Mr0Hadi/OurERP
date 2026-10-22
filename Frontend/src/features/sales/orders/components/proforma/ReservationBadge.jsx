import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import StatusBadge from "@/shared/components/status/StatusBadge";

/** «۰۹:۴۵» یا «۱:۰۲:۰۳». */
function formatCountdown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * مهلتِ باقی‌مانده‌ی رزروِ پیش‌فاکتور: آبی، زیرِ دو دقیقه هشدار، صفر «تمام شد». `null` ⇒ چیزی نشان نمی‌دهد
 * (مهلتی در کار نیست). شمارش را صدازننده می‌دهد (`useReservationCountdown` یا `ReservationTimer`).
 */
export default function ReservationBadge({ secondsLeft, size }) {
  if (secondsLeft == null) return null;
  const expired = secondsLeft === 0;
  return (
    <StatusBadge size={size} tone={expired ? "danger" : secondsLeft < 120 ? "caution" : "info"} icon={Clock}>
      <span dir="ltr" className="tabular-nums">
        {expired ? "مهلت تمام شد" : formatCountdown(secondsLeft)}
      </span>
    </StatusBadge>
  );
}

/**
 * شمارشِ معکوسِ رزرو برای ردیف‌های فهرست، از `reservationSecondsLeft`ِ همان پاسخ. با هر خواندنِ دوباره‌ی
 * فهرست از نو شروع می‌شود؛ صدازننده `key` را با همان عدد بدهد. `null` ⇒ «بی مهلت».
 */
export function ReservationTimer({ secondsLeft }) {
  const [left, setLeft] = useState(secondsLeft);

  useEffect(() => {
    if (secondsLeft == null) return undefined;
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  if (left == null) return <span className="text-xs text-muted-foreground">بی مهلت</span>;
  return <ReservationBadge secondsLeft={left} size="sm" />;
}
