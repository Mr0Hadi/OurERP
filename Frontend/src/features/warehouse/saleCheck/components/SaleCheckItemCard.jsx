import { CheckCircle2, CircleDashed } from "lucide-react";

import ProductThumb from "@/shared/components/forms/ProductThumb";
import UnitBarcodeScanList from "@/shared/components/barcode/UnitBarcodeScanList";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { lineNeed } from "../domain/saleCheck";

/**
 * یک ردیفِ پیش‌فاکتور در بررسیِ انبار: دانه‌هایی که برداشته می‌شوند اسکن (و با ثبت رزرو)
 * می‌شوند. دانه‌های رزروشده از بررسیِ قبلی دوباره اسکن نمی‌خواهند.
 */
export default function SaleCheckItemCard({ item, barcodes, onChange }) {
  const need = lineNeed(item);
  const reserved = Number(item.reservedQuantity) || 0;
  const done = barcodes.length >= need;

  return (
    <div className={cn("space-y-3 rounded-lg border p-3", !done && "border-dashed")}>
      <div className="flex items-start gap-2.5">
        <ProductThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.productName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {item.productCode && <span className="font-mono">{item.productCode} · </span>}
            سفارش {formatNumber(item.quantity)}
            {reserved > 0 && ` · ${formatNumber(reserved)} از قبل رزرو`}
            {item.freeStock != null && ` · موجودیِ آزاد ${formatNumber(item.freeStock)}`}
          </p>
        </div>
        <StatusBadge tone={done ? "success" : "caution"} icon={done ? CheckCircle2 : CircleDashed} className="shrink-0">
          {need === 0 ? "رزرو کامل" : `${formatNumber(barcodes.length)} از ${formatNumber(need)}`}
        </StatusBadge>
      </div>

      {need > 0 && (
        <UnitBarcodeScanList productId={item.productId} barcodes={barcodes} max={need} required onChange={onChange} />
      )}
    </div>
  );
}
