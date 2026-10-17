# accounting — دفترها و گزارش‌ها

`src/features/accounting/` (صفحه‌های دفتر) + زیرماژولِ `activity/` (گزارش‌های فعالیت). جایگزینِ بخشِ قدیمیِ «گزارش‌ها» است.

## مسیرها

`src/features/accounting/routes.jsx` دو handle دارد: `handle = { permission: "AccountingView" }` و `reportHandle = { permission: "ReportView" }`.

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `ACCOUNTING` | `/accounting` | `AccountingView` | `src/features/accounting/pages/AccountingDashboardPage.jsx` |
| `ACCOUNTING_PARTIES` | `/accounting/parties` | `AccountingView` | `src/features/accounting/pages/PartyBalancesPage.jsx` |
| `ACCOUNTING_PARTY_LEDGER` | `/accounting/party-ledger` | `AccountingView` | `src/features/accounting/pages/PartyLedgerPage.jsx` |
| `ACCOUNTING_SALES` / `ACCOUNTING_PURCHASES` | `/accounting/sales`، `/accounting/purchases` | `AccountingView` | `src/features/accounting/pages/InvoiceJournalPage.jsx` با `side={DocumentSideEnum.SALE \| PURCHASE}` و `key` جدا |
| `ACCOUNTING_SALE_LINES` | `/accounting/sale-lines` | `AccountingView` | `src/features/accounting/pages/SaleLineJournalPage.jsx` |
| `ACCOUNTING_PAYMENTS` | `/accounting/payments` | `AccountingView` | `src/features/accounting/pages/PaymentJournalPage.jsx` |
| `ACCOUNTING_TAX` | `/accounting/tax` | `AccountingView` | `src/features/accounting/pages/TaxReportPage.jsx` |
| `ACCOUNTING_INVENTORY` | `/accounting/inventory` | `AccountingView` | `src/features/accounting/pages/InventoryValuationPage.jsx` |
| `ACCOUNTING_BREAKDOWN` | `/accounting/breakdown` | `AccountingView` | `src/features/accounting/pages/TradeBreakdownPage.jsx` |
| `ACCOUNTING_EMPLOYEES` | `/accounting/employees` | `ReportView` | `src/features/accounting/activity/pages/EmployeeActivityPage.jsx` |
| `ACCOUNTING_CUSTOMERS` | `/accounting/customers` | `ReportView` | `src/features/accounting/activity/pages/CustomerActivityPage.jsx` |
| `ACCOUNTING_SUPPLIERS` | `/accounting/suppliers` | `ReportView` | `src/features/accounting/activity/pages/SupplierActivityPage.jsx` |

**ریدایرکت‌های قدیمی** (`LEGACY_REPORT_REDIRECTS`): `/reports`، `/reports/employees`، `/reports/customers`، `/reports/suppliers`، `/reports/sales`، `/reports/purchases`، `/reports/financial`، `/reports/profit-loss`، `/reports/warehouse` → صفحه‌ی هم‌معنا با `<Navigate replace>`.

## سرویس‌ها

- `src/features/accounting/services/api-v1.js` — همه GET زیرِ `/Accounting/`: `GetAccountingDashboard`، `GetPartyBalanceList`، `GetPartyLedgerEntryList`، `GetSaleJournal`، `GetPurchaseJournal`، `GetSaleLineJournal`، `GetPaymentJournal`، `GetTaxReport`، `GetInventoryValuation`، `GetTradeBreakdown`. فهرست‌ها از کمک‌تابعِ داخلیِ `fetchJournal` می‌گذرند که `summary` را کنارِ `items` نگه می‌دارد. نقشه‌های مرتب‌سازی: `*_SORT_COLUMNS`.
- هوک‌ها (`queries.js`): `useAccountingDashboardQuery`، `usePartyBalancesQuery`، `usePartyLedgerQuery`، `useInvoiceJournalQuery(side, …)`، `useSaleLineJournalQuery`، `usePaymentJournalQuery`، `useInventoryValuationQuery`، `useTradeBreakdownQuery`، `useTaxReportQuery`. کلید `accountingKeys` (`["accounting"]`).
- `src/features/accounting/activity/services/api-v1.js` — GET زیرِ `/Report/`: `GetSalesPerformanceByEmployee`، `GetSupplyPerformanceByEmployee`، `GetCustomerPurchaseStatistics`، `GetSupplierSalesStatistics`؛ کلید `activityKeys` (`["report-activity"]`).

