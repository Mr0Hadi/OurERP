# رفع اشکال‌ها: `offScopeKind` روی ادعای ON_ORDER، و تغییرات ذخیره‌نشده‌ی همان درخواست در دفتر بهای تمام‌شده، شماره‌سریال و انتخاب دانه‌ها (۲۰۲۶-۰۹-۱۲)

این سند اشکال‌هایی را توضیح می‌دهد که در بازبینی کد مرجوعی پیدا شدند، چه چیزی تغییر کرد و چرا. بخش‌های ۱ و ۲ در یک مرحله و بخش ۳ در مرحله‌ی بعدی اصلاح شدند.

---

## ۱. `offScopeKind` روی ادعای ON_ORDER بی‌صدا دور ریخته می‌شد

### مشکل
در `CreatePurchaseReturnCommandHandler` و `CreateSaleReturnCommandHandler`، هنگام ساختن ادعا این خط وجود داشت:

```csharp
OffScopeKind = claimReq.Scope == ReturnClaimScopeEnum.OFF_ORDER ? claimReq.OffScopeKind : null,
```

یعنی اگر کلاینت برای ادعای «روی قلم سند» (`scope = ON_ORDER`) مقداری برای `offScopeKind` می‌فرستاد، سرور بدون هیچ خطایی آن را کنار می‌گذاشت. درخواست موفق می‌شد ولی چیزی که ذخیره شده بود با چیزی که فرستاده شده بود فرق داشت.

### چرا مهم است
ادعایی که هم `scope = ON_ORDER` دارد و هم `offScopeKind` یک داده‌ی متناقض است: یا کلاینت واقعاً می‌خواست ادعای خارج از سند ثبت کند و `scope` را اشتباه فرستاده، یا فرم یک مقدار باقی‌مانده از ویرایش قبلی را فرستاده. در هر دو حالت، پذیرفتن بی‌صدای آن خطا را پنهان می‌کند. در حالت اول هم نتیجه متفاوت است: ادعای ON_ORDER سهمیه‌ی قلم را مصرف می‌کند، ادعای خارج از سند نه.

این همان الگویی است که قبلاً برای `orderLineId` روی ادعای UNLISTED هم اصلاح شده بود.

### تغییر
یک قاعده‌ی ورودی خالص است، پس در validator آمد نه در handler:

```csharp
claim.RuleFor(c => c.OffScopeKind).Null()
    .WithMessage("ادعای روی قلم سند نمی‌تواند نوع ادعای خارج از سند (offScopeKind) داشته باشد.")
    .When(c => c.Scope == ReturnClaimScopeEnum.ON_ORDER);
```

در `CreatePurchaseReturnCommandValidator` و `CreateSaleReturnCommandValidator`. نتیجه: ۴۰۰ به‌جای پذیرفتن بی‌صدا. خط ساختن ادعا در handler دست نخورده، چون حالا تنها مقداری که به آن می‌رسد `null` است.

### آزمون‌ها
`Tests/WMS.Tests/Unit/OnOrderOffScopeKindValidatorTests.cs` (تا ۲۰۲۶-۰۹-۱۷ داخل `Unit/ReturnMoneyBalanceTests.cs` بود، که با حذف قاعده‌ی تراز از بین رفت)، کلاس `OnOrderOffScopeKindValidatorTests`: ادعای ON_ORDER با `offScopeKind` در هر دو سمت نامعتبر است و بدون آن معتبر.

---

## ۲. ردیف دوم یک کالا در یک درخواست، ردیف اول همان درخواست را نمی‌دید

دو سرویس یک اشکال یکسان داشتند: هر دو «آخرین ردیف» را فقط از **پایگاه داده** می‌خواندند، در حالی که ردیف‌هایی که همان درخواست کمی قبل‌تر ساخته بود هنوز ذخیره نشده بودند.

در این پروژه هیچ سرویسی خودش `SaveChangesAsync` صدا نمی‌زند؛ handler همه‌ی تغییرات را جمع می‌کند و در پایان یک‌جا ذخیره می‌کند. پس هر چیزی که بین شروع و پایان یک handler ساخته می‌شود، برای یک کوئری پایگاه داده وجود ندارد.

### ۲-الف. دفتر بهای تمام‌شده (`InventoryCostingService`)

#### مشکل
`AddEntryAsync` برای هر ردیف جدید مجموع‌های جاری (`RunningQuantity`، `RunningInventoryValue`، `RunningAverageCost`) را روی آخرین ردیف همان کالا می‌سازد:

```csharp
var last = await _context.InventoryCostLedgerEntries
    .Where(e => e.ProductId == product.Id)
    .OrderByDescending(e => e.Id)
    .FirstOrDefaultAsync(cancellationToken);
```

اگر یک درخواست دو ردیف برای یک کالا بسازد، هر دو از **همان** ردیف ذخیره‌شده‌ی قبلی شروع می‌کنند و اثر ردیف اول از همه‌ی مجموع‌های بعدی حذف می‌شود.

