# درخواست‌های فرانت از بکند: صفحه‌ی «دانه‌ها و برچسب‌ها» (۲۰۲۶-۰۹-۲۴)

این سند برای تیم بکند است. صفحه‌ی قدیمیِ «برچسب کالاها» (`/warehouse/unit-labels`) در فرانت به یک صفحه‌ی
جامع برای **مدیریتِ دانه‌ای** تبدیل شد: `/warehouse/units` (نشانیِ قدیمی با همان پارامترها به نشانیِ تازه
هدایت می‌شود). فرانت **طوری نوشته شده که انگار همه‌ی بندهای زیر پیاده شده‌اند** — هیچ پرچم یا حالتِ موقتی
ندارد. **هیچ کدی از بکند تغییر نکرده است.**

> این سند جای بندِ «چاپ در فرانت هیچ ردی باقی نمی‌گذارد» در
> [`product-unit-frontend-requirements.fa.md`](./product-unit-frontend-requirements.fa.md) را می‌گیرد: آن
> درخواستِ محصولی حالا تصمیم شده و فرانتش ساخته شده است.

## صفحه چه می‌کند

| بخش | کار |
|---|---|
| نوارِ اسکن | باز کردنِ یک دانه با اسکن، یا **اسکنِ پیاپی برای افزودن به انتخاب** |
| کارت‌های خلاصه | تعدادِ دانه‌ها: در انبار، قرنطینه (+ ارزش)، بدون برچسب، نزدِ مشتری، عودت‌شده، اسقاط — کلیک = فیلتر |
| تبِ «همه‌ی دانه‌ها» | فهرست با جست‌وجو، کالا، وضعیت، وضعیتِ برچسب، تامین‌کننده، مشتری، تاریخِ ورود، بازه‌ی سریال، مرتب‌سازی |
| تبِ «قرنطینه» | علت، چند روز مانده، سندِ منشأ، ارزشِ نگه‌داشته؛ آزادسازی/اسقاطِ دستی یا ارجاع به مرجوعیِ خرید |
| تبِ «صف چاپ برچسب» | دانه‌های قفسه/قرنطینه که هنوز برچسب نخورده‌اند؛ چاپِ دسته‌ای و **ثبتِ چاپ** |
| تبِ «شمارش دانه‌ای» | شمارشِ قفسه برای یک کالا: شمرده‌شده / پیدانشده / غیرمنتظره، با خروجیِ CSV |
| جزئیاتِ دانه | کجاست، از کدام خرید آمده، با کدام فروش رفته، قرنطینه، سابقه‌ی چاپ، تاریخچه‌ی کامل با پیوند به سندها |
| کارهای دسته‌ای | چاپ، قرنطینه/آزادسازی/اسقاط (فقط روی دانه‌های مجاز)، خروجیِ CSV، «انتخابِ همه‌ی نتایج» |
| پیوند از جاهای دیگر | جزئیاتِ خرید («برچسب دانه‌های این خرید»)، جزئیاتِ فروش («دانه‌های ارسال‌شده»)، جزئیاتِ کالا |

فایل‌های فرانت: `Frontend/src/features/warehouse/units/` — قرارداد در `services/api-v1.js` و
`domain/unitVocabulary.js`.

---

## خلاصه‌ی سریع

