import { toneText } from "@/shared/lib/tone";
import { formatRial } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

function Row({ label, value, className }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums text-card-foreground", className)}>{value}</span>
    </div>
  );
}

/**
 * خلاصه‌ی مالیِ سند: جمع، (مبلغِ قابلِ پرداخت اگر با جمع فرق دارد)، پرداخت‌شده و مانده.
 *
 * مانده‌ی منفی «اضافه پرداخت» خوانده می‌شود، نه عددِ منفی. در سندِ نسیه‌ای که
 * هنوز پرداختی ندارد (`showPaid={false}`) فقط جمع نشان داده می‌شود.
 *
 * @param {number} props.totalAmount
 * @param {number} [props.payableAmount] بدهیِ واقعیِ طرف (فروش اقساطی: با سود؛ خرید: منهای قلم‌های بسته‌شده)
 * @param {number} props.paidAmount
 */
export default function PaymentTotals({ totalAmount, payableAmount, paidAmount, showPaid = true }) {
  const total = Number(totalAmount) || 0;
  const payable = payableAmount != null ? Number(payableAmount) || 0 : total;
  const paid = Number(paidAmount) || 0;
  const remaining = payable - paid;

  return (
    <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2 text-sm">
      <Row label="جمع فاکتور" value={formatRial(total)} />
      {payable !== total && <Row label="مبلغ قابل پرداخت" value={formatRial(payable)} />}
      {showPaid && (
        <>
          <Row label="پرداخت‌شده" value={formatRial(paid)} />
          <div className="border-t border-border pt-2">
            <Row
              label={remaining < 0 ? "اضافه پرداخت" : "مانده بدهی"}
              value={formatRial(Math.abs(remaining))}
              className={cn("font-semibold", toneText(remaining > 0 ? "danger" : "success"))}
            />
          </div>
        </>
      )}
    </div>
  );
}
