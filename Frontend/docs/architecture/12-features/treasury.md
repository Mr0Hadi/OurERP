# treasury — خزانه‌داری

یک جا برای هرچه پول جابه‌جا می‌کند: صفِ صندوق و اقساط؛ و جای حساب‌های بانک/صندوق، دریافت/پرداختِ مستقل از فاکتور، انتقال‌ها و چک‌ها (GAP-03، هنوز ساخته نشده). `src/features/treasury/` با `routes.jsx` و زیرماژولِ `cashier/`. صفحه‌ی اقساط کدش در `src/features/sales/installments/` می‌ماند (منطقِ فروش است) و فقط مسیرش این‌جاست.

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `TREASURY` | `/treasury` | — | ریدایرکت به صندوق |
| `TREASURY_CASHIER` | `/treasury/cashier` | `SalePayment` | `src/features/treasury/cashier/pages/CashierQueuePage.jsx` |
| `TREASURY_CASHIER_DETAIL` | `/treasury/cashier/:id` | `SalePayment` | `src/features/treasury/cashier/pages/CashierPaymentPage.jsx` |
| `TREASURY_INSTALLMENTS` | `/treasury/installments` | `SaleInstallmentView` | `src/features/sales/installments/pages/InstallmentsPage.jsx` |
| `LEGACY_SALES_CASHIER`، `LEGACY_SALES_INSTALLMENTS` | `/sales/cashier`، `/sales/installments` | — | ریدایرکت با همان query |

## صندوق

- فهرست: `useProformaQueueQuery(WAREHOUSE_CHECKED)`، فیلترهای مشترکِ `ProformaQueueFilters`/`createProformaQueueFilterStore` و ستون‌های `proformaQueueColumns` از `sales/orders`؛ تازه‌سازی هر ۳۰ ثانیه و `RefreshButton`.
- دریافت: `cashier/pages/CashierPaymentPage.jsx` (`DocumentFormLayout`) — ستونِ پهن `ProformaPaymentSection` با `useProformaPayment` (همان منطقِ فرمِ فروش: شیوه‌ی پرداخت، قرارداد، کارتخوان، تحویلِ حضوری)؛ ستونِ کناری `CashierCustomerCard` (تماس، مانده، سقف و اعتبارِ مانده پس از این فروش؛ با `CustomerView`) و جمع؛ زیرِ هر دو و تمام‌عرض (`below`) `CashierCustomerTabs` — اقلام، گردشِ حساب (`PartyStatementCard`، با `PartyStatementView`) و قراردادهای اقساطِ مشتری (`CustomerInstallmentsCard`)، که فقط با بازشدنِ تب خوانده می‌شوند. پیش‌فاکتوری که دیگر آماده‌ی پرداخت نیست: `ProformaUnavailable`.

## importهای بیرونی

`sales` (سرویس‌ها، دامنه و کامپوننت‌های `orders` و `installments`)، `auth` (`usePermission`).