| # | موضوع | فوریت | اگر نباشد |
|---|---|---|---|
| ۱ | سابقه‌ی چاپِ برچسب + `MarkProductUnitsPrinted` | **بالا** | صفِ چاپ خالی/پُر می‌ماند و «ثبت چاپ» خطا می‌دهد |
| ۲ | فیلترها، مرتب‌سازی و فیلدهای تازه روی `GetProductUnitList` | **بالا** | فیلترهای تازه بی‌اثرند؛ ستون‌های قرنطینه/برچسب خالی‌اند |
| ۳ | `GetProductUnitSummary` | **بالا** | کارت‌های بالای صفحه «—» نشان می‌دهند |
| ۴ | `ApplyProductUnitAction` (قرنطینه / آزادسازی / اسقاطِ دستی) | **بالا** | دکمه‌ها با ۴۰۴ خطا می‌دهند |
| ۵ | علت‌های نگهداریِ تازه + علتِ کار روی حرکتِ دانه | **بالا** | پیش‌نیازِ ۴ و بند ۱۰ سندِ فروش |
| ۶ | مغایرتِ `Stock` با دانه‌های `IN_STOCK` (باگ) + اصلاحِ شمارش | **بالا** (باگ) | شمارش مغایرتِ ساختگی نشان می‌دهد |
| ۷ | دسترسیِ `ProductUnitManage` | **بالا** | کارهای انبار برای هیچ‌کس دیده نمی‌شوند |

---

## ۱. سابقه‌ی چاپِ برچسب

**مشکل.** انباردار نمی‌داند کدام دانه برچسب خورده. چاپ کاملاً در مرورگر است و هیچ ردی در سرور نمی‌ماند؛
دانه‌هایی که با دریافتِ خرید ساخته می‌شوند هیچ‌وقت در صفی نمی‌آیند که یادآوری کند برچسب لازم دارند.

**درخواست.**

روی `ProductUnit`:

```csharp
public int PrintCount { get; set; }            // پیش‌فرض 0
public DateTime? FirstPrintedAt { get; set; }
public DateTime? LastPrintedAt { get; set; }
public int? LastPrintedByUserId { get; set; }
```

دستورِ تازه:

```
POST api/Product/MarkProductUnitsPrinted
{ "productUnitIds": [101, 102, 103] }
→ data: { "updatedCount": 3 }
```

- هر فراخوانی `PrintCount` هر دانه را **یکی** بالا می‌برد، `LastPrintedAt = now` و `LastPrintedByUserId` =
  کاربرِ جاری؛ `FirstPrintedAt` فقط اگر خالی بود.
- شناسه‌ی ناموجود → ۴۰۴ با پیامِ فارسی؛ همه یا هیچ.
- دسترسی: `ProductUnitView` (همان که چاپ را می‌بیند — چاپ کارِ روزمره‌ی انباردار است).
- حرکتِ دانه (`ProductUnitMovement`) ثبت **نمی‌شود**؛ چاپ جابه‌جایی نیست.

**فرانت.** بعد از بسته شدنِ پنجره‌ی چاپِ مرورگر می‌پرسد «برچسب‌ها چاپ شدند؟» و فقط با «بله» این دستور را
می‌فرستد (`UnitPrintDialog.jsx`). چاپِ دوباره‌ی برچسبِ افتاده هم همین مسیر است و `PrintCount` را ۲ می‌کند.

**تعریفِ «بدون برچسب»** (برای بند ۲ و ۳): `Status ∈ {IN_STOCK, QUARANTINED} && PrintCount == 0`. دانه‌ی
فروخته/عودت‌شده/اسقاط‌شده دیگر در دسترس نیست که برچسب بخورد و در صف نمی‌آید.

---

## ۲. `GET api/Product/GetProductUnitList` — فیلترها، مرتب‌سازی، فیلدها

### پارامترهای تازه

| پارامتر | نوع | معنا |
|---|---|---|
| `Search` | string | بارکد (هر شکلی که اسکنر بدهد → `ToPayload`)، سریال، نام یا کدِ کالا |
| `Statuses` | `List<ProductUnitStatusEnum>` | چند وضعیت با هم (صفِ چاپ: `IN_STOCK` + `QUARANTINED`)؛ کنارِ `Status` که می‌ماند |
| `CustodyReason` | `UnitCustodyReasonEnum?` | علتِ قرنطینه |
| `LabelState` | `1 = UNPRINTED`، `2 = PRINTED` | `PrintCount == 0` / `> 0` |
| `SupplierId` | int? | تامین‌کننده‌ی خریدی که دانه با آن آمد |
| `CustomerId` | int? | مشتریِ آخرین فروشی که دانه با آن رفت |
| `PurchaseId` | int? | دانه‌های یک خرید (پیوندِ «برچسب دانه‌های این خرید») |
| `SaleId` | int? | دانه‌های یک فروش |
| `FromDate` / `ToDate` | DateOnly | بازه روی `CreatedAt` (ورود به انبار) |

