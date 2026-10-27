# purchases — خرید و مرجوعیِ خرید

سه زیرماژول در `src/features/purchases/`: `orders/`، `returns/`، `reorder/` (پیشنهادِ خرید). ساختار آینه‌ی [sales.md](sales.md) است؛ اینجا فقط تفاوت‌ها و endpointها.

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `PURCHASES` | `/purchases` | `PurchaseView` | `src/features/purchases/orders/pages/PurchasesPage.jsx` |
| `PURCHASES_NEW` | `/purchases/new` | `PurchaseCreate` | `src/features/purchases/orders/pages/PurchasesNewPage.jsx` |
| `PURCHASES_REORDER` | `/purchases/reorder` | `ReorderSuggestionView` (ساخت: `PurchaseCreate`) | `src/features/purchases/reorder/pages/ReorderPage.jsx` |
| `PURCHASES_DETAIL` | `/purchases/:id` | `PurchaseView` | `src/features/purchases/orders/pages/PurchaseDetailPage.jsx` |
| `PURCHASES_RETURNS_LIST` | `/purchases/returns` | `PurchaseReturnView` | `src/features/purchases/returns/pages/PurchaseReturnsListPage.jsx` |
| `PURCHASES_RETURNS_NEW` | `/purchases/returns/new` | `PurchaseReturnCreate` | `src/features/purchases/returns/pages/PurchaseReturnNewPage.jsx` |
| `PURCHASES_RETURNS_DETAIL` | `/purchases/returns/:id` | `PurchaseReturnView` | `src/features/purchases/returns/pages/PurchaseReturnDetailPage.jsx` |

`PurchaseDetailPage` بینِ `PurchaseForm.jsx` (پیش‌فاکتور) و `PurchaseIssuedView.jsx` (صادرشده) انتخاب می‌کند؛ `PurchaseIssuedView` دکمه‌ی «مرجوعی» به `PURCHASES_RETURNS_NEW?purchaseId=` دارد.

## سرویس‌ها

- `src/features/purchases/orders/services/api-v1.js` روی `/Purchase/*`: `fetchPurchases`، `fetchPurchaseById`، `createPurchase`، `updatePurchase`، `changePurchaseStatus`، `updatePurchaseAttachments`، `updatePurchasePaymentDate`، `addPurchasePayment`، `editPurchasePayment`، `voidPurchasePayment`، `removePurchase`، و مخصوصِ خرید: `closePurchaseItem`، `reopenPurchaseItem`، `acceptPurchaseExcess`. `fromApiPurchase` با `documentVersion` فیلدِ `updatedAt` را می‌سازد ([08](../08-client-state-zustand.md)).
- `src/features/purchases/returns/services/api-v1.js` روی `/PurchaseReturn/*` (همان فعل‌های مرجوعیِ فروش)؛ `fetchPurchaseForReturn` → `GET /PurchaseReturn/GetPurchaseReceivingInfo`، `fetchReturnablePurchases` → `GET /Purchase/GetPurchaseList`.
- mutationها: `useCreatePurchaseMutation`، `useChangePurchaseStatusMutation`، `useRemovePurchaseMutation`، `useClosePurchaseItemMutation`، `useReopenPurchaseItemMutation`، `useAcceptPurchaseExcessMutation`، `usePurchaseChangesSaver`؛ مرجوعی: `useCreatePurchaseReturnMutation`، `useExecuteGoodsRoundMutation`، `useUpdatePurchaseReturnAttachmentsMutation`، `usePurchaseReturnActions` (از `createReturnMutations`).
- کلیدها: `purchaseKeys` (`['purchases']`)، `purchaseReturnKeys` (`['purchaseReturns']`). invalidation: `invalidatePurchaseEcosystem` در `src/features/purchases/orders/services/sharedInvalidation.js` (جزئیات/لیستِ خرید، `receivingKeys`، مرجوعی‌ها، `productKeys.all`، `productUnitKeys.all`).

## پیشنهادِ خرید (`reorder/`)

