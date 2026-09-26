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
  Activity,
  FileText,
} from "lucide-react";

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
};

/** وضعیت‌هایی که هنگامِ ثبت قابل انتخاب‌اند. */
const SELECTABLE = [SALE_STATUSES.PROFORMA, SALE_STATUSES.PROCESSING];

/** وضعیت‌هایی که فقط ارسالِ انبار (یا فروش حضوری) می‌گذارد — نمایشی و غیرفعال. */
const WAREHOUSE_SET = [
  SALE_STATUSES.PARTIALLY_DELIVERED,
  SALE_STATUSES.SHIPPED,
  SALE_STATUSES.DELIVERED,
];

/**
 * وضعیتِ فروشِ تازه — هم‌شکلِ `PurchaseStatusSection`.
 *
 * بکند `status` را از فرم نمی‌گیرد: فروش پیش‌فاکتور ثبت می‌شود و **اولین
 * دریافت** فاکتور را صادر و وضعیت را «آماده‌سازی انبار» می‌کند. پس
 * «آماده‌سازی انبار» اینجا یعنی «با دریافت وجه ثبت کن» (بخش پرداخت فعال
 * می‌شود) و «پیش‌فاکتور» یعنی بدون پرداخت. «ارسال ناقص/ارسال شده/تحویل»
 * را ارسالِ انبار می‌گذارد؛ برای تحویلِ همین‌جا دانه‌ها را در اقلام اسکن
 * کنید تا فروش حضوری ثبت شود.
 */
export default function SaleStatusSection({ selectedStatus, onStatusChange }) {
  const value =
    selectedStatus === "" || selectedStatus == null
      ? String(SALE_STATUSES.PROFORMA)
      : String(selectedStatus);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" />
          وضعیت سفارش
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-1.5 mt-0">
        <Label className="text-sm font-medium text-card-foreground">
          وضعیت هنگام ثبت
        </Label>
        <Select
          value={value}
          onValueChange={(next) => onStatusChange(Number(next))}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...SELECTABLE, ...WAREHOUSE_SET].map((status) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const disabled = !SELECTABLE.includes(status);
              return (
                <SelectItem
                  key={status}
                  value={String(status)}
                  disabled={disabled}
                >
                  <span
                    className={`flex items-center gap-2 ${config.textColor}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {SALE_STATUS_LABELS[status]}
                    {disabled && (
                      <span className="text-xs text-muted-foreground">
                        (با ارسال انبار)
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {Number(value) === SALE_STATUSES.PROFORMA
            ? "بدون دریافت وجه ثبت می‌شود و اقلام بعداً هم قابل ویرایش‌اند."
            : "با ثبتِ مبلغ دریافتی، فاکتور رسمی صادر و به صف ارسال انبار فرستاده می‌شود. اگر مبلغی دریافت نشود، پیش‌فاکتور می‌ماند."}
        </p>
        <p className="text-xs text-muted-foreground">
          برای تحویلِ همین‌جا به مشتری، دانه‌ها را در «اقلام فروش» اسکن کنید تا
          فروش حضوری و «تحویل کامل» ثبت شود.
        </p>
      </CardContent>
    </Card>
  );
}