`Statuses` به شکلِ `?statuses=1&statuses=9` می‌آید (مثلِ بند ۱۲ سندِ خرید).

### `ProductUnitListSortEnum` — سه عضوِ تازه

```csharp
SERIAL_NUMBER = 0, PRODUCT_NAME = 1, STATUS = 2, SOLD_AT = 3,   // موجود
CREATED_AT = 4, LAST_PRINTED_AT = 5, QUARANTINED_AT = 6,        // تازه
```

### سقفِ `Take`

فرانت برای «انتخابِ همه‌ی نتایج»، «خروجیِ CSV همه» و فهرستِ انتظارِ شمارش صفحه‌های ۲۰۰تایی می‌خواند
(حداکثر ۲۰۰۰ دانه، و برای شمارش ۵۰۰۰). لطفاً `Take` تا ۲۰۰ را بپذیرید؛ اگر سقف می‌گذارید، همین عدد.

### فیلدهای تازه روی `ProductUnitDto`

| فیلد | منبع |
|---|---|
| `ProductCode` | `Product.Code` (در سندِ قبلی توافق شده بود؛ هنوز نمی‌آید) |
| `RequiresUnitTracking` | `Product.RequiresUnitTracking` |
| `CustodyReason` | همان ستونِ موجود |
| `QuarantineCost` | همان ستونِ موجود |
| `QuarantinedAt` | **ستونِ تازه** — لحظه‌ی ورود به قرنطینه؛ با خروج پاک نمی‌شود |
| `QuarantineDocumentKind` / `QuarantineDocumentId` / `QuarantineDocumentNumber` | سندی که دانه را به قرنطینه برد (خرید، مرجوعیِ فروش؛ `null` برای قرنطینه‌ی دستی) |
| `CreatedAt` | همان ستونِ موجود |
| `LastMovementAt` | `OccurredAt` آخرین حرکت |
| `PrintCount`، `FirstPrintedAt`، `LastPrintedAt`، `LastPrintedByName` | بند ۱ |

`QuarantinedAt` و سندِ منشأ را می‌شود از آخرین حرکتِ `→ QUARANTINED` هم درآورد، ولی چون فهرست روی آن
مرتب می‌شود، ستون روی خودِ دانه ارزان‌تر است. هر جا `ProductUnitService` دانه را `QUARANTINED` می‌کند
(دریافتِ خرید، مرجوعیِ فروش پس از بند ۱۰ سندِ فروش، بند ۴ همین سند) این سه ستون پر شوند.

---

## ۳. `GET api/Product/GetProductUnitSummary`

کارت‌های بالای صفحه و شمارنده‌ی تب‌ها. با `productId` اختیاری (وقتی کاربر یک کالا را فیلتر کرده).

```json
{
  "byStatus": [
    { "status": 1, "count": 105 },
    { "status": 2, "count": 3 },
    { "status": 3, "count": 2 },
    { "status": 4, "count": 1 },
    { "status": 9, "count": 0 }
  ],
  "quarantineByReason": [
    { "custodyReason": 1, "count": 2, "value": 200000 }
  ],
  "quarantineValue": 200000,
  "unprintedCount": 97
}
```

- `quarantineValue` = مجموعِ `QuarantineCost` دانه‌های `QUARANTINED`.
- `unprintedCount` = تعریفِ بند ۱.
- یک `GROUP BY` روی `ProductUnits`؛ دسترسی `ProductUnitView`.

---

