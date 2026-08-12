# راهنمای کامل ماژول «ارسال فروش و مرجوعی از مشتری»

این سند توضیح می‌دهد که در فیچر `SaleReturn` (و پیش‌نیازش، ارسال چندمرحله‌ای فروش) دقیقاً چه کدی نوشته شده، هر بخش چرا این‌طور طراحی شده، و هر تابع/هندلر روی چه سناریوهایی و با چه منطقی کار می‌کند. این سند مکمل `docs/purchase-return-guide.fa.md` و `docs/return-scenarios-guide.fa.md` (بخش دو) است — همان‌ها منبع سناریوهای کسب‌وکاری بودند؛ این‌جا پیاده‌سازی واقعی مستند می‌شود.

> این فیچر از صفر ساخته شد (نه بازنویسی) چون قبل از آن هیچ‌چیز از مرجوعی فروش در بک‌اند وجود نداشت — نه Entity، نه Command، نه حتی `SaleItem.ShippedQuantity`.

---

## فهرست مطالب

1. [چرا این فیچر این‌طور طراحی شد](#1-چرا-این-فیچر-این‌طور-طراحی-شد)
2. [پیش‌نیاز: ارسال چندمرحله‌ای فروش — `ShipSaleCommand`](#2-پیش‌نیاز-ارسال-چندمرحله‌ای-فروش--shipsalecommand)
3. [مدل داده (Entities و Enums)](#3-مدل-داده-entities-و-enums)
4. [سرویس محاسباتی مرکزی — `ISaleReturnCalculationService`](#4-سرویس-محاسباتی-مرکزی--isalereturncalculationservice)
5. [فرمان ثبت ادعا — `CreateSaleReturnCommand`](#5-فرمان-ثبت-ادعا--createsalereturncommand)
6. [فرمان بازرسی فیزیکی — `ConfirmReturnInspectionCommand`](#6-فرمان-بازرسی-فیزیکی--confirmreturninspectioncommand)
7. [فرمان‌های تصمیم — Add/RemoveSaleReturnDecisionCommand](#7-فرمانهای-تصمیم--addremovesalereturndecisioncommand)
8. [فرمان ارسال جایگزین — `ConfirmReplacementShipmentCommand`](#8-فرمان-ارسال-جایگزین--confirmreplacementshipmentcommand)
9. [فرمان‌های چرخه‌ی عمر مرجوعی: لغو، رد، بازگشایی، حذف](#9-فرمانهای-چرخهی-عمر-مرجوعی-لغو-رد-بازگشایی-حذف)
10. [کوئری‌ها (خواندن داده)](#10-کوئری‌ها-خواندن-داده)
11. [تصمیم‌های طراحی که عمداً گرفته شدند](#11-تصمیمهای-طراحی-که-عمداً-گرفته-شدند)
12. [جدول کامل Endpoint ها](#12-جدول-کامل-endpoint-ها)
13. [کارهای باقی‌مانده / محدودیت‌های شناخته‌شده](#13-کارهای-باقی‌مانده--محدودیتهای-شناخته‌شده)

---

## 1. چرا این فیچر این‌طور طراحی شد

`docs/return-scenarios-guide.fa.md` (بخش دو) منطق کامل فرانت‌اند (`Frontend/src/features/sales/services/returns`) را مستند کرده بود، اما به‌صراحت چند نکته را «بازِ طراحی» گذاشته بود (بخش ۲.۸ همان سند) که فرانت‌اند خودش هم پاسخ روشنی برایشان نداشت. قبل از کدنویسی، این‌ها آگاهانه تصمیم‌گیری شدند:

1. **ارسال (Shipping) باید اول ساخته شود.** فرانت‌اند فرض کرده بود `SaleItem.ShippedQuantity` وجود دارد و ارسال چندمرحله‌ای است، ولی هیچ‌کدام در بک‌اند نبود. بدون این، محاسبه‌ی «چقدر قابل مرجوع کردن است» اصلاً معنا ندارد. پس `ShipSaleCommand` به‌عنوان پیش‌نیاز ساخته شد (بخش ۲).
2. **`Sale.Status` باید بعد از هر اقدام مرجوعی بازمحاسبه شود** (برخلاف فرانت‌اند که هیچ Syncی انجام نمی‌داد) — تا همان باگ شناخته‌شده‌ی `UpdatePurchaseCommand` (نوشتنِ مستقیمِ Status بدونِ عبور از سرویسِ محاسباتی) در این فیچر تکرار نشود. جزئیات در بخش ۴.۶.
3. **`STORE_CREDIT` فقط یک برچسب است، نه یک Ledger واقعی** — دقیقاً مثل `CREDIT` در `PurchaseReturn`. ساختِ یک Entity اعتبار واقعی (`CustomerCredit`) خارج از حوزه‌ی این فیچر است.

---

## 2. پیش‌نیاز: ارسال چندمرحله‌ای فروش — `ShipSaleCommand`

**Endpoint:** `POST api/Sale/ShipSale`
**فایل:** `Application/Features/Sale/Commands/ShipSaleCommand.cs`

نسخه‌ی خروجیِ `ReceivePurchaseCommand` است: به‌جای این‌که کالا وارد انبار شود، از انبار خارج می‌شود. تفاوت‌های کلیدی با `ReceivePurchaseCommand`:

- **هیچ مفهوم «مغایرت» (Issues) در لحظه‌ی ارسال وجود ندارد.** مشکلات فقط بعداً و توسط خودِ مشتری، از طریق `SaleReturn`، گزارش می‌شوند — نه توسط انباردار در لحظه‌ی ارسال.
- **موجودی کم می‌شود، نه زیاد** (`Product.Stock -= ShippedQuantity`)، و قبل از کم‌کردن بررسی می‌شود که موجودی کافی باشد (خطای «موجودی کافی نیست» — این یک محافظتِ دامنه‌ای است که در `ReceivePurchaseCommand` معنا نداشت چون دریافت هیچ‌وقت موجودی را منفی نمی‌کند).
- **بودجه ساده‌تر است**: فقط `Quantity - ShippedQuantity` (نه فرمولِ چندجزئیِ `GetReceivableQuantity`)، چون در لحظه‌ی ارسال هیچ «مغایرتِ بازِ» معادلی وجود ندارد که کم شود.

وضعیتِ فروش بعد از هر ارسال بازمحاسبه می‌شود: اگر همه‌ی اقلام کامل ارسال شده باشند → `SHIPPED` (مقدارِ تازه‌اضافه‌شده به `SalesStatusEnum`، در انتهای enum append شده تا مقادیرِ عددیِ قبلی جابه‌جا نشوند)؛ وگرنه اگر چیزی ارسال شده → `PARTIALLY_DELIVERED`؛ وگرنه بدون تغییر. `DELIVERED` همچنان کاملاً دستی می‌ماند (دقیقاً مثل فرانت‌اند — هیچ‌جا خودکار ست نمی‌شود).

اگر `Sale.Status == CANCELLED`، ارسال رد می‌شود.

---

## 3. مدل داده (Entities و Enums)

### 3.1. چرا مدل فروش یک لایه‌ی اضافه دارد

`PurchaseReturn` فقط یک محور دارد (`PurchaseIssueTypeEnum`، ثبت‌شده در لحظه‌ی دریافتِ فیزیکی). `SaleReturn` طبقِ `return-scenarios-guide.fa.md` بخش ۲.۲ **دو محورِ کاملاً مستقل** دارد:

- **دلیلِ ادعای مشتری** (`SalesReturnReasonEnum`) — در لحظه‌ی ثبتِ درخواست، قبل از این‌که چیزی فیزیکاً دیده شود.
- **مشکلِ مشاهده‌شده توسط انباردار** (`SalesReturnIssueTypeEnum?`) — در لحظه‌ی بازرسیِ فیزیکی، مستقل از دلیلِ مشتری.

برای این‌که این دو محور واقعاً مستقل ثبت شوند (نه این‌که دومی جای اولی را بگیرد)، مدل یک لایه‌ی میانی اضافه دارد:

```
Sale (فروش)
 └─ SaleItem × چند تا (هر قلم سفارش، حالا با ShippedQuantity و SettledQuantity)

SaleReturn (مرجوعی، مرتبط با یک Sale)
 └─ SaleReturnClaim × چند تا («ادعا»: یک SaleItem + یک دلیلِ مشتری + مقدارِ ادعاشده)
     └─ SaleReturnItem × چند تا («نتیجه‌ی بازرسی»: یک نوعِ مشکلِ مشاهده‌شده‌ی خاص یا null=سالم + مقدارِ بازرسی‌شده)
         └─ SaleReturnDecision × چند تا (هر «تصمیم» روی بخشی از آن نتیجه‌ی بازرسی)
```

`SaleReturnClaim` دقیقاً همان نقشی را بازی می‌کند که `PurchaseItem` برای `ReceivePurchaseCommand` بازی می‌کند: یک «بودجه» که بازرسی در برابرش اعتبارسنجی می‌شود. `SaleReturnItem` دقیقاً همان نقشِ `PurchaseReturnItem` را دارد: یک ردیف به‌ازای هر نوع مشکلِ مشاهده‌شده (با تجمیعِ خودکار اگر همان نوع دوباره در دورِ بعدیِ بازرسی گزارش شود)، به‌همراهِ تصمیم‌هایش.

### 3.2. Enum های تازه (`Domain/Enums`)

```csharp
public enum SalesReturnReasonEnum
{
    DEFECTIVE, WRONG_ITEM, DAMAGED_IN_TRANSIT, CHANGED_MIND, QUALITY_ISSUE, EXCESS_ORDER, OTHER,
}

public enum SalesReturnIssueTypeEnum   // روی SaleReturnItem به‌صورت nullable استفاده می‌شود
{
    DEFECTIVE, WRONG_ITEM, DAMAGED_IN_TRANSIT, QUALITY_ISSUE, OTHER,
}

public enum SaleReturnStatusEnum
{
    PENDING_INSPECTION, COORDINATING, RESOLVED, REJECTED, CANCELLED,
}

public enum SaleReturnDecisionStatusEnum { AWAITING, RESOLVED }

public enum SaleReturnDecisionTypeEnum
{
    REFUND, REPLACEMENT, STORE_CREDIT, NO_COMPENSATION,
}
```

`SalesStatusEnum` یک مقدارِ تازه گرفت: `SHIPPED`. **عمداً در انتهای enum append شد**، نه بینِ `PARTIALLY_DELIVERED` و `DELIVERED` (جایی که از نظرِ معنایی منطقی‌تر بود) — چون این enum بدونِ `HasConversion` به int سریالایز می‌شود و درج در وسط، مقادیرِ عددیِ `DELIVERED`/`RETURNED`/`CANCELLED` را جابه‌جا می‌کرد و هر داده‌ی از‌قبل‌ذخیره‌شده را خراب می‌کرد.

### 3.3. Entity های تازه (`Domain/Entities`)

`SaleItem` دو فیلدِ جدید گرفت، دقیقاً مشابهِ `PurchaseItem`:

```csharp
public int ShippedQuantity { get; set; }   // معادلِ ReceivedQuantity، جهتِ خروجی
public int SettledQuantity { get; set; }   // معادلِ دقیقِ SettledQuantity در PurchaseItem
```

```csharp
public class SaleReturn
{
    public int Id { get; set; }
    public string ReturnNumber { get; set; }     // مثل SRET-2026-0003
    public int SaleId { get; set; }
    public DateTime RequestDate { get; set; }
    public SaleReturnStatusEnum Status { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Sale? Sale { get; set; }
    public List<SaleReturnClaim> Claims { get; set; } = new();
}

public class SaleReturnClaim
{
    public int Id { get; set; }
    public int SaleReturnId { get; set; }
    public int SaleItemId { get; set; }
    public int ProductId { get; set; }
    public UInt64 UnitPrice { get; set; }        // snapshot از قیمتِ لحظه‌ی ادعا
    public SalesReturnReasonEnum Reason { get; set; }
    public int ClaimedQuantity { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<SaleReturnItem> InspectionItems { get; set; } = new();
}

public class SaleReturnItem
{
    public int Id { get; set; }
    public int SaleReturnClaimId { get; set; }
    public SalesReturnIssueTypeEnum? IssueType { get; set; }   // null = بازرسی‌شده و سالم
    public int Quantity { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<SaleReturnDecision> Decisions { get; set; } = new();
}

public class SaleReturnDecision
{
    public int Id { get; set; }
    public int SaleReturnItemId { get; set; }
    public SaleReturnDecisionTypeEnum DecisionType { get; set; }
    public int Quantity { get; set; }
    public UInt64? RefundAmount { get; set; }
    public SaleReturnDecisionStatusEnum Status { get; set; }
    public int ReplacementShippedQuantity { get; set; }   // فقط برای REPLACEMENT، تجمیعی
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
```

### 3.4. روابط در `WMSDbContext`

- `SaleReturn → Sale`: `Restrict` (مثلِ `PurchaseReturn → Purchase`).
- `SaleReturnClaim → SaleReturn`: `Cascade`.
- `SaleReturnClaim → SaleItem` و `→ Product`: `Restrict`.
- `SaleReturnItem → SaleReturnClaim`: `Cascade`.
- `SaleReturnDecision → SaleReturnItem`: `Cascade`.

همین زنجیره‌ی Cascade باعث می‌شود `DeleteSaleReturnCommand` بتواند فقط با حذفِ خودِ `SaleReturn`، کل زیردرخت (`Claims`، `InspectionItems`، `Decisions`) را پاک کند.

---

## 4. سرویس محاسباتی مرکزی — `ISaleReturnCalculationService`

- اینترفیس: `Application/Common/Contracts/SaleReturn/ISaleReturnCalculationService.cs`
- پیاده‌سازی: `Infrastructure/Services/SaleReturnCalculationService.cs`
- ثبت در DI: `Scoped`، دقیقاً مثلِ `IPurchaseReturnCalculationService`.

### 4.1. `IsTerminal(status)`

فقط `REJECTED` و `CANCELLED` نهایی‌اند — یکسان با `PurchaseReturn`.

### 4.2. `IsValidDecision(issueType, decisionType)`

```csharp
public bool IsValidDecision(SalesReturnIssueTypeEnum? issueType, SaleReturnDecisionTypeEnum decisionType)
{
    if (issueType == null)
        return decisionType != SaleReturnDecisionTypeEnum.REPLACEMENT;
    return true;
}
```

ماتریسِ خریدی هفت‌حالته نبود، چون در فروش فقط **یک** ترکیب منطقاً بی‌معناست: `REPLACEMENT` برای مقدارِ بازرسی‌شده‌ی سالم (`IssueType == null`) — چیزی برای جایگزین کردن وجود ندارد چون کالا سالم است. هر ترکیبِ دیگر (شاملِ هر چهار تصمیم برای هرکدام از پنج نوعِ مشکلِ واقعی) مجاز است.

### 4.3. `RecomputeReturnStatus(saleReturn)` — تفاوتِ کلیدی با خرید

```csharp
public SaleReturnStatusEnum RecomputeReturnStatus(Domain.Entities.SaleReturn saleReturn)
{
    var totalClaimed = saleReturn.Claims.Sum(c => c.ClaimedQuantity);
    var totalInspected = saleReturn.Claims.SelectMany(c => c.InspectionItems).Sum(i => i.Quantity);

    if (totalInspected < totalClaimed)
        return SaleReturnStatusEnum.PENDING_INSPECTION;

    var allDecisions = saleReturn.Claims.SelectMany(c => c.InspectionItems).SelectMany(i => i.Decisions).ToList();
    var allocatedQty = allDecisions.Sum(d => d.Quantity);
    var allFinal = allDecisions.Count > 0 && allDecisions.All(d => d.Status == SaleReturnDecisionStatusEnum.RESOLVED);

    if (allocatedQty >= totalInspected && allFinal)
        return SaleReturnStatusEnum.RESOLVED;

    return SaleReturnStatusEnum.COORDINATING;
}
```

**این عمداً با `PurchaseReturn`'s `RecomputeReturnStatus` فرق دارد.** در خرید، گذارِ `PENDING → COORDINATING` با **اولین تصمیم** اتفاق می‌افتد. در فروش، طبقِ نمودارِ `return-scenarios-guide.fa.md` بخش ۲.۵، گذارِ `PENDING_INSPECTION → COORDINATING` نیازمندِ **بازرسیِ کاملِ همه‌ی اقلام** است، نه فقط اولین تصمیم — چون فروش یک فازِ بازرسیِ فیزیکی دارد که خرید ندارد (مرجوعیِ خرید همیشه *بعد* از دریافتِ فیزیکی ساخته می‌شود، پس این فاز از قبل تمام شده؛ مرجوعیِ فروش *قبل* از بازرسی ساخته می‌شود).

### 4.4. `GetOpenClaimQuantity` / `GetClaimableQuantity` — جمع روی چند مرجوعیِ فعال

```csharp
public int GetOpenClaimQuantity(int saleItemId, List<Domain.Entities.SaleReturn> activeReturns)
{
    if (activeReturns == null || activeReturns.Count == 0) return 0;
    return activeReturns
        .SelectMany(r => r.Claims)
        .Where(c => c.SaleItemId == saleItemId)
        .Sum(c => c.ClaimedQuantity - c.InspectionItems.Sum(i => i.Decisions.Sum(d => d.Quantity)));
}

public int GetClaimableQuantity(Domain.Entities.SaleItem item, List<Domain.Entities.SaleReturn> activeReturns)
{
    var budget = item.ShippedQuantity - item.SettledQuantity;
    var openClaim = GetOpenClaimQuantity(item.Id, activeReturns);
    return Math.Max(0, budget - openClaim);
}
```

مقدارِ یک ادعا «باز» می‌ماند (هنوز جزوِ بودجه‌ی مصرف‌شده حساب می‌شود) تا وقتی یک تصمیمِ واقعی رویش ثبت شود — چه هنوز بازرسی نشده باشد، چه بازرسی شده ولی تصمیمی نگرفته باشند؛ فرمول `ClaimedQuantity − Decisions.Sum(Quantity)` هردو حالت را با هم پوشش می‌دهد، پس نیازی به شاخه‌بندیِ جداگانه برایِ «بازرسی‌نشده» در برابرِ «بازرسی‌شده-ولی-تصمیم‌نگرفته» نیست.

**تفاوتِ ساختاری با خرید:** `GetReceivableQuantity` در خرید یک `PurchaseReturn?` تکی می‌گیرد چون در هر لحظه حداکثر یک مرجوعیِ فعال برایِ هر خرید مجاز است. این‌جا هر دو تابع یک `List<SaleReturn>` می‌گیرند چون چند مرجوعیِ فعال هم‌زمان روی یک فروش کاملاً ممکن است (`return-scenarios-guide.fa.md` بخش ۲.۷ سناریوی ۸) — بدونِ این جمع‌زنی، دو ادعایِ هم‌زمان روی همان قلم می‌توانستند مجموعاً از موجودیِ واقعیِ ارسال‌شده بیشتر ادعا کنند.

### 4.5. `SaleReturnClaim.UninspectedQuantity` (روی خودِ موجودیت)

```csharp
[NotMapped]
public int UninspectedQuantity => ClaimedQuantity - InspectedQuantity;
```

بودجه‌ای که `ConfirmReturnInspectionCommand` هر بار در برابرش اعتبارسنجی می‌کند. این یکی — برخلافِ بقیه‌ی توابعِ این بخش — در سرویس نیست بلکه روی خودِ موجودیت نشسته، چون صرفاً یک جمعِ ساده روی گرافِ بارگذاری‌شده است و کوئری‌های جزئیات/بازرسی هم دقیقاً همان عدد را لازم دارند. هم‌خانواده‌هایش:

| موجودیت | خواص |
|---|---|
| `SaleReturn` | `ClaimedQuantity`, `InspectedQuantity`, `DecidedQuantity` |
| `SaleReturnClaim` | `InspectedQuantity`, `UninspectedQuantity`, `DecidedQuantity` |
| `SaleReturnItem` | `DecidedQuantity`, `UndecidedQuantity` |
| `SaleReturnDecision` | `UnshippedReplacementQuantity` |

هر چهار دسته `[NotMapped]`‌اند و **به SQL ترجمه نمی‌شوند**: فقط روی موجودیتِ materialize‌شده کار می‌کنند. در `GetSaleReturnListQuery` که projection سمتِ سرور دارد نباید استفاده شوند (همان‌جا جمع‌زنی باید به‌شکلِ خام و ترجمه‌پذیر بماند).

### 4.6. `RecomputeSaleStatus(sale)` — چرا فقط یک‌طرفه است

```csharp
public SalesStatusEnum RecomputeSaleStatus(Domain.Entities.Sale sale)
{
    if (sale.Status == SalesStatusEnum.CANCELLED) return SalesStatusEnum.CANCELLED;

    var fullyReturned = sale.Items.Count > 0 &&
        sale.Items.All(i => i.ShippedQuantity > 0 && i.SettledQuantity >= i.ShippedQuantity);

    if (fullyReturned) return SalesStatusEnum.RETURNED;

    return sale.Status;
}
```

فرانت‌اند هیچ‌جا `Sale.Status` را بر اساسِ مرجوعی تغییر نمی‌داد (`return-scenarios-guide.fa.md` بخش ۲.۸.۱). این‌جا آگاهانه یک قدم فراتر رفته شد: **فقط برایِ یک گذارِ خاص** — وقتی *همه‌ی* واحدهایی که تا الان ارسال شده‌اند، حالا از طریقِ تصمیمِ مرجوعی تسویه شده‌اند، `Sale.Status` به `RETURNED` می‌رود (مقدارِ enum که قبلاً کاملاً مرده بود، حالا زنده است). در هر حالتِ دیگر (مثلاً یک مرجوعیِ فعال هست ولی هنوز چیزی نهایی نشده)، `Sale.Status` دست‌نخورده می‌ماند — همان چیزی که ارسال/تحویلِ دستی رویش گذاشته بود. این تفاوت با `RecomputePurchaseStatus` (که یک طیفِ کاملِ وضعیت‌ها را بازمحاسبه می‌کند، نه فقط یک گذارِ نهایی) عمدی است: چون فروش هیچ معادلِ `PARTIALLY_RECEIVED`ایِ مرجوعی‌محور در enum فعلی‌اش ندارد، تلاش برایِ بازمحاسبه‌ی کاملِ طیف نیازمندِ افزودنِ enum جدید بود که خارج از دامنه‌ی این کار تشخیص داده شد.

---

## 5. فرمان ثبت ادعا — `CreateSaleReturnCommand`

**Endpoint:** `POST api/SaleReturn/CreateSaleReturn`

- هر فراخوانی **همیشه یک `SaleReturn` تازه می‌سازد** — برخلافِ `ReceivePurchaseCommand` که مرجوعیِ فعالِ موجود را بازاستفاده می‌کند. چون چند مرجوعیِ فعال روی یک فروش مجاز است، نیازی به منطقِ «بازاستفاده» نیست؛ هر درخواست، پرونده‌ی خودش را دارد.
- ورودی چند خطِ `Claims` می‌گیرد (`{SaleItemId, Reason, ClaimedQuantity, Note?}`)؛ اعتبارسنجی از تکراریِ `(SaleItemId, Reason)` در یک درخواست جلوگیری می‌کند (مشابهِ اعتبارسنجیِ عدم‌تکرارِ `PurchaseItemId` در `ReceivePurchaseCommand`).
- فقط فروش‌هایی که `Status` شان `SHIPPED`، `PARTIALLY_DELIVERED` یا `DELIVERED` است قابل ادعا هستند.
- بودجه (`GetClaimableQuantity`) برایِ هر `SaleItemId` **یک‌بار، با مجموعِ همه‌ی خطوطِ همان قلم در همین درخواست** بررسی می‌شود (نه جداگانه برایِ هر دلیل) — تا اگر مشتری در یک درخواست دو دلیلِ مختلف برایِ همان قلم ادعا کند، مجموعشان از بودجه بیشتر نشود.
- مرجوعی با `Status = PENDING_INSPECTION` ساخته می‌شود؛ چیزی بازمحاسبه نمی‌شود چون هنوز هیچ بازرسی/تصمیمی رخ نداده.

---

## 6. فرمان بازرسی فیزیکی — `ConfirmReturnInspectionCommand`

**Endpoint:** `POST api/SaleReturn/ConfirmReturnInspection`

معادلِ `ReceivePurchaseCommand` برایِ سمتِ انبار، ولی روی یک `SaleReturn` مشخص عمل می‌کند (نه یک فروش، چون بازرسی مالِ یک پرونده‌ی مرجوعیِ خاص است). چندمرحله‌ای است: هر `SaleReturnClaimId` می‌تواند در دفعاتِ مختلف بخش‌بخش بازرسی شود.

ورودی برایِ هر ادعا، یک لیستِ `Results` می‌گیرد (`{IssueType?, Quantity, Note?}`) — `IssueType = null` یعنی «این مقدار سالم بود». نتایج بر اساسِ `IssueType` گروه‌بندی می‌شوند (مشابهِ گروه‌بندیِ `Issues` بر اساسِ `Type` در `ReceivePurchaseCommand`) و در `SaleReturnItem` موجود ادغام یا جدید ساخته می‌شوند.

**تنها نکته‌ی رفتاریِ متفاوت از خرید:** به‌محضِ ثبتِ یک نتیجه‌ی «سالم» (`IssueType == null`)، همان لحظه `Product.Stock` افزایش می‌یابد — نه در لحظه‌ی تصمیم. این دقیقاً همان قانونِ `ReceivePurchaseCommand` است (فقط `ReceivedQuantity` سالم موجودی را زیاد می‌کند، نه هر مقداری که بعداً واردِ سیستم می‌شود)، فقط این‌جا «سالم» با `IssueType == null` مشخص می‌شود به‌جایِ یک فیلدِ جداگانه.

بعد از اعمالِ نتایج، `SaleReturn.Status` با `RecomputeReturnStatus` بازمحاسبه می‌شود. `Sale.Status` عمداً بازمحاسبه **نمی‌شود** — بخشِ ۹ را ببینید.

---

## 7. فرمان‌های تصمیم — Add/RemoveSaleReturnDecisionCommand

**Endpoints:** `POST api/SaleReturn/AddSaleReturnDecision`, `DELETE api/SaleReturn/RemoveSaleReturnDecision`

تقریباً بیت‌به‌بیت معادلِ `AddPurchaseReturnDecisionCommand`/`RemovePurchaseReturnDecisionCommand` هستند، با این جایگزینی‌ها:

| خرید | فروش |
|---|---|
| `PurchaseReturnItemId` | `SaleReturnItemId` |
| `PurchaseReturnDecisionTypeEnum` | `SaleReturnDecisionTypeEnum` |
| `purchaseReturnItem.UnitPrice` (روی خودِ Item) | `claim.UnitPrice` (یک لایه بالاتر، روی `SaleReturnClaim`، چون `SaleReturnItem` قیمت ندارد) |
| `PurchaseItem.SettledQuantity += Quantity` | `SaleItem.SettledQuantity += Quantity` (پیدا شده از طریقِ `claim.SaleItemId`) |
| `IsValidDecision(issueType, decisionType)` | همان امضا، فقط `issueType` این‌جا `Nullable` است |

منطق یکسان است: `REPLACEMENT` → `AWAITING`؛ هر تصمیمِ دیگر → بلافاصله `RESOLVED` و `SettledQuantity` را زیاد می‌کند. حذف فقط برایِ تصمیم‌هایِ `AWAITING` مجاز است (همان استدلالِ بخشِ ۶.۳ در راهنمایِ خرید: فقط `REPLACEMENT`های معلق هنوز اثرِ مالیِ قطعی نگذاشته‌اند).

هر دو فرمان بعد از اعمالِ تغییر، هم `SaleReturn.Status` و هم `Sale.Status` را بازمحاسبه می‌کنند.

---

## 8. فرمان ارسال جایگزین — `ConfirmReplacementShipmentCommand`

**Endpoint:** `POST api/SaleReturn/ConfirmReplacementShipment`

**این تنها بخشی از فیچرِ فروش است که مکانیزمش با معادلِ خریدی‌اش (`ResolveAwaitingReplacements`) کاملاً فرق دارد** — و فرق ساده‌تر است، نه پیچیده‌تر:

- در خرید، سیستم مجبور است **حدس بزند** آیا یک محموله‌ی تازه‌رسیده همان جایگزینِ وعده‌داده‌شده است یا ادامه‌ی طبیعیِ سفارش (چون هیچ فیلدی این دو را به‌طورِ صریح از هم جدا نمی‌کند) — یک الگوریتمِ FIFO حدسی، توضیح‌داده‌شده در `purchase-return-guide.fa.md` بخشِ ۳.۷.
- در فروش، **جهتِ حرکت برعکس است**: این خودِ انبار است که کالای جایگزین را ارسال می‌کند، پس هیچ ابهامی وجود ندارد — کاربر مستقیماً `SaleReturnDecisionId` مشخص را هدف می‌گیرد. نیازی به حدس نیست.

ورودی: `{SaleReturnDecisionId, ShippedQuantity, Note?}`. اعتبارسنجی‌ها: تصمیم باید `REPLACEMENT` و `AWAITING` باشد؛ `ShippedQuantity` نباید از `Quantity - ReplacementShippedQuantity` بیشتر باشد؛ موجودیِ محصول باید کافی باشد. چندمرحله‌ای است (`ReplacementShippedQuantity` تجمیعی)؛ وقتی مجموعِ ارسال‌شده به `Quantity` برسد، تصمیم `RESOLVED` می‌شود. `Product.Stock` به‌اندازه‌ی مقدارِ ارسالی کم می‌شود (مطابقِ سناریوی ۲.۷.۶ در `return-scenarios-guide.fa.md`: «استوک به‌اندازه‌یِ همان ۲ تا کم می‌شود»).

---

## 9. فرمان‌های چرخه‌ی عمر مرجوعی: لغو، رد، بازگشایی، حذف

**Endpoints:** `POST api/SaleReturn/{Cancel,Reject,Reopen}SaleReturn`, `DELETE api/SaleReturn/DeleteSaleReturn`

شکلِ کد تقریباً یکسان با معادلِ خریدی است، ولی **شرطِ مجازبودن سخت‌گیرانه‌تر است**:

- در خرید: `Cancel`/`Reject`/`Delete` فقط از `PENDING` مجازند (یعنی «قبل از اولین تصمیم»).
- در فروش: `Cancel`/`Reject`/`Delete` فقط وقتی مجازند که `Status == PENDING_INSPECTION` **و** هیچ مقداری از هیچ ادعایی هنوز بازرسی نشده باشد (`inspectedQuantity == 0`). صرفِ چک‌کردنِ `Status == PENDING_INSPECTION` کافی نیست، چون این وضعیت می‌تواند حتی بعد از بازرسیِ *جزئی* هم برقرار بماند (تا وقتی همه‌ی مقدار بازرسی نشده) — طبقِ `return-scenarios-guide.fa.md` بخش ۲.۵: «Reject/Cancel فقط تا پیش از هرگونه بازرسیِ فیزیکی مجازند، نه فقط قبل از تصمیم».

`Reopen` فقط از `REJECTED` مجاز است (نه `CANCELLED`)، دقیقاً همان استدلالِ خرید: رد یعنی طرفِ مقابل (این‌جا: واحدِ فروش، پیش از بازرسی) نپذیرفته و ممکن است بعداً دوباره باز شود؛ لغو یعنی تصمیمِ داخلیِ قطعی. چون یک مرجوعیِ `REJECTED` هرگز بازرسی نداشته (طبقِ همان قانون)، `RecomputeReturnStatus` بعد از بازگشایی همیشه `PENDING_INSPECTION` برمی‌گرداند.

`Delete` واقعاً حذف می‌کند (hard delete)، چون `SaleReturn` هم مثلِ `PurchaseReturn` فاقدِ `IsActive` است؛ زیردرخت با Cascade پاک می‌شود.

**`Sale.Status` کجا بازمحاسبه می‌شود:** فقط در `AddSaleReturnDecisionCommand`. تنها ورودی‌ای که `RecomputeSaleStatus` می‌خواند `SaleItem.SettledQuantity` است و فقط ثبتِ یک تصمیمِ نهایی آن را جابه‌جا می‌کند؛ لغو/رد/حذف/بازگشایی (که همگی پیش از هر بازرسی رخ می‌دهند)، ثبتِ بازرسی، ارسالِ کالای جایگزین و حذفِ تصمیمِ `AWAITING` هیچ‌کدام مقدارِ تسویه‌شده را تغییر نمی‌دهند، پس فراخوانیِ `RecomputeSaleStatus` در آن‌ها همیشه همان وضعیتِ قبلی را برمی‌گرداند و صرفاً یک `Include` اضافه‌ی `Sale → Items` تحمیل می‌کرد. اگر روزی حذفِ تصمیم‌های نهایی مجاز شد، هم برگرداندنِ `SettledQuantity` و هم این فراخوانی باید به `RemoveSaleReturnDecisionCommand` برگردند (کامنتِ همان‌جا این را یادآوری می‌کند).

---

## 10. کوئری‌ها (خواندن داده)

| Endpoint | توضیح |
|---|---|
| `GET api/SaleReturn/GetSaleReturnList` | لیستِ مرجوعی‌ها با فیلتر (`Search`, `CustomerId`, `Status`, `Reason`, `FromDate/ToDate`) و صفحه‌بندی؛ هر ردیف `DominantReason` (دلیلِ غالب، بر اساسِ بیشترین `ClaimedQuantity`) دارد، معادلِ `DominantIssueType` در خرید. |
| `GET api/SaleReturn/GetSaleReturnDetail` | جزئیاتِ کاملِ یک مرجوعی، شاملِ سه سطحِ `Claims → InspectionItems → Decisions`؛ `CanCancel`/`CanReject`/`CanDelete` (فقط `PENDING_INSPECTION && inspectedQuantity==0`)، `CanReopen` (فقط `REJECTED`)، `FinalizedRefundAmount` — همه از سرور محاسبه می‌شوند، مطابقِ الگویِ `GetPurchaseReturnDetailQuery`. |
| `GET api/SaleReturn/GetSaleReturnInspectionInfo` | معادلِ سمتِ فروشِ `GetPurchaseReceivingInfoQuery`: برایِ یک `SaleId`، هر ادعایِ هنوز (کامل یا جزئی) بازرسی‌نشده در تمامِ مرجوعی‌های فعالش، به‌همراهِ نتایجِ بازرسیِ قبلی — صفحه‌ی «بازرسیِ انبار» را تغذیه می‌کند. |
| `GET api/SaleReturn/GetReplacementShippingQueue` | صفِ خروجیِ انبار: هر تصمیمِ `REPLACEMENT` با `Status == AWAITING`، در کلِ سیستم یا فیلترشده با `SaleId` اختیاری — چیزی که در خرید اصلاً معادل ندارد چون آن‌جا جایگزینی با حدس‌زدن حل می‌شود، نه با یک صفِ صریح. |

---

## 11. تصمیم‌های طراحی که عمداً گرفته شدند

این‌ها پاسخِ صریح به سوالاتِ بازِ بخشِ ۲.۸ در `return-scenarios-guide.fa.md` هستند:

1. **آیا `Sale.Status` بعدِ هر اقدامِ مرجوعی بازمحاسبه شود؟** بله، ولی فقط یک‌طرفه — فقط برایِ رسیدن به `RETURNED`. جزئیات و استدلال در بخشِ ۴.۶ همینِ سند.
2. **آیا اعتبارسنجیِ سازگاریِ نوعِ مشکل با نوعِ تصمیم اضافه شود؟** بله، `ISaleReturnCalculationService.IsValidDecision` — روی نوعِ **مشکلِ بازرسی‌شده** (نه دلیلِ اولیه‌ی مشتری)، دقیقاً همان‌طور که سند پیشنهاد داده بود. تنها ترکیبِ ممنوع: `REPLACEMENT` برایِ `IssueType == null`.
3. **آیا `RefundAmount` سقف داشته باشد؟** نه — همان رفتارِ خرید حفظ شد؛ مقدارِ دستی بدونِ محدودیتِ فنی پذیرفته می‌شود (یک انتخابِ تخفیفی/توافقی، نه یک محدودیتِ سیستمی).
4. **آیا `SaleItem.ShippedQuantity` اضافه شود؟** بله، به‌همراهِ کلِ فیچرِ `ShipSaleCommand` (بخش ۲) — طبقِ خودِ سند، این پیش‌نیازِ اجباریِ کلِ فیچر بود.
5. **آیا `STORE_CREDIT` یک Ledger واقعی بسازد؟** نه — فقط برچسب، دقیقاً مثلِ `CREDIT` در خرید. ساختِ Ledger واقعی خارج از حوزه‌ی این تغییر است.

---

## 12. جدول کامل Endpoint ها

| متد HTTP | مسیر | فرمان/کوئری | توضیح |
|---|---|---|---|
| `POST` | `api/Sale/ShipSale` | `ShipSaleCommand` | ثبتِ یک دورِ ارسالِ کالا برایِ مشتری |
| `POST` | `api/SaleReturn/CreateSaleReturn` | `CreateSaleReturnCommand` | ثبتِ درخواستِ مرجوعیِ مشتری (ادعا) |
| `POST` | `api/SaleReturn/ConfirmReturnInspection` | `ConfirmReturnInspectionCommand` | ثبتِ نتیجه‌ی بازرسیِ فیزیکیِ کالایِ برگشتی |
| `GET` | `api/SaleReturn/GetSaleReturnList` | `GetSaleReturnListQuery` | لیستِ مرجوعی‌ها با فیلتر و صفحه‌بندی |
| `GET` | `api/SaleReturn/GetSaleReturnDetail` | `GetSaleReturnDetailQuery` | جزئیاتِ کاملِ یک مرجوعی |
| `GET` | `api/SaleReturn/GetSaleReturnInspectionInfo` | `GetSaleReturnInspectionInfoQuery` | اطلاعاتِ لازم برایِ صفحه‌ی بازرسیِ انبار |
| `GET` | `api/SaleReturn/GetReplacementShippingQueue` | `GetReplacementShippingQueueQuery` | صفِ ارسالِ کالای جایگزین |
| `POST` | `api/SaleReturn/AddSaleReturnDecision` | `AddSaleReturnDecisionCommand` | ثبتِ یک تصمیم برایِ بخشی از یک نتیجه‌ی بازرسی |
| `DELETE` | `api/SaleReturn/RemoveSaleReturnDecision` | `RemoveSaleReturnDecisionCommand` | حذفِ یک تصمیمِ هنوز `AWAITING` |
| `POST` | `api/SaleReturn/ConfirmReplacementShipment` | `ConfirmReplacementShipmentCommand` | ثبتِ ارسالِ کالای جایگزین برایِ یک تصمیم |
| `POST` | `api/SaleReturn/CancelSaleReturn` | `CancelSaleReturnCommand` | لغوِ یک مرجوعیِ هنوز بازرسی‌نشده |
| `POST` | `api/SaleReturn/RejectSaleReturn` | `RejectSaleReturnCommand` | ردِ یک مرجوعیِ هنوز بازرسی‌نشده |
| `POST` | `api/SaleReturn/ReopenSaleReturn` | `ReopenSaleReturnCommand` | بازگشاییِ یک مرجوعیِ `REJECTED` |
| `DELETE` | `api/SaleReturn/DeleteSaleReturn` | `DeleteSaleReturnCommand` | حذفِ کاملِ یک مرجوعیِ هنوز بازرسی‌نشده |

---

## 13. کارهای باقی‌مانده / محدودیت‌های شناخته‌شده

- **Migration اجرا شده.** `20260809214004_sale-return-and-shipping` روی دیتابیسِ محلیِ `WMS` اعمال شده است (بررسی‌شده در ۲۰۲۶-۰۸-۱۱ از رویِ `__EFMigrationsHistory`).
- **داده‌ی نمونه موجود است.** `scripts/seed-mock-data.sql` داده‌های mock فرانت‌اند را (محصولات، مشتریان، تامین‌کنندگان، خریدها، فروش‌ها و یک مجموعه‌ی سازگار از هر دو نوع مرجوعی) در یک دیتابیسِ migrate‌شده بارگذاری می‌کند. اگر جدول‌ها خالی نباشند اجرا نمی‌شود مگر `@ResetExisting = 1` ست شود. صحتِ آن روی یک دیتابیسِ یک‌بارمصرف به‌طورِ کامل آزمایش شده است.
- **تست نشده روی API درحالِ اجرا.** منطق از نظرِ منطقی بازبینی شده و پروژه بدونِ خطا build می‌شود (`dotnet build WMS.slnx`)، اما هنوز از طریقِ اجرای واقعیِ API تست نشده — دقیقاً همان وضعیتِ `PurchaseReturn` در زمانِ نگارشِ راهنمایِ آن.
- **فرانت‌اند برایِ این فیچر حتی `api-v1.js` هم ندارد** (طبقِ `return-scenarios-guide.fa.md` بخش ۴.۳ ردیف ۱۴) — یعنی هیچ فرضِ از‌پیش‌نوشته‌شده‌ای درباره‌یِ شکلِ API واقعی وجود نداشت که این پیاده‌سازی باید با آن هماهنگ می‌شد؛ هر کس بخواهد فرانت را از mock جدا کند، باید یک لایه‌یِ adapter کاملاً از نو بنویسد.
- **بدونِ ledger واقعی برایِ `STORE_CREDIT`/`CREDIT`.** اگر در آینده لازم شد این‌ها واقعاً به یک اعتبارِ قابلِ‌استفاده تبدیل شوند، نیازمندِ یک Entity/فیچرِ جداگانه است.
- **بدونِ ledger حرکتِ موجودی.** `Product.Stock` مستقیماً توسطِ `ShipSaleCommand`، `ConfirmReturnInspectionCommand` و `ConfirmReplacementShipmentCommand` تغییر می‌کند — همان محدودیتِ شناخته‌شده در سمتِ خرید.
