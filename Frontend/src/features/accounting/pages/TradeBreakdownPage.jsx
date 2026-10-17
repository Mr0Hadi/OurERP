import { ChartPie } from "lucide-react";

import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { LEDGER_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import AccountingPageLayout from "../components/AccountingPageLayout";
import SummaryStrip from "../components/SummaryStrip";
import IdFilterChips from "../components/filters/IdFilterChips";
import TradeBreakdownFilters from "../components/filters/TradeBreakdownFilters";
import TradeBreakdownTable from "../components/table/TradeBreakdownTable";
import { tradeBreakdownGroupLabels } from "../domain/accountingEnums";
import { useUrlPreset } from "@/shared/hooks/useUrlPreset";
import { useTradeBreakdownQuery } from "../services/queries";
import { useTradeBreakdownFilterStore } from "../store/accountingFilterStores";

const URL_KEYS = ["side", "groupBy", "partyId", "productId", "productCategoryId", "fromDate", "toDate"];

function summaryItems(summary, groupLabel) {
  return [
    { key: "groups", label: groupLabel, value: summary?.groupCount, format: "count" },
    { key: "invoices", label: "فاکتور", value: summary?.invoiceCount, format: "count" },
    { key: "quantity", label: "تعداد", value: summary?.quantity, format: "count" },
    { key: "net", label: "خالص", value: summary?.netAmount, emphasis: true },
    { key: "tax", label: "مالیات", value: summary?.taxAmount },
    { key: "total", label: "جمع", value: summary?.totalAmount },
  ];
}

/**
 * تفکیکِ فروش و خرید (`GetTradeBreakdown`) — «کدام کالا/دسته/مشتری/فروشنده بیشترین فروش را
 * داشت» و همان برای خرید. جمع‌ها کلِ دوره‌اند و جست‌وجو را اعمال نمی‌کنند (سهمِ هر گروه از
 * کل معنا داشته باشد). بدونِ بهای تمام‌شده و سود.
 */
export default function TradeBreakdownPage() {
  useUrlPreset(useTradeBreakdownFilterStore, URL_KEYS);

  const listState = useTradeBreakdownFilterStore();
  const filters = useDebouncedFilters(useTradeBreakdownFilterStore, {
    text: ["search"],
    instant: ["side", "groupBy", "fromDate", "toDate", "partyId", "productCategoryId", "productId"],
  });
  const query = useTradeBreakdownQuery(filters, listState.pagination, listState.sorting);
  const groupLabel = tradeBreakdownGroupLabels(listState.side)[listState.groupBy];

  return (
    <AccountingPageLayout
      title="تفکیک فروش و خرید"
      icon={ChartPie}
      description="جمعِ اقلامِ فاکتورهای صادرشده به تفکیکِ کالا، دسته، طرف‌حساب یا کاربر، با تاریخِ فاکتور."
    >
      <TradeBreakdownFilters />
      <DateRangeToolbar
        fromDate={listState.fromDate}
        toDate={listState.toDate}
        onRangeChange={listState.setRange}
        onReset={() => listState.setRange({ fromDate: "", toDate: "" })}
        presets={LEDGER_RANGE_PRESETS}
      />
      <IdFilterChips
        items={[
          { key: "productId", label: "شناسه‌ی کالا", value: listState.productId, onClear: () => listState.setProductId("") },
        ]}
      />
      <SummaryStrip items={summaryItems(query.data?.summary, groupLabel)} isLoading={query.isLoading} caption="جمعِ کلِ دوره" />
      <ServerTable
        query={query}
        listState={listState}
        table={TradeBreakdownTable}
        context={{ side: listState.side, groupBy: listState.groupBy, fromDate: filters.fromDate, toDate: filters.toDate }}
      />
    </AccountingPageLayout>
  );
}