## ۴. `POST api/Product/ApplyProductUnitAction` — کارِ دستیِ انبار روی دانه

**مشکل.** امروز وضعیتِ دانه فقط از مسیرِ خرید/فروش/مرجوعی عوض می‌شود. ولی انبار کارهایی دارد که هیچ سندِ
طرفِ حسابی ندارند:

- کالا روی قفسه شکست یا خراب شد (تقصیرِ خودمان) → **اسقاط از موجودی**.
- کالای مشکوک باید تا بررسی از فروش کنار برود → **انتقال به قرنطینه**.
- بررسی تمام شد و سالم است → **آزادسازی**.
- کالای معیوبِ برگشتی از مشتری (بعد از بند ۱۰ سندِ فروش در قرنطینه) که قابلِ ادعا از تامین‌کننده نیست →
  **اسقاط از قرنطینه**.

امروز تنها راهِ اسقاط از موجودی، ساختنِ یک مرجوعیِ خریدِ ساختگی است.

**درخواست.**

```
POST api/Product/ApplyProductUnitAction
Idempotency-Key: <uuid>
{
  "action": 1,                 // ProductUnitActionEnum
  "productUnitIds": [101, 102],
  "reason": 4,                 // UnitActionReasonEnum
  "note": "قاب ترک خورده",
  "occurredAt": null           // اختیاری؛ پیش‌فرض اکنون
}
→ data: { "affectedCount": 2 }
```

```csharp
public enum ProductUnitActionEnum { QUARANTINE = 1, RELEASE = 2, SCRAP = 3 }

public enum UnitActionReasonEnum
{
    DAMAGED_IN_WAREHOUSE = 1,   // آسیب در انبار
    DEFECT_FOUND = 2,           // عیبِ کشف‌شده
    EXPIRED = 3,                // تاریخ گذشته
    NEEDS_INSPECTION = 4,       // نیاز به بررسی
    INSPECTION_PASSED = 5,      // بررسی شد — سالم
    OTHER = 9,                  // سایر موارد
}
```

### قواعد (فرانت دقیقاً همین‌ها را در `allowedActionsOf` اعمال می‌کند)

| کار | از وضعیت | به وضعیت | `Product.Stock` | بهای تمام‌شده | حرکت |
|---|---|---|---|---|---|
| `QUARANTINE` | `IN_STOCK` | `QUARANTINED`، `CustodyReason = WAREHOUSE_HOLD` | −۱ | ارزش از استخر به قرنطینه با میانگینِ جاری؛ `QuarantineCost` = همان | `STOCK_QUARANTINED` (تازه) |
| `RELEASE` | `QUARANTINED` با علتِ `WAREHOUSE_HOLD` یا `CUSTOMER_RETURN` | `IN_STOCK` | +۱ | `QuarantineCost` به استخر برمی‌گردد | `QUARANTINE_RELEASED` (۹) |
| `SCRAP` | `IN_STOCK` | `SCRAPPED` | −۱ | زیانِ اسقاط با میانگینِ جاری (همان `RecordStockScrappedAsync` بدونِ ادعا) | `STOCK_SCRAPPED` (۱۲) |
| `SCRAP` | `QUARANTINED` با علتِ `WAREHOUSE_HOLD` یا `CUSTOMER_RETURN` | `SCRAPPED` | — | زیان = `QuarantineCost` | `QUARANTINE_SCRAPPED` (۱۰) |

- **قرنطینه‌ی دریافتِ خرید (`ON_ORDER` / `EXCESS` / `UNLISTED`) با این دستور جابه‌جا نمی‌شود** → ۴۰۹ با پیامِ
  «این دانه در قرنطینه‌ی دریافتِ خرید است؛ از مرجوعیِ خرید تعیین تکلیف کنید». حسابِ این دانه‌ها با
  تامین‌کننده باز است (پولِ پرداخت‌شده، مازادِ پرداخت‌نشده) و فقط مرجوعیِ خرید آن را می‌بندد. فرانت برای این
  دانه‌ها دکمه‌ی «تعیین تکلیف در مرجوعی خرید» را نشان می‌دهد (`/purchases/returns/new?purchaseId=…&prefill=quarantine`).
