# فاز ۱ — تحلیل کامل مرجوعی: فرانت در برابر بک‌اند

سند مرجع برای فاز ۲ (تغییرات فرانت) و فاز ۳ (سند تحویلی به تیم بک‌اند).

**تصمیم بنیادی پروژه:** مدل هدف، مدل «اثر» (Effect) است که فرانت پیاده کرده. بک‌اند باید به آن مهاجرت کند، ولی نقاط قوت فعلی بک‌اند (سهمیه، انتشار به سند مبدأ، بازرسی چنددوره‌ای، تفکیک ادعا/مشاهده) باید در مدل جدید بازتولید شوند، نه حذف.

**سبک API:** REST بماند. gRPC رد شد (مصرف‌کننده مرورگر است، gRPC-Web پروکسی می‌خواهد و کل لایه‌ی axios/React Query باید بازنویسی شود، بدون سود واقعی).

---

## ۱. نقشه‌ی کد فعلی

### ۱.۱ فرانت

| لایه | مسیر | نقش |
|---|---|---|
| دامنه‌ی مشترک | `src/shared/domain/returns/effects.js` | ۴ اثر پایه، روش پرداخت، وضعیت اثر، `summarizeEffects`, `stockDeltasOf` |
| | `.../resolutions.js` | ترکیب تصمیم، `expandComposition`, `buildResolution`, `validateComposition`, `deriveReturnStatus`, `buildGoodsLines`, نگهبان‌های چرخه‌ی عمر |
| | `.../statuses.js` | `OPEN / IN_PROGRESS / SETTLED / REJECTED / CANCELLED` |
| | `.../sides.js` | تفاوت زبانی خرید و فروش (برچسب، ترتیب محورها) |
| | `.../orderContext.js` | نمای چند-مرجوعیِ یک سند: `deliveredAdjustment`, `claimBreakdown`, `relatedReturnsSummary` |
| واژگان هر سمت | `features/sales/returns/domain/returnVocabulary.js` | `RETURN_PROBLEMS`, `CLAIM_SCOPES(ON/OFF_INVOICE)`, `OFF_INVOICE_KINDS` |
| | `features/purchases/returns/domain/purchaseReturnVocabulary.js` | `PURCHASE_RETURN_PROBLEMS`, `CLAIM_SCOPES(ON/OFF_ORDER)`, `hasAnythingArrived` |
| کامپوننت مشترک | `shared/components/returns/*` | `ResolutionComposer`, `ResolutionMoneySection`, `ClaimResolutionCard`, `ClaimsSection`, `OffScopeClaimsSection`, `ReturnStatusBar`, `OrderInvoiceCard`, `RelatedReturnsCard`, `EffectBadge` |
| سرویس | `features/*/returns/services/{queries,mutations,api-v1,api-mockData,mockData}.js` | امروز `queries`/`mutations` از **`api-mockData`** ایمپورت می‌کنند؛ `api-v1` نوشته شده ولی متصل نیست |
| انبار | `features/warehouse/receiving/*`, `features/warehouse/shipping/*` | صف‌ها را از اثرهای `PENDING` می‌سازند (`buildGoodsLines`) و با `executeGoodsRound` می‌بندند |

ساختار سند فرانت:

```
returnDoc { id, returnNumber, saleId|purchaseId, customerName|supplierName,
            returnDate, status, description, previousReturnId, sourceEffectId,
            totalClaimedAmount, claims[] }
  claim { id, scope, offScopeKind, saleLineId, productId, productCode,
          productName, unit, unitPrice, qty, problem, note, resolutions[] }
    resolution { id, qty, note, effects[], createdAt }
      effect { id, kind, qty, doneQty, restockedQty, productId..., amount,
               method, reference, parts[], status, history[], appliedAt }
```

### ۱.۲ بک‌اند

