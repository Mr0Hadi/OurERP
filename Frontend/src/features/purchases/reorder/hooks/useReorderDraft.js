import { useState } from "react";

/**
 * ردیفِ پیش‌فرض از پیشنهادِ سرور. هیچ ردیفی خودبه‌خود تیک نمی‌خورد؛ خریدار خودش انتخاب می‌کند.
 * قیمت اینجا ویرایش نمی‌شود (آخرین قیمتِ خرید می‌رود)؛ پیش‌فاکتورِ ساخته‌شده خودش ویرایش‌پذیر است.
 */
const defaultsOf = (suggestion) => ({
  selected: false,
  quantity: suggestion.suggestedQuantity,
  supplierId: suggestion.supplierId ?? null,
});

/**
 * پیش‌نویسِ خریدار روی فهرستِ پیشنهاد: انتخاب، تعداد (با `QuantityStepper`، همیشه عددِ صحیحِ ≥ ۱) و
 * تامین‌کننده‌ی هر کالا.
 * فقط «تغییرها» (بر اساسِ `productId`) نگه داشته می‌شوند و روی پیشنهادِ سرور می‌نشینند؛ پس عوض‌شدنِ صفحه،
 * مرتب‌سازی یا فیلتر انتخاب‌ها را پاک نمی‌کند.
 *
 * @param all همه‌ی ردیف‌های قابلِ نمایش (نه فقط صفحه‌ی فعلی) تا خلاصه و بدنه همه‌ی انتخاب‌ها را ببینند
 */
export function useReorderDraft(all = []) {
  const [edits, setEdits] = useState({});

  const lineOf = (suggestion) => {
    const line = { ...defaultsOf(suggestion), ...edits[suggestion.productId] };
    return { ...line, needsSupplier: line.selected && !line.supplierId };
  };

  const selected = all
    .map((suggestion) => ({ suggestion, ...lineOf(suggestion) }))
    .filter((line) => line.selected);

  const hasProblem = selected.some((line) => line.needsSupplier);
  const summary = {
    count: selected.length,
    supplierCount: new Set(selected.map((line) => line.supplierId).filter(Boolean)).size,
    total: selected.reduce((sum, line) => sum + line.quantity * (line.suggestion.lastUnitPrice || 0), 0),
    hasProblem,
    problem: hasProblem ? "برای کالای انتخاب‌شده‌ی بی‌تامین‌کننده، تامین‌کننده انتخاب کنید" : null,
  };

  const update = (productId, patch) =>
    setEdits((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));

  /** بدنه‌ی `CreatePurchaseDraftsFromReorder`؛ `null` وقتی چیزی انتخاب نشده یا ردیفی تامین‌کننده ندارد. */
  const buildPayload = () =>
    summary.count === 0 || summary.hasProblem
      ? null
      : {
          lines: selected.map((line) => ({
            productId: line.suggestion.productId,
            supplierId: line.supplierId,
            quantity: line.quantity,
            unitPrice: line.suggestion.lastUnitPrice ?? 0,
          })),
        };

  /** «لغو انتخاب»: تیک‌ها برداشته می‌شوند، تعداد و تامین‌کننده‌ی ویرایش‌شده می‌ماند. */
  const clearSelection = () =>
    setEdits((prev) =>
      Object.fromEntries(Object.entries(prev).map(([id, edit]) => [id, { ...edit, selected: false }])),
    );

  /** بعد از ساختِ پیش‌فاکتورها: ویرایشِ آن کالاها دیگر معنا ندارد. */
  const clear = (productIds) =>
    setEdits((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !productIds.includes(Number(id)))));

  return { lineOf, summary, update, buildPayload, clear, clearSelection };
}
