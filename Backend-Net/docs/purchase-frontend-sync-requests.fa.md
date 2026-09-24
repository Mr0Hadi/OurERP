# درخواست‌های فرانت از بکند: همگام‌سازی خرید و مرجوعی خرید (۲۰۲۶-۰۹-۲۴)

این سند برای تیم بکند است. فرانتِ بخش خرید و مرجوعی خرید با بکندِ فعلی مقایسه شد و همه‌ی
شکاف‌هایی که در خودِ فرانت قابل حل بود، در فرانت حل شد. **هیچ کدی از بکند تغییر نکرده است**؛
موارد زیر کارهایی است که فقط سمت سرور شدنی است. برای هر بند آمده که فرانت امروز چه می‌کند،
چه چیزی کم است، و پیشنهاد پیاده‌سازی.

---

## خلاصه‌ی سریع

| # | موضوع | فوریت | فرانت تا آن وقت |
|---|---|---|---|
| ۱ | سقف‌های ادعا و مازادِ آزاد روی `GetPurchaseReceivingInfo` | **بالا** | با عددِ نزدیک کار می‌کند؛ حرفِ آخر ۴۰۰ سرور است |
| ۲ | ویرایشِ اقلام در `UpdatePurchase` | **فوری** | فرانت همین حالا `productItemList` می‌فرستد؛ تا پیاده‌سازی، تغییرِ اقلام گم و جمع ناسازگار می‌شود |
| ۳ | پنهان‌کردنِ خریدِ حذف‌شده در لیست/جزئیات | **بالا** (باگ) | راهی ندارد |
| ۴ | `data` روی `CreatePurchase` / `UpdatePurchase` / `DeletePurchase` | متوسط | دور زده شده |
| ۵ | خواندنِ هدر `Idempotency-Key` | متوسط | هدر فرستاده می‌شود ولی اثری ندارد |
| ۶ | «دلیل» روی رد/لغو مرجوعی | پایین | فرستاده نمی‌شود |
| ۷ | `ReturnPaymentMethodEnum.STORE_CREDIT = 5` | تصمیم لازم | از فرانت حذف شده |
| ۸ | جست‌وجوی لیست خرید با نام تامین‌کننده | پایین | فقط شماره فاکتور |
| ۹ | وضعیت‌های «تحویل ناقص/کامل» دستی در `UpdatePurchase` | **بالا** (باگ) | فرانت دیگر انتخابشان نمی‌کند |
| ۱۰ | «کسری» به‌عنوان مشکلِ کالای رسیده | **بالا** (باگ) | فرانت دیگر نمی‌فرستد |
| ۱۱ | کسریِ پرداخت‌شده: مبلغ خرید و بازگشتِ پول | **بالا** (شکاف) | راهی ندارد |
| ۱۲ | فیلترِ چندوضعیتی (`Statuses`) روی `GetPurchaseList` | **بالا** | فرانت می‌فرستد؛ تا آن وقت فیلترِ سمتِ فرانت و صفحه‌بندیِ نادقیق |
| ۱۳ | اسکنِ دانه در عودت فقط از موجودیِ قفسه الزامی باشد | متوسط (قاعده‌ی محصول) | فرانت فقط برای `IN_STOCK` الزامی می‌کند؛ از قرنطینه سرور هنوز ۴۰۰ می‌دهد |

---

## ۱. سقف‌ها روی `GET api/PurchaseReturn/GetPurchaseReceivingInfo`

**مشکل.** `CreatePurchaseReturn` و `AcceptPurchaseExcess` سقف را از روی ادعاهای بازِ مرجوعی‌های دیگر
حساب می‌کنند، ولی این پاسخ فقط اعداد خام را می‌دهد (`receivedQuantity`، `quarantinedExcessQuantity`،
`quarantinedQuantity`). نتیجه: فرم مرجوعی و کارتِ «کالای مازاد در قرنطینه» عددی پیشنهاد می‌دهند که
سرور با ۴۰۰ رد می‌کند، وقتی مرجوعیِ باز دیگری بخشی از آن را رزرو کرده باشد.

**درخواست.** سه فیلد تازه، دقیقاً با همان منطقی که handlerها چک می‌کنند:

| DTO | فیلد | مقدار |
|---|---|---|
| `PurchaseReceivingItemInfoDto` | `ClaimableQuantity` | `IPurchaseReturnCalculationService.GetClaimableQuantity(item, openReturns)` — سقفِ ادعای ON_ORDER |
| `PurchaseReceivingItemInfoDto` | `FreeExcessQuantity` | `QuarantinedExcessQuantity − GetOutstandingOffOrderClaimQuantity(EXCESS, item.Id, item.ProductId, openReturns)`، حداقل صفر |
| `PurchaseReceivingUnlistedInfoDto` | `FreeQuantity` | `QuarantinedQuantity − GetOutstandingOffOrderClaimQuantity(UNLISTED, null, productId, openReturns)`، حداقل صفر |

`openReturns` همان چیزی است که `CreatePurchaseReturnCommand` می‌خواند:

```csharp
var openReturns = await _context.PurchaseReturns
    .AsNoTracking()
    .Where(x => x.PurchaseId == request.PurchaseId)
    .WhereNotDeleted()
    .WhereOpen()
    .WithReturnGraph()
    .ToListAsync(cancellationToken);
```

handler باید `IPurchaseReturnCalculationService` را inject کند؛ `PurchaseReceivingImageTests` که handler را
مستقیم می‌سازد باید پارامتر سوم (`scope.PurchaseReturnCalculation`) را بدهد.

**فرانت.** سه تابع `claimableQuantityOf` / `freeExcessQuantityOf` / `freeUnlistedQuantityOf` در
`Frontend/src/features/purchases/returns/domain/purchaseReturnVocabulary.js` این فیلدها را می‌خوانند و
اگر نبودند به `receivedQuantity` / `quarantinedExcessQuantity` / `quarantinedQuantity` برمی‌گردند. پس
بعد از پیاده‌سازی، **فرانت بدون هیچ تغییری** سقف‌های دقیق را نشان می‌دهد.

---

## ۲. ویرایشِ اقلام در `PUT api/Purchase/UpdatePurchase` — فقط در پیش‌فاکتور (فوری)

**تصمیمِ محصول.** اقلامِ خرید **فقط در وضعیتِ پیش‌فاکتور** قابل ویرایش‌اند؛ بعد از آن فاکتورِ رسمیِ
تامین‌کننده رسیده و انبار روی همین اقلام کار می‌کند. تغییرِ بعدی فقط از مسیرهای خودش است: بستنِ قلم
(`ClosePurchaseItem`) و خریدِ مازاد (`AcceptPurchaseExcess`).

**وضعیتِ فعلی.** فرانت در پیش‌فاکتور اقلام را قابل‌ویرایش نشان می‌دهد، `totalAmount` را از روی همان
اقلام حساب می‌کند و فهرستِ نهایی را در `productItemList` می‌فرستد؛ بیرون از پیش‌فاکتور اقلام را
فقط‌خواندنی نشان می‌دهد و همان اقلامِ ذخیره‌شده و `totalAmount`ِ سرور را پس می‌فرستد.
`UpdatePurchaseCommand` امروز `productItemList` را ندارد و نادیده‌اش می‌گیرد، ولی `TotalAmount` را ذخیره
می‌کند — پس **تا این بند پیاده نشده، ویرایشِ اقلامِ پیش‌فاکتور گم می‌شود و جمعِ تازه کنارِ اقلامِ قدیمی
ذخیره می‌شود**.

**بدنه‌ای که فرانت می‌فرستد** (کنارِ فیلدهای فعلیِ `UpdatePurchaseCommand`):

```json
{
  "id": 42,
  "totalAmount": 1850000,
  "productItemList": [
    { "id": 101, "productId": 7,  "quantity": 12, "unitPrice": 100000, "discount": 0 },
    { "productId": 15, "quantity": 5, "unitPrice": 130000, "discount": 5 }
  ]
}
```

**قرارداد لازم.**

- `ProductItemList` روی `UpdatePurchaseCommand` با همان شکلِ `CreatePurchaseItemDto` به‌علاوه‌ی `int? Id`،
  **جایگزینیِ کامل** (مثل `Attachments` و `PaymentDetails`):
  - `Id` پر ⇒ قلمِ موجودِ همین خرید، به‌روز می‌شود (`Id`ی که مالِ این خرید نیست ⇒ ۴۰۴).
  - `Id` خالی ⇒ قلمِ تازه. قلمِ موجودی که در فهرست نیست ⇒ حذف. فهرستِ خالی ⇒ ۴۰۰.