| لایه | مسیر |
|---|---|
| موجودیت فروش | `Domain/Entities/SaleReturn.cs`, `SaleReturnClaim.cs`, `SaleReturnItem.cs`, `SaleReturnDecision.cs` |
| موجودیت خرید | `PurchaseReturn.cs`, `PurchaseReturnItem.cs`, `PurchaseReturnDecision.cs` |
| enum | `SaleReturnStatusEnum`, `SalesReturnReasonEnum`, `SalesReturnIssueTypeEnum`, `SaleReturnDecisionType/StatusEnum` و قرینه‌های خرید + `PurchaseIssueTypeEnum` |
| منطق | `Infrastructure/Services/SaleReturnCalculationService.cs`, `PurchaseReturnCalculationService.cs` |
| فرمان‌ها | `Application/Features/SaleReturn/Commands/*`, `Application/Features/PurchaseReturn/Commands/*` |
| کنترلر | `WMS/Controllers/SaleReturnController.cs`, `PurchaseReturnController.cs` |

ساختار بک‌اند (نامتقارن):

```
فروش:  SaleReturn → Claim(SaleItemId, Reason, ClaimedQuantity)
                      → InspectionItem(IssueType?, Quantity)   ← فقط با ConfirmReturnInspection
                          → Decision(DecisionType, Quantity, RefundAmount?)
خرید:  PurchaseReturn → Item(PurchaseItemId, IssueType, Quantity)  ← فقط با ReceivePurchase
                          → Decision(...)
```

---

## ۲. شکاف‌ها به تفکیک

### ۲.۱ مدل داده

| موضوع | بک‌اند | فرانت (هدف) |
|---|---|---|
| سطح تصمیم | enum بسته‌ی ۴ حالته | ترکیب سه محور مستقل → ۴ اثر پایه |
| «ادعا» در خرید | وجود ندارد؛ `PurchaseReturnItem` هم ادعاست هم بازرسی | `claim` مستقل، یکسان با فروش |
| بازرسی | موجودیت جدا و اجباری (`SaleReturnItem`) | مرحله‌ی جدا ندارد؛ در `effect.history` و `restockedQty` ثبت می‌شود |
| ادعای خارج از سند | ندارد (`SaleItemId`/`PurchaseItemId` اجباری) | `scope=OFF_*` + `offScopeKind=EXCESS|UNLISTED` + قیمت دستی |
| چند مرجوعی فعال | فروش: بله / خرید: خیر (فقط یکی) | هر دو: بله |
| زنجیره‌ی مرجوعی | ندارد | `previousReturnId`, `sourceEffectId` |
| اشتراک خرید/فروش | صفر (دو درخت آینه‌ای و واگرا) | یک دامنه، تفاوت فقط برچسب |

### ۲.۲ enum ها (نگاشت لازم)

| فرانت | بک‌اند | وضعیت |
|---|---|---|
| `OPEN` | `PENDING_INSPECTION` (فروش) / `PENDING` (خرید) | نام و معنا هر دو فرق دارند |
| `IN_PROGRESS` | `COORDINATING` | نگاشت مستقیم |
| `SETTLED` | `RESOLVED` | معیار محاسبه فرق دارد (بند ۲.۳) |
| `REJECTED`/`CANCELLED` | همان | منطبق |
| `RETURN_PROBLEMS` (۱۳ مقدار، با تفکیک مقصر) | `SalesReturnReasonEnum` (۷) + `SalesReturnIssueTypeEnum` (۵) | فرانت تک‌محوره، بک‌اند دومحوره |
| `PURCHASE_RETURN_PROBLEMS` (۹) | `PurchaseIssueTypeEnum` | ناسازگار (`OVER_DELIVERED`/`UNORDERED_ITEM` در برابر `EXCESS`) |
| `PAYMENT_METHODS` (cash/check/transfer/on_account/store_credit/mixed) | `PaymentTypeEnum` (CASH/CREDIT/CHECK/TRANSFER/MIXED) | `on_account ↔ CREDIT`؛ `store_credit` معادل ندارد |
| مقادیر رشته‌ای snake_case | enum بدون `JsonStringEnumConverter` → **عدد** سریالایز می‌شود | باید حل شود |

### ۲.۳ ماشین وضعیت

- بک‌اند فروش: تا وقتی `InspectedQuantity < ClaimedQuantity` وضعیت `PENDING_INSPECTION` است — یعنی **انبار در وضعیت دخالت دارد**.
- فرانت: وضعیت از ادعا و اثر مشتق می‌شود و صریحاً می‌گوید انبار نقشی ندارد؛ مرجوعیِ فقط-نقدی مستقیم `OPEN → SETTLED` می‌رود.
- نتیجه: در مدل هدف، «بازرسی» دیگر ورودی وضعیت نیست؛ فقط اثرِ `PENDING` وضعیت را در `IN_PROGRESS` نگه می‌دارد.

