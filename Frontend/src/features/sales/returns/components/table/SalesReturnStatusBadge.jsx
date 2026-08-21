import { Badge } from "@/shared/components/ui/badge";
import {
  SALES_RETURN_STATUS_LABELS,
  SALES_RETURN_STATUS_STYLES,
} from "../../domain/returnVocabulary";

export default function SalesReturnStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={
        SALES_RETURN_STATUS_STYLES[status] ??
        "bg-muted text-muted-foreground border-border"
      }
    >
      {SALES_RETURN_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
