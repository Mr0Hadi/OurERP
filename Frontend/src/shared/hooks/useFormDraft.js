// src/shared/hooks/useFormDraft.js
import { useCallback, useEffect, useState } from "react";

import { useFormDraftStore } from "@/shared/store/formDraftStore";

/**
 * پیش‌نویسِ یک فرم، برای رفت‌وبرگشت به صفحه‌های «ایجاد جدید».
 *
 * `draft` هنگام mount *خوانده* می‌شود (نه با subscribe): اگر با subscribe
 * خوانده می‌شد، پاک‌شدنش بلافاصله فرم را دوباره رندر می‌کرد و
 * `defaultValues` را از دست می‌داد.
 *
 * خواندن و پاک‌کردن هم عمداً از هم جدا شده‌اند. خواندن داخل initializer
 * ی `useState` انجام می‌شود که باید *خالص* بماند — در StrictMode دو بار
 * صدا زده می‌شود و اگر همان‌جا پاک می‌کرد، بارِ دوم null برمی‌گرداند و
 * پیش‌نویس بی‌صدا گم می‌شد. پاک‌کردن در افکت است، بعد از اینکه مقدار
 * خوانده شده.
 *
 * استفاده:
 *   const { draft, saveDraft, clearDraft } = useFormDraft(`department:${id}`);
 *   ...
 *   saveDraft(getValues());              // درست قبل از navigate
 *   navigate(target, { state: { returnTo } });
 */
export function useFormDraft(key) {
  const save = useFormDraftStore((s) => s.saveDraft);
  const clear = useFormDraftStore((s) => s.clearDraft);

  const [draft] = useState(
    () => useFormDraftStore.getState().drafts[key] ?? null,
  );

  // یک‌بارمصرف: اگر کاربر فرم را رها کند و بعداً از جای دیگری برگردد،
  // نباید با یک فرمِ کهنه روبه‌رو شود.
  useEffect(() => {
    clear(key);
  }, [clear, key]);

  const saveDraft = useCallback((values) => save(key, values), [save, key]);
  const clearDraft = useCallback(() => clear(key), [clear, key]);

  return { draft, saveDraft, clearDraft };
}