### ۲.۴ ترتیب کاری

| | بک‌اند | فرانت (هدف) |
|---|---|---|
| فروش | ادعا → **بازرسی** → تصمیم | ادعا → تصمیم → اجرای انبار (چنددوره‌ای) |
| خرید | دریافت انبار (زایش مرجوعی) → تصمیم | ادعا (مستقل یا از دل دریافت) → تصمیم → اجرای انبار |

### ۲.۵ پول

- بک‌اند: فقط `RefundAmount` روی ردیف تصمیم. **هیچ‌جا `Sale/Purchase.TotalAmount`، `PaidAmount` یا `PaymentDetail` را تغییر نمی‌دهد.** یعنی بازگشت وجه اثر مالی واقعی ندارد.
- فرانت: جهت (`RECEIVE/PAY`)، روش، پرداخت ترکیبی چندردیفی، شماره پیگیری، و قاعده‌ی «اعتبار خرید بعدی مبلغ فاکتور را تغییر نمی‌دهد» (`affectsInvoiceTotal`).
- نکته‌ی فنی: `PaymentDetail.PurchaseId` از نوع `Guid` است در حالی که `Purchase.Id` از نوع `int` است؛ EF یک FK سایه به نام `PurchaseId1` ساخته (`Migrations/20260730143015_stuff-4.cs`). قبل از اتصال اثر مالی باید پاک شود.

### ۲.۶ انبار و موجودی

| | بک‌اند | فرانت |
|---|---|---|
| بازگشت کالای سالم به موجودی | لحظه‌ی بازرسی، بر اساس `IssueType == null` | لحظه‌ی دور کالا، بر اساس `restockedQty` |
| خروج کالا | مسیر و شمارنده‌ی جدا (`ConfirmReplacementShipment`, `ReplacementShippedQuantity`) | همان قرارداد `doneQty` برای هر دو جهت |
| اجرای جزئی | فقط برای جایگزین | برای همه‌ی اثرهای کالایی |
| اطلاعات حمل (راننده/پلاک/کد ملی) | ندارد | در `effect.history[]` |
| ورود به صف انبار | بر اساس وضعیت مرجوعی | بر اساس وجود اثر `PENDING` |

### ۲.۷ API

| موضوع | بک‌اند | فرانت |
|---|---|---|
| مسیر | `GET /api/SaleReturn/GetSaleReturnList` | `GET /sales-returns` |
| baseURL | `api/[controller]` | `api/v1` (`shared/services/api/axios.js`) |
| پاسخ نوشتن | `{ ReturnId, ReturnStatus }` | انتظار سندِ کاملِ به‌روزشده (`setQueryData`) |
| پوشش | `ResponseDto { Data, Message, ResponseMessageType }` | مستقیم `data` |
| صفحه‌بندی | `Page`, `Take` | `page`, `limit` |
| فیلتر | `CustomerId` (تکی)، `Reason` | `customerIds[]`, `status`, `problem`, `scope`, `fromDate`, `toDate` |
| مرتب‌سازی | ندارد (همیشه `CreatedAt desc`) | `sortBy`, `sortOrder` |
| خطا | کد وضعیت واقعی از `ExceptionHandlingMiddleware` ✅ | `error.message` را toast می‌کند |

---

## ۳. باگ‌ها و ریسک‌های تاییدشده در حین بررسی

### بک‌اند
1. **`ReopenSaleReturnCommand`** وضعیت را با `RecomputeReturnStatus` می‌سازد؛ برای مرجوعیِ ردشده‌ی بدون ادعا/بازرسی نتیجه‌اش قابل پیش‌بینی نیست و هیچ محافظی ندارد.
2. **حذف تصمیم فقط برای `AWAITING`** مجاز است (`RemoveSaleReturnDecisionCommand`) — یعنی یک تصمیم بازگشت وجه با مبلغ اشتباه برای همیشه می‌ماند.
3. **`UpdatePurchaseCommand`** وضعیت خرید را مستقیم می‌نویسد و `RecomputePurchaseStatus` را دور می‌زند (ثبت‌شده در `docs/return-scenarios-guide.fa.md` §۴.۱).
4. **`GetWarehouseReceiveSaleListQuery`** روی `SalesStatusEnum.RETURNED` فیلتر می‌زند که هیچ‌جا ست نمی‌شود → همیشه لیست خالی.
5. **`PurchaseStatusEnum.RETURNED`** مقدار مرده است.
6. **`ResolveAwaitingReplacements`** یک heuristic است (حدس می‌زند محموله‌ی رسیده همان جایگزین وعده‌داده‌شده است)، نه اتصال صریح.
7. **بدون `JsonStringEnumConverter`** → همه‌ی enum ها عدد سریالایز می‌شوند.
8. **`PaymentDetail`** با FK سایه‌ی `PurchaseId1` (بند ۲.۵).