**نمونه.** کالایی بدون سابقه؛ در یک درخواست ۱۰ واحد به قیمت ۱۰۰ و سپس ۱۰ واحد به قیمت ۲۰۰ وارد می‌شود.

| | ردیف دوم — قبل از اصلاح | ردیف دوم — بعد از اصلاح |
|---|---|---|
| `RunningQuantity` | ۱۰ | ۲۰ |
| `RunningInventoryValue` | ۲۰۰۰ | ۳۰۰۰ |
| `RunningAverageCost` | ۲۰۰ | ۱۵۰ |

با خروج هم همین است: ورود ۱۰ واحد و سپس خروج ۴ واحد در یک درخواست، خروج را با میانگین صفر (چون ردیف ورود دیده نمی‌شد) و مانده‌ی منفی ۴ واحد ثبت می‌کرد.

#### کجا رخ می‌داد
هر جایی که یک درخواست بیش از یک ردیف برای یک کالا می‌نویسد، از جمله `ExecuteGoodsRoundCommand` با دو خط برای یک کالا (یا یک اثر در دو خط)، چون میانگین موزون روی زنجیره‌ی همین ردیف‌ها محاسبه می‌شود، خطا در یک ردیف به همه‌ی بهای تمام‌شده‌ی فروش‌های بعدی و گزارش سود منتقل می‌شد.

#### تغییر
- سرویس (که مثل `DbContext` با طول عمر Scoped ثبت شده، یعنی دقیقاً هم‌عمر ردیف‌های ذخیره‌نشده‌ی همان درخواست است) آخرین ردیفی را که خودش برای هر کالا ساخته در یک `Dictionary<int, InventoryCostLedgerEntry>` نگه می‌دارد.
- متد جدید `LatestEntryAsync` اول آن ردیف را برمی‌گرداند و فقط در نبودنش سراغ پایگاه داده می‌رود. `AddEntryAsync` از آن استفاده می‌کند.
- ردیف نگه‌داشته‌شده فقط تا وقتی معتبر است که `ChangeTracker` هنوز آن را ردیابی کند؛ ردیفی که درخواستش شکست خورده و از context جدا شده نباید به مجموع‌های بعدی نشت کند.

#### چرا از خود `ChangeTracker` یا `DbSet.Local` ترتیب را نخواندیم
- ترتیب شمارش `ChangeTracker.Entries()` تضمین‌شده نیست.
- ردیف‌های افزوده‌شده تا پیش از ذخیره شناسه‌ی واقعی ندارند (EF کلید موقت را فقط در change tracker نگه می‌دارد و `Id` خود موجودیت صفر می‌ماند)، پس `OrderByDescending(Id)` روی آن‌ها معنای «جدیدتر» نمی‌دهد.
- `CreatedAt` هم می‌تواند برای دو ردیف پشت‌سرهم برابر باشد.

تنها منبع قابل‌اعتماد ترتیب، خود سرویس است که ردیف‌ها را به ترتیب می‌سازد.

### ۲-ب. شماره‌سریال دانه‌ها (`ProductUnitService`)

#### مشکل
`MintAsync` شماره‌ی سریال بعدی را از بیشترین سریالِ **ذخیره‌شده** می‌گرفت:

```csharp
var maxSerial = await _context.ProductUnits
    .Where(x => x.ProductId == productId)
    .Select(x => (int?)x.SerialNumber)
    .MaxAsync(cancellationToken);
```

دو فراخوانی `MintAsync` برای یک کالا در یک درخواست، هر دو از همان عدد شروع می‌کردند و سریال تکراری می‌ساختند. چون روی `(ProductId, SerialNumber)` ایندکس یکتا وجود دارد، نتیجه داده‌ی تکراری نبود بلکه **شکست کل ذخیره‌سازی** با خطای ۵۰۰ بود؛ مثلاً یک نوبت `ExecuteGoodsRound` خرید با دو خط `goodsIn` برای یک کالا اصلاً ثبت‌شدنی نبود.

#### تغییر
بیشترین سریال حالا بیشینه‌ی دو مقدار است: بیشترین سریال ذخیره‌شده، و بیشترین سریال دانه‌هایی که در `_context.ProductUnits.Local` ردیابی می‌شوند. برخلاف دفتر، اینجا `Local` کافی است: سریال یک مقدار واقعی است نه کلید موقت، پس بیشینه‌گرفتن از آن درست است و به ترتیب نیازی ندارد.

### آزمون‌ها
`Tests/WMS.Tests/Integration/InFlightLedgerAndSerialTests.cs` — همه دو نوشتن برای یک کالا در یک درخواست را پیش از `SaveChanges` آزمایش می‌کنند:
- `Ledger_TwoInboundEntriesForOneProductInOneRequest_ChainTheirRunningTotals` — نمونه‌ی جدول بالا.
- `Ledger_OutboundAfterInboundInOneRequest_ConsumesAtTheInFlightAverage` — خروج با میانگین ردیف ذخیره‌نشده.
- `Serials_TwoMintsForOneProductInOneRequest_AreDistinct_AndTheRequestSaves` — سریال‌های ۱ تا ۵ و ذخیره‌ی موفق.
- `PurchaseGoodsRound_TwoLinesForTheSameProduct_SavesWithDistinctSerials_AndChainedLedger` — همان دو اشکال از مسیر واقعی handler.

