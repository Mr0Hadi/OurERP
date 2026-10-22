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

- فهرست: `useProformaQueueQuery(WAREHOUSE_CHECKED)` و فیلترهای مشترکِ `ProformaQueueFilters` / `createProformaQueueFilterStore` از `sales/orders` (تازه‌سازی هر ۳۰ ثانیه). مهلتِ رزروِ هر ردیف: `cashier/components/ReservationTimer.jsx`.
- دریافت: صفحه‌ی جدا `cashier/pages/CashierPaymentPage.jsx` (`DocumentFormLayout`): ستونِ پهن شیوه‌ی پرداخت و دریافت؛ ستونِ کناری مشتری (`cashier/components/CashierCustomerCard.jsx` — تماس، مانده، سقف و اعتبارِ مانده پس از این فروش؛ با `CustomerView`)، و جمع؛ زیرِ هر دو با `below`ِ `DocumentFormLayout` و تمام‌عرض سه تب — اقلام، گردشِ حساب (`PartyStatementCard`، با `PartyStatementView`) و قراردادهای اقساطِ مشتری (`CustomerInstallmentsCard`) — که فقط با بازشدن خوانده می‌شوند؛ و دریافت. پیش‌پرداختِ قرارداد با روشِ «انتقال بانکی» با کارتخوان هم گرفته می‌شود (`DownPaymentPosPanel` در `sales/installments`، از `InstallmentPlanDraftCard.posPayment`). صندوقدار شیوه‌ی پرداخت را انتخاب می‌کند (نقد/نسیه یا اقساطی)؛ پیش از دریافت `ensureProformaPaymentType` آن را ثبت می‌کند. نقد/نسیه: `useSaleChangesSaver` با `paymentDraft` (کارتخوان با `useSalePosActions`)؛ اقساطی: `useIssueInstallmentSaleMutation`؛ فروشِ حضوری (`isInPersonProforma`) با پرداختِ کامل یا قرارداد: `useCompleteInPersonMutation`.

## importهای بیرونی

`sales` (سرویس‌ها، دامنه و کامپوننت‌های `orders` و `installments`)، `auth` (`usePermission`).