### فرانت
9. **هویت خط سند اشتباه است**: در `useSalesReturnForm.js` مقدار `saleLineId: String(line.productId)` و `lineKey: ${saleId}-${productId}` — یعنی خط فاکتور با `productId` شناخته می‌شود، نه `saleItemId`. اگر یک کالا در دو خط فاکتور باشد، ادعاها روی هم می‌افتند و بک‌اند هم `SaleItemId` می‌خواهد.
10. **حقیقت در کلاینت ساخته می‌شود**: `id` اثر و تصمیم با `Date.now()+random`، وضعیت با `deriveReturnStatus`، مبلغ فاکتور با `adjustSaleTotal`. همه باید بعد از مهاجرت سروری شوند.
11. **بدون محافظ ایدمپوتنسی**: `executeGoodsRound` و `addClaimResolution` تجمعی‌اند؛ دوبار کلیک یا retry شبکه دو بار اعمال می‌شود.
12. **مشاهده‌ی انبار در `history` دفن شده** (`issueProblem`) — گزارش‌گیری روی مقصر ناممکن است، در حالی که بک‌اند برایش فیلد درجه‌یک دارد.
13. **دو واژگان جدا برای یک مفهوم**: `wrong_item_shipped` در فروش و `wrong_item` در خرید و... — بدون یک enum مشترک، نگاشت به بک‌اند دوبار نوشته می‌شود.
14. **`api-v1.js` ناقص است**: `for-return`، صف‌های انبار و اکشن‌های چرخه‌ی عمر پوشش دارند ولی هیچ‌کدام تست نشده‌اند و پوشش `ResponseDto` را در نظر نگرفته‌اند.

---

## ۴. تغییرات لازم در فرانت (فاز ۲)

| # | تغییر | فایل‌های اصلی |
|---|---|---|
| F1 | اصلاح هویت خط سند: حمل `saleItemId`/`purchaseItemId` واقعی از `for-return` تا payload | `useSalesReturnForm.js`, `usePurchaseReturnForm.js`, `*FormStore.js`, `mockData.js` |
| F2 | یک enum مشترک برای «مشکل» + نگاشت صریح به enum بک‌اند در لایه‌ی adapter | `shared/domain/returns/problems.js` (جدید)، دو `*Vocabulary.js` |
| F3 | ارتقای مشاهده‌ی انبار از `history` به فیلد درجه‌یک روی خط دور کالا | `effects.js`, `resolutions.js`, `ReceivingReturnDetailPage.jsx`, `SupplierReturnDetailPage.jsx` |
| F4 | لایه‌ی adapter: پوشش `ResponseDto`، نگاشت enum عدد↔رشته، `page/limit ↔ Page/Take`، نگاشت خطا | `shared/services/api/axios.js`, `features/*/returns/services/api-v1.js` |
| F5 | افزودن `Idempotency-Key` به mutationهای تصمیم و دور کالا | `mutations.js` هر دو سمت |
| F6 | سروری‌کردن حقیقت: حذف id سازی کلاینت، وضعیت از سرور، `expandComposition` فقط پیش‌نمایش | `resolutions.js`, `effects.js`, `mutations.js` |
| F7 | حذف اثرهای جانبی محلی (`adjustSaleTotal`, `adjustPurchaseTotal`, `adjustProductsStock`) از مسیر واقعی — فقط در mock بمانند | `api-mockData.js` هر دو سمت |
| F8 | سقف‌ها فقط از سرور (`/for-return`)؛ محاسبه‌ی محلی فقط برای بازخورد آنی | `useSalesReturnForm.js`, `usePurchaseReturnForm.js` |
| F9 | سوییچ mock↔v1 پشت یک فلگ محیطی، فیچر به فیچر | `queries.js`, `mutations.js` هر دو سمت |
| F10 | یکسان‌سازی نام فیلدها با قرارداد نهایی (`returnDate` در برابر `requestDate` و…) | سراسر لایه‌ی سرویس |

