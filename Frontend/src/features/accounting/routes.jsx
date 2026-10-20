import { lazy } from "react";
import { Navigate } from "react-router-dom";

import { ROUTES } from "@/shared/constants/routes";
import { DocumentSideEnum } from "./domain/accountingEnums";

const AccountingDashboardPage = lazy(() => import("./pages/AccountingDashboardPage"));
const PartyBalancesPage = lazy(() => import("./pages/PartyBalancesPage"));
const PartyLedgerPage = lazy(() => import("./pages/PartyLedgerPage"));
const InvoiceJournalPage = lazy(() => import("./pages/InvoiceJournalPage"));
const SaleLineJournalPage = lazy(() => import("./pages/SaleLineJournalPage"));
const PaymentJournalPage = lazy(() => import("./pages/PaymentJournalPage"));
const WarehouseIssuesPage = lazy(() => import("./pages/WarehouseIssuesPage"));
const TaxReportPage = lazy(() => import("./pages/TaxReportPage"));
const InventoryValuationPage = lazy(() => import("./pages/InventoryValuationPage"));
const TradeBreakdownPage = lazy(() => import("./pages/TradeBreakdownPage"));
const EmployeeActivityPage = lazy(() => import("./activity/pages/EmployeeActivityPage"));
const CustomerActivityPage = lazy(() => import("./activity/pages/CustomerActivityPage"));
const SupplierActivityPage = lazy(() => import("./activity/pages/SupplierActivityPage"));

/** دفترهای حسابداری پشتِ یک دسترسی‌اند (بخش ۲۰ سند)؛ گزارش‌های فعالیت پشتِ `ReportView` (بخش ۱۸). */
const handle = { permission: "AccountingView" };
const reportHandle = { permission: "ReportView" };

/** نشانی‌های بخشِ قدیمیِ «گزارش‌ها» → صفحه‌ی هم‌معنا در این بخش. */
const LEGACY_REPORT_REDIRECTS = {
  "": ROUTES.ACCOUNTING,
  employees: ROUTES.ACCOUNTING_EMPLOYEES,
  customers: ROUTES.ACCOUNTING_CUSTOMERS,
  suppliers: ROUTES.ACCOUNTING_SUPPLIERS,
  sales: ROUTES.ACCOUNTING_SALES,
  purchases: ROUTES.ACCOUNTING_PURCHASES,
  financial: ROUTES.ACCOUNTING,
  "profit-loss": ROUTES.ACCOUNTING,
  warehouse: ROUTES.ACCOUNTING_INVENTORY,
};

export const accountingRoutes = [
  { path: ROUTES.ACCOUNTING, handle, element: <AccountingDashboardPage /> },
  { path: ROUTES.ACCOUNTING_PARTIES, handle, element: <PartyBalancesPage /> },
  // بخش ۱۱ سند: فهرست با `AccountingView` یا `SaleWarehouseIssueResolve`.
  {
    path: ROUTES.ACCOUNTING_WAREHOUSE_ISSUES,
    handle: { permission: ["AccountingView", "SaleWarehouseIssueResolve"] },
    element: <WarehouseIssuesPage />,
  },
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
  { path: ROUTES.ACCOUNTING_EMPLOYEES, handle: reportHandle, element: <EmployeeActivityPage /> },
  { path: ROUTES.ACCOUNTING_CUSTOMERS, handle: reportHandle, element: <CustomerActivityPage /> },
  { path: ROUTES.ACCOUNTING_SUPPLIERS, handle: reportHandle, element: <SupplierActivityPage /> },
  ...Object.entries(LEGACY_REPORT_REDIRECTS).map(([sub, to]) => ({
    path: sub ? `${ROUTES.REPORTS}/${sub}` : ROUTES.REPORTS,
    element: <Navigate to={to} replace />,
  })),
];
