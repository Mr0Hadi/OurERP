// src/features/purchases/components/PurchaseStatusSection.jsx

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
} from "#/features/purchases/services/mockData";
import {
  Clock,
  Truck,
  PackageCheck,
  PackageOpen,
  XCircle,
  Activity,
} from "lucide-react";

const STATUS_CONFIG = {
  [PURCHASE_STATUSES.PENDING]: {
    icon: Clock,
    textColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  [PURCHASE_STATUSES.SHIPPED]: {
    icon: Truck,
    textColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  [PURCHASE_STATUSES.PARTIALLY_RECEIVED]: {
    icon: PackageOpen,
    textColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  [PURCHASE_STATUSES.RECEIVED]: {
    icon: PackageCheck,
    textColor: "text-[oklch(0.50_0.16_152)] dark:text-[oklch(0.70_0.16_152)]",
    bgColor: "bg-green-50 dark:bg-green-950/40",
    borderColor: "border-green-200 dark:border-green-800",
  },
  [PURCHASE_STATUSES.CANCELLED]: {
    icon: XCircle,
    textColor: "text-destructive",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/20",
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  textColor: "text-card-foreground",
  bgColor: "bg-muted/50",
  borderColor: "border-border",
};

export default function PurchaseStatusSection({
  status,
  selectedStatus,
  onStatusChange,
}) {
  const currentLabel = PURCHASE_STATUS_LABELS[status] || status;
  const config = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" />
          وضعیت سفارش
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 mt-0">

        {/* فیلد تغییر وضعیت */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-card-foreground">
            تغییر وضعیت
          </Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="وضعیت را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PURCHASE_STATUS_LABELS).map(([key, label]) => {
                const itemConfig = STATUS_CONFIG[key] ?? DEFAULT_CONFIG;
                const ItemIcon = itemConfig.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <span
                      className={`flex items-center gap-2 ${itemConfig.textColor}`}
                    >
                      <ItemIcon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
