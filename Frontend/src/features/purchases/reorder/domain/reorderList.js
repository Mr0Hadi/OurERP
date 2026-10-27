import { getPartyName } from "@/shared/components/filters/filterUtils";

/**
 * فهرستِ پیشنهادِ خرید سمتِ کاربر: `GetReorderSuggestionList` صفحه‌بندی و مرتب‌سازی ندارد (کلِ فهرست یک‌جا
 * می‌آید)، پس مرتب‌سازی و صفحه‌بندی این‌جا انجام می‌شود و خروجی همان شکلِ فهرست‌های سرور است
 * (`{ items, total, page, totalPages }`) تا `ServerTable`/`DataTable` بی‌تغییر کار کنند.
 */

/**
 * کالایی که سفارش‌های در راهش آن را تا هدف (`targetStock`، یا نقطه‌ی سفارش) پوشش داده‌اند، کنار می‌رود؛
 * کالایی که بی‌سفارشِ در راه درست روی نقطه‌ی سفارش است می‌ماند (به نقطه‌ی سفارش رسیده).
 *
 * TODO(بکند): سرور کالا را تا `stock + onOrder ≤ نقطه‌ی سفارش` نگه می‌دارد؛ کالای بی‌موجودیِ‌هدف بعد از
 * ساختِ پیش‌فاکتور درست روی نقطه‌ی سفارش می‌ماند و با «۱» (حداقل سفارش) دوباره پیشنهاد می‌شد
 * (درخواستِ ۲۸ در `Backend-Net/docs/frontend-requests.fa.md`).
 */
export const needsOrder = (s) => s.onOrder === 0 || s.stock + s.onOrder < (s.targetStock ?? s.reorderPoint);

/** ستون‌های قابلِ مرتب‌سازی — همان نام‌های فیلدِ `ReorderSuggestionDto`. */
const SORT_VALUE = {
  productName: (s) => s.productName ?? "",
  supplierName: (s) => s.supplierName ?? "￿", // بی‌تامین‌کننده آخر
  stock: (s) => s.stock,
  onOrder: (s) => s.onOrder,
  suggestedQuantity: (s) => s.suggestedQuantity,
  lastUnitPrice: (s) => s.lastUnitPrice ?? 0,
};

const collator = new Intl.Collator("fa");

function compareBy(sorting) {
  const valueOf = SORT_VALUE[sorting?.id];
  if (!valueOf) return null;
  const dir = sorting.desc ? -1 : 1;
  return (a, b) => {
    const x = valueOf(a);
    const y = valueOf(b);
    const order = typeof x === "string" ? collator.compare(x, y) : x - y;
    // ترتیبِ پایدار برای مقدارهای برابر: نامِ کالا.
    return order * dir || collator.compare(a.productName ?? "", b.productName ?? "");
  };
}

/**
 * از پاسخِ خامِ سرور تا یک صفحه.
 * @returns {{ all: object[], items: object[], total: number, page: number, totalPages: number }}
 *   `all` همه‌ی ردیف‌های قابلِ نمایش (برای انتخاب‌های صفحه‌های دیگر)
 */
export function reorderPage(rows, { pageIndex, pageSize }, sorting) {
  const visible = (rows ?? []).filter(needsOrder);
  const compare = compareBy(sorting);
  const all = compare ? [...visible].sort(compare) : visible;
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.min(pageIndex, totalPages - 1);
  return {
    all,
    items: all.slice(page * pageSize, (page + 1) * pageSize),
    total: all.length,
    page: page + 1,
    totalPages,
  };
}

/**
 * نامِ تامین‌کننده برای پنجره‌ی نتیجه: از ردیف‌های پیشنهاد (تامین‌کننده‌ی سرور)، وگرنه از گزینه‌هایی که خریدار
 * برای کالای بی‌تامین‌کننده انتخاب کرد.
 *
 * @param {number} supplierId
 * @param {object[]} rows ردیف‌های پیشنهاد (`all`)
 * @param {object[]} suppliers گزینه‌های `useSuppliersOptionsQuery`
 */
export function supplierNameOf(supplierId, rows, suppliers) {
  const fromRow = rows.find((s) => s.supplierId === supplierId);
  if (fromRow) return fromRow.supplierName;
  const option = suppliers.find((s) => s.id === supplierId);
  return option ? getPartyName(option) : undefined;
}
