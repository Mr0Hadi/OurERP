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
  SaleStatusEnum as SALE_STATUSES,
  SALE_STATUS_LABELS,
} from "@/shared/domain/enums/saleStatus";
import {
  Loader2,
  PackageOpen,
  Truck,
  PackageCheck,
  XCircle,
  Activity,
  FileText,
  Undo2,
} from "lucide-react";
import {
  manualSaleStatusOptions,
  saleStatusHint,
} from "../../domain/saleRules";

const STATUS_CONFIG = {
  [SALE_STATUSES.PROFORMA]: {
    icon: FileText,
    textColor: "text-slate-600 dark:text-slate-300",
  },
  [SALE_STATUSES.PROCESSING]: {
    icon: Loader2,
    textColor: "text-blue-600 dark:text-blue-400",
  },
  [SALE_STATUSES.PARTIALLY_DELIVERED]: {
    icon: PackageOpen,
    textColor: "text-orange-600 dark:text-orange-400",
  },
  [SALE_STATUSES.SHIPPED]: {
    icon: Truck,
    textColor: "text-indigo-600 dark:text-indigo-400",
  },
  [SALE_STATUSES.DELIVERED]: {
    icon: PackageCheck,
    textColor: "text-[oklch(0.50_0.16_152)] dark:text-[oklch(0.70_0.16_152)]",
  },
  [SALE_STATUSES.CANCELLED]: {
    icon: XCircle,
    textColor: "text-destructive",
  },
  [SALE_STATUSES.RETURNED]: {
    icon: Undo2,
    textColor: "text-purple-600 dark:text-purple-400",
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  textColor: "text-card-foreground",
};

function StatusLabel({ status }) {
  const config = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;
  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-2 ${config.textColor}`}>
      <Icon className="h-3.5 w-3.5" />
      {SALE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

/**
 * وضعیتِ فروش. بیشترِ وضعیت‌ها را سرور تعیین می‌کند — پیش‌فاکتور با اولین
 * پرداخت خارج می‌شود و «ارسال ناقص/شده» را ارسالِ انبار می‌گذارد — پس
 * کشویی فقط قدم‌های دستیِ مجاز را نشان می‌دهد (`manualSaleStatusOptions`).
 *
 * @param sale فروشِ ذخیره‌شده؛ برای فروشِ تازه خالی — آن‌وقت فقط
 *   «پیش‌فاکتور» نشان داده می‌شود و انتخابی در کار نیست.
 */
export default function SaleStatusSection({ sale, selectedStatus, onStatusChange }) {
  const isNew = !sale;
  const options = isNew ? [SALE_STATUSES.PROFORMA] : manualSaleStatusOptions(sale);
  const locked = options.length <= 1;
  const value =
    selectedStatus === "" || selectedStatus == null
      ? String(options[0])
      : String(selectedStatus);

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
            {locked ? "وضعیت" : "تغییر وضعیت"}
          </Label>
          <Select
            value={value}
            onValueChange={(next) => onStatusChange(Number(next))}
            disabled={locked}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((status) => (
                <SelectItem key={status} value={String(status)}>
                  <StatusLabel status={status} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isNew
              ? "فروشِ تازه پیش‌فاکتور ثبت می‌شود. اگر پرداختی وارد کنید، سرور همان لحظه شماره‌ی فاکتور رسمی را می‌سازد و فروش را به «آماده‌سازی انبار» می‌برد."
              : saleStatusHint(sale.status)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
