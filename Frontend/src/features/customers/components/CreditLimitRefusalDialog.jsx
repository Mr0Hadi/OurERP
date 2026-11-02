import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { formatRial } from "@/shared/lib/numberFormat";
import { useCreditRefusalStore } from "../store/creditRefusalStore";

/**
 * «سقفِ اعتبار»: سرور صدورِ این فاکتور را رد کرد چون بدهیِ مؤثرِ مشتری از سقف بالاتر می‌رفت (GAP-06). عددها و دو راه:
 * دریافتِ نقدیِ بیشتر (برگشت به فرم) و، فقط با `CustomerUpdate`، تغییرِ سقف در پرونده‌ی مشتری. راهِ «رد شدن» ندارد،
 * چون سرور هم ندارد.
 */
export default function CreditLimitRefusalDialog() {
  const refusal = useCreditRefusalStore((state) => state.refusal);
  const close = useCreditRefusalStore((state) => state.close);
  const { can } = usePermission();

  const rows = refusal
    ? [
        ["سقفِ اعتبار", refusal.creditLimit === 0 ? "فقط نقدی" : formatRial(refusal.creditLimit)],
        ["بدهیِ فعلی", formatRial(refusal.currentExposure)],
        ...(refusal.unclearedCheques > 0 ? [["چک‌های وصول‌نشده (در بدهی)", formatRial(refusal.unclearedCheques)]] : []),
        ["نسیه‌ی این فاکتور", formatRial(refusal.addedAmount)],
        ["بدهی پس از ثبت", formatRial(refusal.exposure)],
      ]
    : [];

  return (
    <Dialog open={Boolean(refusal)} onOpenChange={(open) => !open && close()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            سقفِ اعتبارِ «{refusal?.customerName}»
          </DialogTitle>
          <DialogDescription>
            فاکتور صادر نشد و چیزی ذخیره نشد. برای ثبت، دست‌کم {formatRial(refusal?.excess ?? 0)} بیشتر نقد یا با کارت
            دریافت کنید{can("CustomerUpdate") ? "، یا سقفِ اعتبارِ مشتری را تغییر دهید" : ""}.
          </DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border rounded-lg border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 px-3 py-2 font-semibold text-destructive">
            <dt>مازاد بر سقف</dt>
            <dd className="tabular-nums">{formatRial(refusal?.excess ?? 0)}</dd>
          </div>
        </dl>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" onClick={close}>
            دریافتِ نقدیِ بیشتر
          </Button>
          {can("CustomerUpdate") && refusal?.customerId && (
            <Button type="button" variant="outline" asChild onClick={close}>
              <Link to={routeWithId(ROUTES.CUSTOMERS_DETAIL, refusal.customerId)}>تغییرِ سقف در پرونده‌ی مشتری</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
