import { CheckCircle } from "lucide-react";

import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import PurchaseStatusBadge from "@/shared/components/status/PurchaseStatusBadge";
import { ROUTES } from "@/shared/constants/routes";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";

import { useReceivablePurchasesQuery, useReceivingListFilters } from "../services/queries";
import { useReceivingFilterStore } from "../store/receivingFilterStore";
import { RECEIVING_STATUS_OPTIONS } from "../domain/receivingVocabulary";
import { useQueueRows } from "../../shared/useQueueRows";
import { needsDocumentList } from "../../shared/queueFilters";
import QueueFilters from "../../shared/QueueFilters";
import QueueTable from "../../shared/QueueTable";

function ReceivingTable(props) {
  return (
    <QueueTable
      {...props}
      party={{ key: "supplierName", header: "تامین‌کننده / مشتری" }}
      StatusBadge={PurchaseStatusBadge}
      action={{ label: "بررسی و دریافت", icon: CheckCircle, route: ROUTES.WAREHOUSE_RECEIVING_DETAIL }}
      emptyMessage="خریدی در انتظار دریافت نیست."
    />
  );
}

/**
 * صفِ دریافت = `GetPurchaseList` فیلترشده روی وضعیت‌های قابلِ دریافت.
 *
 * کالای مرجوعیِ منتظر (`useQueueRows`): جایگزین روی ردیفِ همان خرید
 * علامت می‌خورد؛ برگشتیِ مشتری ردیفِ خودش را دارد. دو حالتِ مرجوعیِ فیلتر
 * یک صفحه‌اند و صفحه‌بندیِ سرور ندارند.
 */
export default function ReceivingListPage() {
  const listState = useReceivingFilterStore();
  const filters = useReceivingListFilters();
  const query = useReceivablePurchasesQuery(filters, listState.pagination, listState.sorting);
  const { suppliers, isLoading: isSuppliersLoading } = useSuppliersOptionsQuery();
  const buildRows = useQueueRows("in", filters, listState.pagination.pageIndex === 0);

  return (
    <ListPageLayout
      title="دریافت کالاهای انبار"
      description="بررسی و ثبت کالاهای خریداری‌شده‌ای که هنوز کامل نرسیده‌اند"
    >
      <QueueFilters
        useStore={useReceivingFilterStore}
        party={{
          key: "supplierId",
          label: "تامین‌کننده",
          emptyText: "تامین‌کننده‌ای یافت نشد",
          items: suppliers,
          isLoading: isSuppliersLoading,
          phoneOf: (supplier) => supplier.phone,
        }}
        statusOptions={RECEIVING_STATUS_OPTIONS}
        searchPlaceholder="شماره فاکتور..."
      />
      <ServerTable
        query={query}
        listState={listState}
        table={ReceivingTable}
        transform={buildRows}
        singlePage={!needsDocumentList(filters.status)}
      />
    </ListPageLayout>
  );
}
