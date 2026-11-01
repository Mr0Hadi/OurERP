/**
 * چیدمانِ داشبورد روی سیم: رشته‌ی JSONِ `{ order, hidden }` (`SaveMyDashboardLayout`، حداکثر ۴۰۰۰ نویسه).
 * سرور محتوا را نمی‌شناسد؛ شکلِ نامعتبر مثلِ «چیدمانی نیست» است و `resolveLayout` پیش‌فرض را می‌گذارد.
 */
export function parseLayout(text) {
  if (!text) return undefined;
  try {
    const value = JSON.parse(text);
    return Array.isArray(value?.order) && Array.isArray(value?.hidden) ? value : undefined;
  } catch {
    return undefined;
  }
}

export const serializeLayout = (layout) => (layout ? JSON.stringify({ order: layout.order, hidden: layout.hidden }) : null);
