# راهنمای کامل ماژول «دریافت خرید و مرجوعی به تامین‌کننده»

این سند توضیح می‌دهد که در فیچر `PurchaseReturn` دقیقاً چه کدی نوشته شده، هر بخش چرا این‌طور طراحی شده، و هر تابع/هندلر روی چه سناریوهایی و با چه منطقی کار می‌کند. هدف این است که یک نفر بدون نیاز به خواندن کد بتواند دقیقاً بفهمد سیستم در هر حالت ممکن چه رفتاری دارد.

> این سند مربوط به وضعیت فعلی کد (بعد از تبدیل `PurchaseReturnCalculations` به یک سرویس تزریق‌پذیر به نام `IPurchaseReturnCalculationService`) است.

---

## فهرست مطالب

1. [چرا این بازنویسی انجام شد](#1-چرا-این-بازنویسی-انجام-شد)
2. [مدل داده (Entities و Enums)](#2-مدل-داده-entities-و-enums)
3. [سرویس محاسباتی مرکزی — `IPurchaseReturnCalculationService`](#3-سرویس-محاسباتی-مرکزی--ipurchasereturncalculationservice)
4. [فرمان دریافت خرید — `ReceivePurchaseCommand`](#4-فرمان-دریافت-خرید--receivepurchasecommand)
5. [فرمان ثبت تصمیم — `AddPurchaseReturnDecisionCommand`](#5-فرمان-ثبت-تصمیم--addpurchasereturndecisioncommand)
6. [فرمان حذف تصمیم — `RemovePurchaseReturnDecisionCommand`](#6-فرمان-حذف-تصمیم--removepurchasereturndecisioncommand)
7. [فرمان‌های چرخه‌ی عمر مرجوعی: لغو، رد، بازگشایی، حذف](#7-فرمانهای-چرخهی-عمر-مرجوعی-لغو-رد-بازگشایی-حذف)
8. [کوئری‌ها (خواندن داده)](#8-کوئریها-خواندن-داده)
9. [Repository و DbContext](#9-repository-و-dbcontext)
10. [Migration دیتابیس](#10-migration-دیتابیس)
11. [ثبت سرویس در DI](#11-ثبت-سرویس-در-di)
12. [یک نکته‌ی فنی خاص .NET که چند بار در این فیچر گیر انداخت](#12-یک-نکتهی-فنی-خاص-net-که-چند-بار-در-این-فیچر-گیر-انداخت)
13. [جدول کامل Endpoint ها](#13-جدول-کامل-endpoint-ها)
14. [جمع‌بندی سناریوها (چک‌لیست کامل)](#14-جمعبندی-سناریوها-چکلیست-کامل)
15. [کارهای باقی‌مانده / محدودیت‌های شناخته‌شده](#15-کارهای-باقیمانده--محدودیتهای-شناختهشده)

---

## 1. چرا این بازنویسی انجام شد

قبل از این تغییرات، در برنچ یک نسخه‌ی «ساده‌شده» از فیچر مرجوعی خرید وجود داشت که:

- فقط دو وضعیت داشت: `OPEN` و `RESOLVED`.
- فرض می‌کرد هر خرید فقط در **یک مرحله** به‌طور کامل دریافت می‌شود (یعنی دریافت چندمرحله‌ای/جزئی پشتیبانی نمی‌شد).
- هیچ اکشن صریحی برای «رد کردن»، «لغو کردن» یا «بازگشایی» مرجوعی نداشت.

وقتی کد فرانت‌اند واقعی پروژه (`Frontend/src/features/purchases/services/returns/`) بررسی شد، مشخص شد که فرانت از قبل با یک مدل خیلی کامل‌تر پیاده‌سازی شده بود — شامل ۵ وضعیت مختلف، دریافت چندمرحله‌ای، و اکشن‌های رد/لغو/بازگشایی/حذف. علاوه بر این در تاریخچه‌ی گیت یک تلاش قبلی‌تر هم پیدا شد که دقیقاً همین مدل کامل‌تر را می‌خواسته پیاده کند ولی به یک کلاس کمکی ناقص (`PurchaseReturnStatusUpdater`) وابسته بود که هیچ‌وقت نوشته نشده بود — یعنی آن نسخه اصلاً کامپایل نمی‌شده است.

**تصمیم نهایی:** مدل کامل (همان چیزی که فرانت‌اند از قبل انتظارش را دارد) از نو و این‌بار به‌طور کامل و درست پیاده‌سازی شد. همه‌ی منطق‌ها زیر تست کامپایل قرار گرفتند و پروژه با موفقیت build می‌شود.

---

## 2. مدل داده (Entities و Enums)

### 2.1. Enum ها

#### `PurchaseStatusEnum` (وضعیت کلی یک خرید)

```csharp
public enum PurchaseStatusEnum
{
    PENDING,
    SHIPPED,
    PARTIALLY_RECEIVED,   // ← تازه اضافه شده
    RECEIVED,
    RETURNED,
    CANCELLED,
}
```

مقدار `PARTIALLY_RECEIVED` تازه اضافه شده تا بشود گفت «بخشی از این خرید رسیده ولی هنوز کامل نشده» — چیزی که در مدل قبلی اصلاً وجود نداشت چون دریافت فقط یک‌مرحله‌ای بود.

#### `PurchaseReturnStatusEnum` (وضعیت کلی یک مرجوعی)

```csharp
public enum PurchaseReturnStatusEnum
{
    PENDING,        // هنوز هیچ تصمیمی برای هیچ قلمی ثبت نشده
    COORDINATING,   // بخشی تصمیم‌گیری شده، یا یک تصمیم REPLACEMENT هنوز در انتظار است
    RESOLVED,       // کل مقدار هر قلم تصمیم‌گیری شده و همه‌ی تصمیم‌ها نهایی‌اند
    REJECTED,       // به‌صورت دستی رد شده (فقط از PENDING ممکن است)
    CANCELLED,      // به‌صورت دستی لغو شده (فقط از PENDING ممکن است)
}
```

این ۵ وضعیت دقیقاً همان چیزی است که در فرانت‌اند به‌صورت `pending / coordinating / resolved / rejected / cancelled` تعریف شده بود.

#### `PurchaseReturnDecisionStatusEnum` (وضعیت هر خط تصمیم — تازه اضافه شده)

```csharp
public enum PurchaseReturnDecisionStatusEnum
{
    AWAITING,   // فقط برای تصمیم‌های REPLACEMENT: کالای جایگزین هنوز نرسیده
    RESOLVED,   // تصمیم قطعی و نهایی شده
}
```

#### `PurchaseReturnDecisionTypeEnum` (نوع تصمیمی که می‌توان برای یک مشکل گرفت — بدون تغییر)

```csharp
public enum PurchaseReturnDecisionTypeEnum
{
    REFUND,        // بازگشت وجه نقدی
    REPLACEMENT,   // ارسال کالای جایگزین از طرف تامین‌کننده
    CREDIT,        // اعتبار برای خرید بعدی
    WRITE_OFF,     // پذیرش زیان بدون بازگشت وجه
}
```

#### `PurchaseIssueTypeEnum` (نوع مشکل گزارش‌شده روی یک قلم خرید — بدون تغییر)

```csharp
public enum PurchaseIssueTypeEnum
{
    SHORTAGE,     // کسری تحویل
    DEFECTIVE,    // معیوب / خراب
    DAMAGED,      // آسیب‌دیده در حمل
    WRONG_ITEM,   // ارسال کالای اشتباه
    EXPIRED,      // تاریخ گذشته
    EXCESS,       // ارسال اضافه (مرجوع داوطلبانه)
    OTHER,        // سایر موارد
}
```

### 2.2. Entity ها

#### `PurchaseItem` (تغییر یافته — یک قلم از یک خرید)

```csharp
public class PurchaseItem
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }          // تعداد سفارش داده‌شده
    public UInt64 UnitPrice { get; set; }
    public int Discount { get; set; }
    public int ReceivedQuantity { get; set; }   // ← از حالت «بلااستفاده» درآمد و حالا فعال است
    public int SettledQuantity { get; set; }    // ← فیلد کاملاً جدید
    public Product Product { get; set; }
    public int PurchaseId { get; set; }
    public Purchase Purchase { get; set; }
}
```

- **`ReceivedQuantity`**: مجموع تجمعیِ تعداد سالمی که تا الان از این قلم فیزیکاً وارد انبار شده (ممکن است طی چند مرحله جمع بسته شود).
- **`SettledQuantity`** (جدید): مجموع تجمعیِ تعدادی که «تسویه‌ی مالی» شده — یعنی برایش تصمیم `REFUND`، `CREDIT` یا `WRITE_OFF` گرفته شده. این تعداد دیگر منتظر رسیدن فیزیکی نیست چون به‌جایش پول/اعتبار گرفته‌ایم یا زیانش را پذیرفته‌ایم.

این دو فیلد با هم مشخص می‌کنند که از سفارش اولیه (`Quantity`) چقدر «باقی مانده و هنوز واقعاً منتظرش هستیم». این فرمول بارها در کد تکرار می‌شود:

```
باقیمانده‌ی واقعی = Quantity − ReceivedQuantity − SettledQuantity
```

#### `PurchaseReturn` (بازنویسی‌شده — سرِ یک «پرونده‌ی مرجوعی»)

```csharp
public class PurchaseReturn
{
    public int Id { get; set; }
    public string ReturnNumber { get; set; }     // مثل RET-2026-0007
    public int PurchaseId { get; set; }
    public DateTime ReturnDate { get; set; }
    public PurchaseReturnStatusEnum Status { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Purchase? Purchase { get; set; }
    public List<PurchaseReturnItem> Items { get; set; } = new();
}
```

نکته‌ی مهم: این entity دیگر `IsActive` ندارد. چرخه‌ی عمرش کاملاً با `Status` مدیریت می‌شود (نه soft-delete با فلگ بولی).

#### `PurchaseReturnItem` (جایگزینِ نام قبلی‌اش `PurchaseReturnDiscrepancy` — یک «مشکلِ گزارش‌شده» روی یک قلم خرید)

```csharp
public class PurchaseReturnItem
{
    public int Id { get; set; }
    public int PurchaseReturnId { get; set; }
    public int PurchaseItemId { get; set; }
    public int ProductId { get; set; }
    public UInt64 UnitPrice { get; set; }        // snapshot از قیمت لحظه‌ی گزارش
    public PurchaseIssueTypeEnum IssueType { get; set; }
    public int Quantity { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public PurchaseReturn? PurchaseReturn { get; set; }
    public PurchaseItem? PurchaseItem { get; set; }
    public Product? Product { get; set; }
    public List<PurchaseReturnDecision> Decisions { get; set; } = new();
}
```

هر رکورد از این جدول یعنی: «برای قلم فلان از خریدِ فلان، به تعداد `Quantity`، مشکل از نوع `IssueType` گزارش شده». برای هر ترکیب `(PurchaseItemId, IssueType)` معمولاً فقط یک ردیف وجود دارد (اگر دوباره همان نوع مشکل گزارش شود، به‌جای ردیف جدید، به `Quantity` همین ردیف اضافه می‌شود — در بخش ۴ توضیح داده می‌شود).

#### `PurchaseReturnDecision` (جایگزینِ نام قبلی‌اش `PurchaseReturnResolution` — یک «تصمیم» روی بخشی از یک مشکل)

```csharp
public class PurchaseReturnDecision
{
    public int Id { get; set; }
    public int PurchaseReturnItemId { get; set; }
    public PurchaseReturnDecisionTypeEnum DecisionType { get; set; }
    public int Quantity { get; set; }
    public UInt64? RefundAmount { get; set; }
    public PurchaseReturnDecisionStatusEnum Status { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public PurchaseReturnItem? PurchaseReturnItem { get; set; }
}
```

یک `PurchaseReturnItem` می‌تواند چند `PurchaseReturnDecision` داشته باشد — چون مقدار یک مشکل می‌تواند بین چند نوع تصمیم تقسیم شود (مثلاً از ۴ عدد کسری، ۲ عدد بازگشت وجه و ۲ عدد اعتبار).

### 2.3. رابطه‌ی بین entity ها (سلسله‌مراتب)

```
Purchase (خرید)
 └─ PurchaseItem × چند تا (هر قلم سفارش)

PurchaseReturn (مرجوعی، مرتبط با یک Purchase)
 └─ PurchaseReturnItem × چند تا (هر «مشکلِ گزارش‌شده» روی یک PurchaseItem)
     └─ PurchaseReturnDecision × چند تا (هر «تصمیم» روی بخشی از آن مشکل)
```

---

## 3. سرویس محاسباتی مرکزی — `IPurchaseReturnCalculationService`

این سرویس یک نکته‌ی خیلی مهم را حل می‌کند: چون فرمول‌های «چقدر باقیمانده؟» و «وضعیت باید چی بشه؟» باید در **حداقل ۸ هندلر مختلف** دقیقاً یکسان محاسبه شوند، این منطق در **یک جا** (پشت یک اینترفیس) نوشته شده تا هیچ‌وقت دو هندلر با هم ناهماهنگ نشوند.

- اینترفیس: `Application/Common/Contracts/PurchaseReturn/IPurchaseReturnCalculationService.cs`
- پیاده‌سازی: `Infrastructure/Services/PurchaseReturnCalculationService.cs`
- ثبت در DI: `Scoped` (مثل `ITokenService`)

هر متد را جداگانه با مثال توضیح می‌دهم.

### 3.1. `IsTerminal(status)`

```csharp
public bool IsTerminal(PurchaseReturnStatusEnum status) => TerminalReturnStatuses.Contains(status);
```

فقط چک می‌کند آیا وضعیت داده‌شده `REJECTED` یا `CANCELLED` است یا نه. این دو وضعیت «نهایی» (terminal) هستند — یعنی دیگر هیچ تغییری روی مرجوعی مجاز نیست.

### 3.2. `IsValidDecision(issueType, decisionType)` — ماتریسِ اعتبارسنجی

این تابع مشخص می‌کند برای هر نوع مشکل، چه نوع تصمیمی منطقاً مجاز است:

| نوع مشکل (`IssueType`) | تصمیم‌های مجاز |
|---|---|
| `SHORTAGE` (کسری تحویل) | `REFUND`, `REPLACEMENT`, `CREDIT` |
| `WRONG_ITEM` (کالای اشتباه) | `REFUND`, `REPLACEMENT`, `CREDIT` |
| `EXCESS` (ارسال اضافه) | `REFUND`, `CREDIT` |
| `DAMAGED` (آسیب‌دیده) | `REFUND`, `REPLACEMENT`, `CREDIT`, `WRITE_OFF` |
| `DEFECTIVE` (معیوب) | `REFUND`, `REPLACEMENT`, `CREDIT`, `WRITE_OFF` |
| `EXPIRED` (تاریخ‌گذشته) | `REFUND`, `REPLACEMENT`, `CREDIT`, `WRITE_OFF` |
| `OTHER` (سایر) | `REFUND`, `REPLACEMENT`, `CREDIT`, `WRITE_OFF` |

**چرا `EXCESS` نمی‌تواند `REPLACEMENT` یا `WRITE_OFF` داشته باشد؟**
- `REPLACEMENT` منطقی نیست چون «اضافه» یعنی کالای زیادی داریم، نه کم — درخواست جایگزین برای چیزی که خودش اضافه است بی‌معنی است.
- `WRITE_OFF` هم اینجا معنی ندارد چون این کالا مال ما نیست که «زیانش را بپذیریم»؛ یا باید پولش را پس بگیریم (`REFUND`) یا به‌عنوان اعتبار خرید بعدی حسابش کنیم (`CREDIT`).

اگر تصمیمی خارج از این ماتریس درخواست شود، `AddPurchaseReturnDecisionCommand` با خطای اعتبارسنجی رد می‌شود.

### 3.3. `RecomputeReturnStatus(purchaseReturn)`

```csharp
public PurchaseReturnStatusEnum RecomputeReturnStatus(Domain.Entities.PurchaseReturn purchaseReturn)
{
    var allDecisions = purchaseReturn.Items.SelectMany(i => i.Decisions).ToList();
    var allocatedQty = allDecisions.Sum(d => d.Quantity);

    if (allocatedQty == 0)
        return PurchaseReturnStatusEnum.PENDING;

    var totalQty = purchaseReturn.Items.Sum(i => i.Quantity);
    var allFinal = allDecisions.Count > 0 && allDecisions.All(d => d.Status == PurchaseReturnDecisionStatusEnum.RESOLVED);

    if (allocatedQty >= totalQty && allFinal)
        return PurchaseReturnStatusEnum.RESOLVED;

    return PurchaseReturnStatusEnum.COORDINATING;
}
```

منطق به زبان ساده:

1. اگر **هیچ** تصمیمی روی **هیچ** قلمی ثبت نشده → `PENDING`.
2. اگر مجموع مقدار تمام تصمیم‌ها (`allocatedQty`) به مجموع مقدار تمام مشکلات (`totalQty`) رسیده باشد **و** همه‌ی تصمیم‌ها `RESOLVED` باشند (یعنی هیچ `REPLACEMENT` در حالت `AWAITING` نمانده باشد) → `RESOLVED`.
3. در هر حالت بینابینی دیگر (مثلاً بخشی تصمیم‌گیری شده، یا همه تصمیم‌گیری شده ولی یک `REPLACEMENT` هنوز منتظر است) → `COORDINATING`.

توجه: این تابع هرگز `REJECTED` یا `CANCELLED` برنمی‌گرداند — این دو وضعیت فقط با اکشن صریح کاربر (فرمان `Reject`/`Cancel`) تنظیم می‌شوند، نه با محاسبه‌ی خودکار.

### 3.4. `GetOpenIssueQuantity(purchaseItemId, activeReturn)`

```csharp
public int GetOpenIssueQuantity(int purchaseItemId, Domain.Entities.PurchaseReturn? activeReturn)
{
    if (activeReturn == null)
        return 0;

    return activeReturn.Items
        .Where(i => i.PurchaseItemId == purchaseItemId)
        .Sum(i => i.Quantity - i.Decisions.Sum(d => d.Quantity));
}
```

برای یک قلم خرید مشخص، مجموع «مقدار مشکل گزارش‌شده منهای مقدار تصمیم‌گیری‌شده» را در تمام ردیف‌های `PurchaseReturnItem` مربوط به آن قلم، در مرجوعیِ **فعال** جمع می‌زند. یعنی «چقدر مشکل هنوز بدون تصمیم مانده».

مثال: قلم X یک ردیف `SHORTAGE` با `Quantity=5` دارد که رویش یک تصمیم با `Quantity=2` ثبت شده. باقیمانده‌ی این ردیف = `5 - 2 = 3`. اگر همین قلم یک ردیف `DAMAGED` هم داشته باشد با `Quantity=1` و صفر تصمیم، آن هم کامل باز است. جمع کل = `3 + 1 = 4`.

### 3.5. `GetReceivableQuantity(item, activeReturn)`

```csharp
public int GetReceivableQuantity(Domain.Entities.PurchaseItem item, Domain.Entities.PurchaseReturn? activeReturn)
{
    var budget = item.Quantity - item.ReceivedQuantity - item.SettledQuantity;
    var openIssue = GetOpenIssueQuantity(item.Id, activeReturn);
    return Math.Max(0, budget - openIssue);
}
```

این مهم‌ترین فرمول کل فیچر است — «از این قلم، چقدر هنوز می‌تواند در آینده وارد انبار شود؟»

```
باقیمانده‌ی سفارش = Quantity − ReceivedQuantity − SettledQuantity
قابل‌دریافتِ واقعی = باقیمانده‌ی سفارش − مقدار مشکلِ هنوز بدون‌تصمیم
```

چرا مشکلِ بدون‌تصمیم هم کم می‌شود؟ چون تا وقتی واحد خرید برای آن مقدار تصمیم نگرفته (مثلاً هنوز معلوم نیست کسری با `REPLACEMENT` جبران می‌شود یا `REFUND` می‌گیریم)، انباردار **نباید** بتواند دوباره همان مقدار را به‌عنوان «دریافت عادی» ثبت کند — چون معلوم نیست قرار است دوباره برسد یا نه.

نکته‌ی ظریف: وقتی یک تصمیم (چه `REPLACEMENT` چه غیر آن) برای بخشی از یک مشکل ثبت می‌شود، آن بخش دیگر «بدون‌تصمیم» نیست، پس از `openIssue` کم می‌شود. اگر تصمیم از نوع `REPLACEMENT` باشد، آن مقدار به `SettledQuantity` اضافه **نمی‌شود**، در نتیجه دوباره در فرمول بالا به‌عنوان «قابل‌دریافت» ظاهر می‌شود — یعنی سیستم منتظر می‌ماند تا کالای جایگزین در یک دریافت بعدی برسد. اگر تصمیم غیر از `REPLACEMENT` باشد (یعنی `REFUND`/`CREDIT`/`WRITE_OFF`)، آن مقدار به `SettledQuantity` اضافه می‌شود و برای همیشه از بودجه‌ی قابل‌دریافت کم می‌ماند (چون دیگر قرار نیست فیزیکاً چیزی برسد).

### 3.6. `RecomputePurchaseStatus(purchase, activeReturn)`

```csharp
public PurchaseStatusEnum RecomputePurchaseStatus(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? activeReturn)
{
    if (purchase.Status == PurchaseStatusEnum.CANCELLED)
        return PurchaseStatusEnum.CANCELLED;

    var hasOpenIssue = purchase.Items.Any(i => GetOpenIssueQuantity(i.Id, activeReturn) > 0);
    var fullyAccounted = purchase.Items.All(i => i.ReceivedQuantity + i.SettledQuantity >= i.Quantity);

    if (fullyAccounted && !hasOpenIssue)
        return PurchaseStatusEnum.RECEIVED;

    if (purchase.Items.Any(i => i.ReceivedQuantity > 0 || i.SettledQuantity > 0))
        return PurchaseStatusEnum.PARTIALLY_RECEIVED;

    return purchase.Status;
}
```

منطق:

1. اگر خرید از قبل `CANCELLED` است، همیشه `CANCELLED` می‌ماند (هیچ اکشن دیگری نباید این را عوض کند).
2. اگر همه‌ی قلم‌ها «کامل حساب‌رسی شده‌اند» (`ReceivedQuantity + SettledQuantity >= Quantity`) **و** هیچ مشکل بدون‌تصمیمی روی هیچ‌کدام نمانده → `RECEIVED`.
3. وگرنه، اگر حداقل یک قلم چیزی دریافت یا تسویه شده باشد → `PARTIALLY_RECEIVED`.
4. وگرنه (هیچ‌چیز هنوز اتفاق نیفتاده) → همان وضعیت قبلی خرید بدون تغییر می‌ماند.

این تابع بعد از **هر** اکشنی که ممکن است رقم‌ها را عوض کند صدا زده می‌شود: دریافت خرید، ثبت تصمیم، حذف تصمیم، لغو/رد/بازگشایی/حذف مرجوعی.

### 3.7. `ResolveAwaitingReplacements(purchase, activeReturn, now)` — پیچیده‌ترین بخش منطق

```csharp
public void ResolveAwaitingReplacements(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? activeReturn, DateTime now)
{
    if (activeReturn == null) return;

    var awaitingByPurchaseItem = activeReturn.Items
        .SelectMany(i => i.Decisions
            .Where(d => d.DecisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT &&
                        d.Status == PurchaseReturnDecisionStatusEnum.AWAITING)
            .Select(d => new { i.PurchaseItemId, Decision = d }))
        .GroupBy(x => x.PurchaseItemId);

    foreach (var group in awaitingByPurchaseItem)
    {
        var purchaseItem = purchase.Items.FirstOrDefault(x => x.Id == group.Key);
        if (purchaseItem == null) continue;

        var lines = group.Select(x => x.Decision).OrderBy(d => d.CreatedAt).ToList();
        var totalAwaitingQty = lines.Sum(d => d.Quantity);
        var stillNeeded = Math.Max(0, purchaseItem.Quantity - purchaseItem.ReceivedQuantity - purchaseItem.SettledQuantity);
        var coveredBudget = Math.Max(0, totalAwaitingQty - stillNeeded);

        foreach (var line in lines)
        {
            if (coveredBudget < line.Quantity) break;
            line.Status = PurchaseReturnDecisionStatusEnum.RESOLVED;
            line.ResolvedAt = now;
            coveredBudget -= line.Quantity;
        }
    }
}
```

**مسئله‌ای که حل می‌کند:** وقتی برای یک قلم تصمیم `REPLACEMENT` گرفته می‌شود (یعنی «تامین‌کننده باید جایگزین بفرستد»)، آن قلم `AWAITING` می‌ماند تا کالای جایگزین برسد. اما وقتی کالای جایگزین در یک دریافتِ بعدی می‌رسد، در سیستم **هیچ فیلدی وجود ندارد که مشخص کند این تحویلِ جدید همان جایگزینِ وعده‌داده‌شده است یا فقط ادامه‌ی طبیعیِ باقیِ سفارش**. پس باید با محاسبه حدس زده شود.

**منطق حدس زدن، گام‌به‌گام با یک مثال عددی:**

فرض کنید یک قلم خرید با `Quantity = 10` داریم:

1. دور اول دریافت: ۶ عدد سالم می‌رسد → `ReceivedQuantity = 6`. ۴ عدد باقی مانده به‌عنوان کسری گزارش می‌شود (`SHORTAGE`, `Quantity = 4`).
2. واحد خرید تصمیم می‌گیرد که این ۴ تا با `REPLACEMENT` جبران شود → یک `PurchaseReturnDecision` با `Quantity = 4`، `Status = AWAITING` ساخته می‌شود.
   - در این لحظه: `stillNeeded = 10 - 6 - 0 = 4` (یعنی طبق حساب معمولی، هنوز ۴ تا از تامین‌کننده طلبکاریم).
   - `totalAwaitingQty = 4`.
   - `coveredBudget = max(0, 4 - 4) = 0` → یعنی هیچ چیز «اضافه بر انتظار عادی» نرسیده، پس این خط هنوز `AWAITING` می‌ماند. (این محاسبه در همین لحظه‌ی ثبت تصمیم هم اجرا می‌شود، ولی چون `ReceivePurchaseCommand` هنوز اجرا نشده تغییری نمی‌بیند.)
3. دور دوم دریافت: تامین‌کننده یک محموله‌ی ۴ تایی می‌فرستد (که همان جایگزینِ وعده‌داده‌شده است) → `ReceivePurchaseCommand` این ۴ تا را به‌عنوان `ReceivedQuantity` ثبت می‌کند → `ReceivedQuantity` از ۶ به ۱۰ می‌رسد.
   - حالا `ResolveAwaitingReplacements` صدا زده می‌شود: `stillNeeded = max(0, 10 - 10 - 0) = 0` (دیگر طبق حساب معمولی چیزی طلب نداریم).
   - `totalAwaitingQty = 4` (همان خط قبلی هنوز `AWAITING` است).
   - `coveredBudget = max(0, 4 - 0) = 4` → یعنی این ۴ واحدِ اضافه بر انتظار معمولی، دقیقاً باید همان جایگزینِ وعده‌داده‌شده باشد.
   - چون `coveredBudget (4) >= line.Quantity (4)`، این خط `RESOLVED` می‌شود و `ResolvedAt = now`.

**چرا FIFO (قدیمی‌ترین اول)؟** اگر چند خطِ `AWAITING` برای یک قلم وجود داشته باشد (مثلاً چون در چند دور مختلف چند بار کسری گزارش و برایش `REPLACEMENT` خواسته شده)، وقتی سهمیه‌ی جایگزینیِ رسیده کمتر از مجموع همه‌ی وعده‌هاست، منطقی‌ترین فرض این است که وعده‌های قدیمی‌تر زودتر برآورده شده باشند. به همین دلیل خط‌ها بر اساس `CreatedAt` مرتب و یکی‌یکی از قدیم به جدید بررسی می‌شوند؛ به محض این‌که `coveredBudget` کافی برای یک خط نباشد، حلقه متوقف می‌شود (چون خطوط بعدی که جدیدترند حتماً هنوز کمتر پوشش داده شده‌اند).

این تابع در پایان **هر بار** اجرای `ReceivePurchaseCommand` صدا زده می‌شود (چه دریافت مشکلی داشته باشد چه نداشته باشد) — چون ممکن است این دریافت دقیقاً همان جایگزینِ منتظرمانده باشد.

---

## 4. فرمان دریافت خرید — `ReceivePurchaseCommand`

**Endpoint:** `POST api/Purchase/ReceivePurchase`
**فایل:** `Application/Features/PurchaseReturn/Commands/ReceivePurchaseCommand.cs`

### 4.1. ساختار ورودی

```csharp
public class ReceivePurchaseCommand
{
    public int PurchaseId { get; set; }
    public DateTime? ReceivedDate { get; set; }
    public string? ReceivingNote { get; set; }
    public List<ReceivePurchaseItemDto> Items { get; set; } = new();
}

public class ReceivePurchaseItemDto
{
    public int PurchaseItemId { get; set; }
    public int ReceivedQuantity { get; set; }              // تعداد سالمی که این دور رسیده
    public List<ReceivePurchaseIssueDto> Issues { get; set; } = new();
}

public class ReceivePurchaseIssueDto
{
    public PurchaseIssueTypeEnum Type { get; set; }
    public int Quantity { get; set; }
    public string? Note { get; set; }
}
```

هر بار فراخوانیِ این فرمان یعنی «یک محموله رسید». برای هر قلم خرید، هم تعداد سالمِ رسیده (`ReceivedQuantity`) و هم لیستِ مشکلاتِ این دور (`Issues`) با هم گزارش می‌شوند.

### 4.2. قوانین اعتبارسنجی (Validator)

| قانون | پیام خطا |
|---|---|
| `PurchaseId` نباید خالی باشد | «خرید الزامی است.» |
| `Items` نباید خالی باشد | «لیست اقلام دریافتی الزامی است.» |
| هیچ `PurchaseItemId` نباید در یک درخواست تکراری باشد | «هر آیتم خرید فقط یک‌بار می‌تواند در یک درخواست دریافت ظاهر شود.» |
| `PurchaseItemId` هر ردیف نباید خالی باشد | «آیتم خرید الزامی است.» |
| `ReceivedQuantity` هر ردیف نباید منفی باشد | «مقدار دریافتی نمی‌تواند منفی باشد.» |
| هر ردیف باید یا `ReceivedQuantity > 0` باشد یا حداقل یک `Issue` با `Quantity > 0` داشته باشد | «برای هر قلم باید مقدار دریافتی یا حداقل یک مغایرت وارد شود.» |
| مقدار هر `Issue` باید بزرگ‌تر از صفر باشد | «مقدار مغایرت باید از صفر بیشتر باشد.» |
| نوع هر `Issue` باید یکی از مقادیر معتبر `PurchaseIssueTypeEnum` باشد | «نوع مغایرت نامعتبر است.» |

قانون «تکراری نبودن `PurchaseItemId`» عمداً اضافه شد تا جلوی یک باگ ظریف گرفته شود: اگر یک قلم دو بار در یک درخواست بیاید، هر دو ردیف جدا-جدا در برابر **همان** بودجه‌ی اولیه اعتبارسنجی می‌شدند و ممکن بود هرکدام به‌تنهایی مجاز باشند ولی مجموعشان از بودجه‌ی واقعی بیشتر شود.

### 4.3. مراحل اجرای هندلر (گام‌به‌گام)

**گام ۱ — بارگذاری خرید:**
خرید به همراه تمام قلم‌ها و محصولات هرکدام از دیتابیس خوانده می‌شود. اگر پیدا نشود → خطای «خرید مورد نظر یافت نشد.» (۴۰۴).

**گام ۲ — بررسی وضعیت لغوشدگی:**
اگر `purchase.Status == CANCELLED`، بلافاصله خطا داده می‌شود: «خرید لغو شده قابل دریافت نیست.»

> توجه: اگر خرید از قبل `RECEIVED` باشد، خطای صریح نمی‌دهد — چون در عمل، اگر همه‌چیز واقعاً کامل شده باشد، `GetReceivableQuantity` برای هر قلم صفر برمی‌گردد و هر تلاش برای دریافتِ بیشتر (غیر از `EXCESS`) خودش با خطای «بیشتر از باقیمانده» رد می‌شود. این طراحی عمدی است تا اگر بعداً چیزی اضافه (`EXCESS`) رسید، هنوز بتوان آن را حتی بعد از تکمیل خرید ثبت کرد.

**گام ۳ — پیدا کردن مرجوعیِ فعال:**
با `IPurchaseReturnRepository.GetActiveByPurchaseIdAsync`، مرجوعیِ این خرید که وضعیتش `PENDING` یا `COORDINATING` است پیدا می‌شود (اگر باشد). چون طبق قانون‌های بعدی، لغو/رد فقط از `PENDING` ممکن است، در هر لحظه حداکثر **یک** مرجوعیِ فعال برای هر خرید وجود دارد.

**گام ۴ — حلقه‌ی اعتبارسنجیِ بودجه (قبل از هر تغییری):**

برای هر ردیف درخواستی:
```csharp
var nonExcessQty = issues.Where(i => i.Type != EXCESS).Sum(i => i.Quantity);
var requestedNonExcess = ReceivedQuantity + nonExcessQty;
var receivable = GetReceivableQuantity(purchaseItem, activeReturn);

if (requestedNonExcess > receivable) throw ...;
```

نکته‌ی کلیدی: مقدارِ نوع `EXCESS` از این محاسبه **مستثنی** است. چون طبق تعریف، «اضافه» یعنی چیزی بیشتر از سفارش رسیده — پس منطقاً نباید محدود به بودجه‌ی باقیمانده باشد (وگرنه اصلاً نمی‌شد اضافه را ثبت کرد).

این حلقه **قبل از** هرگونه تغییر روی دیتابیس اجرا می‌شود — یعنی اگر حتی یکی از ردیف‌ها نامعتبر باشد، کل درخواست رد می‌شود و هیچ تغییری (نه در استوک، نه در مرجوعی) اعمال نمی‌شود.

**گام ۵ — حلقه‌ی اعمالِ تغییرات:**

برای هر ردیف درخواستی:

1. اگر `ReceivedQuantity > 0`:
   - `purchaseItem.ReceivedQuantity += ReceivedQuantity`
   - `purchaseItem.Product.Stock += ReceivedQuantity` ← موجودی انبار همین‌جا زیاد می‌شود.
2. اگر هیچ `Issue` ای با مقدار مثبت وجود ندارد، برو سراغ ردیف بعدی.
3. اگر مرجوعیِ فعالی وجود ندارد، یکی ساخته می‌شود:
   ```csharp
   activeReturn = new PurchaseReturn
   {
       ReturnNumber = Generator.GenerateReturnNumber(returnCount + 1),  // مثل RET-2026-0009
       PurchaseId = request.PurchaseId,
       ReturnDate = receivedDate,
       Status = PENDING,
       Description = request.ReceivingNote,
       CreatedAt = now, UpdatedAt = now,
   };
   ```
4. مشکلات همین ردیف بر اساس `Type` گروه‌بندی می‌شوند (چون ممکن است در یک درخواست چند خط با نوعِ یکسان بیاید) و برای هر گروه:
   - اگر از قبل یک `PurchaseReturnItem` با همان `(PurchaseItemId, IssueType)` در مرجوعیِ فعال وجود دارد → به `Quantity` آن ردیف اضافه می‌شود و یادداشت‌ها با «؛» به هم می‌چسبند.
   - وگرنه یک `PurchaseReturnItem` جدید ساخته می‌شود.

**گام ۶ — رزولوشنِ خودکار جایگزین‌های در انتظار:**
`ResolveAwaitingReplacements(purchase, activeReturn, now)` صدا زده می‌شود (توضیح کامل در بخش ۳.۷).

**گام ۷ — بازمحاسبه‌ی نهاییِ وضعیت‌ها:**
```csharp
activeReturn.Status = RecomputeReturnStatus(activeReturn);
purchase.Status = RecomputePurchaseStatus(purchase, activeReturn);
```

**گام ۸ — ذخیره و پاسخ:**
`SaveChangesAsync` صدا زده می‌شود و در پاسخ، شناسه و وضعیتِ جدیدِ خرید و مرجوعی (اگر ساخته/به‌روزرسانی شده) برگردانده می‌شود.

### 4.4. تمام سناریوهای این فرمان

1. **دریافتِ کامل و بدون مشکل، یک‌مرحله‌ای.** برای هر قلم، `ReceivedQuantity = Quantity` و `Issues` خالی. هیچ مرجوعی‌ای ساخته نمی‌شود؛ فقط `Product.Stock` و `PurchaseItem.ReceivedQuantity` زیاد می‌شوند و در نهایت وضعیت خرید `RECEIVED` می‌شود.

2. **دریافتِ جزئی و چندمرحله‌ای.** دور اول فقط بخشی از تعداد سفارش‌شده می‌رسد (`ReceivedQuantity` کمتر از `Quantity`، بدون مشکل). وضعیت خرید `PARTIALLY_RECEIVED` می‌شود. در دور بعدی، باقیِ همان قلم دوباره با یک فراخوانیِ دیگرِ همین فرمان دریافت می‌شود.

3. **کسری تحویل (`SHORTAGE`).** مثلاً از ۱۵ عدد سفارش‌شده، ۷ تا سالم می‌رسد و ۸ تا اصلاً نمی‌رسد → `ReceivedQuantity = 7`، `Issues = [{ Type: SHORTAGE, Quantity: 8 }]`. یک `PurchaseReturnItem` با `IssueType = SHORTAGE` و `Quantity = 8` ساخته می‌شود.

4. **کالای معیوب/آسیب‌دیده/تاریخ‌گذشته/اشتباه/سایر (`DEFECTIVE`, `DAMAGED`, `EXPIRED`, `WRONG_ITEM`, `OTHER`).** همان الگوی بالا، فقط با `Type` متفاوت. مهم است که این‌ها معمولاً بخشی از کالاهایی هستند که فیزیکاً رسیده‌اند اما قابل‌فروش نیستند — یعنی جزو `ReceivedQuantity` (سالم) حساب نمی‌شوند، بلکه در `Issues` گزارش می‌شوند.

5. **کالای اضافی (`EXCESS`).** تامین‌کننده بیشتر از سفارش فرستاده. این مقدار در `Issues` با `Type = EXCESS` گزارش می‌شود ولی:
   - در محاسبه‌ی «آیا از باقیمانده بیشتر است؟» شرکت نمی‌کند (چون تعریفاً بیشتر از سفارش است).
   - به `Product.Stock` اضافه **نمی‌شود** — یعنی تا وقتی واحد خرید تصمیم نگیرد («بازگشت وجه بگیریم یا به‌عنوان اعتبار حساب کنیم»)، این کالا در استوکِ قابل‌فروش دیده نمی‌شود.

6. **یک قلم چند نوع مشکل هم‌زمان دارد.** مثلاً از ۱۵ عدد یک محصول، ۴ تا آسیب‌دیده و ۲ تا تاریخ‌گذشته گزارش می‌شود → دو `PurchaseReturnItem` جداگانه (یکی با `DAMAGED`، یکی با `EXPIRED`) روی همان `PurchaseReturnItem.PurchaseItemId` ساخته می‌شود.

7. **همان نوع مشکل در دو دورِ مختلفِ دریافت گزارش می‌شود.** مثلاً دور اول ۴ تا `SHORTAGE`، دور دوم (چون هنوز بقیه‌اش نرسیده) دوباره ۲ تا `SHORTAGE` برای همان قلم گزارش می‌شود → به‌جای ساختن ردیف جدید، `Quantity` ردیفِ موجود از ۴ به ۶ افزایش می‌یابد و یادداشت‌ها به هم می‌چسبند.

8. **تلاش برای دریافتِ بیشتر از باقیمانده‌ی واقعی.** مثلاً یک قلم `Quantity=10` دارد، `ReceivedQuantity` از قبل `6` است، و درخواستِ جدید `ReceivedQuantity=5` می‌فرستد (که یعنی جمعاً ۱۱ تا، بیشتر از سفارش) → خطای «مقدار وارد شده برای «نام محصول» از باقیمانده قابل دریافت این قلم بیشتر است.»

9. **تلاش برای دریافتِ یک خریدِ لغوشده.** خطای «خرید لغو شده قابل دریافت نیست.»

10. **تلاش برای دریافتِ قلمی که اصلاً متعلق به این خرید نیست.** (`PurchaseItemId` نامعتبر) → خطای «آیتم خرید مورد نظر یافت نشد.»

11. **درخواستی که در آن یک `PurchaseItemId` دو بار تکرار شده.** → همان مرحله‌ی اعتبارسنجی رد می‌کند: «هر آیتم خرید فقط یک‌بار می‌تواند در یک درخواست دریافت ظاهر شود.»

12. **ردیفی که نه `ReceivedQuantity` دارد نه `Issues`.** → خطای اعتبارسنجی «برای هر قلم باید مقدار دریافتی یا حداقل یک مغایرت وارد شود.»

13. **دریافتی که در آن مرجوعیِ فعالی از قبل وجود دارد (چون در دور قبلی مشکلی گزارش شده بود).** به‌جای ساختنِ مرجوعیِ جدید، همان مرجوعی بازاستفاده می‌شود و مشکلاتِ جدید به آن اضافه می‌شوند.

14. **دریافتی که دقیقاً همان کالای جایگزینِ وعده‌داده‌شده (`REPLACEMENT`) است.** طبق منطق بخش ۳.۷، خط `AWAITING` مربوطه به‌طور خودکار `RESOLVED` می‌شود و اگر این آخرین چیزِ باز مانده در مرجوعی بود، خودِ مرجوعی هم `RESOLVED` می‌شود.

---

## 5. فرمان ثبت تصمیم — `AddPurchaseReturnDecisionCommand`

**Endpoint:** `POST api/PurchaseReturn/AddPurchaseReturnDecision`
**فایل:** `Application/Features/PurchaseReturn/Commands/AddPurchaseReturnDecisionCommand.cs`

### 5.1. ورودی

```csharp
public class AddPurchaseReturnDecisionCommand
{
    public int PurchaseReturnItemId { get; set; }
    public PurchaseReturnDecisionTypeEnum DecisionType { get; set; }
    public int Quantity { get; set; }
    public UInt64? RefundAmount { get; set; }
    public string? Note { get; set; }
}
```

با هر فراخوانی، **فقط یک تصمیم** برای بخشی (یا کلِ) یک `PurchaseReturnItem` ثبت می‌شود — نه به‌صورت دسته‌ای. این طراحی دقیقاً با فرانت‌اند هماهنگ است (هر کارت در صفحه‌ی جزئیاتِ مرجوعی، یک دکمه‌ی «ثبت این تصمیم برای N عدد» دارد).

### 5.2. اعتبارسنجی

| قانون | پیام |
|---|---|
| `PurchaseReturnItemId` الزامی | «قلم مرجوعی الزامی است.» |
| `Quantity > 0` | «مقدار تصمیم باید از صفر بیشتر باشد.» |
| `DecisionType` باید مقدار معتبر enum باشد | «نوع تصمیم نامعتبر است.» |
| اگر `RefundAmount` مقدار داشت، باید `> 0` باشد | «مبلغ باید از صفر بیشتر باشد.» |

### 5.3. مراحل هندلر

1. `PurchaseReturnItem` مربوطه به همراه مرجوعیِ والدش (و تمام قلم‌ها/تصمیم‌های خواهر برای محاسبه‌ی وضعیت) و خریدِ والدِ مرجوعی خوانده می‌شود. اگر پیدا نشود → «قلم مرجوعی مورد نظر یافت نشد.»
2. اگر وضعیتِ مرجوعی `RESOLVED`، `REJECTED` یا `CANCELLED` باشد → خطای «این مرجوعی قابل تغییر نیست.»
3. مقدارِ باقیمانده‌ی این قلمِ مرجوعی محاسبه می‌شود: `remaining = Quantity - Decisions.Sum(Quantity)`. اگر `request.Quantity > remaining` → خطای «مجموع تصمیم‌های ثبت‌شده از تعداد قلم مرجوعی بیشتر است.»
4. با `IsValidDecision` بررسی می‌شود که این `DecisionType` برای این `IssueType` مجاز است یا نه (جدول بخش ۳.۲). اگر نبود → «نوع تصمیم برای این مغایرت معتبر نیست.»
5. مبلغِ بازگشتی محاسبه می‌شود:
   ```csharp
   RefundAmount = DecisionType == REFUND
       ? (request.RefundAmount ?? Quantity * UnitPrice)   // اگر مبلغ دستی داده نشده، پیش‌فرض = تعداد × قیمت واحد
       : null;                                              // برای بقیه‌ی انواع، مبلغ ذخیره نمی‌شود
   ```
6. رکورد `PurchaseReturnDecision` جدید ساخته می‌شود:
   - اگر `DecisionType == REPLACEMENT` → `Status = AWAITING`، `ResolvedAt = null`.
   - در غیر این صورت → `Status = RESOLVED`، `ResolvedAt = now` (بلافاصله نهایی می‌شود).
7. اگر تصمیم `REPLACEMENT` **نبود**، `PurchaseItem.SettledQuantity += Quantity` (یعنی این مقدار برای همیشه از چرخه‌ی «انتظارِ فیزیکی» خارج می‌شود).
8. وضعیتِ مرجوعی و خرید با همان توابع مرکزی (`RecomputeReturnStatus`, `RecomputePurchaseStatus`) بازمحاسبه می‌شوند.
9. ذخیره می‌شود و در پاسخ، `ReturnId` و `ReturnStatus` جدید برگردانده می‌شود.

### 5.4. تمام سناریوهای این فرمان

1. **ثبت `REFUND` با مبلغ پیش‌فرض.** کاربر فقط `Quantity` می‌دهد، `RefundAmount` را خالی می‌گذارد → سیستم خودش `Quantity × UnitPrice` را محاسبه و ذخیره می‌کند.
2. **ثبت `REFUND` با مبلغ دستی.** کاربر عدد دلخواهی وارد می‌کند (مثلاً برای توافق خاص با تامین‌کننده) → همان مقدار عیناً ذخیره می‌شود.
3. **ثبت `REPLACEMENT`.** تصمیم با `Status = AWAITING` ساخته می‌شود و منتظر می‌ماند تا در یک دریافتِ بعدی به‌طور خودکار `RESOLVED` شود (بخش ۳.۷ و ۴.۴ سناریوی ۱۴).
4. **ثبت `CREDIT` یا `WRITE_OFF`.** هیچ‌کدام مبلغ ندارند؛ بلافاصله `RESOLVED` می‌شوند و `SettledQuantity` را افزایش می‌دهند.
5. **تلاش برای ثبت تصمیمی که با نوع مشکل سازگار نیست** (مثلاً `REPLACEMENT` برای یک ردیف `EXCESS`) → خطای اعتبارسنجی.
6. **تلاش برای ثبتِ مقداری بیشتر از باقیماندهٔ آن مشکل** (مثلاً مشکل ۴ تایی است، ۲ تا قبلاً تصمیم‌گیری شده، و درخواستِ جدید ۳ تا می‌خواهد) → خطا.
7. **تلاش برای ثبت تصمیم روی مرجوعیِ `RESOLVED`/`REJECTED`/`CANCELLED`.** → خطای «این مرجوعی قابل تغییر نیست.»
8. **تقسیم یک مشکل بین چند نوع تصمیم با چند فراخوانیِ جداگانه.** مثلاً از ۴ تا کسری، ۲ تا `REFUND` و ۲ تا `CREDIT` — دو بار این فرمان صدا زده می‌شود.
9. **آخرین تصمیمِ لازم برای کامل‌شدن یک مرجوعی ثبت می‌شود.** وضعیت مرجوعی از `COORDINATING` به `RESOLVED` تغییر می‌کند و به‌تبع آن وضعیت خرید هم بازمحاسبه می‌شود (اگر همه‌چیزِ خرید هم حساب‌رسی شده باشد، `RECEIVED` می‌شود).
10. **اولین تصمیم روی یک مرجوعیِ تازه‌ساخته‌شده ثبت می‌شود.** وضعیت مرجوعی از `PENDING` به `COORDINATING` تغییر می‌کند.

---

## 6. فرمان حذف تصمیم — `RemovePurchaseReturnDecisionCommand`

**Endpoint:** `DELETE api/PurchaseReturn/RemovePurchaseReturnDecision`
**فایل:** `Application/Features/PurchaseReturn/Commands/RemovePurchaseReturnDecisionCommand.cs`

### 6.1. ورودی

```csharp
public class RemovePurchaseReturnDecisionCommand
{
    public int Id { get; set; }   // شناسه‌ی خودِ تصمیم (PurchaseReturnDecision.Id)
}
```

### 6.2. مراحل هندلر

1. تصمیم مربوطه (به همراه قلمِ مرجوعیِ والد، مرجوعیِ والد، و خریدِ والدِ مرجوعی) خوانده می‌شود. اگر پیدا نشود → «تصمیم مورد نظر یافت نشد.»
2. اگر وضعیتِ مرجوعی `RESOLVED`/`REJECTED`/`CANCELLED` باشد → «این مرجوعی قابل تغییر نیست.»
3. اگر وضعیتِ خودِ تصمیم `AWAITING` **نباشد** (یعنی از قبل `RESOLVED` شده) → خطای «این تصمیم قطعی شده و دیگر قابل حذف نیست.»
4. تصمیم از کالکشنِ `Decisions` حذف می‌شود.
5. وضعیتِ مرجوعی و خرید بازمحاسبه می‌شوند.

### 6.3. چرا فقط `AWAITING` قابل‌حذف است؟

چون فقط تصمیم‌های `REPLACEMENT` می‌توانند `AWAITING` باشند، و تنها آن‌ها هستند که هنوز اثرِ مالیِ قطعی (مثل `SettledQuantity` یا مبلغِ بازگشتی) روی سیستم نگذاشته‌اند — پس برگرداندنشان بی‌خطر است. اما تصمیم‌های `RESOLVED` (مثل `REFUND` یا `WRITE_OFF`) از لحظه‌ی ثبت، `SettledQuantity` را تغییر داده‌اند؛ حذفِ آن‌ها بدون یک منطقِ «برگردانِ اثر» (که عمداً پیاده‌سازی نشده، چون در دنیای واقعی یعنی پول یا اعتبار قبلاً رد و بدل شده) می‌تواند داده‌ها را ناهماهنگ کند.

### 6.4. تمام سناریوهای این فرمان

1. **حذفِ یک تصمیمِ `REPLACEMENT` که هنوز `AWAITING` است.** موفق؛ آن مقدار دوباره به‌عنوان «بدون‌تصمیم» (`open issue`) برمی‌گردد و در نتیجه از طریق `GetReceivableQuantity` دوباره قابل‌دریافتِ عادی می‌شود.
2. **تلاش برای حذفِ یک تصمیمِ نهایی‌شده (`REFUND`/`CREDIT`/`WRITE_OFF`، یا یک `REPLACEMENT` که خودش `RESOLVED` شده).** → خطا.
3. **تلاش برای حذفِ تصمیمی که مرجوعی‌اش دیگر قابل‌تغییر نیست.** → خطا.
4. **حذفِ آخرین تصمیمِ باقیمانده‌ی یک مرجوعیِ `COORDINATING`.** وضعیتِ مرجوعی به `PENDING` برمی‌گردد (چون دیگر هیچ تصمیمی ثبت نشده).

---

## 7. فرمان‌های چرخه‌ی عمر مرجوعی: لغو، رد، بازگشایی، حذف

این چهار فرمان همگی خیلی کوتاه و شبیه هم هستند.

### 7.1. `CancelPurchaseReturnCommand`

**Endpoint:** `POST api/PurchaseReturn/CancelPurchaseReturn`

- فقط وقتی مجاز است که `Status == PENDING` باشد (یعنی هنوز هیچ تصمیمی ثبت نشده). در غیر این صورت → «فقط مرجوعی‌های بدون تصمیم ثبت‌شده قابل لغو کردن هستند.»
- وضعیت به `CANCELLED` تغییر می‌کند.
- وضعیتِ خرید با `RecomputePurchaseStatus(purchase, activeReturn: null)` بازمحاسبه می‌شود — به‌عمد `null` پاس داده می‌شود چون این مرجوعی دیگر «فعال» نیست، پس مشکلاتِ گزارش‌شده‌ی رویش دیگر «باز» حساب نمی‌شوند (انگار اصلاً گزارش نشده بودند؛ اگر لازم شود، بعداً می‌توان دوباره برایشان گزارش/مرجوعیِ تازه ساخت).

**چرا فقط از `PENDING`؟** چون به‌محض این‌که حتی یک تصمیم ثبت شود، ممکن است آن تصمیم قبلاً اثرِ واقعی (مثل `SettledQuantity`) گذاشته باشد؛ لغوِ کاملِ مرجوعی در آن حالت یعنی نادیده‌گرفتنِ آن اثر. طبق طراحیِ فرانت‌اند، بعد از اولین تصمیم، واحدِ خرید باید باقیمانده را با «پذیرش زیان» (`WRITE_OFF`) ببندد، نه این‌که کل مرجوعی را لغو کند.

### 7.2. `RejectPurchaseReturnCommand`

**Endpoint:** `POST api/PurchaseReturn/RejectPurchaseReturn`

دقیقاً همان منطقِ `Cancel`، با این تفاوت که وضعیت به `REJECTED` می‌رود (به‌جای `CANCELLED`) و پیام فارسی متفاوت است: «مرجوعی به‌عنوان رد‌شده ثبت شد.» این حالت برای وقتی است که **خودِ تامین‌کننده** مرجوعی را از ابتدا نپذیرفته (نه این‌که واحد خرید داخلی منصرف شده باشد).

### 7.3. `ReopenPurchaseReturnCommand`

**Endpoint:** `POST api/PurchaseReturn/ReopenPurchaseReturn`

- فقط وقتی مجاز است که `Status == REJECTED` باشد. در غیر این صورت → «فقط مرجوعی‌های ردشده قابل بازگشایی هستند.» (توجه: `CANCELLED` قابلِ بازگشایی **نیست** — چون لغو یعنی واحدِ خرید عمداً منصرف شده، ولی رد یعنی طرفِ مقابل (تامین‌کننده) در همان لحظه نپذیرفته و ممکن است بعداً با مذاکره دوباره باز شود.)
- وضعیت با `RecomputeReturnStatus` بازمحاسبه می‌شود — و چون یک مرجوعیِ `REJECTED` هرگز تصمیمی نداشته (طبق قانونِ بخش ۷.۱)، نتیجه‌ی این محاسبه **همیشه** `PENDING` است.
- وضعیتِ خرید هم دوباره با در نظر گرفتنِ همین مرجوعی (این‌بار به‌عنوانِ فعال) بازمحاسبه می‌شود — یعنی مشکلاتِ رویش دوباره «باز» حساب می‌شوند.

### 7.4. `DeletePurchaseReturnCommand`

**Endpoint:** `DELETE api/PurchaseReturn/DeletePurchaseReturn`

- فقط وقتی مجاز است که `Status == PENDING` باشد. در غیر این صورت → «فقط مرجوعی‌های بدون تصمیم ثبت‌شده قابل حذف هستند.»
- برخلافِ همه‌ی entity های دیگرِ پروژه (که soft-delete با `IsActive=false` دارند)، این‌جا **حذفِ واقعی (hard delete)** انجام می‌شود — چون `PurchaseReturn` اصلاً `IsActive` ندارد.
- تمام `PurchaseReturnItem` های زیرمجموعه‌اش (و به‌تبع آن‌ها تمام `PurchaseReturnDecision` هایشان) به‌صورت **cascade** در دیتابیس حذف می‌شوند (تنظیمِ `DeleteBehavior.Cascade` در `WMSDbContext`). چون `Status == PENDING` است، اصلاً هیچ تصمیمی وجود ندارد که حذف شود؛ در عمل فقط خودِ مرجوعی و ردیف‌های `PurchaseReturnItem` (بدون تصمیم) حذف می‌شوند.
- بعد از حذف، وضعیتِ خرید دوباره با `activeReturn: null` بازمحاسبه می‌شود (همان استدلالِ بخش ۷.۱).

> **نکته‌ی مهم دربارهٔ یک باگ که در همین توسعه پیدا و رفع شد:** در نسخه‌ی اولیه‌ی این فرمان، بعد از حذف، وضعیتِ خرید اصلاً بازمحاسبه نمی‌شد. یعنی اگر یک مرجوعیِ `PENDING` حذف می‌شد، درحالی‌که همه‌ی قلم‌های دیگرِ خرید کامل بودند، وضعیتِ خرید همچنان `PARTIALLY_RECEIVED` می‌ماند به‌جای این‌که به `RECEIVED` برگردد. این مورد در بازبینیِ کد پیدا و اصلاح شد: الان `DeletePurchaseReturnCommandHandler` هم خرید و قلم‌هایش را می‌خواند و هم بعد از حذف، `RecomputePurchaseStatus` را صدا می‌زند.

### 7.5. تمام سناریوهای این چهار فرمان

1. لغوِ یک مرجوعیِ `PENDING` → موفق، `CANCELLED`.
2. تلاش برای لغوِ یک مرجوعیِ `COORDINATING`/`RESOLVED`/`REJECTED`/`CANCELLED` → خطا.
3. ردِ یک مرجوعیِ `PENDING` → موفق، `REJECTED`.
4. تلاش برای ردِ یک مرجوعیِ غیر-`PENDING` → خطا.
5. بازگشاییِ یک مرجوعیِ `REJECTED` → موفق، برمی‌گردد به `PENDING`.
6. تلاش برای بازگشاییِ یک مرجوعیِ `CANCELLED` یا هر وضعیتِ دیگر → خطا.
7. حذفِ یک مرجوعیِ `PENDING` که خودش تنها دلیلِ ناقص‌ماندنِ خرید بود → خرید بعد از حذف به `RECEIVED` برمی‌گردد.
8. حذفِ یک مرجوعیِ `PENDING` وقتی هنوز مشکلاتِ دیگری (از قلم‌های دیگر) هم روی خرید باز است → خرید همچنان `PARTIALLY_RECEIVED` می‌ماند.
9. تلاش برای حذفِ یک مرجوعیِ غیر-`PENDING` → خطا.

---

## 8. کوئری‌ها (خواندن داده)

### 8.1. `GetPurchaseReturnListQuery`

**Endpoint:** `GET api/PurchaseReturn/GetPurchaseReturnList`

فیلترهای پشتیبانی‌شده:

| فیلتر | توضیح |
|---|---|
| `Search` | جست‌وجو در `ReturnNumber`، شماره‌فاکتورِ خرید، و نامِ تامین‌کننده |
| `SupplierId` | فقط مرجوعی‌های یک تامین‌کننده‌ی خاص |
| `Status` | فقط یک وضعیتِ خاص |
| `Reason` | فقط مرجوعی‌هایی که حداقل یک قلمشان از این نوعِ مشکل است |
| `FromDate` / `ToDate` | بازه‌ی `ReturnDate` |

خروجی هر ردیف (`PurchaseReturnListDto`) شاملِ `DominantIssueType` است — یعنی نوعِ مشکلی که بیشترین مقدار را در آن مرجوعی دارد (`Items.OrderByDescending(Quantity).First().IssueType`)، همراه با `TotalQuantity` و `TotalAmount` (مجموعِ `Quantity × UnitPrice` تمامِ قلم‌ها).

نتیجه صفحه‌بندی‌شده است (`Page`/`Take` + خروجیِ `ResponsePageDto`).

### 8.2. `GetPurchaseReturnDetailQuery`

**Endpoint:** `GET api/PurchaseReturn/GetPurchaseReturnDetail`

کاملاً یک مرجوعی را با تمام جزئیاتش برمی‌گرداند، به‌همراه چند فیلدِ محاسبه‌شده که مستقیماً UI را ساده می‌کنند:

| فیلد | نحوه‌ی محاسبه |
|---|---|
| `TotalAmount` | مجموعِ `Quantity × UnitPrice` تمام قلم‌ها |
| `FinalizedRefundAmount` | مجموعِ `RefundAmount` تصمیم‌های `REFUND` که `Status == RESOLVED` هستند |
| `TotalQuantity` | مجموعِ `Quantity` تمام قلم‌ها |
| `AllocatedQuantity` | مجموعِ `Quantity` تمامِ تصمیم‌های ثبت‌شده روی تمامِ قلم‌ها |
| `CanDelete` / `CanCancel` / `CanReject` | `true` فقط اگر `Status == PENDING` |
| `CanReopen` | `true` فقط اگر `Status == REJECTED` |

این چهار فیلد `Can...` عمداً از سرور محاسبه و فرستاده می‌شوند تا فرانت‌اند مجبور نباشد قوانینِ مجازبودنِ هر اکشن را دوباره در کلاینت پیاده کند و دو طرف از هم عقب نمانند.

هر قلمِ داخلِ لیستِ `Items` هم `AllocatedQuantity` و `RemainingQuantity` (مقدارِ هنوز بدون‌تصمیم، مخصوصِ همان قلم) را دارد.

### 8.3. `GetPurchaseReceivingInfoQuery`

**Endpoint:** `GET api/PurchaseReturn/GetPurchaseReceivingInfo`

این کوئری مخصوصِ **صفحه‌ی دریافتِ انبار** طراحی شده — همان صفحه‌ای که در آن انباردار قرار است بگوید هر قلم چقدر رسیده و چقدرش مشکل دارد. قبل از این‌که انباردار فرمِ `ReceivePurchaseCommand` را پر کند، این کوئری باید صدا زده شود تا:

- برای هر قلمِ خرید، `OrderedQuantity`، `ReceivedQuantity` (تا الان)، `SettledQuantity` (تا الان)، `OpenIssueQuantity` (مشکلاتِ بدون‌تصمیمِ فعلی) و `ReceivableQuantity` (سقفِ واقعیِ قابل‌دریافت در همین دور) نمایش داده شود.
- لیستِ `OpenIssues` هر قلم هم نشان دهد چه مشکلاتی از قبل روی این قلم گزارش شده و چقدرشان تصمیم‌گیری شده (`DecidedQuantity`) — این دقیقاً معادلِ سرور برای چیزی است که در فرانت‌اند «گزارشِ انبار» (`shortage report`) نامیده می‌شود، با این تفاوت که این‌جا از دادهٔ واقعیِ ذخیره‌شده در دیتابیس محاسبه می‌شود، نه یک چیزِ موقتیِ سمتِ کلاینت.

---

## 9. Repository و DbContext

### 9.1. `IPurchaseReturnRepository`

```csharp
public interface IPurchaseReturnRepository : IGenericRepository<Domain.Entities.PurchaseReturn>
{
    Task<Domain.Entities.PurchaseReturn?> GetActiveByPurchaseIdAsync(int purchaseId, CancellationToken cancellationToken);
}
```

پیاده‌سازی:

```csharp
public async Task<PurchaseReturn?> GetActiveByPurchaseIdAsync(int purchaseId, CancellationToken cancellationToken)
{
    return await _context.PurchaseReturns
        .Where(x => x.PurchaseId == purchaseId &&
                    (x.Status == PENDING || x.Status == COORDINATING))
        .Include(x => x.Items)
            .ThenInclude(x => x.Decisions)
        .FirstOrDefaultAsync(cancellationToken);
}
```

این تنها متدِ اختصاصیِ این ریپازیتوری است و در ۴ جای مختلف استفاده می‌شود: `ReceivePurchaseCommand`، `GetPurchaseReceivingInfoQuery`، و به‌طورِ غیرمستقیم هر جایی که باید بداند «آیا الان یک مرجوعیِ در‌حال‌پیگیری برای این خرید وجود دارد یا نه».

### 9.2. تغییرات در `WMSDbContext`

- `DbSet<PurchaseReturnItem> PurchaseReturnItems` و `DbSet<PurchaseReturnDecision> PurchaseReturnDecisions` جایگزینِ نام‌های قدیمی‌شان شدند.
- رابطه‌ها در `OnModelCreating`:
  - `PurchaseReturn → Purchase`: `Restrict` (نباید با حذفِ خرید، مرجوعی هم پاک شود — چون خرید اصلاً soft-delete است، نه hard-delete).
  - `PurchaseReturnItem → PurchaseReturn`: **`Cascade`** (با حذفِ یک مرجوعی، قلم‌هایش هم پاک شوند).
  - `PurchaseReturnItem → PurchaseItem`: `Restrict`.
  - `PurchaseReturnItem → Product`: `Restrict`.
  - `PurchaseReturnDecision → PurchaseReturnItem`: **`Cascade`** (با حذفِ یک قلمِ مرجوعی، تصمیم‌هایش هم پاک شوند).

این ترکیبِ `Cascade` دقیقاً چیزی است که `DeletePurchaseReturnCommand` را ساده نگه می‌دارد — کافی است فقط `PurchaseReturn` حذف شود، بقیه‌ی درخت خودش پاک می‌شود.

---

## 10. Migration دیتابیس

Migration نهایی: **`20260805211146_purchase-return-lifecycle`**

این migration روی آخرین migration واقعاً commit‌شده (`20260802220706_purchase-return-model`) ساخته شده — یک migration میانیِ commit‌نشده از تلاشِ اول (که ناقص بود) کنار گذاشته شد تا تاریخچه‌ی migration ها تمیز بماند.

مهم‌ترین تغییراتِ این migration:

- تغییرِ نامِ جدولِ `PurchaseReturnItem` → `PurchaseReturnItems` و `PurchaseReturnDecision` → `PurchaseReturnDecisions`.
- افزودنِ ستونِ `SettledQuantity` به جدولِ `PurchaseItems`.
- افزودنِ ستونِ `CreatedAt` به جدولِ `PurchaseReturnItems`.
- افزودنِ ستونِ `ResolvedAt` (قابلِ null) به جدولِ `PurchaseReturnDecisions`.
- تبدیلِ ستونِ `RefundAmount` از غیرِ-null به قابلِ null.
- افزودنِ Foreign Key از `PurchaseReturnItems.ProductId` به `Products`.
- تنظیمِ `ON DELETE CASCADE` روی روابطِ ذکرشده در بخشِ قبل.

> **این migration هنوز روی هیچ دیتابیسی اجرا نشده است.** برای اعمالِ آن باید دستورِ زیر از پوشه‌ی `Backend-Net` اجرا شود:
> ```
> dotnet ef database update --project Infrastructure --startup-project WMS
> ```

---

## 11. ثبت سرویس در DI

طبقِ همان الگویی که در پروژه‌ی مرجعِ `smshub2` برای `ITokenService`/`TokenService` و `IDashboardService`/`DashboardService` استفاده شده، سرویسِ محاسباتی هم به همین شکل ثبت شده:

```csharp
// Infrastructure/Ioc/InfrastructureServiceRegistration.cs
services.AddScoped<IPurchaseReturnCalculationService, PurchaseReturnCalculationService>();
```

یعنی اینترفیس در لایه‌ی `Application` تعریف می‌شود (`Application/Common/Contracts/PurchaseReturn/`) و پیاده‌سازیِ آن در لایه‌ی `Infrastructure` قرار می‌گیرد (`Infrastructure/Services/`) — دقیقاً همان جدایی‌ای که در بقیه‌ی سرویس‌های پروژه رعایت شده.

---

## 12. یک نکته‌ی فنی خاص .NET که چند بار در این فیچر گیر انداخت

در C#، وقتی داخلِ یک namespace هستید (مثلاً `Application.Common.Contracts.Context`) و در همان زنجیره‌ی namespace های بیرونی (`Application.Common.Contracts`، `Application.Common`، `Application`) یک namespace هم‌نام با یک نوعِ (type) واقعی وجود داشته باشد (مثلاً یک namespace به اسمِ `Application.Common.Contracts.PurchaseReturn` که یک entity هم به اسمِ `PurchaseReturn` در `Domain.Entities` وجود دارد)، کامپایلر وقتی به کلمه‌ی خامِ `PurchaseReturn` (بدونِ using) برمی‌خورد، اول namespace هم‌نام را پیدا می‌کند و خطای `CS0118: 'PurchaseReturn' is a namespace but is used like a type` می‌دهد.

این اتفاق در این فیچر **دو بار** افتاد:

1. اولین بار وقتی namespace فیچر `Application.Features.PurchaseReturn.Commands`/`Queries` ساخته شد — چون segment آخرش `PurchaseReturn` است.
2. بارِ دوم، دقیقاً همین سناریو، وقتی namespace جدیدِ `Application.Common.Contracts.PurchaseReturn` برای سرویس ساخته شد — این‌بار فایل‌هایی مثلِ `IWMSDbContext.cs` (که در `Application.Common.Contracts.Context` است، یعنی خواهرِ همان namespace جدید) هم به همین مشکل خوردند.

**راه‌حل ثابت:** در هر جایی که این تداخل پیش بیاید، به‌جایِ نوشتنِ خامِ `PurchaseReturn`، همیشه کاملاً نوشته می‌شود: `Domain.Entities.PurchaseReturn`. این کار در تمامِ فایل‌های این فیچر رعایت شده است.

---

## 13. جدول کامل Endpoint ها

| متد HTTP | مسیر | فرمان/کوئری | توضیح |
|---|---|---|---|
| `POST` | `api/Purchase/ReceivePurchase` | `ReceivePurchaseCommand` | ثبتِ یک دورِ دریافتِ کالا از خرید |
| `GET` | `api/PurchaseReturn/GetPurchaseReturnList` | `GetPurchaseReturnListQuery` | لیستِ مرجوعی‌ها با فیلتر و صفحه‌بندی |
| `GET` | `api/PurchaseReturn/GetPurchaseReturnDetail` | `GetPurchaseReturnDetailQuery` | جزئیاتِ کاملِ یک مرجوعی |
| `GET` | `api/PurchaseReturn/GetPurchaseReceivingInfo` | `GetPurchaseReceivingInfoQuery` | اطلاعاتِ لازم برای صفحه‌ی دریافتِ انبار |
| `POST` | `api/PurchaseReturn/AddPurchaseReturnDecision` | `AddPurchaseReturnDecisionCommand` | ثبتِ یک تصمیم برای بخشی از یک مشکل |
| `DELETE` | `api/PurchaseReturn/RemovePurchaseReturnDecision` | `RemovePurchaseReturnDecisionCommand` | حذفِ یک تصمیمِ هنوز `AWAITING` |
| `POST` | `api/PurchaseReturn/CancelPurchaseReturn` | `CancelPurchaseReturnCommand` | لغوِ یک مرجوعیِ `PENDING` |
| `POST` | `api/PurchaseReturn/RejectPurchaseReturn` | `RejectPurchaseReturnCommand` | ردِ یک مرجوعیِ `PENDING` |
| `POST` | `api/PurchaseReturn/ReopenPurchaseReturn` | `ReopenPurchaseReturnCommand` | بازگشاییِ یک مرجوعیِ `REJECTED` |
| `DELETE` | `api/PurchaseReturn/DeletePurchaseReturn` | `DeletePurchaseReturnCommand` | حذفِ کاملِ یک مرجوعیِ `PENDING` |

---

## 14. جمع‌بندی سناریوها (چک‌لیست کامل)

### دریافتِ خرید
- [x] دریافتِ کاملِ یک‌مرحله‌ای بدونِ مشکل
- [x] دریافتِ جزئیِ چندمرحله‌ای
- [x] گزارشِ کسری (`SHORTAGE`)
- [x] گزارشِ کالای معیوب (`DEFECTIVE`)
- [x] گزارشِ کالای آسیب‌دیده (`DAMAGED`)
- [x] گزارشِ کالای تاریخ‌گذشته (`EXPIRED`)
- [x] گزارشِ ارسالِ کالای اشتباه (`WRONG_ITEM`)
- [x] گزارشِ سایرِ موارد (`OTHER`)
- [x] گزارشِ کالای اضافی (`EXCESS`) — بدونِ محدودیتِ بودجه، بدونِ افزودن به استوک
- [x] یک قلم هم‌زمان چند نوع مشکل دارد
- [x] همان نوع مشکل در دو دورِ مختلف گزارش می‌شود (ادغام)
- [x] تلاش برای دریافتِ بیش از باقیمانده → خطا
- [x] تلاش برای دریافتِ خریدِ لغوشده → خطا
- [x] تلاش برای ارسالِ یک `PurchaseItemId` تکراری در یک درخواست → خطا
- [x] ردیفی بدونِ هیچ `ReceivedQuantity` یا `Issue` → خطا
- [x] بازاستفاده از مرجوعیِ فعالِ موجود به‌جایِ ساختنِ مرجوعیِ جدید
- [x] رزولوشنِ خودکارِ یک `REPLACEMENT` در دورِ دریافتِ بعدی

### تصمیم‌گیری
- [x] `REFUND` با مبلغِ پیش‌فرض
- [x] `REFUND` با مبلغِ دستی
- [x] `REPLACEMENT` → `AWAITING`
- [x] `CREDIT` → بلافاصله `RESOLVED`
- [x] `WRITE_OFF` → بلافاصله `RESOLVED`
- [x] تصمیمِ نامعتبر بر اساسِ ماتریسِ نوعِ مشکل → خطا
- [x] مقدارِ بیش از باقیماندهٔ مشکل → خطا
- [x] تصمیم روی مرجوعیِ غیرقابل‌تغییر → خطا
- [x] تقسیمِ یک مشکل بین چند نوع تصمیم
- [x] آخرین تصمیمِ لازم → مرجوعی `RESOLVED` می‌شود
- [x] اولین تصمیم → مرجوعی از `PENDING` به `COORDINATING` می‌رود

### حذفِ تصمیم
- [x] حذفِ یک `AWAITING`
- [x] تلاش برای حذفِ یک `RESOLVED` → خطا
- [x] تلاش برای حذف روی مرجوعیِ غیرقابل‌تغییر → خطا
- [x] حذفِ آخرین تصمیم → مرجوعی به `PENDING` برمی‌گردد

### چرخه‌ی عمرِ مرجوعی
- [x] لغوِ یک `PENDING`
- [x] تلاش برای لغوِ غیر-`PENDING` → خطا
- [x] ردِ یک `PENDING`
- [x] تلاش برای ردِ غیر-`PENDING` → خطا
- [x] بازگشاییِ یک `REJECTED`
- [x] تلاش برای بازگشاییِ غیر-`REJECTED` (از جمله `CANCELLED`) → خطا
- [x] حذفِ یک `PENDING` و بازگشتِ خرید به `RECEIVED`
- [x] حذفِ یک `PENDING` وقتی هنوز چیزِ دیگری ناقص است
- [x] تلاش برای حذفِ غیر-`PENDING` → خطا

### وضعیتِ خرید
- [x] `PENDING`/`SHIPPED` → بدونِ تغییر تا وقتی چیزی دریافت/تسویه نشده
- [x] `PARTIALLY_RECEIVED` به‌محضِ اولین دریافت یا تسویه
- [x] `RECEIVED` وقتی همه‌چیز حساب‌رسی شده و هیچ مشکلِ بازی نمانده
- [x] `CANCELLED` همیشه ثابت می‌ماند، هیچ اکشنی آن را عوض نمی‌کند

---

## 15. کارهای باقی‌مانده / محدودیت‌های شناخته‌شده

- **Migration اجرا نشده.** باید `dotnet ef database update` روی دیتابیسِ واقعی زده شود.
- **تست نشده روی داده‌ی واقعی/API درحالِ اجرا.** منطق به‌دقت بازبینی و از نظرِ منطقی بررسی شده و پروژه بدونِ خطا build می‌شود، اما هنوز از طریقِ اجرای واقعیِ API تست نشده.
- **مسیرهای فرانت‌اند با بک‌اند یکی نیستند.** فرانت‌اند مسیرهایی مثل `/purchase-returns/:id` را در `services/returns/api-v1.js` صدا می‌زند، درحالی‌که بک‌اند از الگویِ اسم-اکشن (`api/PurchaseReturn/GetPurchaseReturnDetail`) استفاده می‌کند. هر کسی که بخواهد فرانت‌اند را از حالتِ mock به این API واقعی وصل کند، باید یک لایه‌ی adapter بنویسد.
- **`TRACKABLE` پیاده‌سازی نشده.** فرانت‌اند یک وضعیتِ مجازیِ سمتِ کلاینت به اسمِ `TRACKABLE` دارد (برای خریدهایی که مشکل دارند ولی هنوز رسماً مرجوعی برایشان ساخته نشده). چون در این طراحی، `ReceivePurchaseCommand` همیشه بلافاصله یک مرجوعیِ رسمیِ `PENDING` می‌سازد، این حالتِ میانی اصلاً پیش نمی‌آید و نیازی به پیاده‌سازیِ آن نیست.
