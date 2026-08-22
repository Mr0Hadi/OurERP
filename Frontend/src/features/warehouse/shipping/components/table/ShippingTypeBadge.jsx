import { Truck, PackageMinus } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  OUTGOING_TYPES,
  OUTGOING_TYPE_LABELS,
} from "../../domain/shippingVocabulary";

const TYPE_STYLES = {
  [OUTGOING_TYPES.SALE]:
    "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100",
  [OUTGOING_TYPES.RETURN_TO_SUPPLIER]:
    "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100",
};

const TYPE_ICON = {
  [OUTGOING_TYPES.SALE]: Truck,
  [OUTGOING_TYPES.RETURN_TO_SUPPLIER]: PackageMinus,
};

export default function ShippingTypeBadge({ type }) {
  const Icon = TYPE_ICON[type] ?? Truck;
  return (
    <Badge
      className={`gap-1 ${TYPE_STYLES[type] ?? "bg-gray-100 text-gray-800"}`}
    >
      <Icon className="h-3 w-3" />
      {OUTGOING_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}
