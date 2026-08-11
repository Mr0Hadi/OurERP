import { Truck, Undo2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  INCOMING_TYPES,
  INCOMING_TYPE_LABELS,
} from "../../services/incomingQueueApi";

const TYPE_STYLES = {
  [INCOMING_TYPES.PURCHASE]:
    "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  [INCOMING_TYPES.SALES_RETURN]:
    "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-100",
};

const TYPE_ICON = {
  [INCOMING_TYPES.PURCHASE]: Truck,
  [INCOMING_TYPES.SALES_RETURN]: Undo2,
};

export default function ReceivingTypeBadge({ type }) {
  const Icon = TYPE_ICON[type] ?? Truck;
  return (
    <Badge
      className={`gap-1 ${TYPE_STYLES[type] ?? "bg-gray-100 text-gray-800"}`}
    >
      <Icon className="h-3 w-3" />
      {INCOMING_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}
