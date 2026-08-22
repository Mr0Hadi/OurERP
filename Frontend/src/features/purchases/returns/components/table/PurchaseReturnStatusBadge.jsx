import { Badge } from "@/shared/components/ui/badge";
import {
  PURCHASE_RETURN_STATUS_LABELS,
  PURCHASE_RETURN_STATUS_STYLES,
} from "../../domain/purchaseReturnVocabulary";

export default function PurchaseReturnStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={
        PURCHASE_RETURN_STATUS_STYLES[status] ??
        "bg-muted text-muted-foreground border-border"
      }
    >
      {PURCHASE_RETURN_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
