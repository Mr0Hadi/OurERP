import { CheckCircle2, CircleDashed, PencilLine } from "lucide-react";

import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import UnitBarcodeScanList from "@/shared/components/barcode/UnitBarcodeScanList";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/**
 * یک ردیفِ پیش‌فاکتور در بررسیِ انبار: دانه‌هایی که برداشته می‌شوند اسکن (و با ثبت رزرو) می‌شوند.
 * اگر کالا کم است، انباردار تعدادِ تأییدی را کم می‌کند (تا صفر = حذفِ ردیف)؛ دلیلش در صفحه
 * الزامی می‌شود.
 *
 * @param quantity  تعدادِ تأییدی
 * @param need      دانه‌هایی که باید اسکن شوند
 * @param canEdit   کاربر می‌تواند تعداد را تغییر دهد
 */
export default function SaleCheckItemCard({ item, quantity, need, barcodes, canEdit, onQuantityChange, onBarcodesChange }) {
  const ordered = Number(item.quantity) || 0;
  const changed = quantity !== ordered;
  const removed = quantity === 0;
  const reservedKept = !changed && Number(item.reservedQuantity) > 0;
  const done = barcodes.length >= need;

  return (
    <div className={cn("space-y-3 rounded-lg border p-3", changed && "border-warning/60 bg-warning/5", removed && "opacity-70")}>
      <div className="flex items-start gap-2.5">
        <ProductThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-medium", removed && "line-through")}>{item.productName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {item.productCode && <span className="font-mono">{item.productCode} · </span>}
            سفارش {formatNumber(ordered)}
            {reservedKept && ` · ${formatNumber(item.reservedQuantity)} از قبل رزرو`}
            {item.freeStock != null && ` · موجودیِ آزاد ${formatNumber(item.freeStock)}`}
          </p>
        </div>
        {removed ? (
          <StatusBadge tone="caution" className="shrink-0">حذف می‌شود</StatusBadge>
        ) : (
          <StatusBadge tone={done ? "success" : "neutral"} icon={done ? CheckCircle2 : CircleDashed} className="shrink-0">
            {need === 0 ? "رزرو کامل" : `${formatNumber(barcodes.length)} از ${formatNumber(need)}`}
          </StatusBadge>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <PencilLine className="size-3.5" />
            تعدادِ تأییدی
            {changed && <span className="font-medium text-warning">(تغییر کرد)</span>}
          </span>
          <QuantityStepper value={quantity} max={ordered} onChange={onQuantityChange} size="sm" />
        </div>
      )}

      {need > 0 && (
        <UnitBarcodeScanList productId={item.productId} barcodes={barcodes} max={need} required onChange={onBarcodesChange} />
      )}
    </div>
  );
}
