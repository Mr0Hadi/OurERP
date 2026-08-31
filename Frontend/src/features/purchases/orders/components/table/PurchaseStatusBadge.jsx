import { Badge } from "@/shared/components/ui/badge";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";

const STATUS_STYLES = {
  [PurchaseStatusEnum.PROFORMA]:
    "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-100",
  [PurchaseStatusEnum.PENDING]:
    "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100",
  [PurchaseStatusEnum.SHIPPED]: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  [PurchaseStatusEnum.PARTIALLY_RECEIVED]:
    "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100",
  [PurchaseStatusEnum.RECEIVED]:
    "bg-green-100 text-green-800 border-green-300 hover:bg-green-100",
  [PurchaseStatusEnum.CANCELLED]: "bg-red-100 text-red-800 border-red-300 hover:bg-red-100",
};

export default function PurchaseStatusBadge({ status, labels }) {
  return (
    <Badge className={STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"}>
      {labels?.[status] ?? status}
    </Badge>
  );
}