- هر دانه‌ای که قاعده را نقض کند → کلِ درخواست ۴۰۰ و هیچ تغییری (همه یا هیچ). فرانت فقط دانه‌های مجاز را
  می‌فرستد و بقیه را با دلیل به کاربر نشان می‌دهد.
- `note` برای `SCRAP` و برای `reason = OTHER` الزامی است (اسقاط زیانِ مالی است).
- `Idempotency-Key` خوانده شود (بند ۵ سندِ خرید): این دستور موجودی را عوض می‌کند.
- کالای ردیابی‌پذیر: فرانت شناسه‌ی دقیقِ دانه را می‌فرستد (از اسکن یا فهرست)، پس بارکد جدا لازم نیست.
- هر حرکت `UserId`، `Note`، `ActionReason` (بند ۵) و `DocumentKind = null` دارد.

---

## ۵. علت‌های نگهداری و علتِ کار

### `UnitCustodyReasonEnum` — دو عضوِ تازه

```csharp
ON_ORDER = 1, EXCESS = 2, UNLISTED = 3,   // موجود — قرنطینه‌ی دریافتِ خرید
CUSTOMER_RETURN = 4,   // کالای معیوبِ برگشتی از مشتری (بند ۱۰ سندِ فروش)
WAREHOUSE_HOLD = 5,    // انباردار خودش از قفسه به قرنطینه برده (بند ۴)
```

توضیحِ فعلیِ enum می‌گوید «فقط یک قاعده حق دارد آن را بخواند (سهمیه‌ی ادعای OFF_ORDER)». با این دو عضو
قاعده‌ی دوم هم اضافه می‌شود: **کدام قرنطینه را `ApplyProductUnitAction` می‌پذیرد** (فقط ۴ و ۵). لطفاً کامنت را
هم به‌روز کنید.

### `ProductUnitMovementReasonEnum` — یک عضوِ تازه

```csharp
[Description("انتقال به قرنطینه")]
STOCK_QUARANTINED = 14,
```

### علتِ کار روی حرکت

ستونِ `ActionReason` (`UnitActionReasonEnum?`) روی `ProductUnitMovement` و در `ProductUnitMovementDto` دو
فیلدِ `ActionReason` و `ActionReasonTitle` (از `Description`). فرانت در تاریخچه‌ی دانه
`ActionReasonTitle — Note` را نشان می‌دهد.

---

## ۶. مغایرتِ `Stock` با دانه‌های `IN_STOCK` (باگ) و اصلاحِ شمارش

**باگ.** روی سرورِ تست، برای «قطعه نمونه 46» (`productId = 53`):

- `Product.Stock = 87`
- `GetProductUnitList?productId=53&status=1` → **۸۸** دانه

یعنی ثابتِ `Stock == COUNT(IN_STOCK)` که در کامنتِ `ProductUnitStatusEnum` آمده شکسته است. این کالا در
تستِ سراسری ۶ عدد دریافت شد (۵ به موجودی، ۱ مازاد به قرنطینه) و مازاد از قرنطینه به تامین‌کننده عودت داده
شد (حالا ۱ دانه `RETURNED_TO_SUPPLIER`). یا یکی از این مسیرها یک دانه‌ی `IN_STOCK` اضافه ساخته، یا داده از
قبل ناهماهنگ بوده. لطفاً:

1. یک کوئریِ تشخیص روی همه‌ی کالاها اجرا کنید: `Stock` در برابرِ `COUNT(IN_STOCK)`.
2. مسیری که مغایرت می‌سازد را پیدا کنید (مظنونِ اول: دریافتِ مازاد و عودتش از قرنطینه).
3. `ReconcileStockAsync` (یا یک دستورِ ادمین) داده‌ی موجود را هم‌تراز کند.

