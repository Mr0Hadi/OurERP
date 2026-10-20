# sales — فروش، مرجوعیِ فروش، اقساط

سه زیرماژول در `src/features/sales/`: `orders/`، `returns/`، `installments/`؛ یک `routes.jsx` (همه‌ی صفحه‌ها `lazy()`).

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `SALES` | `/sales` | `SaleView` | `src/features/sales/orders/pages/SalePage.jsx` |
| `SALES_NEW` | `/sales/new` | `["SaleCreate", "SaleInPerson"]` | `src/features/sales/orders/pages/SaleNewPage.jsx` |
| `SALES_DETAIL` | `/sales/:id` | `SaleView` | `src/features/sales/orders/pages/SaleDetailPage.jsx` |
| `SALES_INSTALLMENTS` | `/sales/installments` | `SaleInstallmentView` | `src/features/sales/installments/pages/InstallmentsPage.jsx` |
| `SALES_RETURNS_LIST` | `/sales/returns` | `SaleReturnView` | `src/features/sales/returns/pages/SalesReturnsListPage.jsx` |
| `SALES_RETURNS_NEW` | `/sales/returns/new` | `SaleReturnCreate` | `src/features/sales/returns/pages/SalesReturnNewPage.jsx` |
| `SALES_RETURNS_DETAIL` | `/sales/returns/:id` | `SaleReturnView` | `src/features/sales/returns/pages/SalesReturnDetailPage.jsx` |

`SaleDetailPage` با `useSaleQuery` سند را می‌گیرد: اگر `isSaleProforma(sale.status)` → `SaleForm.jsx` (ویرایشِ پیش‌فاکتور)، وگرنه `SaleIssuedView.jsx` (فاکتورِ صادرشده؛ مشتری و اقلام فقط‌خواندنی). بالای `SaleIssuedView`، `components/forms/SaleDeliveryNotice.jsx` قدمِ بعدیِ تحویل را نشان می‌دهد: در «ارسال شده» دکمه‌ی «ثبت تحویل کامل» (`useMarkSaleDeliveredMutation` → `ChangeSaleStatus`)، در «ارسال ناقص» پیوند به ارسالِ انبار. `SaleNewPage` همان `SaleForm` را بدونِ سند رندر می‌کند.

## سرویس‌ها (endpointها)

| زیرماژول | `api-v1.js` | کلید |
| --- | --- | --- |
| orders | `fetchSales` GET `/Sale/GetSaleList`، `fetchSaleById` GET `/Sale/GetSaleDetail`، `createSale` POST `/Sale/CreateSale`، `approveSaleProforma` POST `/Sale/ApproveSaleProforma`، `checkSaleWarehouse` POST `/Sale/CheckSaleWarehouse`، `completeInPersonSale` POST `/Sale/CompleteInPersonSale`، `fetchSaleWarehouseIssues` GET `/Sale/GetSaleWarehouseIssueList`، `resolveSaleWarehouseIssue` POST، `updateSale` PUT `/Sale/UpdateSale`، `changeSaleStatus` POST `/Sale/ChangeSaleStatus`، `updateSaleAttachments` PUT، `updateSalePaymentDate` PUT، `addSalePayment` / `editSalePayment` / `voidSalePayment` POST، `removeSale` DELETE `/Sale/DeleteSale` | `saleKeys` (`['sales']`)، `warehouseIssueKeys` (`['saleWarehouseIssues']`) |
| returns | `fetchSalesReturns`، `fetchSalesReturnById`، `createSalesReturn`، `addClaimResolution`، `removeClaimResolution`، `executeGoodsRound`، `executeMoneyEffect`، `rejectSalesReturn`، `cancelSalesReturn`، `reopenSalesReturn`، `removeSalesReturn`، `updateSalesReturnAttachments` روی `/SaleReturn/*`؛ و `fetchReturnableSales`/`fetchSaleForReturn` روی `/Sale/GetSaleList`/`GetSaleDetail` | `salesReturnKeys` (`['salesReturns']`) |
| installments | `fetchInstallmentPlan`، `fetchInstallmentPlans`، `fetchInstallments`، `createInstallmentPlan`، `updateInstallmentPlan`، `cancelInstallmentPlan`، `payInstallment`، `settleInstallmentPlan` روی `/SaleInstallment/*` | `installmentKeys` (`["saleInstallments"]`) |

