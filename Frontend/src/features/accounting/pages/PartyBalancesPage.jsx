import { Scale } from "lucide-react";

import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { toApiSort } from "@/shared/services/api/sorting";
import AccountingPageLayout from "../components/AccountingPageLayout";
import { PARTY_BALANCE_SORT_COLUMNS } from "../services/api-v1";
import AgingBar from "../components/AgingBar";
import SummaryStrip from "../components/SummaryStrip";
import PartyBalanceFilters from "../components/filters/PartyBalanceFilters";
import PartyBalanceTable from "../components/table/PartyBalanceTable";
import { useUrlPreset } from "@/shared/hooks/useUrlPreset";
import { usePartyBalancesQuery } from "../services/queries";
import { usePartyBalanceFilterStore } from "../store/accountingFilterStores";

const URL_KEYS = ["partyType", "balanceState", "search"];

function summaryItems(summary) {
  return [
    { key: "count", label: "طرف‌حساب", value: summary?.count, format: "count" },
    {
      key: "receivable",
      label: "طلبِ ما",
      value: summary?.totalReceivable,
      tone: "warning",
      hint: "جمعِ مانده‌های بدهکار (طرف به ما بدهکار است).",
    },
    {
      key: "payable",
      label: "بدهیِ ما",
      value: summary?.totalPayable,
      tone: "info",
      hint: "جمعِ مانده‌های بستانکار (ما به طرف بدهکاریم)، به‌صورتِ عددِ مثبت.",
    },
    { key: "net", label: "خالص", value: summary?.net, emphasis: true, hint: "طلب منهای بدهی." },
    { key: "debtors", label: "بدهکار", value: summary?.debtorCount, format: "count" },
    { key: "creditors", label: "بستانکار", value: summary?.creditorCount, format: "count" },
  ];
}

/**
 * حسابِ اشخاص (`GetPartyBalanceList`) — مشتری‌ها و تامین‌کننده‌ها در یک جدول، با مانده‌ی
 * دفتر و سنی‌بندیِ اسنادِ باز. گردشِ هر نفر در «دفتر اشخاص» با فیلترِ آماده باز می‌شود.
 *
 * مشتری/تامین‌کننده‌ی غیرفعال فقط وقتی می‌آید که در دفتر ردیفی داشته باشد. مانده‌ی اولیه‌ی دستی
 * (`balance`/`balanceType`ِ خودِ طرف) را سرور اینجا حساب نمی‌کند (بندِ ۲۱.۱ سندِ درخواست‌ها)، پس برای
 * طرف‌های قدیمی با مانده‌ی صفحه‌ی مشتری/تامین‌کننده فرق دارد.
 */
export default function PartyBalancesPage() {
  useUrlPreset(usePartyBalanceFilterStore, URL_KEYS);

  const listState = usePartyBalanceFilterStore();
  const filters = useDebouncedFilters(usePartyBalanceFilterStore, {
    text: ["search", "minBalance", "maxBalance"],
    instant: ["partyType", "balanceState", "overdueOnly"],
  });
  const query = usePartyBalancesQuery(filters, listState.pagination, listState.sorting);
  const summary = query.data?.summary;

  // خروجی همان ردیف‌ها را به همان ترتیبِ جدول می‌دهد.
  const exportFilters = { ...filters, ...toApiSort(listState.sorting, PARTY_BALANCE_SORT_COLUMNS) };

  return (
    <AccountingPageLayout
      title="حساب اشخاص"
      icon={Scale}
      description="مانده‌ی هر مشتری و تامین‌کننده در دفترِ اشخاص؛ مثبت یعنی طرف به ما بدهکار است. مانده‌ی اولیه‌ی دستیِ تعریفِ طرف هنوز در آن نیست."
      actions={<DataTransferActions resource="party-balances" filters={exportFilters} />}
    >
      <PartyBalanceFilters />
      <SummaryStrip items={summaryItems(summary)} isLoading={query.isLoading} />

      {summary && (summary.receivableAging?.total > 0 || summary.payableAging?.total > 0) && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">سنی‌بندیِ طلب از مشتریان</p>
            <AgingBar aging={summary.receivableAging} showLegend />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">سنی‌بندیِ بدهی به تامین‌کنندگان</p>
            <AgingBar aging={summary.payableAging} showLegend />
          </div>
        </div>
      )}

      <ServerTable query={query} listState={listState} table={PartyBalanceTable} />
    </AccountingPageLayout>
  );
}
