import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";

/** لغوِ خرید — نهایی است؛ پرداخت‌ها روی خرید می‌مانند. */
export default function CancelPurchaseDialog({ open, onOpenChange, isPending, onConfirm }) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="لغو خرید"
      description="لغو نهایی است و قابل بازگشت نیست. پرداخت‌های انجام‌شده روی خرید می‌مانند؛ پولی که تامین‌کننده برمی‌گرداند را با «پول برگشتی» در کارت پرداخت‌ها ثبت کنید."
      confirmLabel="لغو خرید"
      pendingLabel="در حال لغو..."
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
