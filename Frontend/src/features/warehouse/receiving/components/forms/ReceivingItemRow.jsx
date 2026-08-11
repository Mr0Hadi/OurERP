import { Fragment } from "react";
import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { getRowStatus, ROW_STATUS_CONFIG } from "./receivingRowStatus";
import IssueBreakdownEditor from "./IssueBreakdownEditor";

/**
 * نمای جدولی یک قلم دریافت. وقتی کسری وجود دارد، یک ردیف دوم برای
 * تفکیک مشکل زیر همان قلم باز می‌شود.
 */
export default function ReceivingItemRow({
  item,
  onItemChange,
  onAddIssue,
  onUpdateIssue,
  onRemoveIssue,
}) {
  const received = item.receivedQty || 0;
  const shortage = Math.max(0, item.expectedQty - received);
  const status = getRowStatus(item.expectedQty, received);
  const config = ROW_STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <Fragment>
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

        <td className="px-2 py-2 text-center tabular-nums">
          {item.expectedQty.toLocaleString("fa-IR")}
        </td>

        <td className="px-2 py-2">
          <QuantityStepper
            item={item}
            field="receivedQty"
            onItemChange={onItemChange}
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

      {shortage > 0 && (
        <tr className={config.rowClass}>
          <td colSpan={4} className="px-3 pb-3 pt-0">
            <IssueBreakdownEditor
              item={item}
              shortage={shortage}
              onAddIssue={onAddIssue}
              onUpdateIssue={onUpdateIssue}
              onRemoveIssue={onRemoveIssue}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
