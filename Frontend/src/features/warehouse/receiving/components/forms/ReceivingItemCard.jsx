import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { getRowStatus, ROW_STATUS_CONFIG } from "./receivingRowStatus";
import IssueBreakdownEditor from "./IssueBreakdownEditor";

/** نمای موبایل یک قلم دریافت. */
export default function ReceivingItemCard({
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
            {item.brand && (
              <>
                <span className="text-border">|</span>
                <span>برند: {item.brand}</span>
              </>
            )}
          </div>
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
          مورد انتظار:{" "}
          <span className="tabular-nums font-medium text-card-foreground">
            {item.expectedQty.toLocaleString("fa-IR")}
          </span>
        </span>
        <QuantityStepper
          item={item}
          field="receivedQty"
          onItemChange={onItemChange}
          size="sm"
        />
      </div>

      {shortage > 0 && (
        <IssueBreakdownEditor
          item={item}
          shortage={shortage}
          onAddIssue={onAddIssue}
          onUpdateIssue={onUpdateIssue}
          onRemoveIssue={onRemoveIssue}
        />
      )}
    </div>
  );
}
