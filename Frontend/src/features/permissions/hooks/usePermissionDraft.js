import { useState } from "react";
import { difference, toNumberSet } from "../components/permissionSets";

/**
 * نسخه‌ی در حالِ ویرایشِ یک مجموعه‌ی دسترسی در برابرِ نسخه‌ی ذخیره‌شده.
 *
 * فقط یک بار از سرور مقدار می‌گیرد: refetchِ پس‌زمینه (فوکوسِ پنجره) نباید
 * تیک‌های ذخیره‌نشده را پاک کند. بعد از ذخیره‌ی موفق `commit(saved)` نسخه‌ی
 * پایه را جلو می‌برد.
 */
export function usePermissionDraft(initialItems) {
  const [baseline, setBaseline] = useState(() => toNumberSet(initialItems));
  const [selected, setSelected] = useState(baseline);

  const added = difference(selected, baseline).length;
  const removed = difference(baseline, selected).length;

  return {
    baseline,
    selected,
    setSelected,
    added,
    removed,
    dirty: added + removed > 0,
    reset: () => setSelected(baseline),
    commit: (saved) => setBaseline(saved),
  };
}
