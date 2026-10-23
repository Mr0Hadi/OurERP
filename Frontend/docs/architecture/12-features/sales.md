# sales — فروش، مرجوعیِ فروش، اقساط

سه زیرماژول در `src/features/sales/`: `orders/`، `returns/`، `installments/`؛ صفحه‌ی اقساط و صفِ صندوق در [treasury](treasury.md) سوار می‌شوند. یک `routes.jsx` (همه‌ی صفحه‌ها `lazy()`).

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `SALES` | `/sales` | `SaleView` | `src/features/sales/orders/pages/SalePage.jsx` |
| `SALES_NEW` | `/sales/new` | `["SaleCreate", "SaleInPerson"]` | `src/features/sales/orders/pages/SaleNewPage.jsx` |
| `SALES_DETAIL` | `/sales/:id` | `SaleView` | `src/features/sales/orders/pages/SaleDetailPage.jsx` |
| `SALES_RETURNS_LIST` | `/sales/returns` | `SaleReturnView` | `src/features/sales/returns/pages/SalesReturnsListPage.jsx` |
| `SALES_RETURNS_NEW` | `/sales/returns/new` | `SaleReturnCreate` | `src/features/sales/returns/pages/SalesReturnNewPage.jsx` |
| `SALES_RETURNS_DETAIL` | `/sales/returns/:id` | `SaleReturnView` | `src/features/sales/returns/pages/SalesReturnDetailPage.jsx` |

`SaleDetailPage` با `useSaleQuery` سند را می‌گیرد: اگر `isSaleProforma(sale.status)` → `SaleForm.jsx` (ویرایشِ پیش‌فاکتور)، وگرنه `SaleIssuedView.jsx` (فاکتورِ صادرشده؛ مشتری و اقلام فقط‌خواندنی). قدمِ بعدیِ تحویل زیرِ فیلدِ وضعیت در «اطلاعات فاکتور» است (`components/forms/SaleStatusHint.jsx`): در «ارسال شده» «تحویل کامل» از همان منو انتخاب و با دکمه‌ی اصلی ثبت می‌شود (`ChangeSaleStatus` در «ثبت تغییرات»)، در «ارسال ناقص» پیوند به ارسالِ انبار. `SaleNewPage` همان `SaleForm` را بدونِ سند رندر می‌کند.

## سرویس‌ها (endpointها)

| زیرماژول | `api-v1.js` | کلید |
| --- | --- | --- |
| orders | `fetchSales` GET `/Sale/GetSaleList`، `fetchSaleById` GET `/Sale/GetSaleDetail`، `createSale` POST `/Sale/CreateSale`، `approveSaleProforma` POST `/Sale/ApproveSaleProforma`، `checkSaleWarehouse` POST `/Sale/CheckSaleWarehouse`، `completeInPersonSale` POST `/Sale/CompleteInPersonSale`، `fetchSaleWarehouseIssues` GET `/Sale/GetSaleWarehouseIssueList`، `resolveSaleWarehouseIssue` POST، `updateSale` PUT `/Sale/UpdateSale`، `changeSaleStatus` POST `/Sale/ChangeSaleStatus`، `updateSaleAttachments` PUT، `updateSalePaymentDate` PUT، `addSalePayment` / `editSalePayment` / `voidSalePayment` POST، `removeSale` DELETE `/Sale/DeleteSale` | `saleKeys` (`['sales']`)، `warehouseIssueKeys` (`['saleWarehouseIssues']`) |
| returns | `fetchSalesReturns`، `fetchSalesReturnById`، `createSalesReturn`، `addClaimResolution`، `removeClaimResolution`، `executeGoodsRound`، `executeMoneyEffect`، `rejectSalesReturn`، `cancelSalesReturn`، `reopenSalesReturn`، `removeSalesReturn`، `updateSalesReturnAttachments` روی `/SaleReturn/*`؛ و `fetchReturnableSales`/`fetchSaleForReturn` روی `/Sale/GetSaleList`/`GetSaleDetail` | `salesReturnKeys` (`['salesReturns']`) |
| installments | `fetchInstallmentPlan`، `fetchInstallmentPlans`، `fetchInstallments`، `createInstallmentPlan`، `updateInstallmentPlan`، `cancelInstallmentPlan`، `payInstallment`، `settleInstallmentPlan`، `waiveInstallmentPenalty` روی `/SaleInstallment/*` | `installmentKeys` (`["saleInstallments"]`) |

