import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { getRowStatus, ROW_STATUS_CONFIG } from "./receivingRowStatus";

/**
 * نمای جدولیِ یک قلمِ دریافت.
 *
 * فقط تعداد گرفته می‌شود: `ReceivePurchaseCommand` جایی برای گزارشِ
 * مغایرت ندارد و کسری/آسیب باید جدا به‌صورتِ مرجوعیِ خرید ثبت شود.
 */
export default function ReceivingItemRow({ item, onItemChange }) {
  const received = item.receivedQuantity || 0;
  const status = getRowStatus(item.stillOwedQuantity, received);
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
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5">
              <span>{item.productCode}</span>
              {item.brand && (
                <>
                  <span className="text-border">|</span>
                  <span>برند: {item.brand}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
        {item.orderedQuantity.toLocaleString("fa-IR")}
      </td>

      <td className="px-2 py-2 text-center tabular-nums">
        {item.stillOwedQuantity.toLocaleString("fa-IR")}
      </td>

      <td className="px-2 py-2">
        <QuantityStepper
          value={item.receivedQuantity}
          max={item.stillOwedQuantity}
          onChange={(next) => onItemChange(item.purchaseItemId, next)}
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
