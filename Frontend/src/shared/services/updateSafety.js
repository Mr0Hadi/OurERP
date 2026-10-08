import { useEffect, useId } from "react";
import { create } from "zustand";

/**
 * «الان می‌شود صفحه را از نو بارگذاری کرد؟» — دفترِ مشترکِ بروزرسانیِ برنامه.
 *
 * هر جایی که بارگذاریِ دوباره کارِ کاربر را از بین می‌برد (فرمِ نیمه‌کاره،
 * کارتخوان، آپلود، ثبتِ در جریان) با `useUpdateGuard` خودش را اینجا ثبت می‌کند و
 * با رفتنِ حالتش (یا بسته‌شدنِ صفحه) خودکار برمی‌دارد. `appUpdate.js` فقط
 * `getUpdateBlocker()` را می‌پرسد و از جزئیاتِ فرم‌ها خبر ندارد.
 *
 * فقط وقتی ثبت می‌شود که `dirty` یا `busy` باشد؛ دفتر همیشه تقریباً خالی است.
 */

const DIRTY_REASON = "تغییراتِ ذخیره‌نشده دارید";
const BUSY_REASON = "عملیاتی در جریان است";
/** دلیلِ مشترکِ آپلودِ فایل (`useImageUpload`، `useFileUploadList`). */
export const UPLOADING_REASON = "آپلودِ فایل در جریان است";

export const useUpdateSafetyStore = create(() => ({ guards: {} }));

function setGuard(id, guard) {
  useUpdateSafetyStore.setState((state) => ({ guards: { ...state.guards, [id]: guard } }));
}

function clearGuard(id) {
  useUpdateSafetyStore.setState((state) => {
    const guards = { ...state.guards };
    delete guards[id];
    return { guards };
  });
}

/**
 * اگر چیزی جلوی بارگذاریِ دوباره را می‌گیرد دلیلش (متنِ فارسی)، وگرنه `null`.
 * کارِ در جریان بر تغییرِ ذخیره‌نشده مقدم است.
 */
export function getUpdateBlocker() {
  const guards = Object.values(useUpdateSafetyStore.getState().guards);
  if (guards.length === 0) return null;
  const guard = guards.find((g) => g.busy) ?? guards[0];
  return guard.reason || (guard.busy ? BUSY_REASON : DIRTY_REASON);
}

/**
 * ثبتِ حالتِ این کامپوننت در دفتر تا وقتی `dirty` یا `busy` است.
 *
 * @param dirty  تغییرِ ذخیره‌نشده — با ذخیره/انصراف خاموش می‌شود
 * @param busy   کارِ در جریان (ثبتِ فاکتور، آپلود، کارتخوان)
 * @param reason دلیل برای کاربر؛ پیش‌فرض بر اساسِ dirty/busy
 */
export function useUpdateGuard({ dirty = false, busy = false, reason } = {}) {
  const id = useId();
  useEffect(() => {
    if (!dirty && !busy) return undefined;
    setGuard(id, { dirty, busy, reason });
    return () => clearGuard(id);
  }, [id, dirty, busy, reason]);
}