هوک‌ها:
- `src/features/sales/orders/services/mutations.js` — فقط کش و پیام: `useCreateSaleMutation`، `useApproveSaleProformaMutation`، `useWarehouseApproveMutation`، `useReleaseReservationMutation`، `useSettleProformaMutation`، `useResolveWarehouseIssueMutation`، `useRemoveSaleMutation`، `useSaleChangesSaver`، `useSalePosActions` (کارتخوان؛ کش را تا «بستن»ِ رسید عوض نمی‌کند). invalidation: `invalidateSalesEcosystem` در `src/features/sales/orders/services/sharedInvalidation.js`.
- `src/features/sales/orders/services/proformaWorkflow.js` — زنجیره‌های سرورِ چرخه‌ی پیش‌فاکتور، بی React و بی کش: `createProforma`، `approveAtWarehouse`، `releaseReservation`، `ensureProformaPaymentType`، `saveProformaInfo`، `recordProformaPlan`، `settleProforma`. `SALE_DOCUMENT_CHANGES_API` (برای `runDocumentChanges`) در `api-v1.js`.
- `src/features/sales/orders/services/queries.js`: علاوه بر فهرست و جزئیات، `useProformaQueueQuery` (صف‌های انبار و صندوق، تازه‌سازی هر ۳۰ ثانیه)، `useProformaQueueFilters`، `useSaleWarehouseIssuesQuery`.
- `src/features/sales/returns/services/`: هوک‌ها نام‌های مستعارِ factoryهای مشترک‌اند — `createReturnQueries` (`src/shared/services/returns/createReturnQueries.js`) و `createReturnMutations` (`src/shared/services/returns/createReturnMutations.js`) با `invalidate: invalidateSalesEcosystem`.
- `src/features/sales/installments/services/`: `useInstallmentsQuery`، `useInstallmentPlansQuery`، `useInstallmentCountQuery`، `usePayInstallmentMutation`، `useSettleInstallmentPlanMutation`، `useWaiveInstallmentPenaltyMutation`، … و کمک‌تابعِ `applyInstallmentPlan`.
- دیرکرد و جریمه (GAP-26): `OVERDUE` را سرور می‌نویسد و فرانت آن را از تاریخ حدس نمی‌زند. `InstallmentSchedule` ستونِ «جریمه» (`penaltyDue`/`penaltyAmount`، بخشودگی، روزهای تأخیر) و تخفیفِ تسویه‌ی هر سطر را نشان می‌دهد؛ `InstallmentPenaltyWaiveDialog` بخشودگی است (`SaleInstallmentPenaltyWaive`). `InstallmentPaymentDialog` عددها را همیشه از `useInstallmentPlanQuery(saleId)` می‌خواند (سطرِ فهرستِ اقساط جریمه ندارد): قسط = مبلغ + `penaltyDue`؛ تسویه = `remainingAmount` + `penaltyDueAmount` به‌عنوانِ «حداکثر»، چون تخفیفِ تسویه را سرور هنگامِ ثبت حساب می‌کند.

## state و دامنه

