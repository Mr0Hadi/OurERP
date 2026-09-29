import { useState } from "react";
import { Activity } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

/**
 * وضعیتِ یک سندِ صادرشده و تغییرِ دستیِ آن (`Change{Purchase,Sale}Status`).
 * `statusBadge` همان badgeِ وضعیتِ سند است (`PurchaseStatusBadge`/`SaleStatusBadge`) تا رنگ
 * همه‌جا یکی باشد.
 *
 * فقط مقصدهایی که سرور از وضعیتِ فعلی می‌پذیرد در فهرست می‌آیند؛ بقیه‌ی
 * وضعیت‌ها را خودِ سیستم می‌گذارد (دریافت، ارسال، پرداخت). «لغو» دکمه و
 * دیالوگِ جدای خودش را دارد.
 *
 * `children` زیرِ راهنما می‌آید — کارهای سند (ثبت مرجوعی، لغو) و راهنمای
 * اصلاحِ اشتباه، تا همه‌ی «با این سند چه می‌شود کرد» یک‌جا باشد.
 */
export default function StatusChangeCard({
  statusBadge,
  targets = [],
  labels,
  canEdit,
  isPending,
  hint,
  onChange,
  children,
}) {
  const [target, setTarget] = useState("");
  const available = canEdit && targets.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold text-card-foreground">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            وضعیت
          </span>
          {statusBadge}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {available && (
          <div className="flex gap-2">
            <Select
              value={target}
              onValueChange={setTarget}
              disabled={isPending}
            >
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="تغییر وضعیت به..." />
              </SelectTrigger>
              <SelectContent>
                {targets.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {labels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={isPending || target === ""}
              onClick={() =>
                onChange(Number(target), { onSuccess: () => setTarget("") })
              }
            >
              {isPending ? "..." : "ثبت"}
            </Button>
          </div>
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {children}
      </CardContent>
    </Card>
  );
}
