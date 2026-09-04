import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { getRowStatus, ROW_STATUS_CONFIG } from "./shippingRowStatus";

/** نمای جدولی یک قلم ارسال. */
export default function ShippingItemRow({ item, onItemChange }) {
  const shipped = item.shippedQuantity || 0;
  const status = getRowStatus(item.expectedQuantity, shipped);
  const config = ROW_STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <tr className={`hover:bg-accent/30 transition-colors ${config.rowClass}`}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <ProductThumb item={item} />
          <div className="min-w-0">
            <div className="font-medium text-card-foreground text-sm truncate">
              {item.productName}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {item.productCode}
            </div>
          </div>
        </div>
      </td>

      <td className="px-2 py-2 text-center tabular-nums">
        {item.expectedQuantity.toLocaleString("fa-IR")}
      </td>

      <td className="px-2 py-2">
        <QuantityStepper
          value={item.shippedQuantity}
          max={item.expectedQuantity}
          onChange={(next) => onItemChange(item.lineId, "shippedQuantity", next)}
        />
      </td>

      <td className="px-2 py-2">
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className={`gap-1 text-xs ${config.badgeClass}`}
          >
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </td>
    </tr>
  );
}
