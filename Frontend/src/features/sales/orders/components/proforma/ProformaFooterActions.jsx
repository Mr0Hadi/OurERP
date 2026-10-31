import { PackageOpen, Trash2 } from "lucide-react";
import { useState } from "react";

import { usePermission } from "@/features/auth/hooks/usePermission";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { useReleaseReservationMutation, useRemoveSaleMutation } from "../../services/mutations";

/**
 * کارهای ثانویه‌ی پیش‌فاکتور، زیرِ دکمه‌ی اصلی: «آزاد کردن رزرو» (در «آماده‌ی پرداخت») و «حذف پیش‌فاکتور»
 * — هر دو با تأیید. مشتری‌ای که نخواست: حذف؛ کالایی که باید برای دیگران آزاد شود: آزادسازی.
 *
 * @param disabled  صفحه وسطِ کاری است
 * @param onDeleted `() => void` — پس از حذف (صفحه می‌رود)
 */
export default function ProformaFooterActions({ sale, disabled, onDeleted }) {
  const { allows } = usePermission();
  const [confirm, setConfirm] = useState(null); // "release" | "delete" | null
  const releaseMutation = useReleaseReservationMutation();
  const deleteMutation = useRemoveSaleMutation();
  const busy = disabled || releaseMutation.isPending || deleteMutation.isPending;
  const canRelease = Number(sale.proformaStage) === SaleProformaStageEnum.WAREHOUSE_CHECKED && allows("SaleUpdate");

  return (
    <>
      {canRelease && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setConfirm("release")}
          disabled={busy}
        >
          <PackageOpen className="size-3.5" />
          آزاد کردن رزرو
        </Button>
      )}
      {allows("SaleDelete") && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirm("delete")}
          disabled={busy}
        >
          <Trash2 className="size-3.5" />
          حذف پیش‌فاکتور
        </Button>
      )}

      <ConfirmDialog
        open={confirm === "release"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="آزاد کردن رزرو"
        description="دانه‌های رزروشده به موجودیِ قابلِ فروش برمی‌گردند و پیش‌فاکتور با همان اقلام به پیش‌نویس برمی‌گردد. برای فروشِ دوباره باید رزرو یا بررسیِ انبار شود."
        confirmLabel="آزاد کن"
        pendingLabel="در حال آزادسازی..."
        destructive={false}
        isPending={releaseMutation.isPending}
        onConfirm={() => releaseMutation.mutate(sale, { onSuccess: () => setConfirm(null) })}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="حذف پیش‌فاکتور فروش"
        description="این پیش‌فاکتور حذف می‌شود و دیگر در فهرست فروش‌ها نیست. این کار برگشت‌پذیر نیست."
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(sale.id, { onSuccess: onDeleted })}
      />
    </>
  );
}