---

## ۳. انتخاب دانه‌ها هم باید تغییرات همان درخواست را ببیند (مرحله‌ی دوم)

آخرین مورد از همان خانواده، که در مرحله‌ی قبل عمداً کنار گذاشته شده بود، در یک مرحله‌ی جدا اصلاح شد.

### ۳-الف. انتخاب دانه (`ProductUnitService`)

#### مشکل
`ConsumeAsync`، `ReturnToSupplierAsync`، `RestoreAsync` (و `ReconcileStockAsync`) دانه‌ها را با کوئری روی **وضعیت ذخیره‌شده** انتخاب می‌کردند، مثلاً:

```csharp
_context.ProductUnits
    .Where(x => x.ProductId == product.Id && x.Status == ProductUnitStatusEnum.IN_STOCK)
    .OrderBy(x => x.SerialNumber)
    .Take(count)
```

دانه‌ای که همان درخواست کمی قبل‌تر `SOLD` کرده، در پایگاه داده هنوز `IN_STOCK` است؛ پس فراخوانی دوم **همان دانه‌ها** را دوباره انتخاب می‌کرد. EF همان نمونه‌ی ردیابی‌شده را برمی‌گرداند و بررسی تعداد (`units.Count < count`) هم می‌گذشت، ولی در عمل یک دانه دو بار «خارج» می‌شد در حالی که `Product.Stock` دو بار کم شده بود — یعنی مستقیماً `Product.Stock == COUNT(ProductUnit WHERE IN_STOCK)` را می‌شکست. برعکسش هم بود: دانه‌ای که همان درخواست ساخته (`MintAsync`) هنوز سطری در پایگاه داده ندارد و قابل انتخاب یا اسکن نبود؛ و `ReconcileStockAsync` تعداد `IN_STOCK` را بدون دانه‌های تازه‌ساخته می‌شمرد و دوباره می‌ساخت.

**نمونه‌ی واقعی.** یک نوبت `ExecuteGoodsRound` خرید با دو خط `GOODS_OUT` (هر کدام ۱ واحد) برای یک کالا: هر دو خط همان دانه را `RETURNED_TO_SUPPLIER` می‌کردند؛ موجودی ۲ کم می‌شد ولی فقط ۱ دانه از `IN_STOCK` خارج می‌شد.

#### تغییر
یک متد کمکی مشترک، `SelectUnitsAsync` (و همتای شمارشی‌اش `CountUnitsAsync`)، که همه‌ی انتخاب‌ها از آن می‌گذرند:
- دانه‌هایی که context ردیابی می‌کند (هر وضعیتی جز `Deleted`، از جمله `Added`) با **مقادیر درون‌حافظه‌ای‌شان** سنجیده می‌شوند؛
- همان دانه‌ها با شناسه از کوئری ذخیره‌شده **کنار گذاشته می‌شوند** تا دو مجموعه هم‌پوشانی نداشته باشند؛
- باقی دانه‌ها با سطر ذخیره‌شده‌شان سنجیده می‌شوند؛
- ترتیب (سریال، یا `SoldAt` سپس سریال برای برگرداندن) یک‌بار روی مجموع هر دو اعمال می‌شود.

جست‌وجوی بارکد صریح در `ConsumeAsync` هم اول در `ProductUnits.Local` می‌گردد، تا دانه‌ی ساخته‌شده در همان درخواست قابل اسکن باشد.

دانه‌های `Added` شناسه‌ی واقعی ندارند (EF کلید موقت را روی خود موجودیت نمی‌گذارد)، برای همین فقط شناسه‌های `> 0` از کوئری ذخیره‌شده کنار گذاشته می‌شوند — دانه‌ی `Added` اصلاً سطری ندارد که کنار گذاشته شود.

### آزمون‌ها
`Tests/WMS.Tests/Integration/InFlightUnitSelectionTests.cs` — همه دو جابه‌جایی یک کالا در یک درخواست را پیش از `SaveChanges` آزمایش می‌کنند:
- `Consume_TwiceForOneProductInOneRequest_PicksDistinctUnits`
- `Consume_UnitsMintedEarlierInTheSameRequest_CanBeConsumed` و `Consume_ExplicitBarcodeOfAUnitMintedInTheSameRequest_IsFound`
- `ReturnToSupplier_TwiceForOneProductInOneRequest_PicksDistinctUnits`
- `Restore_TwiceForOneSaleLineInOneRequest_PicksDistinctUnits` و `Restore_ThenConsume_InOneRequest_ShipsTheRestoredUnit`
- `ReconcileStock_AfterAMintInTheSameRequest_CountsTheInFlightUnits`
- `PurchaseGoodsRound_TwoGoodsOutLinesForOneProduct_ReturnsTwoDistinctUnits` — از مسیر واقعی handler؛ ثابت می‌کند `Product.Stock == COUNT(IN_STOCK)` بعد از ذخیره برقرار است.
