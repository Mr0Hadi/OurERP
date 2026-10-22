# treasury — خزانه‌داری

یک جا برای هرچه پول جابه‌جا می‌کند: صفِ صندوق، اقساط، صندوق‌ها و حساب‌های بانکی، و دریافت/پرداختِ علی‌الحساب؛ و جای چک‌ها (GAP-03.3، هنوز ساخته نشده). `src/features/treasury/` با `routes.jsx` و زیرماژول‌های `cashier/`، `bankAccounts/` و `partyPayments/`. صفحه‌ی اقساط کدش در `src/features/sales/installments/` می‌ماند (منطقِ فروش است) و فقط مسیرش این‌جاست.

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `TREASURY` | `/treasury` | — | ریدایرکت به صندوق |
| `TREASURY_CASHIER` | `/treasury/cashier` | `SalePayment` | `src/features/treasury/cashier/pages/CashierQueuePage.jsx` |
| `TREASURY_CASHIER_DETAIL` | `/treasury/cashier/:id` | `SalePayment` | `src/features/treasury/cashier/pages/CashierPaymentPage.jsx` |
| `TREASURY_INSTALLMENTS` | `/treasury/installments` | `SaleInstallmentView` | `src/features/sales/installments/pages/InstallmentsPage.jsx` |
| `TREASURY_PARTY_PAYMENTS`، `TREASURY_PARTY_PAYMENTS_DETAIL` | `/treasury/party-payments`، `/treasury/party-payments/:id` | `PartyStatementView` یا `PartyPaymentCreate` | `src/features/treasury/partyPayments/pages/PartyPaymentsPage.jsx`، `PartyPaymentDetailPage.jsx` |
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

## علی‌الحساب (`partyPayments/`)

- پولِ بی فاکتور از مشتری یا به تامین‌کننده (`api/PartyAccount` بخشِ پرداخت). فهرست: `ListPageLayout` + `PartyPaymentFilters` (`usePartyPaymentFilterStore`، نام‌های `GetPartyPaymentListQuery`) + `PartyPaymentTable`؛ `?customerId=`/`?supplierId=` یک‌بار پیش از اولین درخواست.
- جزئیات: مشخصات، تخصیص‌ها (فعال و برداشته‌شده) با «برداشتن» (`RemovePartyPaymentAllocation`)، «تخصیص» (`AllocateDialog`) و «ابطال» (`PartyPaymentVoid`؛ تا تخصیصِ فعال هست بسته).
- `PartyPaymentFormDialog`: طرف (یا ثابت از صفحه‌ی شخص)، جهت (طبیعی یا برگرداندنِ بستانکاری)، روش، مبلغ، تاریخ، مرجع، صندوق/حساب، شرح و تخصیصِ اختیاری در همان درخواست. کارتخوان و فیلدهای تکمیلیِ چک ندارد.
- `AllocationEditor` مشترکِ فرم و `AllocateDialog`؛ قواعد (جهتِ طبیعی، سقفِ هر فاکتور و جمع، «پرکردنِ خودکار» قدیمی‌ترین سررسید اول) در `domain/partyPayment.js`.
- `PartyOnAccountBar` در صفحه‌ی جزئیاتِ مشتری و تامین‌کننده.
- روی فاکتور: `PaymentsCard` پارامترِ `allocations` (`paymentAllocations`ِ سند) را جزوِ «پرداخت‌شده» می‌شمارد و فقط نمایش می‌دهد؛ سقفِ پولِ برگشتی همان پرداخت‌های خودِ سند است.
- بعد از هر نوشتن: فهرست‌ها، فاکتورهای قابلِ تخصیص، مشتری/تامین‌کننده (مانده و گردش)، فروش یا خرید، صندوق/بانک و حسابداری باطل می‌شوند.

## importهای بیرونی

`sales` (سرویس‌ها، دامنه و کامپوننت‌های `orders` و `installments`)، `auth` (`usePermission`).
`bankAccounts/` فقط از `shared/` و `auth` می‌خواند. `partyPayments/`: `customers`، `suppliers` (گزینه‌ها و کلیدها)، `sales/orders`، `purchases/orders`، `accounting` (کلیدها برای باطل‌کردن).
