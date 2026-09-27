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
  SALE_STATUS_TONES,
} from "@/shared/domain/enums/saleStatus";
import { Activity } from "lucide-react";

import StatusText from "@/shared/components/status/StatusText";
import { SALE_STATUS_ICONS } from "@/shared/components/status/statusIcons";

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
              const disabled = !SELECTABLE.includes(status);
              return (
                <SelectItem
                  key={status}
                  value={String(status)}
                  disabled={disabled}
                >
                  <StatusText tone={SALE_STATUS_TONES[status]} icon={SALE_STATUS_ICONS[status]}>
                    {SALE_STATUS_LABELS[status]}
                    {disabled && (
                      <span className="text-xs text-muted-foreground">
                        (با ارسال انبار)
                      </span>
                    )}
                  </StatusText>
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
