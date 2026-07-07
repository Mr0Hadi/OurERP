// src/features/sales/components/forms/SaleStatusSection.jsx

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  SALE_STATUSES,
  SALE_STATUS_LABELS,
} from "../../services/constants";
import {
  Clock,
  Loader2,
  PackageOpen,
  PackageCheck,
  XCircle,
  Activity,
} from "lucide-react";

const STATUS_CONFIG = {
  [SALE_STATUSES.PENDING]: {
    icon: Clock,
    textColor: "text-amber-600 dark:text-amber-400",
  },
  [SALE_STATUSES.PROCESSING]: {
    icon: Loader2,
    textColor: "text-blue-600 dark:text-blue-400",
  },
  [SALE_STATUSES.PARTIALLY_DELIVERED]: {
    icon: PackageOpen,
    textColor: "text-orange-600 dark:text-orange-400",
  },
  [SALE_STATUSES.DELIVERED]: {
    icon: PackageCheck,
    textColor: "text-[oklch(0.50_0.16_152)] dark:text-[oklch(0.70_0.16_152)]",
  },
  [SALE_STATUSES.CANCELLED]: {
    icon: XCircle,
    textColor: "text-destructive",
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  textColor: "text-card-foreground",
};

export default function SaleStatusSection({ selectedStatus, onStatusChange }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" />
          وضعیت سفارش
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 mt-0">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-card-foreground">
            تغییر وضعیت
          </Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="وضعیت را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SALE_STATUS_LABELS).map(([key, label]) => {
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
