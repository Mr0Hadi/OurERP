export default function PaymentSummary({ totalAmount, paidAmount, isCredit }) {
  const remaining = totalAmount - paidAmount;

  return (
    <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2 text-sm">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">جمع کل فاکتور</span>
        <span className="font-medium text-card-foreground">
          {totalAmount.toLocaleString("fa-IR")} ریال
        </span>
      </div>
      {!isCredit && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">مبلغ پرداختی</span>
            <span className="font-medium text-card-foreground">
              {paidAmount.toLocaleString("fa-IR")} ریال
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-border pt-2">
            <span className="text-muted-foreground">مانده بدهی</span>
            <span
              className={`font-semibold ${
                remaining > 0
                  ? "text-destructive"
                  : "text-[oklch(0.50_0.16_152)]"
              }`}
            >
              {remaining.toLocaleString("fa-IR")} ریال
            </span>
          </div>
        </>
      )}
    </div>
  );
}