هوک‌ها:
- `src/features/sales/orders/services/mutations.js`: `useCreateSaleMutation`، `useInPersonSaleMutation`، `useApproveSaleProformaMutation`، `useWarehouseApproveMutation`، `useResolveWarehouseIssueMutation`، `useIssueInstallmentSaleMutation`، `useRemoveSaleMutation`، `useSaleChangesSaver`، `useSalePosActions`. invalidation: `invalidateSalesEcosystem` در `src/features/sales/orders/services/sharedInvalidation.js`.
- `src/features/sales/returns/services/`: هوک‌ها نام‌های مستعارِ factoryهای مشترک‌اند — `createReturnQueries` (`src/shared/services/returns/createReturnQueries.js`) و `createReturnMutations` (`src/shared/services/returns/createReturnMutations.js`) با `invalidate: invalidateSalesEcosystem`.
- `src/features/sales/installments/services/`: `useInstallmentsQuery`، `useInstallmentPlansQuery`، `useInstallmentCountQuery`، `usePayInstallmentMutation`، `useSettleInstallmentPlanMutation`، … و کمک‌تابعِ `applyInstallmentPlan`.

## state و دامنه

- store: `useSaleFormStore` (`createDocumentFormStore`، `src/features/sales/orders/store/saleFormStore.js`)، `useSaleFilterStore`، `useSalesReturnFormStore` (`create` مستقیم)، `useSalesReturnFilterStore`، `useInstallmentFilterStore`.
- دامنه: `src/features/sales/orders/domain/saleRules.js`، `salePricing.js` (`SALE_PRICE_MODES` خرده/همکار؛ جابه‌جایی حالت قیمتِ اقلامِ هنوز-پیش‌فرض را از روی `products` (جزئیاتِ کالاهای فاکتور، `useDocumentProducts`) که `SaleForm` به `SaleItemsSection` می‌دهد عوض می‌کند)، `salePayments.js`؛ `src/features/sales/installments/domain/installmentPlan.js`، `installmentViews.js`؛ `src/features/sales/returns/domain/salesReturnVocabulary.js`. مدلِ مرجوعی: [11-domain-layer.md](../11-domain-layer.md).
- hook: `src/features/sales/orders/hooks/useSaleFormPos.js` (کارتخوان در فرم)، `src/features/sales/returns/hooks/useSalesReturnForm.js`.

## جریان‌ها

**ثبتِ فروشِ تازه**
1. `SaleNewPage` → `SaleForm` با `useSaleFormStore` و `useDocumentFormDraft` ([08](../08-client-state-zustand.md)).
2. `onSubmit` در `SaleForm.jsx`: `saleFormProblem(...)` را چک می‌کند، بدنه را با `buildPayload` می‌سازد، `createMutation.mutate(payload)`. فروشِ تازه همیشه پیش‌فاکتورِ «پیش‌نویس» است و پول نمی‌گیرد.
3. `useCreateSaleMutation`: `createSale(payload, { idempotencyKey: idempotencyKeyFor(payload) })` → `POST /Sale/CreateSale`.
4. `onSuccess`: toast، `invalidateSalesEcosystem(queryClient, created.id)`، `customerKeys.all`.
5. صفحه: `attachments.commit()`، `resetForm()`، `navigate(routeWithId(ROUTES.SALES_DETAIL, id), { replace: true })`.

**چرخه‌ی تأییدِ پیش‌فاکتور (بکند ۲۰۲۶-۱۰-۱۶)** — مرحله‌ها در `proformaStage` (`src/shared/domain/enums/saleProforma.js`): پیش‌نویس → «مشتری تأیید کرد؛ ارسال به انبار» (`useApproveSaleProformaMutation`) → بررسیِ انبار (`warehouse/saleCheck`؛ تأیید، یا کم‌کردنِ اقلام با دلیل و تأیید: `useWarehouseApproveMutation`) → دریافت یا حذف. صفحه **یک دکمه‌ی اصلی** دارد که کارش را `proformaAction` می‌گوید (`src/features/sales/orders/domain/proformaFlow.js`)؛ `ProformaStageCard` فقط وضعیت، شمارشِ معکوسِ رزرو (`useReservationCountdown`) و تاریخچه را نشان می‌دهد. دریافت فقط در «آماده‌ی پرداخت» و پیش از پایانِ مهلت. `UpdateSale` با تغییرِ مشتری، اقلام، قیمت/تخفیف، `paymentType` یا سررسید تأییدها را برمی‌گرداند؛ selectorهای `isSaleCoreChanged`/`isSaleDueDateChanged`/`isSaleInfoChanged` در `saleFormStore.js` تغییرها را جدا می‌کنند. هنگامِ دریافت فقط توضیح/پیوست پیش از آن و سررسید بعد از صدور ذخیره می‌شوند، و `paymentType` همان مقدارِ ذخیره‌شده است (`proformaPaymentType`). تاریخِ فاکتور را سرور با صدور می‌گذارد (`OrderInfoCard` با `showInvoiceDate={false}`).

