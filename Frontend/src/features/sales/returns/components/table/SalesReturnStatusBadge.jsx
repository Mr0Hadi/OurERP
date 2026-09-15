import { Badge } from "@/shared/components/ui/badge";
import { SALES_RETURN_STATUS_LABELS } from "../../domain/salesReturnVocabulary";
import { RETURN_STATUS_STYLES } from "@/shared/domain/returns/statuses";

export default function SalesReturnStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={
        RETURN_STATUS_STYLES[status] ??
        "bg-muted text-muted-foreground border-border"
      }
    >
      {SALES_RETURN_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
