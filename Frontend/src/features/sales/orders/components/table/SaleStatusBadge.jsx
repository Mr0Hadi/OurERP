import { Badge } from "@/shared/components/ui/badge";
import { SALE_STATUS_LABELS, SALE_STATUSES } from "../../services/mockData";

const STATUS_STYLES = {
  [SALE_STATUSES.PROCESSING]: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  [SALE_STATUSES.PARTIALLY_DELIVERED]:
    "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100",
  [SALE_STATUSES.SHIPPED]:
    "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-100",
  [SALE_STATUSES.DELIVERED]: "bg-green-100 text-green-800 border-green-300 hover:bg-green-100",
  [SALE_STATUSES.CANCELLED]: "bg-red-100 text-red-800 border-red-300 hover:bg-red-100",
  [SALE_STATUSES.RETURNED]: "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100",
};

export default function SaleStatusBadge({ status }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"}>
      {SALE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