- `src/features/purchases/reorder/services/api-v1.js`: `fetchReorderSuggestions` (`GET /Reorder/GetReorderSuggestionList`، فیلترِ صفحه: `search` و `supplierId`؛ بی‌صفحه‌بندی) و `createPurchaseDraftsFromReorder` (`POST /Reorder/CreatePurchaseDraftsFromReorder`، ایدمپوتنت، برای هر تامین‌کننده یک پیش‌فاکتور، همه یا هیچ). کلید: `reorderKeys` (`['reorder']`)؛ بعد از ساخت `invalidatePurchaseEcosystem` و `reorderKeys.all`.
- جدول مثلِ بقیه‌ی فهرست‌هاست (`ServerTable` + `ReorderTable` روی `DataTable`: مرتب‌سازی، صفحه‌بندی، تازه‌سازی، کارتِ موبایل)؛ چون سرور فهرست را یک‌جا می‌دهد، `reorderPage` در `src/features/purchases/reorder/domain/reorderList.js` در `select`ِ کوئری فیلتر (`needsOrder`)، مرتب و صفحه‌بندی می‌کند و همان شکلِ `{ items, total, page, totalPages }` (به‌علاوه‌ی `all`) را می‌دهد.
- الگوی ساخت «انتخابِ ردیف + نوارِ اقدامِ پایین» است، نه دکمه در هر ردیف (هر ردیف یک سندِ خریدِ جدا می‌ساخت؛ سرور برای هر تامین‌کننده یک پیش‌فاکتور از هر زیرمجموعه می‌سازد). `src/features/purchases/reorder/hooks/useReorderDraft.js` فقط ویرایش‌های خریدار (انتخاب، تعداد با `QuantityStepper`، تامین‌کننده) را بر اساسِ `productId` نگه می‌دارد، پس با صفحه و مرتب‌سازی نمی‌پرند؛ هیچ ردیفی پیش‌فرض انتخاب نیست؛ قیمت همان آخرین قیمتِ خرید است و در خودِ پیش‌فاکتور ویرایش می‌شود. نوارِ پایین `ReorderActionBar` روی `StickyActionBar` است (با «لغو انتخاب»)، فهرستِ خالی `EmptyState`، و انتخابگرِ تامین‌کننده `SupplierSelect`؛ نامِ تامین‌کننده‌ی پنجره‌ی نتیجه از `supplierNameOf` (`src/features/purchases/reorder/domain/reorderList.js`).
- ورودی‌اش روی کالاست: `ProductReorderForm` (`src/features/warehouse/products/components/forms/ProductReorderForm.jsx`) — نقطه‌ی سفارش، موجودی هدف و تامین‌کننده‌ی ترجیحی؛ حداقل سفارش و زمان تحویل زیرِ «بیشتر».

## state و دامنه

`usePurchaseFormStore` (`createDocumentFormStore`)، `usePurchaseFilterStore`، `usePurchaseReturnFormStore` (+ `offScopeCapKey`)، `usePurchaseReturnFilterStore`؛ `src/features/purchases/returns/hooks/usePurchaseReturnForm.js`. دامنه: `src/features/purchases/orders/domain/purchaseRules.js` (`canCancelPurchase`، `purchaseStatusTargets`، `canClosePurchaseItem`، `purchaseFormProblem`، `PURCHASE_SHIPPING_CHOICES`، …)، `purchasePayments.js`، `src/features/purchases/returns/domain/purchaseReturnVocabulary.js` (`claimableQuantityOf`، `freeExcessQuantityOf`، …).

## جریان: خرید → دریافت در انبار

1. `PurchaseForm.jsx` → `useCreatePurchaseMutation` → `createPurchase` (`POST /Purchase/CreatePurchase`، با `idempotencyKeyFor`).
2. موفق → `applyPurchase`: `setQueryData(purchaseKeys.detail)`، `invalidatePurchaseEcosystem(..., { freshPurchase: true })`، `supplierKeys.all`؛ ناوبری به `PURCHASES_DETAIL`.
3. تغییرِ وضعیت (پیش‌فاکتور → در انتظار → ارسال‌شده) با `usePurchaseChangesSaver` یا `useChangePurchaseStatusMutation`.
4. خرید با وضعیتِ `RECEIVING_ELIGIBLE_STATUSES` در صفِ دریافتِ انبار ظاهر می‌شود → [warehouse.md](warehouse.md#دریافت-و-ارسال).

**مرجوعیِ خرید:** `PurchaseReturnNewPage` (`usePurchaseForReturnQuery`) → `useCreatePurchaseReturnMutation`؛ اضافه‌ی دریافت‌شده را می‌شود با `useAcceptPurchaseExcessMutation` خرید. اجرای کالای خروجی به تامین‌کننده در انبار (`SupplierReturnDetailPage`)، جایگزینِ ورودی داخلِ `ReceiveShipment` (`purchaseReturnRounds`). قرنطینه فقط در مرجوعیِ خرید است.

## importهای بیرونی

`suppliers` (`useSuppliersOptionsQuery`، `useSupplierQuery`، `useSupplierSearchQuery`، `supplierKeys`)، `partyAccount` (`partyName`)، `auth`، `warehouse` (`UnitsPageLink`، `LABEL_FILTERS`، `usePurchaseReceivingInfoQuery`، `receivingKeys`، `productKeys`، `productUnitKeys`)؛ `audit` (`AuditHistoryButton` در هدرِ صفحه‌ی جزئیات): `PurchaseDetailPage` و `PurchaseReturnDetailPage` با `documentKind` ۱ و ۳.

## نکته‌ها و بدهی

- `/Purchase/GetPurchaseList` از سه جا با سه کلید صدا زده می‌شود (`fetchPurchases`، `fetchReturnablePurchases`، `fetchReceivablePurchases` در انبار).
- `GetPurchaseReceivingInfo` زیرِ دو کلید کش می‌شود (`receivingKeys.detail` و `purchaseReturnKeys.purchaseForReturn`)؛ `invalidatePurchaseEcosystem` هر دو را باطل می‌کند.
- `MANUAL_PurchaseStatusEnum` (فایل [11](../11-domain-layer.md)).
- سبکِ import داخلِ فیچر مخلوط است (`@/features/purchases/...` و نسبی).
