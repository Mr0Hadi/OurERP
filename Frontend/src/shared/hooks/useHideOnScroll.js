import { useEffect, useState } from "react";

/** کمترین جابه‌جایی (px) که جهتِ اسکرول را عوض می‌کند؛ لرزشِ انگشت نادیده می‌ماند. */
const DIRECTION_THRESHOLD = 8;

/**
 * آیا نوارِ بالا باید کنار برود؟ مثلِ نوارِ آدرسِ کروم: با اسکرول به پایین
 * پنهان و با کمی اسکرول به بالا دوباره پیدا می‌شود؛ تا `offset` پیکسلِ اول
 * همیشه پیداست تا بالای صفحه هیچ‌وقت خالی نماند.
 */
export function useHideOnScroll(offset = 64) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y <= offset) {
        setHidden(false);
        lastY = y;
        return;
      }
      const delta = y - lastY;
      if (Math.abs(delta) < DIRECTION_THRESHOLD) return;
      setHidden(delta > 0);
      lastY = y;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [offset]);

  return hidden;
}
