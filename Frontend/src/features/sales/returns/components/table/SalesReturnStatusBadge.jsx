import { Badge } from "@/shared/components/ui/badge";
import { SALES_RETURN_STATUS_LABELS } from "../../services/mockData";

const STATUS_STYLES = {
  pending_inspection:
    "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100",
  coordinating: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  resolved: "bg-green-100 text-green-800 border-green-300 hover:bg-green-100",
  rejected: "bg-red-100 text-red-800 border-red-300 hover:bg-red-100",
  cancelled: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-100",
};

export default function SalesReturnStatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"}
    >
      {SALES_RETURN_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