ترتیب پیشنهادی فاز ۲: F1 → F2 → F3 → F6 → F4 → F5 → F8 → F7 → F10 → F9.
(F1 تا F3 و F6 اصلاح‌های داخلی‌اند و بدون بک‌اند قابل انجام‌اند؛ F4/F9 نقطه‌ی اتصال‌اند و به فاز ۳ گره می‌خورند.)

---

## ۵. تغییرات لازم در بک‌اند (فاز ۳ — سند تحویلی)

| # | تغییر | اولویت |
|---|---|---|
| B1 | مدل جدید `ReturnClaim → ReturnResolution → ReturnEffect` جایگزین `Item/Decision` | بنیادی |
| B2 | یکسان‌سازی خرید و فروش زیر یک قرارداد واحد (side به‌عنوان تمایز، نه دو درخت جدا) | بنیادی |
| B3 | ادعای خارج از سند: `SaleItemId`/`PurchaseItemId` قابل null + `Scope` + `OffScopeKind` + قیمت واحد ورودی | بالا |
| B4 | چند مرجوعی فعال روی یک خرید + `CreatePurchaseReturn` مستقل | بالا |
| B5 | تعمیم سهمیه (`GetClaimableQuantity`/`GetReceivableQuantity`) به مدل جدید بر پایه‌ی «ادعا منهای تصمیم» | بالا |
| B6 | تبدیل بازرسی به «دور اجرای اثر»: اجرای جزئی، `restockedQty`، مشاهده‌ی انبار، اطلاعات حمل | بالا |
| B7 | اثر مالی واقعی: ساخت `PaymentDetail` و به‌روزرسانی `TotalAmount`/`PaidAmount`؛ تعیین تکلیف `store_credit` (ledger یا بی‌اثر)؛ رفع FK سایه‌ی `PurchaseId1` | بالا |
| B8 | قاعده‌ی برگشت‌پذیری: حذف تصمیم تا وقتی هیچ اثری `APPLIED` نشده + خنثی‌سازی اثر مالی | متوسط |
| B9 | REST + بازگرداندن سند کامل + `JsonStringEnumConverter` + فیلتر/مرتب‌سازی/صفحه‌بندی سازگار | بالا |
| B10 | ایدمپوتنسی برای ثبت تصمیم و دور کالا | بالا |
| B11 | انتشار به سند مبدأ در مدل جدید: `SettledQuantity` از روی اثرها، `RecomputeSale/PurchaseStatus`، جایگزینی heuristic با اتصال صریحِ دور کالا به اثر | بالا |
| B12 | صف‌های انبار بر پایه‌ی اثر `PENDING` (جایگزین `GetWarehouseReceiveSaleListQuery` مرده) | متوسط |
| B13 | زنجیره‌ی مرجوعی: `PreviousReturnId`, `SourceEffectId` | پایین |
| B14 | Migration + backfill از `Decision` قدیمی به `Effect` جدید | بنیادی |
| B15 | رفع باگ‌های بند ۳ (۱ تا ۸) | متوسط |

---

## ۶. آنچه از قبل هم‌راستاست (نباید دست بخورد)

- وضعیت‌های مجاز برای ادعا: بک‌اند `SHIPPED/PARTIALLY_DELIVERED/DELIVERED` و فرانت `shipped/delivered/partially_delivered`.
- قاعده‌ی «فقط کالای سالم به موجودی قابل‌فروش برمی‌گردد» در هر دو سمت.
- تجمعی بودن مقدارِ اجراشده و پشتیبانی از چند دور.
- محاسبه‌ی پیش‌فرض مبلغ = تعداد × قیمت واحد، با امکان بازنویسی دستی.
- معماری CQRS/MediatR بک‌اند و جداسازی Repository/UnitOfWork — حفظ شود؛ فقط مسیرهای بیرونی REST شوند.
