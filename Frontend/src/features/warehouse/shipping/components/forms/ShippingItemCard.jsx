import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import UnitBarcodeScanList from "@/shared/components/barcode/UnitBarcodeScanList";
import { getRowStatus, ROW_STATUS_CONFIG } from "./shippingRowStatus";
import { EXCESS_QUANTITY_CAP } from "../../hooks/useShippingForm";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * یک قلمِ ارسال: سهمِ سفارشِ همین دور، و در صورت نیاز مازاد و اسکنِ دانه‌ها.
 *
 * بخشِ «بیشتر» برای کالای ردیابی‌پذیر یا وقتی مازاد ثبت شده باز است؛ در
 * حالتِ پرتکرار (کالای فله، بدون مازاد) کارت فقط یک شمارنده است.
 */
export default function ShippingItemCard({
  item,
  isTracked,
  allowExcess = false,
  onItemChange,
  onExcessChange,
  onBarcodesChange,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shipped = Number(item.shippedQuantity) || 0;
  const excess = Number(item.excessQuantity) || 0;
  const isFullyShipped = item.remainingQuantity === 0;
  const status = getRowStatus(item.remainingQuantity, shipped);
  const config = ROW_STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const canExcess = allowExcess || excess > 0;
  // بدون مازاد، بخشِ «بیشتر» فقط اسکنِ دانه‌های همین دور است.
  const showExtras = canExcess
    ? isExpanded || isTracked || excess > 0
    : (isExpanded || isTracked) && shipped > 0;

  return (
    <div
      className={`rounded-lg border border-border p-3 space-y-2.5 ${
        isFullyShipped ? "" : config.rowClass
      }`}
    >
      <div className="flex items-start gap-2.5">
        <ProductThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-card-foreground text-sm truncate">
            {item.productName}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            سفارش {fa(item.quantity)}
            {isTracked && " · ردیابی دانه‌ای"}
          </p>
        </div>
        {isFullyShipped ? (
          <Badge variant="outline" className={`text-xs shrink-0 ${ROW_STATUS_CONFIG.complete.badgeClass}`}>
            ارسال کامل شده
          </Badge>
        ) : (
          <Badge variant="outline" className={`gap-1 text-xs shrink-0 ${config.badgeClass}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        )}
      </div>

      {!isFullyShipped && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <span className="text-xs text-muted-foreground">
            باقی‌مانده برای ارسال:{" "}
            <span className="tabular-nums font-medium text-card-foreground">
              {fa(item.remainingQuantity)}
            </span>
          </span>
          <QuantityStepper
            value={item.shippedQuantity}
            max={item.remainingQuantity}
            onChange={(next) => onItemChange(item.saleItemId, next)}
            size="sm"
          />
        </div>
      )}

      {!isTracked && excess === 0 && (canExcess || !isFullyShipped) && (
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-card-foreground"
          onClick={() => setIsExpanded((open) => !open)}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
          {canExcess ? "اسکن دانه‌ها / ثبت ارسالِ اشتباهِ بیش از فاکتور" : "اسکن دانه‌ها"}
        </button>
      )}

      {showExtras && (
        <div className="space-y-3 rounded-md border border-dashed border-border p-2.5">
          {shipped > 0 && (
            <UnitBarcodeScanList
              productId={item.productId}
              barcodes={item.productUnitBarcodes}
              max={shipped}
              required={isTracked}
              onChange={(next) =>
                onBarcodesChange(item.saleItemId, "productUnitBarcodes", next)
              }
            />
          )}

          {canExcess && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              ثبتِ ارسالِ اشتباهِ بیش از فاکتور
              <span className="block text-[11px]">
                فقط برای خطایی که کشف شده (مثلاً کسریِ قفسه نشان می‌دهد دانه‌ای اضافه
                رفته) — نه ارسالِ عمدی. بدون درآمد ثبت می‌شود و مشتری می‌تواند پسش بدهد.
              </span>
            </span>
            <QuantityStepper
              value={item.excessQuantity}
              max={EXCESS_QUANTITY_CAP}
              onChange={(next) => onExcessChange(item.saleItemId, next)}
              size="sm"
            />
          </div>
          )}

          {excess > 0 && (
            <UnitBarcodeScanList
              productId={item.productId}
              barcodes={item.excessProductUnitBarcodes}
              max={excess}
              required={isTracked}
              onChange={(next) =>
                onBarcodesChange(item.saleItemId, "excessProductUnitBarcodes", next)
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