- store: `useSaleFormStore` (`createDocumentFormStore`، `src/features/sales/orders/store/saleFormStore.js`؛ selectorهای `isSaleCoreChanged`/`isSaleDueDateChanged`/`isSaleInfoChanged` تغییرها را به تفکیکِ اثرشان روی تأییدها جدا می‌کنند)، `useSaleFilterStore`، `createProformaQueueFilterStore` (یک store برای هر صف)، `useSalesReturnFormStore` (`create` مستقیم)، `useSalesReturnFilterStore`، `useInstallmentFilterStore`.
- دامنه: `src/features/sales/orders/domain/proformaFlow.js` (کارِ دکمه‌ی اصلی `proformaAction`، `proformaPaymentType`، تشخیصِ فروشِ حضوری `isInPersonProforma`، دلیلِ تغییرِ انبار `warehouseChangeNote`)، `saleRules.js`، `salePricing.js` (`SALE_PRICE_MODES` خرده/همکار)، `salePayments.js`؛ `src/features/sales/installments/domain/installmentPlan.js`، `installmentViews.js`؛ `src/features/sales/returns/domain/salesReturnVocabulary.js`. مدلِ مرجوعی: [11-domain-layer.md](../11-domain-layer.md).
- hook: `src/features/sales/orders/hooks/useProformaPayment.js` (گامِ دریافت، مشترکِ فرمِ فروش و صندوق)، `useReservationCountdown.js`؛ `src/features/sales/returns/hooks/useSalesReturnForm.js`.
- کامپوننت‌های پیش‌فاکتور (`src/features/sales/orders/components/proforma/`): `ProformaStageCard` (+ `ProformaEventHistory`)، `ProformaPaymentSection`، `ProformaFooterActions` (آزادسازیِ رزرو و حذف)، `ProformaUnavailable` (پیش‌فاکتوری که از مرحله‌ی صفحه گذشته)، `ReservationBadge`/`ReservationTimer`، `PriceListPrint`. ستون‌های صف‌ها: `components/table/proformaQueueColumns.jsx`.

## جریان‌ها

**ثبتِ فروشِ تازه**
1. `SaleNewPage` → `SaleForm` با `useSaleFormStore` و `useDocumentFormDraft` ([08](../08-client-state-zustand.md)).
2. پیش از تأییدِ مشتری چیزی ذخیره نمی‌شود: «لیست قیمت‌ها» در کارتِ سند (`PriceListPrint` + `PriceListDocument`، بی‌مشتری؛ پوسته‌ی `PrintStudio` با کاغذ (A4/A5/Letter/رولِ حرارتی)، ستون‌ها، سربرگ، متنِ پایین و اندازه‌ی متن که با `usePrintSettings("price-list")` می‌مانند؛ روی رول هر قلم دوسطری؛ دکمه از `localPrints`ِ `InvoiceDocumentSection`).
3. پس از تأیید: `saleFormProblem` ← `useCreateSaleMutation` (`createProforma`): `CreateSale` ← (با `SaleUpdate`) `ApproveSaleProforma` — به صفِ انبار. شکستِ پس از ثبت `partiallySaved` و صفحه پیش‌فاکتور را باز می‌کند.
4. فروشِ حضوری = دانه‌ی اسکن‌شده در فروشِ تازه (`SaleItemsSection` با `trackUnits`): همان زنجیره ← `CheckSaleWarehouse` با همان دانه‌ها و `IN_PERSON_CHECK_NOTE` (بی صفِ انبار).

**چرخه‌ی تأییدِ پیش‌فاکتور (بکند ۲۰۲۶-۱۰-۱۶)** — مرحله‌ها در `proformaStage` (`src/shared/domain/enums/saleProforma.js`): پیش‌نویس → «مشتری تأیید کرد؛ ارسال به انبار» → بررسیِ انبار (`warehouse/saleCheck`؛ تأیید، یا کم‌کردنِ اقلام با دلیل و تأیید) → دریافت یا حذف. صفحه **یک دکمه‌ی اصلی** دارد (`proformaAction`)؛ پس از ارسال به انبار مشتری و اقلام فقط‌خواندنی‌اند تا «ویرایش پیش‌فاکتور». `UpdateSale` با تغییرِ مشتری، اقلام، قیمت/تخفیف، `paymentType` یا سررسید تأییدها را برمی‌گرداند؛ تاریخِ فاکتور را سرور با صدور می‌گذارد (`OrderInfoCard` با `showInvoiceDate={false}`).

**دریافت** — `useProformaPayment` + `ProformaPaymentSection` (فرمِ فروش و صندوق): شیوه‌ی پرداخت فقط همین‌جا انتخاب می‌شود؛ `useSettleProformaMutation` (`settleProforma`): `ensureProformaPaymentType` (`UpdateSale` + تأییدِ دوباره که با رزروِ مانده مستقیم «آماده‌ی پرداخت» برمی‌گردد) ← تغییرهای بی‌اثر (توضیح/پیوست) ← یکی از: قرارداد (`CreateSaleInstallmentPlan`)، تحویلِ حضوری (`CompleteInPersonSale`، با دریافتِ کلِ مبلغ یا قرارداد روی پیش‌فاکتورِ حضوری)، یا دریافت‌ها با `runDocumentChanges` (اولینش فاکتور را صادر می‌کند)؛ سررسیدِ تازه بعد از صدور. کارتخوان: دریافتِ عادی روی `PaymentsCard` و پیش‌پرداختِ قرارداد با `DownPaymentPosPanel` (`installments/components/`)؛ هر دو تا «بستن»ِ رسید کش را عوض نمی‌کنند.

