import { Fragment } from "react";
import { Badge } from "@/shared/components/ui/badge";
import ProductThumb from "@/shared/components/forms/ProductThumb";
import QuantityStepper from "@/shared/components/forms/QuantityStepper";
import { getRowStatus, ROW_STATUS_CONFIG } from "./receivingRowStatus";
import IssueBreakdownEditor from "./IssueBreakdownEditor";
import { issueBudgetOf } from "../../domain/issueSemantics";
import ExcessEntryStrip from "./ExcessEntryStrip";

/**
 * نمای جدولی یک قلم دریافت. زیر هر قلم یک ردیف دوم باز می‌شود که دو
 * محور مستقل را نگه می‌دارد: کسری (فقط وقتی کمتر از سفارش رسیده) و
 * مازاد (همیشه در دسترس، چون از روی تعدادها قابل استنتاج نیست).
 * یک قلم می‌تواند هم‌زمان هر دو را داشته باشد.
 */
export default function ReceivingItemRow({
  item,
  onItemChange,
  onAddIssue,
  onUpdateIssue,
  onRemoveIssue,
  onExcessChange,
}) {
  const received = item.receivedQuantity || 0;
  // سقفِ گزارشِ مشکل به منبعِ خط بستگی دارد (کسری برای خط سفارش،
  // مقدارِ برگشتی برای خط مرجوعی) — issueBudget.js
  const issueBudget = issueBudgetOf(item);
  const status = getRowStatus(item.expectedQuantity, received);
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
          {item.expectedQuantity.toLocaleString("fa-IR")}
        </td>

        <td className="px-2 py-2">
          <QuantityStepper
            value={item.receivedQuantity}
            max={item.expectedQuantity}
            onChange={(next) =>
              onItemChange(item.lineId, "receivedQuantity", next)
            }
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

      <tr className={config.rowClass}>
        <td colSpan={4} className="px-3 pb-3 pt-0">
          <div className="space-y-2">
            {issueBudget > 0 && (
              <IssueBreakdownEditor
                item={item}
                budget={issueBudget}
                onAddIssue={onAddIssue}
                onUpdateIssue={onUpdateIssue}
                onRemoveIssue={onRemoveIssue}
              />
            )}
            <ExcessEntryStrip item={item} onExcessChange={onExcessChange} />
          </div>
        </td>
      </tr>
    </Fragment>
  );
}
