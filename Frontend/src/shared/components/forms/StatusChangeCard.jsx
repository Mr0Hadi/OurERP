import { Activity } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import StatusChoice from "./StatusChoice";

/**
 * وضعیتِ یک سندِ صادرشده و تغییرِ دستیِ آن.
 *
 * تغییر همان لحظه ذخیره نمی‌شود: انتخاب فقط «وضعیتِ بعد از ذخیره» است و با
 * دکمه‌ی اصلیِ «ثبت تغییرات»ِ صفحه همراهِ بقیه‌ی تغییرها اعمال می‌شود
 * (`runDocumentChanges`). گزینه‌ها را صفحه می‌سازد: وضعیتِ فعلی، مقصدهایی که
 * سرور از آن می‌پذیرد، و «لغو» اگر ممکن است. بقیه‌ی وضعیت‌ها را خودِ سیستم
 * می‌گذارد (دریافت، ارسال).
 *
 * `children` زیرِ انتخاب می‌آید — کارهای سند (مثلاً ثبت مرجوعی).
 *
 * @param options `[{ value, label, hint }]`؛ اولی وضعیتِ فعلی
 * @param value   وضعیتِ انتخاب‌شده (برابرِ فعلی یعنی بدونِ تغییر)
 */
export default function StatusChangeCard({
  statusBadge,
  options = [],
  value,
  onChange,
  canEdit,
  hint,
  headerAction,
  children,
}) {
  const choosable = canEdit && options.length > 1;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold text-card-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" />
          وضعیت
          {statusBadge}
        </CardTitle>
        {headerAction && <CardAction>{headerAction}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-3">
        {choosable && (
          <StatusChoice
            label="وضعیت بعد از ذخیره"
            options={options}
            value={value}
            onChange={onChange}
          />
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {children}
      </CardContent>
    </Card>
  );
}