شمارشِ دانه‌ای در فرانت همین مغایرت را فوراً نشان می‌دهد: «پیدانشده» حداقل یکی خواهد بود، حتی اگر قفسه
کامل باشد.

**اصلاحِ شمارش (درخواستِ بعدی، نه فوری).** شمارش امروز فقط گزارش است و چیزی در سرور ثبت نمی‌کند (نتیجه در
مرورگر می‌ماند و خروجیِ CSV دارد). قدمِ بعدی:

```
POST api/Product/SubmitUnitCount
{ "productId": 53, "countedBarcodes": [...], "note": "..." }
```

که یک سندِ شمارش بسازد و برای دانه‌های «پیدانشده» وضعیتِ تازه‌ای مثل `MISSING` (شماره‌ی ۷ که در
`frontend-enum-contract.fa.md` بخش ۲ برای `LOST` نگه داشته شده) با زیانِ موجودی ثبت کند. تا تصمیمِ محصول
درباره‌ی این وضعیت، فرانت همان گزارش را نگه می‌دارد.

---

## ۷. دسترسی

```csharp
ProductUnitManage = 171,   // قرنطینه / آزادسازی / اسقاطِ دستی
```

- `ApplyProductUnitAction` → `ProductUnitManage`.
- `GetProductUnitSummary` و `MarkProductUnitsPrinted` → `ProductUnitView` (موجود، ۱۷۰).
- در الگوی پیش‌فرضِ واحدِ «انبار» به سرپرستِ انبار داده شود، نه لزوماً به هر انباردار — اسقاط زیانِ مالی است.

فرانت بدونِ `ProductUnitManage` منوی «کارِ انبار» و دکمه‌های قرنطینه/آزادسازی/اسقاط را نشان نمی‌دهد؛
دیدن، اسکن، چاپ و شمارش با `ProductUnitView` کار می‌کنند.

---

## وابستگی به سندهای دیگر

- **بند ۱۰ [`sale-frontend-sync-requests.fa.md`](./sale-frontend-sync-requests.fa.md):** کالای معیوبِ برگشتی از
  مشتری باید با `CustodyReason = CUSTOMER_RETURN` به قرنطینه برود. تبِ «قرنطینه» و دکمه‌ی «ادعا از
  تامین‌کننده» (`/purchases/returns/new?purchaseId=<خریدِ منشأ>`) روی همین حساب می‌کنند؛ و
  `GetPurchaseReceivingInfo` باید این قرنطینه را هم برگرداند تا ادعای مرجوعیِ خرید سقفش را بداند.
- **بند ۱۳ [`purchase-frontend-sync-requests.fa.md`](./purchase-frontend-sync-requests.fa.md):** اسکنِ دانه در عودت
  فقط از موجودیِ قفسه الزامی است.

## چک‌لیست بکند

- [ ] بند ۱ — ستون‌های چاپ + `MarkProductUnitsPrinted`
- [ ] بند ۲ — پارامترهای تازه، `Statuses`، سه عضوِ `ProductUnitListSortEnum`، `Take ≤ 200`
- [ ] بند ۲ — فیلدهای تازه‌ی `ProductUnitDto` + ستون‌های `QuarantinedAt` و سندِ منشأ
- [ ] بند ۳ — `GetProductUnitSummary`
- [ ] بند ۴ — `ApplyProductUnitAction` با قواعد، بهای تمام‌شده و ایدمپوتنسی
- [ ] بند ۵ — `CUSTOMER_RETURN = 4`، `WAREHOUSE_HOLD = 5`، `STOCK_QUARANTINED = 14`، `ActionReason` روی حرکت
- [ ] بند ۶ — تشخیص و رفعِ مغایرتِ `Stock` / `IN_STOCK`
- [ ] بند ۷ — `ProductUnitManage = 171`