- **فقط وقتی وضعیتِ ذخیره‌شده `PROFORMA` است** اقلام اعمال می‌شوند. در هر وضعیتِ دیگر، فهرستی که با اقلامِ
  ذخیره‌شده فرق دارد ⇒ ۴۰۰ («اقلام فقط در پیش‌فاکتور قابل ویرایش‌اند»). (پیش‌فاکتور هنوز دریافتی ندارد، پس
  قاعده‌ای درباره‌ی قلمِ دریافت‌شده لازم نیست.)
- `TotalAmount` در پیش‌فاکتور از اقلام حساب شود (`Σ quantity × unitPrice × (100 − discount) / 100`، همان
  گردکردنِ `AcceptPurchaseExcess`) یا با آن مقایسه و در صورت اختلاف ۴۰۰ شود؛ بیرون از پیش‌فاکتور
  `TotalAmount` از ورودی خوانده نشود (فقط `AcceptPurchaseExcess` آن را عوض می‌کند).
- پیشنهاد تست: افزودن/حذف/تغییرِ قلم در پیش‌فاکتور؛ ۴۰۰ برای تغییرِ اقلام در `PENDING`/`SHIPPED`؛
  `TotalAmount` مطابق اقلام.

**در فرانت.** `toApiItems` در `Frontend/src/features/purchases/orders/services/api-v1.js` بدنه را می‌سازد؛
کارتِ فقط‌خواندنی `Frontend/src/shared/components/forms/OrderItemsReadOnly.jsx` است. بعد از پیاده‌سازی،
فرانت به تغییری نیاز ندارد.

---

## ۳. خریدِ حذف‌شده در لیست و جزئیات (باگ)

**مشکل.** `DeletePurchaseCommand` فقط `IsActive = false` می‌کند، ولی `GetPurchaseListQuery` و
`GetPurchaseDetailQuery` روی `IsActive` فیلتر نمی‌کنند (فیلتر سراسری هم طبق CLAUDE.md §7 عمداً نیست).
پس خریدِ حذف‌شده همچنان در لیست خرید، صف دریافت انبار و انتخابگرِ «خرید مبدأ» فرم مرجوعی دیده می‌شود.

**درخواست.**
- `GetPurchaseListQuery`: `_context.Purchases.Where(x => x.IsActive)`.
- `GetPurchaseDetailQuery`: `.Where(x => x.Id == request.Id && x.IsActive)` (خریدِ حذف‌شده ⇒ ۴۰۴).
- پیشنهاد تست: حذف ⇒ نبودن در لیست و ۴۰۴ در جزئیات.

**فرانت.** راهی برای دور زدن ندارد. (ترتیبِ لیست که قبلاً اینجا بود، با `SortBy`/`SortDirection` در
`555ce0a` حل شد و فرانت به آن وصل است.)

---

## ۴. `data` روی نوشتن‌های خرید

**مشکل.** `CreatePurchase`، `UpdatePurchase` و `DeletePurchase` هر سه `data = null` برمی‌گردانند. فرانت
قبلاً `updated.id` را از پاسخِ لغو/حذف می‌خواند و خطا می‌داد با اینکه سرور موفق بود (همان باگی که
مرجوعی‌ها در ۲۰۲۶-۰۹-۱۲ داشتند).

**درخواست.** مثل مرجوعی‌ها: `Create` ⇒ `{ Id }` (یا سندِ کامل)، `Update` ⇒ سندِ کاملِ `PurchaseDto`،
`Delete` ⇒ `{ Id }`.

**فرانت.** دور زده شده: شناسه از ورودیِ mutation خوانده می‌شود و بعد از تغییر وضعیت، سند یک بار دیگر
خوانده می‌شود. با پیاده‌سازی این بند آن رفت‌وبرگشتِ اضافه حذف‌شدنی است.

---

## ۵. هدر `Idempotency-Key`

فرانت روی همه‌ی نوشتن‌های تجمعی (ثبت مرجوعی، ثبت تصمیم، دور کالا، ثبت پرداخت، پذیرش مازاد، دریافت
محموله) هدر `Idempotency-Key` می‌فرستد، ولی هیچ جای بکند آن را نمی‌خواند. retryِ شبکه می‌تواند یک دور
کالا یا یک پرداخت را دوبار ثبت کند. پیشنهاد: یک middleware/behavior که پاسخِ اولِ هر کلید را برای مدتی
نگه دارد و درخواستِ تکراری را با همان پاسخ جواب دهد.

---

## ۶. «دلیل» روی رد و لغو مرجوعی

