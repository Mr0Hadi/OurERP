import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { saleKeys } from "../services/queryKeys";

/**
 * ثانیه‌های باقی‌مانده‌ی رزروِ پیش‌فاکتور، زنده. پایه `reservationSecondsLeft`ِ پاسخِ سرور
 * است (نه ساعتِ دستگاه، که ممکن است جلو/عقب باشد) و از لحظه‌ی رسیدنِ همان پاسخ کم می‌شود.
 *
 * وقتی به صفر رسید، سند دوباره خوانده می‌شود؛ سرویسِ پس‌زمینه حدودِ یک دقیقه بعد دانه‌ها را
 * آزاد و مرحله را به «در انتظار انبار» برمی‌گرداند، پس یک بارِ دیگر هم بعد از آن خوانده می‌شود.
 *
 * @returns ثانیه‌ها، یا `null` وقتی مهلتی در کار نیست
 */
export function useReservationCountdown(sale) {
  const queryClient = useQueryClient();
  const base = sale?.reservationSecondsLeft;
  // لحظه‌ی رسیدنِ همین پاسخ (کشِ جزئیات؛ پاسخِ mutationها هم با `setQueryData` همین را تازه می‌کنند).
  const receivedAt = sale?.id == null ? 0 : (queryClient.getQueryState(saleKeys.detail(sale.id))?.dataUpdatedAt ?? 0);

  const [now, setNow] = useState(receivedAt);
  useEffect(() => {
    if (base == null) return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [base, receivedAt]);

  const left = base == null ? null : Math.max(0, base - Math.floor(Math.max(0, now - receivedAt) / 1000));

  const saleId = sale?.id;
  const expired = left === 0;
  useEffect(() => {
    if (!expired || saleId == null) return undefined;
    const refresh = () => queryClient.invalidateQueries({ queryKey: saleKeys.detail(saleId) });
    refresh();
    const later = window.setTimeout(refresh, 75_000);
    return () => window.clearTimeout(later);
  }, [expired, saleId, queryClient]);

  return left;
}
