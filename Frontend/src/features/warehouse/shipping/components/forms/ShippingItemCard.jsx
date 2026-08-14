import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { getRowStatus, ROW_STATUS_CONFIG } from "./shippingRowStatus";

/** نمای موبایل یک قلم ارسال. */
export default function ShippingItemCard({ item, onItemChange }) {
  const shipped = item.shippedQty || 0;
  const status = getRowStatus(item.expectedQty, shipped);
  const config = ROW_STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`rounded-lg border border-border p-3 space-y-2.5 ${config.rowClass}`}
    >
      <div className="flex items-start gap-2.5">
        <ProductThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-card-foreground text-sm truncate">
            {item.productName}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
            <span>{item.productCode}</span>
          </div>
          {item.note && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {item.note}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={`gap-1 text-xs shrink-0 ${config.badgeClass}`}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        <span className="text-xs text-muted-foreground">
          باقی‌مانده برای ارسال:{" "}
          <span className="tabular-nums font-medium text-card-foreground">
            {item.expectedQty.toLocaleString("fa-IR")}
          </span>
        </span>
        <QuantityStepper
          value={item.shippedQty}
          max={item.expectedQty}
          onChange={(next) => onItemChange(item.productId, "shippedQty", next)}
          size="sm"
        />
      </div>
    </div>
  );
}