فروشِ حضوری (دانه در فرم اسکن شده): `useInPersonSaleMutation` چهار درخواست را پشتِ هم می‌فرستد — `CreateSale` ← `ApproveSaleProforma` ← `CheckSaleWarehouse` (همان دانه‌ها) ← `CompleteInPersonSale` (اتمیک: پرداخت/قرارداد، ارسال، تحویل). شکستِ بعد از ثبت `partiallySaved` می‌گیرد و صفحه پیش‌فاکتور را باز می‌کند. کارتخوانِ ناقص به‌جای قدمِ آخر `AddSalePayment` می‌زند (`deliver: false`).

**ویرایشِ پیش‌فاکتور / صدور / پرداخت («ثبت تغییرات»)** — `useSaleChangesSaver(saleId)` → `runDocumentChanges(SALE_CHANGES_API, saleId, changes)` ([07](../07-server-state-react-query.md)). اولین پرداختِ ورودی فاکتور را صادر می‌کند. موفق → `applySale` (`setQueryData` + invalidate)؛ خطا → `invalidateSalesEcosystem` و `partialSaveMessage`.

**فروشِ اقساطی** — `submitPayment` در `SaleForm.jsx` قرارداد را با `toApiCreatePlan(planDraft)` می‌سازد:
- پیش‌فاکتورِ «آماده‌ی پرداخت»: `useIssueInstallmentSaleMutation` → (پیوست‌های عوض‌شده) بعد `createInstallmentPlan` (`POST /SaleInstallment/CreateSaleInstallmentPlan`).
- حضوری: قرارداد داخلِ `CompleteInPersonSale` (`installmentPlan`).

**مرجوعیِ فروش** — `SalesReturnNewPage` گام‌به‌گام (انتخابِ فاکتور با `useReturnableSalesQuery` → ادعاها) → `useCreateSalesReturnMutation`؛ صفحه‌ی جزئیات تصمیم‌ها و اجرای اثرها (`executeGoodsRound`، `executeMoneyEffect`) را با `useSalesReturnActions` انجام می‌دهد. کامپوننت‌ها از `src/shared/components/returns/` ([10](../10-shared-components-catalog.md)).

## importهای بیرونی

`auth` (`usePermission` در صفحه‌ها)، `customers` (`useCustomersOptionsQuery`، `useCustomerQuery`، `useCustomerSearchQuery`، `customerKeys`)، `warehouse` (`useDocumentProducts`، `UnitsPageLink`، `UNIT_SEGMENTS`، `shippingKeys`، `productKeys`، `productUnitKeys`)، `partyAccount` (`partyDisplayName`)، `dashboard` (`dashboardKeys` در `src/features/sales/installments/services/mutations.js`)؛ `audit` (`AuditHistoryButton` در هدرِ صفحه‌ی جزئیات): `SaleDetailPage` و `SalesReturnDetailPage` با `documentKind` ۲ و ۴.

## نکته‌ها و بدهی

- نامِ فیلدِ `productIds` در `createSale` گمراه‌کننده است: بکند لیستِ اقلامِ کامل می‌خواهد (کامنتِ خودِ `src/features/sales/orders/services/api-v1.js`).
- `src/features/sales/returns/services/api-v1.js` مستقیم `/Sale/GetSaleList` و `/Sale/GetSaleDetail` را صدا می‌زند، نه تابع‌های `orders`.
- `orders` و `installments` به هم وابسته‌اند (هر کدام کلید/تابعِ دیگری را import می‌کند)؛ سبکِ import بینِ زیرماژول‌ها مخلوط است (نسبی `../../returns/...` و `@/features/sales/...`).
- کامنتِ `applyInstallmentPlan` می‌گوید عمداً `invalidateSalesEcosystem` نیست، ولی `orders/services/mutations.js` هر دو را پشتِ هم صدا می‌زند.
- `useInstallmentsQuery` و `useInstallmentCountQuery` هر دو کلیدِ `installmentKeys.installmentList(params)` دارند؛ چون `queryFn` یکی است (`fetchInstallments(params)`) و شمارش فقط `select` دارد، اشتراکِ کش بی‌خطر است.
- فروشِ کاملاً نسیه فعلاً ممکن نیست: بکند فروش را فقط با اولین دریافت به فاکتور تبدیل می‌کند (کامنتِ `SaleForm.jsx`).
- فروشِ حضوری اتمیک نیست (چهار درخواست)؛ بکند دستورِ یک‌جا ندارد.
