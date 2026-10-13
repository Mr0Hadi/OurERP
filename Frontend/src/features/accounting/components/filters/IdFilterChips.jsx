import { X } from "lucide-react";

import { formatDigits } from "@/shared/lib/numberFormat";

/**
 * فیلترهای شناسه‌ای که در پنلِ فیلتر جایی ندارند (`saleId`، `productId`، …) و فقط از پیوندِ
 * صفحه‌ای دیگر می‌آیند. بی‌این چیپ‌ها جدول بی‌صدا محدود می‌ماند و کاربر نمی‌فهمید چرا فقط
 * سه ردیف می‌بیند؛ هر چیپ با ضربدر برداشته می‌شود.
 *
 * @param items `[{ key, label, value, onClear }]`؛ مقدارِ خالی نمایش داده نمی‌شود
 */
export default function IdFilterChips({ items }) {
  const active = items.filter((item) => item.value !== "" && item.value != null);
  if (active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">محدود به:</span>
      {active.map((item) => (
        <span
          key={item.key}
          className="flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 ps-2.5 pe-1 text-xs text-primary"
        >
          {item.label} {formatDigits(item.value)}
          <button
            type="button"
            onClick={item.onClear}
            aria-label={`برداشتنِ ${item.label}`}
            className="flex size-5 items-center justify-center rounded-full hover:bg-primary/15"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
