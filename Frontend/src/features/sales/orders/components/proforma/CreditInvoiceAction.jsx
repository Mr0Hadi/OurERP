import { useState } from "react";
import { FileClock } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * «صدورِ فاکتورِ نسیه» زیرِ دریافت‌های پیش‌فاکتورِ «آماده‌ی پرداخت»: فاکتور بی هیچ دریافتی صادر می‌شود و کلِ مبلغ
 * بدهیِ مشتری می‌شود (`ChangeSaleStatus PROCESSING`). کالای رزروشده برای ارسالِ انبار می‌ماند.
 *
 * @param action `creditInvoice`ِ `useProformaPayment`
 * @param total  جمعِ فاکتور
 */
export default function CreditInvoiceAction({ action, total, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5">
      <p className="text-xs text-muted-foreground">
        {action.blockedReason || "بی دریافت هم می‌شود فاکتور را صادر کرد؛ کلِ مبلغ بدهیِ مشتری می‌شود."}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={disabled || Boolean(action.blockedReason)}
        onClick={() => setOpen(true)}
      >
        <FileClock className="size-3.5" />
        صدورِ فاکتورِ نسیه
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="صدورِ فاکتورِ نسیه"
        description={`فاکتور بی دریافت صادر می‌شود و ${formatRial(total)} بدهیِ مشتری ثبت می‌شود. کالا برای ارسالِ انبار رزرو می‌ماند. صدور برگشت ندارد؛ فقط با لغوِ فاکتور.`}
        confirmLabel="صدورِ فاکتور"
        pendingLabel="در حال صدور..."
        destructive={false}
        isPending={action.isPending}
        onConfirm={() => {
          action.run();
          setOpen(false);
        }}
      />
    </div>
  );
}
