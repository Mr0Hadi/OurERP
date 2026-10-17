import { ArrowLeftRight } from "lucide-react";

import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { toApiSort } from "@/shared/services/api/sorting";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { LEDGER_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import { formatNumber } from "@/shared/lib/numberFormat";
import AccountingPageLayout from "../components/AccountingPageLayout";
import { PAYMENT_JOURNAL_SORT_COLUMNS } from "../services/api-v1";
import SummaryStrip from "../components/SummaryStrip";
import IdFilterChips from "../components/filters/IdFilterChips";
import PaymentJournalFilters from "../components/filters/PaymentJournalFilters";
import PaymentJournalTable from "../components/table/PaymentJournalTable";
import { useUrlPreset } from "@/shared/hooks/useUrlPreset";
import { usePaymentJournalQuery } from "../services/queries";
import { usePaymentJournalFilterStore } from "../store/accountingFilterStores";

const URL_KEYS = ["direction", "documentSide", "customerId", "supplierId", "saleId", "purchaseId", "fromDate", "toDate", "search"];

function summaryItems(summary) {
  return [
    { key: "count", label: "ردیف", value: summary?.count, format: "count" },
    { key: "in", label: "دریافت", value: summary?.totalIn, tone: "success" },
    { key: "out", label: "پرداخت", value: summary?.totalOut, tone: "danger" },
    {
      key: "net",
      label: "خالص",
      value: summary?.net,
      emphasis: true,
      tone: Number(summary?.net) < 0 ? "danger" : undefined,
      hint: "دریافت منهای پرداخت. ردیف‌های باطل‌شده هیچ‌وقت در جمع نیستند.",
    },
  ];
}

/** جمعِ هر روش — جای حسابِ صندوق و بانک تا وقتی که آن حساب‌ها ساخته شوند. */
function ByTypeBreakdown({ byType = [] }) {
  if (byType.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {byType.map((row) => (
        <div key={row.type} className="min-w-36 flex-1 rounded-lg border border-border px-3 py-2 text-xs sm:flex-none">
          <p className="font-medium">
            {PAYMENT_TYPE_LABELS[row.type] ?? row.type}
            <span className="ms-1 font-normal text-muted-foreground">({formatNumber(row.count)})</span>
          </p>
          <p className="mt-0.5 tabular-nums text-muted-foreground">
            <span className="text-success">+{formatNumber(row.in)}</span>
            {" · "}
            <span className="text-destructive">−{formatNumber(row.out)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * دفترِ دریافت و پرداخت (`GetPaymentJournal`) — همه‌ی ردیف‌های پرداختِ فروش و خرید، با هر
 * روشی، نه فقط کارتخوان. حسابِ صندوق و بانک هنوز نیست؛ تفکیک فقط بر اساسِ روش است.
 */
export default function PaymentJournalPage() {
  useUrlPreset(usePaymentJournalFilterStore, URL_KEYS);

  const listState = usePaymentJournalFilterStore();
  const filters = useDebouncedFilters(usePaymentJournalFilterStore, {
    text: ["search"],
    instant: [
      "fromDate",
      "toDate",
      "direction",
      "types",
      "purpose",
      "documentSide",
      "customerId",
      "supplierId",
      "recordedByUserId",
      "includeVoided",
      "saleId",
      "purchaseId",
    ],
  });
  const query = usePaymentJournalQuery(filters, listState.pagination, listState.sorting);
  const summary = query.data?.summary;

  // خروجی همان ردیف‌ها را به همان ترتیبِ جدول می‌دهد.
  const exportFilters = { ...filters, ...toApiSort(listState.sorting, PAYMENT_JOURNAL_SORT_COLUMNS) };

  return (
    <AccountingPageLayout
      title="دفتر دریافت و پرداخت"
      icon={ArrowLeftRight}
      description="هر پولی که برای فروش یا خرید جابه‌جا شده، با تاریخِ پرداخت. حسابِ صندوق و بانک هنوز جدا نیست؛ تفکیک فقط بر اساسِ روش است."
      actions={<DataTransferActions resource="payment-journal" filters={exportFilters} />}
    >
      <DateRangeToolbar
        fromDate={listState.fromDate}
        toDate={listState.toDate}
        onRangeChange={listState.setRange}
        onReset={() => listState.setRange({ fromDate: "", toDate: "" })}
        presets={LEDGER_RANGE_PRESETS}
      />
      <PaymentJournalFilters />
      <IdFilterChips
        items={[
          { key: "saleId", label: "شناسه‌ی فروش", value: listState.saleId, onClear: () => listState.setSaleId("") },
          { key: "purchaseId", label: "شناسه‌ی خرید", value: listState.purchaseId, onClear: () => listState.setPurchaseId("") },
        ]}
      />
      <SummaryStrip items={summaryItems(summary)} isLoading={query.isLoading} />
      <ByTypeBreakdown byType={summary?.byType} />
      <ServerTable query={query} listState={listState} table={PaymentJournalTable} />
    </AccountingPageLayout>
  );
}
