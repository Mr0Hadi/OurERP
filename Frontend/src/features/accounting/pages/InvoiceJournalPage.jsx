import { Receipt, ShoppingBag } from "lucide-react";

import DataTransferActions from "@/shared/components/dataTransfer/DataTransferActions";
import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import ServerTable from "@/shared/components/table/ServerTable";
import { useDebouncedFilters } from "@/shared/hooks/useDebouncedFilters";
import { toApiSort } from "@/shared/services/api/sorting";
import { LEDGER_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import { formatNumber } from "@/shared/lib/numberFormat";
import AccountingPageLayout from "../components/AccountingPageLayout";
import { INVOICE_JOURNAL_SORT_COLUMNS } from "../services/api-v1";
import SummaryStrip from "../components/SummaryStrip";
import InvoiceJournalFilters from "../components/filters/InvoiceJournalFilters";
import InvoiceJournalTable from "../components/table/InvoiceJournalTable";
import { DocumentSideEnum } from "../domain/accountingEnums";
import { JOURNAL_SIDES } from "../domain/journalSides";
import { useUrlPreset } from "../hooks/useUrlPreset";
import { useInvoiceJournalQuery } from "../services/queries";
import { INVOICE_JOURNAL_STORES } from "../store/accountingFilterStores";

const ICONS = {
  [DocumentSideEnum.SALE]: Receipt,
  [DocumentSideEnum.PURCHASE]: ShoppingBag,
};

function summaryItems(summary, config) {
  return [
    { key: "count", label: "فاکتور", value: summary?.count, format: "count" },
    {
      key: "net",
      label: "خالص (بی مالیات)",
      value: summary?.netAmount,
      hint: `ناخالص ${formatNumber(summary?.grossAmount)} منهای تخفیف ${formatNumber(summary?.discountAmount)}.`,
    },
    { key: "tax", label: "مالیات", value: summary?.taxAmount },
    { key: "total", label: "جمع فاکتورها", value: summary?.totalAmount, emphasis: true },
    {
      key: "paid",
      label: "پرداخت‌شده",
      value: summary?.paidAmount,
      tone: "success",
      hint:
        config.side === DocumentSideEnum.SALE
          ? `قابلِ دریافت ${formatNumber(summary?.payableAmount)} (با سودِ اقساط ${formatNumber(summary?.installmentChargeAmount)}).`
          : `قابلِ پرداخت ${formatNumber(summary?.payableAmount)} (بدونِ کسریِ بسته‌شده ${formatNumber(summary?.shortClosedAmount)}).`,
    },
    {
      key: "remaining",
      label: "مانده",
      value: summary?.remainingAmount,
      tone: Number(summary?.remainingAmount) > 0 ? "warning" : undefined,
      hint: "فقط مانده‌های مثبت جمع می‌شوند؛ اضافه‌پرداختِ یک فاکتور بدهیِ فاکتورِ دیگر را صفر نمی‌کند.",
    },
  ];
}

/**
 * دفترِ فروش یا خرید (`GetSaleJournal` / `GetPurchaseJournal`) — یک صفحه برای هر دو سمت؛
 * فقط واژگان (`JOURNAL_SIDES`) و استور فرق می‌کند. route هر سمت `side` را می‌دهد.
 */
export default function InvoiceJournalPage({ side }) {
  const config = JOURNAL_SIDES[side];
  const useStore = INVOICE_JOURNAL_STORES[side];

  useUrlPreset(useStore, ["paymentState", config.partyIdKey, "fromDate", "toDate", "search"]);

  const listState = useStore();
  const filters = useDebouncedFilters(useStore, {
    text: ["search"],
    instant: [
      "fromDate",
      "toDate",
      "fromDueDate",
      "toDueDate",
      "statuses",
      config.partyIdKey,
      config.userIdKey,
      "paymentType",
      "paymentState",
    ],
  });
  const query = useInvoiceJournalQuery(side, filters, listState.pagination, listState.sorting);

  // خروجی همان ردیف‌ها را به همان ترتیبِ جدول می‌دهد.
  const exportFilters = { ...filters, ...toApiSort(listState.sorting, INVOICE_JOURNAL_SORT_COLUMNS) };

  return (
    <AccountingPageLayout
      title={config.title}
      icon={ICONS[side]}
      description={config.description}
      actions={<DataTransferActions resource={config.exportResource} filters={exportFilters} />}
    >
      <DateRangeToolbar
        fromDate={listState.fromDate}
        toDate={listState.toDate}
        onRangeChange={listState.setRange}
        onReset={() => listState.setRange({ fromDate: "", toDate: "" })}
        presets={LEDGER_RANGE_PRESETS}
      />
      <InvoiceJournalFilters config={config} useStore={useStore} />
      <SummaryStrip items={summaryItems(query.data?.summary, config)} isLoading={query.isLoading} />
      <ServerTable query={query} listState={listState} table={InvoiceJournalTable} config={config} />
    </AccountingPageLayout>
  );
}
