import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import InstallmentFilters from "../components/table/InstallmentFilters";
import InstallmentTable from "../components/table/InstallmentTable";
import InstallmentPaymentDialog from "../components/InstallmentPaymentDialog";
import { useInstallmentsQuery } from "../services/queries";
import { useInstallmentFilterStore } from "../store/installmentFilterStore";
import { INSTALLMENT_VIEWS, installmentListParams } from "../domain/installmentViews";

/**
 * «اقساط» — همه‌ی اقساطِ فروش‌های اقساطی، با نماهای سررسیدگذشته / در انتظار / پیش‌رو و
 * دریافتِ مستقیمِ هر قسط. فیلتر و صفحه‌بندی سمتِ سرور (`GetSaleInstallmentList`).
 *
 * `?view=overdue&customerId=5` (از داشبورد و صفحه‌ی مشتری) یک‌بار هنگامِ ورود اعمال می‌شود.
 */
export default function InstallmentsPage() {
  const { allows } = usePermission();
  const [searchParams] = useSearchParams();
  const [payTarget, setPayTarget] = useState(null);
  // فیلترهای نشانی یک‌بار و *پیش از اولین درخواست* اعمال می‌شوند (در initializer، نه افکت —
  // افکت بعد از اولین واکشی اجرا می‌شد و یک درخواستِ بی‌فایده با فیلترهای قبلی می‌رفت).
  // تکرارش بی‌خطر است (StrictMode)؛ بعد از آن فیلترها دستِ کاربر است.
  useState(() => {
    const view = searchParams.get("view");
    const customerId = searchParams.get("customerId");
    if (!view && !customerId) return;
    const { resetFilters, setView, setCustomerId } = useInstallmentFilterStore.getState();
    resetFilters();
    if (view && INSTALLMENT_VIEWS[view]) setView(view);
    if (customerId) setCustomerId(Number(customerId));
  });

  const listState = useInstallmentFilterStore();
  const filters = useDebouncedFilters(useInstallmentFilterStore, {
    instant: ["view", "customerId", "fromDueDate", "toDueDate"],
  });
  const query = useInstallmentsQuery(installmentListParams(filters), listState.pagination, listState.sorting);

  return (
    <ListPageLayout
      title="اقساط فروش"
      icon={CalendarClock}
      description="اقساطِ قراردادهای فروشِ اقساطی؛ هر قسط یکجا و به مبلغِ کامل، همراهِ جریمه‌ی دیرکرد، دریافت می‌شود."
    >
      <InstallmentFilters />
      <ServerTable
        query={query}
        listState={listState}
        table={InstallmentTable}
        onPay={allows("SaleInstallmentPay") ? (row) => setPayTarget({ kind: "pay", saleId: row.saleId, installment: row, invoiceNumber: row.invoiceNumber, customerName: row.customerName }) : undefined}
      />
      <InstallmentPaymentDialog target={payTarget} onOpenChange={(open) => !open && setPayTarget(null)} />
    </ListPageLayout>
  );
}
