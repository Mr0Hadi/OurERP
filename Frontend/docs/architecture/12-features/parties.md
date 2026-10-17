# customers، suppliers، partyAccount — طرف‌حساب‌ها

`customers` و `suppliers` تقریباً قرینه‌اند و قطعاتِ مشترکشان در `partyAccount` است (بدونِ مسیر).

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `CUSTOMERS_LIST` | `/customers` | `CustomerView` | `src/features/customers/pages/CustomersPage.jsx` |
| `CUSTOMERS_NEW` | `/customers/new` | `CustomerCreate` | `src/features/customers/pages/CustomerNewPage.jsx` |
| `CUSTOMERS_DETAIL` | `/customers/:id` | `CustomerView` | `src/features/customers/pages/CustomerDetailPage.jsx` (ویرایش هم همین‌جا) |
| `SUPPLIERS_LIST` | `/suppliers` | `SupplierView` | `src/features/suppliers/pages/SuppliersPage.jsx` |
| `SUPPLIERS_NEW` | `/suppliers/new` | `SupplierCreate` | `src/features/suppliers/pages/SupplierNewPage.jsx` |
| `SUPPLIERS_DETAIL` | `/suppliers/:id` | `SupplierView` | `src/features/suppliers/pages/SupplierDetailPage.jsx` |
| `SUPPLIERS_EDIT` | `/suppliers/edit/:id` | `SupplierUpdate` | `src/features/suppliers/pages/SupplierEditPage.jsx` (**placeholder**) |

## سرویس‌ها

- customers (`src/features/customers/services/api-v1.js`): `fetchCustomers` GET `/Customer/GetCustomerList`، `getCustomerById` GET `/Customer/GetCustomerDetail`، `createCustomer` POST، `updateCustomer` PUT، `deleteCustomer` DELETE. هوک‌ها: `useCustomersQuery`، `useCustomerQuery`، `useCustomersOptionsQuery`، `useCustomerSearchQuery`، `useCreate/Update/DeleteCustomerMutation`. کلید `customerKeys` (`["customers"]`).
- suppliers: همان شکل روی `/Supplier/*`؛ `supplierKeys` (`["suppliers"]`).
- partyAccount (`src/features/partyAccount/services/api-v1.js`): `fetchPartyStatement` GET `/PartyAccount/GetPartyStatement` (`customerId` یا `supplierId`، `fromDate`، `toDate`)؛ `usePartyStatementQuery` و `partyStatementKey` در `queries.js`. فایلِ `queryKeys.js` ندارد.

## partyAccount: چه دارد

| فایل | نقش |
| --- | --- |
| `src/features/partyAccount/store/createPartyFilterStore.js` | `createPartyFilterStore(searchKey)` + `BALANCE_QUICK_FILTERS`؛ مشتری `"fullName"`، تامین‌کننده `"companyNameOrContactName"` |
| `src/features/partyAccount/components/PartyListFilters.jsx` | فیلترِ لیست با `ResponsiveFilters` |
| `PartyStatementCard.jsx`، `LedgerBalanceBadge.jsx`، `PartyAddressForm.jsx`، `PartyDetailLoading.jsx` | صورت‌حساب، نشانِ مانده، فرمِ نشانی، اسکلتون |
| `src/features/partyAccount/domain/partyBalance.js`، `partyName.js` | `partyBalanceOf`، `openingBalanceOf`، `partyDisplayName` |

## جریان‌ها

**ثبتِ مشتری** — `CustomerNewPage` → `useCustomerForm()` (`src/features/customers/hooks/useCustomerForm.js`؛ react-hook-form + `useImageUpload` با `ImageFolderEnum.CUSTOMERS`) → `buildCustomerPayload` (`referralCode` → `refferalCode`ِ بکند، `imageKey`) → `useCreateCustomerMutation` → `POST /Customer/CreateCustomer` → invalidate `customerKeys.lists()` → `imageUpload.commit()`، `goBack({ newCustomerId })` از `useReturnTo` (برگشت به فرمِ فروشی که «مشتری جدید» را باز کرد). تامین‌کننده قرینه است.

**صورت‌حساب** — `PartyStatementCard` بازه را در state محلی نگه می‌دارد → `usePartyStatementQuery` با کلیدِ `[...customerKeys.all, "statement", id, { fromDate, toDate }]` (یا زیرِ `supplierKeys.all`). یعنی **هر invalidateِ `customerKeys.all`، صورت‌حساب را هم تازه می‌کند** — به همین دلیل فروش/پرداخت `customerKeys.all` را باطل می‌کنند.

**تاریخچه** — `CustomerDetailPage` و `SupplierDetailPage` دکمه‌ی «تاریخچه» (`AuditHistoryButton` از `src/features/audit/components/AuditHistoryButton.jsx`، `entityType` = `Customer`/`Supplier`) را در هدر دارند؛ فقط با `AuditLogView` ([audit](audit.md)).

## نکته‌ها و بدهی

- `partyAccount` ↔ `customers`/`suppliers` دوطرفه وابسته‌اند (`partyAccount/services/queries.js` کلیدهای آن دو را import می‌کند).
- `SupplierEditPage.jsx` placeholderِ مسیردار است و هیچ‌جا به آن لینک نشده.
- `useCreateCustomerMutation` فقط `customerKeys.lists()` را باطل می‌کند؛ چون `customerKeys.options()` = `[...lists(), "options"]` است، گزینه‌های انتخابگر هم با همین prefix تازه می‌شوند (کشِ صورت‌حساب و جزئیات نه).
- TODO در `CustomerNewPage.jsx`: endpointِ ساخت هنوز شناسه‌ی رکوردِ تازه را برنمی‌گرداند.
- نامِ فیلدِ بکند `refferalCode` (غلطِ املایی) است.