**ویرایشِ پیش‌فاکتور / فاکتورِ صادرشده («ثبت تغییرات»)** — `useSaleChangesSaver(saleId)` → `runDocumentChanges(SALE_DOCUMENT_CHANGES_API, saleId, changes)` ([07](../07-server-state-react-query.md)). موفق → `applySale` (`setQueryData` + invalidate)؛ خطا → `invalidateSalesEcosystem` و `partialSaveMessage`. در فاکتورِ صادرشده قدمِ بعدیِ تحویل زیرِ وضعیت است (`SaleStatusHint`).

**مرجوعیِ فروش** — `SalesReturnNewPage` گام‌به‌گام (انتخابِ فاکتور با `useReturnableSalesQuery` → ادعاها) → `useCreateSalesReturnMutation`؛ صفحه‌ی جزئیات تصمیم‌ها و اجرای اثرها (`executeGoodsRound`، `executeMoneyEffect`) را با `useSalesReturnActions` انجام می‌دهد. کامپوننت‌ها از `src/shared/components/returns/` ([10](../10-shared-components-catalog.md)).

## importهای بیرونی

`auth` (`usePermission` در صفحه‌ها)، `customers` (`useCustomersOptionsQuery`، `useCustomerQuery`، `useCustomerSearchQuery`، `customerKeys`)، `warehouse` (`useDocumentProducts`، `UnitsPageLink`، `UNIT_SEGMENTS`، `shippingKeys`، `productKeys`، `productUnitKeys`)، `partyAccount` (`partyDisplayName`)، `dashboard` (`dashboardKeys` در `src/features/sales/installments/services/mutations.js`)؛ `audit` (`AuditHistoryButton` در هدرِ صفحه‌ی جزئیات): `SaleDetailPage` و `SalesReturnDetailPage` با `documentKind` ۲ و ۴.

## نکته‌ها و بدهی

- نامِ فیلدِ `productIds` در `createSale` گمراه‌کننده است: بکند لیستِ اقلامِ کامل می‌خواهد (کامنتِ خودِ `src/features/sales/orders/services/api-v1.js`).
- `src/features/sales/returns/services/api-v1.js` مستقیم `/Sale/GetSaleList` و `/Sale/GetSaleDetail` را صدا می‌زند، نه تابع‌های `orders`.
- `orders` و `installments` به هم وابسته‌اند (هر کدام کلید/تابعِ دیگری را import می‌کند)؛ سبکِ import بینِ زیرماژول‌ها مخلوط است (نسبی `../../returns/...` و `@/features/sales/...`).
- کامنتِ `applyInstallmentPlan` می‌گوید عمداً `invalidateSalesEcosystem` نیست، ولی `orders/services/mutations.js` هر دو را پشتِ هم صدا می‌زند.
- فیلترِ `status`ِ `GetSaleInstallmentList` تک‌مقداری است، پس نمای «همه‌ی پرداخت‌نشده‌ها» (`PENDING` + `OVERDUE`) نیست و پیش‌فرضِ `installmentViews.js` «سررسیدگذشته» است؛ و پیش‌نمایشِ مبلغِ تسویه با تخفیف هم نیست (بندهای ۲۵.۱ و ۲۵.۳ `frontend-requests.fa.md`).
- `useInstallmentsQuery` و `useInstallmentCountQuery` هر دو کلیدِ `installmentKeys.installmentList(params)` دارند؛ چون `queryFn` یکی است (`fetchInstallments(params)`) و شمارش فقط `select` دارد، اشتراکِ کش بی‌خطر است.
- فروشِ کاملاً نسیه فعلاً ممکن نیست: بکند فروش را فقط با اولین دریافت به فاکتور تبدیل می‌کند (کامنتِ `SaleForm.jsx`).
- فروشِ حضوری اتمیک نیست (چهار درخواست)؛ بکند دستورِ یک‌جا ندارد.
