import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { usePermission } from "@/features/auth/hooks/usePermission";
import ProformaUnavailable from "@/features/sales/orders/components/proforma/ProformaUnavailable";
import { useWarehouseApproveMutation } from "@/features/sales/orders/services/mutations";
import { useSaleQuery } from "@/features/sales/orders/services/queries";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import Notice from "@/shared/components/feedback/Notice";
import UnsavedChangesDialog from "@/shared/components/feedback/UnsavedChangesDialog";
import SectionCard from "@/shared/components/forms/SectionCard";
import WarehouseFormSkeleton from "@/shared/components/skeletons/WarehouseFormSkeleton";
import { ROUTES } from "@/shared/constants/routes";
import { SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import { isSaleProforma } from "@/shared/domain/enums/saleStatus";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { formatNumber } from "@/shared/lib/numberFormat";
import WarehouseSubmitBar from "../../shared/WarehouseSubmitBar";
import SaleCheckApprovalCard from "../components/SaleCheckApprovalCard";
import SaleCheckItemCard from "../components/SaleCheckItemCard";
import WarehouseIssueDialog from "../components/WarehouseIssueDialog";
import WarehouseIssueList from "../components/WarehouseIssueList";
import { approvedQuantity, lineNeed } from "../domain/saleCheck";
import { useSaleCheckForm } from "../hooks/useSaleCheckForm";

/**
 * بررسیِ انبارِ یک پیش‌فاکتور: انباردار دانه‌های هر ردیف را اسکن و تأیید می‌کند (دانه‌ها رزرو و پیش‌فاکتور
 * «آماده‌ی پرداخت» می‌شود). اگر کالا کم است، تعدادِ ردیف را کم (یا ردیف را حذف) می‌کند، دلیلش را می‌نویسد و
 * همان را تأیید می‌کند — یک دکمه. دانه‌ی معیوب/مفقود جدا گزارش می‌شود.
 */
function SaleCheckForm({ sale, mutation }) {
  const navigate = useNavigate();
  const { allows } = usePermission();
  const canEdit = allows("SaleUpdate");
  const form = useSaleCheckForm(sale, { canEdit });
  const [issueOpen, setIssueOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const blocker = useUnsavedChangesGuard(form.dirty);

  const submit = () =>
    mutation.mutate(
      { sale, quantities: form.quantities, scans: form.scans, issues: form.issues, reason: form.reason.trim() },
      { onError: () => setConfirmOpen(false) },
    );

  const changedCount = form.changed.length;
  const label = changedCount > 0 ? "تغییر و تأیید انبار" : "تأیید انبار";
  const confirmText = `${
    changedCount > 0 ? `پیش‌فاکتور با ${formatNumber(changedCount)} ردیفِ تغییرکرده ذخیره و ` : "پیش‌فاکتور "
  }تأیید می‌شود و ${formatNumber(form.scannedCount)} دانه برای مشتری رزرو می‌شود.${
    form.issues.length ? ` ${formatNumber(form.issues.length)} دانه هم به قرنطینه می‌رود.` : ""
  }`;

  return (
    <div className="container mx-auto max-w-6xl space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title={`اقلامِ پیش‌فاکتور — ${sale.customerName || ""}`}
            description={
              canEdit
                ? "هر دانه‌ای را که برای مشتری برمی‌دارید اسکن کنید. اگر کالا کم است، تعدادِ تأییدی را کم کنید و دلیلش را بنویسید."
                : "هر دانه‌ای را که برای مشتری برمی‌دارید اسکن کنید."
            }
          >
            {!canEdit && (
              <Notice tone="info">تغییرِ تعدادِ اقلام دسترسیِ «ویرایش فروش» می‌خواهد. اگر کالا کم است، به فروش خبر دهید.</Notice>
            )}
            {form.items.map((item) => (
              <SaleCheckItemCard
                key={item.id}
                item={item}
                quantity={approvedQuantity(item, form.quantities)}
                need={lineNeed(item, form.quantities)}
                barcodes={form.scans[item.id] || []}
                canEdit={canEdit}
                onQuantityChange={(quantity) => form.setQuantity(item, quantity)}
                onBarcodesChange={(codes) => form.setLineScans(item.id, codes)}
              />
            ))}
          </SectionCard>
          <WarehouseIssueList issues={form.issues} onAdd={() => setIssueOpen(true)} onRemove={form.removeIssue} />
        </div>

        <div className="space-y-4">
          <SaleCheckApprovalCard form={form} />
          <WarehouseSubmitBar
            label={label}
            complete
            canSubmit
            blockingReason={form.blockingReason}
            isBusy={mutation.isPending}
            onSubmit={() => setConfirmOpen(true)}
            onCancel={() => navigate(ROUTES.WAREHOUSE_SALE_CHECK)}
            hint="پس از تأیید، کالا تا پایانِ مهلتِ رزرو برای مشتری نگه داشته می‌شود."
          />
        </div>
      </div>

      <WarehouseIssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        items={form.items}
        excluded={form.usedBarcodes}
        onAdd={form.addIssue}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={label}
        description={confirmText}
        destructive={false}
        confirmLabel={label}
        pendingLabel="در حال ثبت..."
        isPending={mutation.isPending}
        onConfirm={submit}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

export default function SaleCheckPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sale, isLoading, isError, error, refetch } = useSaleQuery(id);
  // mutation در صفحه است نه در فرم: پاسخِ موفق سند را در کش «آماده‌ی پرداخت» می‌کند و فرم پیش از اجرای
  // `onSuccess`ِ خودش (رفتن به صف) unmount می‌شد — کاربر پیامِ «شاید کس دیگری کارش را کرده» را می‌دید.
  // پس از موفقیت فرم (و blockerِ تغییرهای ذخیره‌نشده‌اش) کنار می‌رود و رفتن به صف بعد از همان commit است.
  const mutation = useWarehouseApproveMutation();
  useEffect(() => {
    if (mutation.isSuccess) navigate(ROUTES.WAREHOUSE_SALE_CHECK);
  }, [mutation.isSuccess, navigate]);

  usePageHeader({ title: sale ? `بررسی انبار — ${sale.customerName || ""}` : "بررسی انبار", showBack: true });

  if (isLoading || mutation.isSuccess) {
    return <WarehouseFormSkeleton itemActionSlot={false} summaryRows={2} hasSecondaryAction={false} />;
  }
  if (isError || !sale) {
    return (
      <DetailErrorState
        error={error}
        notFoundMessage="پیش‌فاکتور یافت نشد."
        onRetry={refetch}
        onBack={() => navigate(ROUTES.WAREHOUSE_SALE_CHECK)}
      />
    );
  }
  if (!isSaleProforma(sale.status) || Number(sale.proformaStage) !== SaleProformaStageEnum.CUSTOMER_APPROVED) {
    return (
      <ProformaUnavailable
        sale={sale}
        purpose="در صفِ انبار"
        backTo={ROUTES.WAREHOUSE_SALE_CHECK}
        backLabel="بازگشت به صف"
      />
    );
  }

  // نسخه‌ی تازه (ویرایشِ هم‌زمانِ فروش) فرم را از نو می‌سازد؛ بررسی روی همان نسخه ثبت می‌شود.
  return <SaleCheckForm key={`${sale.id}:${sale.revision}`} sale={sale} mutation={mutation} />;
}
