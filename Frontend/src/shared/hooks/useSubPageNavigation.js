import { useLocation, useNavigate } from "react-router-dom";

import { useFormDraft } from "./useFormDraft";
import { returnedDataKey } from "./useReturnTo";

/**
 * رفتن از یک فرم به صفحه‌ی ساختِ چیزی تازه (کالا، مشتری، تامین‌کننده) و
 * برگشتن به همان فرم.
 *
 * `openSubPage(route)` صفحه‌ی مقصد را با `returnTo` همین صفحه و
 * `returnVia: "back"` باز می‌کند؛ آن صفحه (با `useReturnTo`) بعد از ثبت یا
 * انصراف یک قدم در تاریخچه برمی‌گردد. پیش از رفتن روی همین ورودیِ تاریخچه
 * `keepDraft` گذاشته می‌شود تا فرم بداند کاربر برگشته — چه با دکمه‌های آن
 * صفحه و چه با Back مرورگر.
 *
 * `returned` داده‌ای است که صفحه‌ی مقصد برگردانده (`{ newProductId }`، …)؛
 * یک‌بارمصرف و فقط لحظه‌ی ورود خوانده می‌شود (`useFormDraft`).
 */
export function useSubPageNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { draft: returned } = useFormDraft(returnedDataKey(location.pathname));

  const openSubPage = (route) => {
    // مستقیم روی ورودیِ فعلیِ تاریخچه؛ `navigate(..., { replace })` پیش از
    // `navigate(route)` کار نمی‌کرد: ناوبری‌های data router ناهمگام‌اند و
    // دومی اولی را پیش از ثبت کنار می‌زد. router این state را هنگامِ
    // برگشت (popstate) از همین ورودی می‌خواند.
    const entry = window.history.state ?? {};
    window.history.replaceState(
      { ...entry, usr: { ...entry.usr, keepDraft: true } },
      "",
    );
    navigate(route, {
      state: { returnTo: location.pathname, returnVia: "back" },
    });
  };

  return {
    openSubPage,
    returned,
    cameBack: Boolean(returned || location.state?.keepDraft),
  };
}