`RejectPurchaseReturnCommand` و `CancelPurchaseReturnCommand` فقط `{ Id }` می‌گیرند. فرانت فیلدی برای
دلیل ندارد که بفرستد. اگر سابقه‌ی دلیل لازم است: `string? Reason` روی هر دو دستور و روی سند.

---

## ۷. `ReturnPaymentMethodEnum.STORE_CREDIT = 5`

فرانت «اعتبار خرید بعدی» را کلاً حذف کرد و `PaymentTypeEnum`اش حالا عیناً مثل بکند است
(`INSTALLMENT = 5`). روش‌های مجازِ مرجوعی در فرانت `CASH/CREDIT/CHECK/TRANSFER/MIXED` است. اثرِ
پولیِ قدیمی با `method = 5` در فرانت «روش نامشخص» نمایش داده می‌شود و در حالت توسعه در کنسول گزارش
می‌شود.

**تصمیم لازم.** یا `STORE_CREDIT` از `ReturnPaymentMethodEnum` حذف و در validator رد شود (و داده‌ی
موجود تعیین تکلیف شود)، یا اگر هنوز در بکند معنا دارد (مثلاً `GetSaleReturnCreditNotePdfQuery`)، به
تیم فرانت اطلاع دهید.

---

## ۸. جست‌وجوی لیست خرید

`GetPurchaseListQuery` فقط روی `InvoiceNumber` جست‌وجو می‌کند. کاربر انتظار دارد با نام تامین‌کننده هم
پیدا کند (فرم مرجوعی و لیست خرید). پیشنهاد: پارامتر `Search` که روی `InvoiceNumber` و
`Supplier.CompanyName` هر دو بگردد، مثل `GetPurchaseReturnListQuery`.

---

## ۹. وضعیت‌های «تحویل ناقص / کامل» نباید دستی تنظیم شوند (باگ)

**مشکل.** `UpdatePurchaseCommand` هر `Status`ی را می‌پذیرد. `PARTIALLY_RECEIVED` و `RECEIVED` را
`RecomputePurchaseStatus` بعد از هر دورِ دریافت حساب می‌کند، ولی واحد خرید می‌توانست:

- خریدی را که کسری دارد دستی «تحویل کامل» کند — از صفِ پیش‌فرضِ دریافتِ انبار بیرون می‌رفت؛
- خریدی را که چیزی از آن رسیده به «ارسال‌شده» / «در انتظار» / «پیش‌فاکتور» برگرداند.

**درخواست.** در `UpdatePurchaseCommandHandler`:
- `Status` فقط بین `PROFORMA` / `PENDING` / `SHIPPED` دستی قابل تنظیم است (`CANCELLED` هم، با قواعدِ لغوِ
  فعلی). فرستادنِ `PARTIALLY_RECEIVED` یا `RECEIVED` وقتی با وضعیتِ فعلی فرق دارد ⇒ ۴۰۰.
- وقتی وضعیتِ فعلی `PARTIALLY_RECEIVED` / `RECEIVED` / `CANCELLED` است، `Status` باید همان بماند ⇒ در غیر
  این صورت ۴۰۰. (فرانت همیشه وضعیتِ فعلی را پس می‌فرستد.)

**فرانت.** کشوییِ وضعیت فقط `PROFORMA` / `PENDING` / `SHIPPED` را پیشنهاد می‌دهد و بعد از اولین دریافت
یا لغو قفل می‌شود (`MANUAL_PURCHASE_STATUSES` و `isPurchaseStatusLocked` در
`Frontend/src/features/purchases/orders/domain/purchaseRules.js`).

---

## ۱۰. «کسری» (`SHORT_SHIPPED`) به‌عنوان مشکلِ کالای رسیده (باگ)

**مشکل.** `ReceivingDefectDto.Problem` و `GoodsRoundObservationDto.Problem` هر عضوِ `ReturnProblemEnum` را
می‌پذیرند. هر ردیف بخشی از مقدارِ *رسیده* است و `ReceivePurchaseCommand` آن را دانه‌ی رسیده‌ی مشکل‌دار
حساب می‌کند: قرنطینه، `ReceivedQuantity` بالا می‌رود، و بهای خط off-pool ثبت می‌شود. پس انبارداری که
«۱۰ رسید، ۳تا کسری» ثبت کند، در واقع **۳ دانه‌ی خیالی** ساخته که هرگز نرسیده‌اند و خرید آن‌ها را
دریافت‌شده و پرداخت‌شده می‌بیند.

