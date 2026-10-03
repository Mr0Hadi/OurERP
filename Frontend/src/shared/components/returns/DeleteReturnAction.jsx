import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";

/**
 * «حذف کامل این مرجوعی» — مشترکِ خرید و فروش. سرور فقط مرجوعیِ بی‌تصمیم را
 * حذف می‌کند (`canDelete`)؛ صفحه این دکمه را فقط همان وقت نشان می‌دهد.
 *
 * دیالوگ تا پایانِ درخواست باز می‌ماند؛ موفقیت کاربر را به فهرست می‌برد
 * (mutation) و شکست او را همین‌جا نگه می‌دارد تا دوباره تلاش کند.
 */
export default function DeleteReturnAction({ returnNumber, onDelete, isPending, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full gap-2 text-destructive hover:bg-destructive/10"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        حذف کامل این مرجوعی
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="حذف مرجوعی"
        description={`این عملیات قابل بازگشت نیست. مرجوعی «${returnNumber}» برای همیشه حذف خواهد شد.`}
        confirmLabel="حذف شود"
        pendingLabel="در حال حذف..."
        isPending={isPending}
        onConfirm={onDelete}
      />
    </>
  );
}