فقط‌خواندنی است؛ mutation ندارد و با `staleTime: 0`ِ سراسری هر ورود از سرور می‌خواند.

## ساختارِ صفحه

- `src/features/accounting/components/AccountingPageLayout.jsx` = `<AccountingNav/>` + `ListPageLayout`.
- `src/features/accounting/components/AccountingNav.jsx` گروه‌های `ACCOUNTING_PAGE_GROUPS` (`src/features/accounting/domain/accountingPages.js`) را با `usePermission().allows(page.permission)` فیلتر می‌کند؛ دو گروه: دفترها (`AccountingView`) و فعالیت (`ReportView`).
- **پیش‌تنظیم از URL:** `useUrlPreset(useStore, keys, { textKeys })` (`src/shared/hooks/useUrlPreset.js`؛ از ۲۰۲۶-۱۰-۱۷ در `shared/` چون `audit` هم لازمش دارد) پارامترهای URL را یک بار در initializerِ `useState` می‌خواند (قبل از اولین درخواست): `search` رشته، کلیدهای `*Date` فقط `YYYY-MM-DD`، بقیه عدد؛ بعد `applyPreset`ِ store. `withFilters(path, filters)` چنین URLهایی می‌سازد (لینک از داشبورد به دفترِ فیلترشده). استفاده: PartyBalances، PartyLedger، InvoiceJournal، SaleLine، PaymentJournal، TradeBreakdown.
- storeها: `src/features/accounting/store/accountingFilterStores.js` (`createFilterStore` + `applyPreset`؛ `INVOICE_JOURNAL_STORES` یکی برای هر `DocumentSideEnum`؛ `useAccountingDashboardStore`، `useTaxReportStore` با factoryِ دستیِ دوره)؛ `src/features/accounting/activity/store/activityFilterStore.js`.
- دامنه: `src/features/accounting/domain/accountingEnums.js` (`AccountingPartyTypeEnum`، `PartyBalanceStateEnum`، `InvoicePaymentStateEnum`، `DocumentSideEnum`، `TradeBreakdownGroupEnum`)، `aging.js`، `dashboardSeries.js`، `journalSides.js`، `paymentPurpose.js`.

## importهای بیرونی

`auth` (`usePermission`)؛ فیلترها: `organization` (واحد/تیم در `EmployeeScopeFilter.jsx`)، `warehouse/categories` (`CategoryFilterSelect.jsx`)، `customers`/`suppliers` (`PartyFilterSelect.jsx`)، `employees` (`src/features/employees/components/UserFilterSelect.jsx`؛ پیش‌تر در `accounting/components/filters/`).

## نکته‌ها و بدهی

- `AccountingDashboardPage.jsx` تنها صفحه‌ای است که `AccountingPageLayout` را استفاده نمی‌کند و `AccountingNav` را مستقیم رندر می‌کند.
- `useTaxReportStore = createPeriodStore(3)` عددِ دوره را literal می‌دهد نه از `src/shared/domain/enums/reportPeriod.js`.
- ریدایرکت‌های قدیمی handle ندارند؛ مجوز در مقصد سنجیده می‌شود (رفتارِ درست).
- `INVOICE_JOURNAL_SORT_COLUMNS` هم `customerName` و هم `supplierName` را به `2` نگاشت می‌کند؛ درست است: `SaleJournalSortEnum.CUSTOMER_NAME` و `PurchaseJournalSortEnum.SUPPLIER_NAME` در `Backend-Net/Application/Features/Accounting/Queries/` هر دو `2` هستند.
