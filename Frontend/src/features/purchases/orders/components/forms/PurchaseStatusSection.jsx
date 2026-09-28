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
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_TONES,
} from "@/shared/domain/enums/purchaseStatus";
import {
  MANUAL_PURCHASE_STATUSES,
  isPurchaseStatusLocked,
} from "../../domain/purchaseRules";
import { Activity } from "lucide-react";

import StatusText from "@/shared/components/status/StatusText";
import { PURCHASE_STATUS_ICONS } from "@/shared/components/status/statusIcons";

/**
 * @param savedStatus وضعیتِ ذخیره‌شده روی سرور؛ برای خریدِ تازه خالی.
 */
export default function PurchaseStatusSection({
  selectedStatus,
  savedStatus,
  onStatusChange,
}) {
  const locked = isPurchaseStatusLocked(savedStatus);
  const options = locked ? [Number(savedStatus)] : MANUAL_PURCHASE_STATUSES;

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
          <Select
            value={selectedStatus === "" || selectedStatus == null ? "" : String(selectedStatus)}
            onValueChange={(value) => onStatusChange(Number(value))}
            disabled={locked}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="وضعیت را انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {options.map((status) => {
                const key = String(status);
                const label = PURCHASE_STATUS_LABELS[status];
                return (
                  <SelectItem key={key} value={key}>
                    <StatusText
                      tone={PURCHASE_STATUS_TONES[status]}
                      icon={PURCHASE_STATUS_ICONS[status] ?? Activity}
                    >
                      {label}
                    </StatusText>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {locked ? (
            <p className="text-xs text-muted-foreground">
              این وضعیت را دریافتِ انبار تعیین می‌کند و دستی عوض نمی‌شود. اگر
              تامین‌کننده بقیه‌ی کالا را نمی‌فرستد، قلمش را در کارتِ «اقلام خرید»
              ببندید.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              وقتی تامین‌کننده فاکتور رسمی را فرستاد، شماره و تاریخِ فاکتور را
              در «اطلاعات فاکتور» وارد و خودِ فاکتور را ضمیمه کنید، بعد وضعیت را
              به «در انتظار ارسال» ببرید. با این کار فاکتور صادر می‌شود و اقلام،
              قیمت‌ها و تامین‌کننده دیگر ویرایش نمی‌شوند. «تحویل ناقص/کامل» را
              دریافتِ انبار تعیین می‌کند.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
