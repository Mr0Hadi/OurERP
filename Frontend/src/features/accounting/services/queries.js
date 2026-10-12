import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { listQuery } from "@/shared/services/api/contract";
import { DocumentSideEnum } from "../domain/accountingEnums";
import {
  INVENTORY_VALUATION_SORT_COLUMNS,
  INVOICE_JOURNAL_SORT_COLUMNS,
  PARTY_BALANCE_SORT_COLUMNS,
  PARTY_LEDGER_SORT_COLUMNS,
  PAYMENT_JOURNAL_SORT_COLUMNS,
  SALE_LINE_SORT_COLUMNS,
  TRADE_BREAKDOWN_SORT_COLUMNS,
  fetchAccountingDashboard,
  fetchInventoryValuation,
  fetchPartyBalances,
  fetchPartyLedgerEntries,
  fetchPaymentJournal,
  fetchPurchaseJournal,
  fetchSaleJournal,
  fetchSaleLineJournal,
  fetchTaxReport,
  fetchTradeBreakdown,
} from "./api-v1";
import { accountingKeys } from "./queryKeys";

/**
 * هوک‌های خواندنِ حسابداری. فهرست‌ها `keepPreviousData` دارند تا با عوض‌شدنِ فیلتر یا صفحه
 * جدول و جمع‌های بالایش خالی نشوند (`FetchingOverlay` حالتِ واکشی را نشان می‌دهد).
 */
function useJournalQuery({ key, fetcher, sortColumns }, filters, pagination, sorting) {
  const params = listQuery({ filters, pagination, sorting, sortColumns });
  return useQuery({
    queryKey: key(params),
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
  });
}

export function useAccountingDashboardQuery(params) {
  return useQuery({
    queryKey: accountingKeys.dashboard(params),
    queryFn: () => fetchAccountingDashboard(params),
    placeholderData: keepPreviousData,
  });
}

export const usePartyBalancesQuery = (...args) =>
  useJournalQuery(
    { key: accountingKeys.partyBalances, fetcher: fetchPartyBalances, sortColumns: PARTY_BALANCE_SORT_COLUMNS },
    ...args,
  );

export const usePartyLedgerQuery = (...args) =>
  useJournalQuery(
    { key: accountingKeys.partyLedger, fetcher: fetchPartyLedgerEntries, sortColumns: PARTY_LEDGER_SORT_COLUMNS },
    ...args,
  );

const INVOICE_JOURNAL_FETCHERS = {
  [DocumentSideEnum.SALE]: fetchSaleJournal,
  [DocumentSideEnum.PURCHASE]: fetchPurchaseJournal,
};

/** دفترِ فروش یا خرید؛ هر سمت کلید و endpointِ خودش را دارد ولی شکلِ پاسخ یکی است. */
export const useInvoiceJournalQuery = (side, ...args) =>
  useJournalQuery(
    {
      key: (params) => accountingKeys.invoiceJournal(side, params),
      fetcher: INVOICE_JOURNAL_FETCHERS[side],
      sortColumns: INVOICE_JOURNAL_SORT_COLUMNS,
    },
    ...args,
  );

export const useSaleLineJournalQuery = (...args) =>
  useJournalQuery(
    { key: accountingKeys.saleLines, fetcher: fetchSaleLineJournal, sortColumns: SALE_LINE_SORT_COLUMNS },
    ...args,
  );

export const usePaymentJournalQuery = (...args) =>
  useJournalQuery(
    { key: accountingKeys.payments, fetcher: fetchPaymentJournal, sortColumns: PAYMENT_JOURNAL_SORT_COLUMNS },
    ...args,
  );

export const useInventoryValuationQuery = (...args) =>
  useJournalQuery(
    { key: accountingKeys.inventory, fetcher: fetchInventoryValuation, sortColumns: INVENTORY_VALUATION_SORT_COLUMNS },
    ...args,
  );

export const useTradeBreakdownQuery = (...args) =>
  useJournalQuery(
    { key: accountingKeys.tradeBreakdown, fetcher: fetchTradeBreakdown, sortColumns: TRADE_BREAKDOWN_SORT_COLUMNS },
    ...args,
  );

export function useTaxReportQuery(params) {
  return useQuery({
    queryKey: accountingKeys.tax(params),
    queryFn: () => fetchTaxReport(params),
    placeholderData: keepPreviousData,
  });
}
