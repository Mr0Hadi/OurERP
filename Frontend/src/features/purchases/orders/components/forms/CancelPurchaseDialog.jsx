import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";

/**
 * لغوِ خرید — نهایی است؛ پرداخت‌ها روی خرید می‌مانند.
 *
 * @param confirmLabel در نمای صادرشده لغو همراهِ بقیه‌ی تغییراتِ ثبت‌نشده ذخیره می‌شود
 *                     («لغو خرید و ذخیره»)
 */
export default function CancelPurchaseDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
  confirmLabel = "لغو خرید",
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="لغو خرید"
      description="لغو نهایی است و قابل بازگشت نیست. پرداخت‌های انجام‌شده روی خرید می‌مانند؛ پولی که تامین‌کننده برمی‌گرداند را با «پول برگشتی» در کارت پرداخت‌ها ثبت کنید."
      confirmLabel={confirmLabel}
      pendingLabel="در حال لغو..."
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