**درخواست.** در `ReceivingDefectDtoValidator` و validatorِ مشاهده‌ی دورِ کالا (هر دو سمت مرجوعی)
`Problem != SHORT_SHIPPED` (و به‌طور کلی هر مشکلی که با دیدنِ کالا قابل مشاهده نیست) ⇒ ۴۰۰. کسری با
مقدارِ رسیده‌ی کمتر بیان می‌شود و مانده روی قلم بدهکار می‌ماند.

**فرانت.** `SHORT_SHIPPED` از فهرستِ مشاهده‌ی انباردار (`OBSERVED_PROBLEMS`) و از مشکل‌های قابل انتخابِ
ادعای مرجوعی خرید حذف شد؛ ادعاهای قدیمی همچنان با برچسبشان نمایش داده می‌شوند.

---

## ۱۱. کسریِ پرداخت‌شده: مبلغ خرید و بازگشتِ پول (شکاف)

**سناریو.** ۱۰ عدد سفارش و پرداخت شده، ۸ عدد رسیده، تامین‌کننده ۲ عددِ دیگر را نمی‌فرستد.

**امروز.**
- انبار ۸ را ثبت می‌کند؛ ۲ عدد روی قلم «مانده» است و خرید «تحویل ناقص» می‌ماند. ✅
- واحد خرید قلم را با `ClosePurchaseItem` می‌بندد؛ خرید «تحویل کامل» می‌شود. ✅
- ولی `Purchase.TotalAmount` همان مبلغِ ۱۰ عدد می‌ماند — بدهیِ ما به تامین‌کننده (یا طلبِ او) بیش از واقع است. ❌
- پولِ ۲ عددِ نرسیده راهِ برگشت ندارد: سقفِ ادعای ON_ORDER «رسیده − تسویه − باز» است، پس برای کالای
  نرسیده ادعایی نمی‌شود ساخت (CLAUDE.md همین را زیر «Open, deliberately not built» آورده). ❌
- راهِ غلطی که قبلاً باز بود: ادعای «کسری» روی ۲ دانه‌ی *رسیده* با `MONEY_IN`. پول برمی‌گشت، ولی ۲ دانه‌ی
  سالمِ رسیده بی‌دلیل تسویه‌شده حساب می‌شدند و جای ادعای واقعیِ بعدی را می‌گرفتند. فرانت این راه را بست.

**درخواست — یکی از این دو، تصمیمِ بکند:**

الف) **بستنِ قلم مبلغ را هم اصلاح کند.** `ClosePurchaseItem`، `TotalAmount` را به‌اندازه‌ی
`ShortClosedQuantity × قیمتِ خالصِ قلم` کم کند و `ReopenPurchaseItem` برگرداند (همان گردکردنِ
`AcceptPurchaseExcess`). بازگشتِ پولِ پرداخت‌شده هم یک ردیفِ پرداختِ «بازگشتی از تامین‌کننده» باشد
(مثلاً `PaymentPurposeEnum.SUPPLIER_REFUND` با اثرِ منفی روی `PaidAmount`) تا سابقه‌ی پرداختِ اول پاک نشود.

ب) **ادعای پولیِ کسری.** ادعای `SHORT_SHIPPED` روی قلمی که `ShortClosedQuantity > 0` دارد، با سقفِ
`ShortClosedQuantity − ادعاهای کسریِ قبلی`، که فقط اثرِ `MONEY_IN` (یا بخشش) بپذیرد — در مدلِ اثرها جا
می‌شود و به دانه‌ها دست نمی‌زند.

در هر دو، `ShortClosedQuantity` تنها منبعِ «چقدر هرگز نمی‌رسد» است. پیشنهادِ تست: همین سناریوی ۱۰/۸/۲
تا جمعِ خرید، مانده‌ی تامین‌کننده و گزارش خرید.

**فرانت.** بعد از تصمیم، یا دیالوگِ بستنِ قلم مبلغِ کاسته را نشان می‌دهد (الف) یا فرمِ مرجوعی برای قلمِ
بسته‌شده ادعای کسری را برمی‌گرداند (ب). تا آن وقت دیالوگِ بستن صریح می‌گوید که پولی خودکار برنمی‌گردد.

---

## ۱۲. فیلترِ چندوضعیتی روی `GET api/Purchase/GetPurchaseList`

