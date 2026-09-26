import { useCallback, useMemo } from "react";
import { useDashboardLayoutStore } from "../store/dashboardLayoutStore";
import { WIDGETS_BY_ID, resolveLayout } from "../domain/widgetRegistry";

/**
 * چیدمانِ نهاییِ داشبوردِ این کاربر، به‌همراهِ کارهایی که پنلِ
 * شخصی‌سازی رویش انجام می‌دهد.
 *
 * هر تغییر بلافاصله ذخیره می‌شود (دکمه‌ی «ذخیره» ندارد): پنل کنارِ خودِ
 * داشبورد باز است و کاربر نتیجه را همان لحظه می‌بیند؛ چیزی برای «لغو»
 * باقی نمی‌ماند که «بازنشانی» پوشش ندهد.
 */
export function useDashboardLayout(context) {
  const userId = context.user?.id;
  const saved = useDashboardLayoutStore((s) =>
    userId == null ? undefined : s.layouts[userId],
  );
  const saveLayout = useDashboardLayoutStore((s) => s.saveLayout);
  const resetLayout = useDashboardLayoutStore((s) => s.resetLayout);

  const layout = useMemo(() => resolveLayout(context, saved), [context, saved]);

  const hidden = useMemo(() => new Set(layout.hidden), [layout.hidden]);
  const visibleIds = useMemo(
    () => layout.order.filter((id) => !hidden.has(id)),
    [layout.order, hidden],
  );

  const commit = useCallback(
    (next) => {
      if (userId != null) saveLayout(userId, next);
    },
    [userId, saveLayout],
  );

  const toggle = useCallback(
    (id, visible) => {
      if (WIDGETS_BY_ID[id]?.locked) return;
      const nextHidden = visible
        ? layout.hidden.filter((x) => x !== id)
        : [...new Set([...layout.hidden, id])];
      commit({ order: layout.order, hidden: nextHidden });
    },
    [layout, commit],
  );

  const move = useCallback(
    (id, offset) => {
      const order = [...layout.order];
      const from = order.indexOf(id);
      const to = from + offset;
      if (from < 0 || to < 0 || to >= order.length) return;
      // ویجتِ قفل (سرِ صفحه) جابه‌جا نمی‌شود و کسی هم از رویش رد نمی‌شود.
      if (WIDGETS_BY_ID[order[from]]?.locked || WIDGETS_BY_ID[order[to]]?.locked) {
        return;
      }
      [order[from], order[to]] = [order[to], order[from]];
      commit({ order, hidden: layout.hidden });
    },
    [layout, commit],
  );

  const reset = useCallback(() => {
    if (userId != null) resetLayout(userId);
  }, [userId, resetLayout]);

  return {
    order: layout.order,
    hidden,
    visibleIds,
    isCustomized: saved != null,
    toggle,
    move,
    reset,
  };
}
