import { Badge } from "@/shared/components/ui/badge";

const STATUS_STYLES = {
  pending:
    "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100",
  shipped: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  partially_received:
    "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100",
  received: "bg-green-100 text-green-800 border-green-300 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 border-red-300 hover:bg-red-100",
};

export default function PurchaseStatusBadge({ status, labels }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"}>
      {labels?.[status] ?? status}
    </Badge>
  );
}
