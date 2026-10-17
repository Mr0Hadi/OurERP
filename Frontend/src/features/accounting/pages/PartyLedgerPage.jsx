import { BookOpenText } from "lucide-react";

import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { toApiSort } from "@/shared/services/api/sorting";
import { LEDGER_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import AccountingPageLayout from "../components/AccountingPageLayout";
import { PARTY_LEDGER_SORT_COLUMNS } from "../services/api-v1";
import SummaryStrip from "../components/SummaryStrip";
import IdFilterChips from "../components/filters/IdFilterChips";
import PartyLedgerFilters from "../components/filters/PartyLedgerFilters";
import PartyLedgerTable from "../components/table/PartyLedgerTable";
import { useUrlPreset } from "@/shared/hooks/useUrlPreset";
import { usePartyLedgerQuery } from "../services/queries";
import { usePartyLedgerFilterStore } from "../store/accountingFilterStores";

const URL_KEYS = ["partyType", "customerId", "supplierId", "saleId", "purchaseId", "fromDate", "toDate", "search"];

function summaryItems(summary) {
  return [
    { key: "count", label: "ردیف", value: summary?.count, format: "count" },
    { key: "debit", label: "جمع بدهکار", value: summary?.totalDebit, tone: "warning" },
    { key: "credit", label: "جمع بستانکار", value: summary?.totalCredit, tone: "info" },
    {
      key: "net",
      label: "خالص",
      value: summary?.net,
      emphasis: true,
      hint: "بدهکار منهای بستانکار در همین فیلتر؛ مثبت یعنی طرف‌ها بدهکارتر شده‌اند.",
    },
  ];
}

/**
 * دفترِ اشخاص (`GetPartyLedgerEntryList`) — هر ردیفی که مانده‌ی یک مشتری یا تامین‌کننده را
 * تکان داده: فاکتور، پرداخت، سودِ اقساط، تسویه‌ی مرجوعی، برگشت. ردیف‌های «(ثبت تکمیلی)»
 * را migrationِ پرکردنِ اسنادِ قدیمی نوشته است.
 */
export default function PartyLedgerPage() {
  useUrlPreset(usePartyLedgerFilterStore, URL_KEYS);

  const listState = usePartyLedgerFilterStore();
  const filters = useDebouncedFilters(usePartyLedgerFilterStore, {
    text: ["search"],
    instant: [
      "fromDate",
      "toDate",
      "partyType",
      "customerId",
      "supplierId",
      "entryTypes",
      "direction",
      "excludeReversed",
      "saleId",
      "purchaseId",
    ],
  });
  const query = usePartyLedgerQuery(filters, listState.pagination, listState.sorting);

  // خروجی همان ردیف‌ها را به همان ترتیبِ جدول می‌دهد.
  const exportFilters = { ...filters, ...toApiSort(listState.sorting, PARTY_LEDGER_SORT_COLUMNS) };

  return (
    <AccountingPageLayout
      title="دفتر حساب اشخاص"
      icon={BookOpenText}
      description="همه‌ی ردیف‌هایی که مانده‌ی مشتریان و تامین‌کنندگان را تغییر داده‌اند، با تاریخِ وقوع."
      actions={<DataTransferActions resource="party-ledger" filters={exportFilters} />}
    >
      <DateRangeToolbar
        fromDate={listState.fromDate}
        toDate={listState.toDate}
        onRangeChange={listState.setRange}
        onReset={() => listState.setRange({ fromDate: "", toDate: "" })}
        presets={LEDGER_RANGE_PRESETS}
      />
      <PartyLedgerFilters />
      <IdFilterChips
        items={[
          { key: "saleId", label: "شناسه‌ی فروش", value: listState.saleId, onClear: () => listState.setSaleId("") },
          { key: "purchaseId", label: "شناسه‌ی خرید", value: listState.purchaseId, onClear: () => listState.setPurchaseId("") },
        ]}
      />
      <SummaryStrip items={summaryItems(query.data?.summary)} isLoading={query.isLoading} />
      <ServerTable query={query} listState={listState} table={PartyLedgerTable} />
    </AccountingPageLayout>
  );
}
