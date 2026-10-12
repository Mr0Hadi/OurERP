import { lazy } from "react";

import { ROUTES } from "@/shared/constants/routes";
import { DocumentSideEnum } from "./domain/accountingEnums";

const AccountingDashboardPage = lazy(() => import("./pages/AccountingDashboardPage"));
const PartyBalancesPage = lazy(() => import("./pages/PartyBalancesPage"));
const PartyLedgerPage = lazy(() => import("./pages/PartyLedgerPage"));
const InvoiceJournalPage = lazy(() => import("./pages/InvoiceJournalPage"));
const SaleLineJournalPage = lazy(() => import("./pages/SaleLineJournalPage"));
const PaymentJournalPage = lazy(() => import("./pages/PaymentJournalPage"));
const TaxReportPage = lazy(() => import("./pages/TaxReportPage"));
const InventoryValuationPage = lazy(() => import("./pages/InventoryValuationPage"));
const TradeBreakdownPage = lazy(() => import("./pages/TradeBreakdownPage"));

/** همه‌ی صفحه‌های حسابداری پشتِ یک دسترسی‌اند (بخش ۲۰ سند). */
const handle = { permission: "AccountingView" };

export const accountingRoutes = [
  { path: ROUTES.ACCOUNTING, handle, element: <AccountingDashboardPage /> },
  { path: ROUTES.ACCOUNTING_PARTIES, handle, element: <PartyBalancesPage /> },
  { path: ROUTES.ACCOUNTING_PARTY_LEDGER, handle, element: <PartyLedgerPage /> },
  // دو دفتر یک صفحه‌اند؛ `key` تا جابه‌جاییِ مستقیم بینشان صفحه را از نو بسازد (فیلترهای
  // نشانی فقط هنگامِ ورود خوانده می‌شوند).
  {
    path: ROUTES.ACCOUNTING_SALES,
    handle,
    element: <InvoiceJournalPage key="sale" side={DocumentSideEnum.SALE} />,
  },
  {
    path: ROUTES.ACCOUNTING_PURCHASES,
    handle,
    element: <InvoiceJournalPage key="purchase" side={DocumentSideEnum.PURCHASE} />,
  },
  { path: ROUTES.ACCOUNTING_SALE_LINES, handle, element: <SaleLineJournalPage /> },
  { path: ROUTES.ACCOUNTING_PAYMENTS, handle, element: <PaymentJournalPage /> },
  { path: ROUTES.ACCOUNTING_TAX, handle, element: <TaxReportPage /> },
  { path: ROUTES.ACCOUNTING_INVENTORY, handle, element: <InventoryValuationPage /> },
  { path: ROUTES.ACCOUNTING_BREAKDOWN, handle, element: <TradeBreakdownPage /> },
];
