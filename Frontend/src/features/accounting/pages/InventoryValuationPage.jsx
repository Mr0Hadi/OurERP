import { Boxes } from "lucide-react";

import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { toApiSort } from "@/shared/services/api/sorting";
import AccountingPageLayout from "../components/AccountingPageLayout";
import { INVENTORY_VALUATION_SORT_COLUMNS } from "../services/api-v1";
import SummaryStrip from "../components/SummaryStrip";
import InventoryValuationFilters from "../components/filters/InventoryValuationFilters";
import InventoryValuationTable from "../components/table/InventoryValuationTable";
import { useInventoryValuationQuery } from "../services/queries";
import { useInventoryValuationFilterStore } from "../store/accountingFilterStores";

function summaryItems(summary) {
  return [
    { key: "products", label: "کالا", value: summary?.productCount, format: "count" },
    { key: "stock", label: "موجودی", value: summary?.stock, format: "count" },
    { key: "pool", label: "ارزش قابل فروش", value: summary?.poolValue },
    { key: "quarantined", label: "تعدادِ قرنطینه", value: summary?.quarantinedQuantity, format: "count" },
    { key: "offPool", label: "ارزش قرنطینه", value: summary?.offPoolValue, tone: "caution" },
    { key: "total", label: "ارزش کل", value: summary?.totalValue, emphasis: true },
  ];
}

/**
 * ارزشِ موجودی (`GetInventoryValuation`) — همین حالا، از آخرین ردیفِ دفترِ ارزشِ هر کالا.
 * اینجا هیچ بهایی حساب نمی‌شود؛ بهای تمام‌شده‌ی فروش فیچرِ جدایی است که هنوز طراحی نشده.
 */
export default function InventoryValuationPage() {
  const listState = useInventoryValuationFilterStore();
  const filters = useDebouncedFilters(useInventoryValuationFilterStore, {
    text: ["search"],
    instant: ["productCategoryId", "onlyWithValue"],
  });
  const query = useInventoryValuationQuery(filters, listState.pagination, listState.sorting);

  // خروجی همان ردیف‌ها را به همان ترتیبِ جدول می‌دهد.
  const exportFilters = { ...filters, ...toApiSort(listState.sorting, INVENTORY_VALUATION_SORT_COLUMNS) };

  return (
    <AccountingPageLayout
      title="ارزش موجودی"
      icon={Boxes}
      description="ارزشِ هر کالا همین حالا، همان‌طور که دفترِ ارزشِ موجودی ثبت کرده؛ اینجا بهایی محاسبه نمی‌شود."
      actions={<DataTransferActions resource="inventory-valuation" filters={exportFilters} />}
    >
      <InventoryValuationFilters />
      <SummaryStrip items={summaryItems(query.data?.summary)} isLoading={query.isLoading} />
      <ServerTable query={query} listState={listState} table={InventoryValuationTable} />
    </AccountingPageLayout>
  );
}
