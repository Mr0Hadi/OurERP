import ListPageLayout from "@/shared/components/layout/ListPageLayout";
import ServerTable from "@/shared/components/table/ServerTable";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";

import ReceivingFilters from "../components/table/ReceivingFilters";
import ReceivingTable from "../components/table/ReceivingTable";
import { useDebouncedReceivingFilters } from "../hooks/useDebouncedReceivingFilters";
import { useReceivablePurchasesQuery } from "../services/queries";
import { useReceivingFilterStore } from "../store/receivingFilterStore";
import { useQueueRows } from "../../shared/useQueueRows";
import { needsDocumentList } from "../../shared/queueFilters";

/**
 * صفِ دریافت = `GetPurchaseList` فیلترشده روی وضعیت‌های قابلِ دریافت.
 *
 * کالای مرجوعیِ منتظر (`useQueueRows`): جایگزین روی ردیفِ همان خرید
 * علامت می‌خورد؛ برگشتیِ مشتری ردیفِ خودش را دارد. دو حالتِ مرجوعیِ فیلتر
 * یک صفحه‌اند و صفحه‌بندیِ سرور ندارند.
 */
export default function ReceivingListPage() {
  const listState = useReceivingFilterStore();
  const filters = useDebouncedReceivingFilters();
  const query = useReceivablePurchasesQuery(filters, listState.pagination, listState.sorting);
  const { suppliers, isLoading: isSuppliersLoading } = useSuppliersOptionsQuery();
  const buildRows = useQueueRows("in", filters, listState.pagination.pageIndex === 0);

  return (
    <ListPageLayout
      title="دریافت کالاهای انبار"
      description="بررسی و ثبت کالاهای خریداری‌شده‌ای که هنوز کامل نرسیده‌اند"
    >
      <ReceivingFilters suppliers={suppliers} isSuppliersLoading={isSuppliersLoading} />
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
