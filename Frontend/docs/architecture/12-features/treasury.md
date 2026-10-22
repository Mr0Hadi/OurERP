# treasury — خزانه‌داری

یک جا برای هرچه پول جابه‌جا می‌کند: صفِ صندوق، اقساط، صندوق‌ها و حساب‌های بانکی؛ و جای دریافت/پرداختِ مستقل از فاکتور و چک‌ها (GAP-03، هنوز ساخته نشده). `src/features/treasury/` با `routes.jsx` و زیرماژول‌های `cashier/` و `bankAccounts/`. صفحه‌ی اقساط کدش در `src/features/sales/installments/` می‌ماند (منطقِ فروش است) و فقط مسیرش این‌جاست.

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `TREASURY` | `/treasury` | — | ریدایرکت به صندوق |
| `TREASURY_CASHIER` | `/treasury/cashier` | `SalePayment` | `src/features/treasury/cashier/pages/CashierQueuePage.jsx` |
| `TREASURY_CASHIER_DETAIL` | `/treasury/cashier/:id` | `SalePayment` | `src/features/treasury/cashier/pages/CashierPaymentPage.jsx` |
| `TREASURY_INSTALLMENTS` | `/treasury/installments` | `SaleInstallmentView` | `src/features/sales/installments/pages/InstallmentsPage.jsx` |
| `TREASURY_ACCOUNTS`، `TREASURY_ACCOUNTS_DETAIL` | `/treasury/accounts`، `/treasury/accounts/:id` | `BankAccountView` یا `BankAccountManage` | `src/features/treasury/bankAccounts/pages/BankAccountsPage.jsx` |
| `LEGACY_SALES_CASHIER`، `LEGACY_SALES_INSTALLMENTS` | `/sales/cashier`، `/sales/installments` | — | ریدایرکت با همان query |

## صندوق

- فهرست: `useProformaQueueQuery(WAREHOUSE_CHECKED)`، فیلترهای مشترکِ `ProformaQueueFilters`/`createProformaQueueFilterStore` و ستون‌های `proformaQueueColumns` از `sales/orders`؛ تازه‌سازی هر ۳۰ ثانیه و `RefreshButton`.
- دریافت: `cashier/pages/CashierPaymentPage.jsx` (`DocumentFormLayout`) — ستونِ پهن `ProformaPaymentSection` با `useProformaPayment` (همان منطقِ فرمِ فروش: شیوه‌ی پرداخت، قرارداد، کارتخوان، تحویلِ حضوری)؛ ستونِ کناری `CashierCustomerCard` (تماس، مانده، سقف و اعتبارِ مانده پس از این فروش؛ با `CustomerView`) و جمع؛ زیرِ هر دو و تمام‌عرض (`below`) `CashierCustomerTabs` — اقلام، گردشِ حساب (`PartyStatementCard`، با `PartyStatementView`) و قراردادهای اقساطِ مشتری (`CustomerInstallmentsCard`)، که فقط با بازشدنِ تب خوانده می‌شوند. پیش‌فاکتوری که دیگر آماده‌ی پرداخت نیست: `ProformaUnavailable`.

## صندوق و بانک (`bankAccounts/`)

- صفحه‌ی فهرست/جزئیات با `MasterListPane` (مثلِ خودروها): ستونِ کنار حساب‌ها با مانده و جمع‌ها (`Totals`: صندوق‌ها، بانک‌ها، کل، و `unassignedNet` = پولِ بی‌حساب)؛ کنارش `BankAccountStatement` — سرصفحه با مانده و کارها، گردشِ `GetBankAccountStatement` در بازه (پیش‌فرض ۳۰ روزِ اخیر، `defaultStatementRange`) و ابطالِ انتقال روی ردیف‌های انتقال.
- دیالوگ‌ها: `BankAccountFormDialog` (صندوق/حساب؛ شبا و کارت با `ShabaInput`/`CardNumberInput` و رقمِ کنترلی، نامِ بانک از روی آن‌ها پیشنهاد می‌شود)، `BankTransferDialog` (انتقال بین دو حسابِ فعال، ایدمپوتنت).
- دامنه: `domain/bankAccountForm.js` (پیش‌نویس، خطاها، بدنه‌ی API؛ همان قاعده‌های validatorهای سرور)، `domain/bankAccountStatement.js`.
- کلیدها در `src/shared/services/bankAccounts/queryKeys.js` (ریشه‌ی `["bankAccounts"]`) چون انتخابگرِ حسابِ فرم‌های پرداخت (`BankAccountSelect`) هم زیرِ همین ریشه است؛ هر نوشتن همه را باطل می‌کند.
- انتخابگرِ حساب روی هر ثبتِ پول: `PaymentMethodEditor` (پرداخت‌های سند، صندوق، فروشِ حضوری)، `InstallmentPaymentFields` (پیش‌پرداخت، قسط، تسویه). فقط نقدی و انتقال (`takesBankAccount`)؛ چک هنگامِ وصول حساب می‌گیرد. پیش‌فرضی انتخاب نمی‌شود؛ پولِ بی‌حساب در `unassignedNet` می‌ماند. پولِ مرجوعی‌ها هنوز حساب نمی‌گیرد (سمتِ سرور).

## importهای بیرونی

`sales` (سرویس‌ها، دامنه و کامپوننت‌های `orders` و `installments`)، `auth` (`usePermission`).
`bankAccounts/` فقط از `shared/` و `auth` می‌خواند.