**مشکل.** صفِ دریافتِ انبار باید «هر خریدی که هنوز چیزی از آن انتظار می‌رود» را نشان دهد — یعنی
`SHIPPED` و `PARTIALLY_RECEIVED` با هم. `GetPurchaseListQuery.Status` فقط یک مقدار می‌گیرد، پس صفِ پیش‌فرض
روی «ارسال شده» بود و خریدی که محموله‌ی اولش رسیده بود (مثلاً ۸ از ۱۰) از آن بیرون می‌افتاد؛ انباردار
باقیمانده را فقط با عوض‌کردنِ دستیِ فیلتر می‌دید. (در تستِ ۲۰۲۶-۰۹-۲۴ دقیقاً همین دیده شد: صفِ پیش‌فرض
«خریدی در انتظار دریافت نیست» نشان می‌داد در حالی که خرید ۲ عدد باقیمانده داشت.)

**درخواست.** پارامترِ `List<PurchaseStatusEnum>? Statuses` کنارِ `Status`:

```csharp
if (request.Statuses is { Count: > 0 })
    query = query.Where(x => request.Statuses.Contains(x.Status));
```

فرانت آن را به شکلِ `?statuses=2&statuses=3` می‌فرستد (شکلِ پیش‌فرضِ binding برای `List<>` در ASP.NET).

**فرانت.** صفِ دریافت پیش‌فرضِ «در انتظار دریافت (ارسال‌شده و ناقص)» دارد و `statuses` را می‌فرستد
(`fetchReceivablePurchases` در `Frontend/src/features/warehouse/receiving/services/api-v1.js`). سرورِ فعلی
این پارامتر را نادیده می‌گیرد و همه‌ی خریدها را صفحه‌بندی‌شده برمی‌گرداند؛ فرانت ردیف‌ها را با همان
فهرست فیلتر می‌کند تا پیش‌نویس و لغوشده هرگز در صف نیایند — ولی تا پیاده‌سازیِ این بند، تعدادِ صفحه‌ها و
ردیف‌های هر صفحه دقیق نیست. بعد از پیاده‌سازی، فرانت به تغییری نیاز ندارد.

---

## ۱۳. اسکنِ دانه در عودت به تامین‌کننده: فقط از موجودیِ قفسه الزامی (قاعده‌ی محصول)

**قاعده.** وقتی کالای ردیابی‌پذیر (`RequiresUnitTracking`) از **موجودیِ قفسه** (`Source = IN_STOCK`) به
تامین‌کننده برمی‌گردد، باید بارکدِ تک‌تکِ دانه‌ها اسکن شود — دانه‌های قفسه برچسب خورده‌اند و دفترِ دانه‌ها
باید دقیقاً بداند کدام‌شان رفت. کالای ردیابی‌ناپذیر اسکن نمی‌خواهد.

از **قرنطینه** (`Source = QUARANTINED`) اسکن اختیاری است: دانه‌ی قرنطینه همان لحظه‌ی دریافت کنار گذاشته شده،
اغلب هنوز برچسب نخورده، و سرور خودش می‌داند کدام دانه‌ها در قرنطینه‌ی همان قلم‌اند
(`UnitSelection` با `CustodyReason`). اگر انباردار اسکن کرد، همان دانه‌ها برداشته شوند.

**وضعیت فعلی.** `PurchaseReturn/ExecuteGoodsRoundCommand` برای هر `GOODS_OUT` از کالای ردیابی‌پذیر، از هر دو
مبدأ، اسکن را الزامی می‌کند:

```csharp
// Goods leaving the company, from either source: a tracked product must be scanned.
if (effect.Direction == ReturnEffectDirectionEnum.GOODS_OUT && products[productId].RequiresUnitTracking && (line.ProductUnitBarcodes?.Count ?? 0) == 0)
```

**درخواست.** شرط را به `line.Source == ProductUnitStatusEnum.IN_STOCK` محدود کنید. برای قرنطینه بدونِ بارکد،
`ReturnToSupplierAsync` همان انتخابِ خودکار از قرنطینه‌ی قلم را انجام دهد (همان کاری که برای کالای
ردیابی‌ناپذیر الان می‌کند).

**فرانت.** `barcodesRequired` در `SupplierReturnDetailPage.jsx` حالا به مبدأ هم نگاه می‌کند: با انتخابِ
«موجودی انبار» اسکن الزامی می‌شود و با «قرنطینه» اختیاری. تا پیاده‌سازیِ این بند، عودتِ کالای ردیابی‌پذیر از
قرنطینه بدون اسکن با پیامِ ۴۰۰ سرور رد می‌شود.
