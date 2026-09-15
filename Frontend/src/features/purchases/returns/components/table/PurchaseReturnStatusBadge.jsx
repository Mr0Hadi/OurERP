import { Badge } from "@/shared/components/ui/badge";
import { PURCHASE_RETURN_STATUS_LABELS } from "../../domain/purchaseReturnVocabulary";
import { RETURN_STATUS_STYLES } from "@/shared/domain/returns/statuses";

export default function PurchaseReturnStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={
        RETURN_STATUS_STYLES[status] ??
        "bg-muted text-muted-foreground border-border"
      }
    >
      {PURCHASE_RETURN_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
