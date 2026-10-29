import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { fullNameOf } from "@/features/auth/domain/userDisplay";

/** تاریخ و ساعتِ شمسیِ همین لحظه، هر ۱۵ ثانیه تازه می‌شود. */
function useNowLabel() {
  const make = () =>
    new DateObject({ calendar: persian, locale: persian_fa }).format("dddd YYYY/MM/DD  HH:mm");
  const [label, setLabel] = useState(make);
  useEffect(() => {
    const id = setInterval(() => setLabel(make()), 15000);
    return () => clearInterval(id);
  }, []);
  return label;
}

/** وضعیتِ Caps Lock / Num Lock از آخرین رویدادِ صفحه‌کلید (مرورگر راهِ دیگری ندارد). */
function useLockKeys() {
  const [locks, setLocks] = useState({ caps: false, num: false });
  useEffect(() => {
    const read = (event) => {
      if (typeof event.getModifierState !== "function") return;
      const next = {
        caps: event.getModifierState("CapsLock"),
        num: event.getModifierState("NumLock"),
      };
      setLocks((prev) => (prev.caps === next.caps && prev.num === next.num ? prev : next));
    };
    window.addEventListener("keydown", read);
    window.addEventListener("keyup", read);
    return () => {
      window.removeEventListener("keydown", read);
      window.removeEventListener("keyup", read);
    };
  }, []);
  return locks;
}

function Panel({ className = "", children }) {
  return (
    <span
      data-slot="classic-status-panel"
      className={`flex h-[18px] items-center px-2 whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * نوارِ وضعیتِ پایینِ پنجره (StatusStrip) — فقط در تمِ کلاسیک.
 *
 * همان چیزهایی که نرم‌افزارهای حسابداریِ قدیمی آن پایین نشان می‌دادند:
 * «آماده» یا «در حالِ دریافت…» (از درخواست‌های در جریانِ React Query)، کاربرِ
 * واردشده، تاریخ و ساعتِ شمسی، و چراغِ CAPS/NUM. روی موبایل جا ندارد.
 */
export function ClassicStatusBar() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const user = useCurrentUser();
  const now = useNowLabel();
  const { caps, num } = useLockKeys();

  const status = mutating > 0 ? "در حالِ ذخیره…" : fetching > 0 ? "در حالِ دریافتِ اطلاعات…" : "آماده";

  return (
    <footer
      data-slot="classic-status-bar"
      className={`sticky bottom-0 z-20 hidden h-[24px] shrink-0 items-center gap-[2px] px-[2px] text-[11px] md:flex ${
        fetching + mutating > 0 ? "cursor-progress" : ""
      }`}
    >
      <Panel className="flex-1">{status}</Panel>
      {user && <Panel>{fullNameOf(user)}</Panel>}
      <Panel className="tabular-nums">{now}</Panel>
      <Panel className={`w-12 justify-center ${caps ? "" : "text-[#808080]"}`}>CAPS</Panel>
      <Panel className={`w-12 justify-center ${num ? "" : "text-[#808080]"}`}>NUM</Panel>
      <span data-slot="classic-size-grip" aria-hidden="true" className="size-[14px] self-end" />
    </footer>
  );
}
