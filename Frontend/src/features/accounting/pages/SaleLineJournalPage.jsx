import { Rows3 } from "lucide-react";

import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { toApiSort } from "@/shared/services/api/sorting";
import { LEDGER_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import { formatNumber } from "@/shared/lib/numberFormat";
import AccountingPageLayout from "../components/AccountingPageLayout";
import { SALE_LINE_SORT_COLUMNS } from "../services/api-v1";
import SummaryStrip from "../components/SummaryStrip";
import IdFilterChips from "../components/filters/IdFilterChips";
import SaleLineFilters from "../components/filters/SaleLineFilters";
import SaleLineTable from "../components/table/SaleLineTable";
import { useUrlPreset } from "@/shared/hooks/useUrlPreset";
import { useSaleLineJournalQuery } from "../services/queries";
import { useSaleLineFilterStore } from "../store/accountingFilterStores";

const URL_KEYS = ["saleId", "customerId", "productId", "productCategoryId", "fromDate", "toDate", "search"];

function summaryItems(summary) {
  return [
    { key: "count", label: "قلم", value: summary?.count, format: "count" },
    { key: "quantity", label: "تعداد", value: summary?.quantity, format: "count" },
    {
      key: "gross",
      label: "ناخالص",
      value: summary?.grossAmount,
      hint: `تخفیف ${formatNumber(summary?.discountAmount)} ریال.`,
    },
    { key: "net", label: "خالص", value: summary?.netAmount },
    { key: "tax", label: "مالیات", value: summary?.taxAmount },
    { key: "total", label: "جمع", value: summary?.totalAmount, emphasis: true },
  ];
}

/** ریزِ اقلامِ فروش (`GetSaleLineJournal`) — برای پاسخ به «از این کالا به چه کسی، چند، چند فروختیم». */
export default function SaleLineJournalPage() {
  useUrlPreset(useSaleLineFilterStore, URL_KEYS);

  const listState = useSaleLineFilterStore();
  const filters = useDebouncedFilters(useSaleLineFilterStore, {
    text: ["search"],
    instant: ["fromDate", "toDate", "statuses", "customerId", "productCategoryId", "taxCategory", "saleId", "productId"],
  });
  const query = useSaleLineJournalQuery(filters, listState.pagination, listState.sorting);

  // خروجی همان ردیف‌ها را به همان ترتیبِ جدول می‌دهد.
  const exportFilters = { ...filters, ...toApiSort(listState.sorting, SALE_LINE_SORT_COLUMNS) };

  return (
    <AccountingPageLayout
      title="ریز اقلام فروش"
      icon={Rows3}
      description="هر قلمِ فاکتورهای فروشِ صادرشده یک ردیف، با تاریخِ فاکتور و مبالغِ ثبت‌شده روی همان قلم."
      actions={<DataTransferActions resource="sale-lines" filters={exportFilters} />}
    >
      <DateRangeToolbar
        fromDate={listState.fromDate}
        toDate={listState.toDate}
        onRangeChange={listState.setRange}
        onReset={() => listState.setRange({ fromDate: "", toDate: "" })}
        presets={LEDGER_RANGE_PRESETS}
      />
      <SaleLineFilters />
      <IdFilterChips
        items={[
          { key: "saleId", label: "شناسه‌ی فروش", value: listState.saleId, onClear: () => listState.setSaleId("") },
          { key: "productId", label: "شناسه‌ی کالا", value: listState.productId, onClear: () => listState.setProductId("") },
        ]}
      />
      <SummaryStrip items={summaryItems(query.data?.summary)} isLoading={query.isLoading} />
      <ServerTable query={query} listState={listState} table={SaleLineTable} />
    </AccountingPageLayout>
  );
}
