# طراحی ماژول «کد محصول، بارکد و فاکتور»

این سند طراحی بک‌اند برای دو خواسته‌ی جلسه‌ی ۱۴۰۵/۰۵/۲۲ (چت تلگرام سینا و هادی) است:

۱. **کد محصول و بارکد** — تولید خودکار با یک الگوی مشخص، قابل چاپ و قابل خواندن با اسکنر.
۲. **فاکتور** — تولید PDF در بک‌اند و تحویل آن به فرانت.

سند فقط بک‌اند را پوشش می‌دهد. مثل `docs/purchase-return-guide.fa.md` و `docs/sale-return-guide.fa.md` نوشته شده و از همان قراردادهای معماری پروژه (`CLAUDE.md`) پیروی می‌کند.

> وضعیت: **طراحی، هنوز پیاده‌سازی نشده.** هیچ کدی از این سند هنوز نوشته نشده است.

---

## بخش صفر — خلاصه‌ی تصمیم‌های گرفته‌شده در چت

آنچه در گفتگو نهایی شد، به‌همراه تفسیر مهندسی‌اش:

| موضوع | تصمیم چت | تفسیر در این طراحی |
|---|---|---|
| کد محصول | `Date-productId` (سطح کالا) | `Product.Code`، تولید خودکار، غیرقابل‌ویرایش |
| بارکد | `Date-productId-productNumber` (سطح تک‌کالا) | جدول جدید `ProductUnit`، یک ردیف به‌ازای هر دانه‌ی فیزیکی |
| «شماره محصول» | «قوطی کبریت ۱، قوطی کبریت ۲» | `ProductUnit.SerialNumber`، شمارنده‌ی مستقل per-product |
| تاریخ | ترجیحاً شمسی | شمسی، با `System.Globalization.PersianCalendar` (بدون پکیج) |
| نام کاربر ثبت‌کننده | حذف شد («کاربر ممکنه اسمش رو عوض کنه») | در کد نیست؛ اگر لازم شد `CreatedByUserId` جداگانه ذخیره می‌شود |
| ورودی کاربر | «تو ثبت کالا شما هیچی وارد نمی‌کنید» | `Code`/`BarCode` از پیلود Create/Update حذف می‌شوند |
| بارکد تامین‌کننده | «ولش کن، بعداً اضافه می‌کنیم» | فقط یک ستون nullable بی‌منطق، تا بعداً مهاجرت دوم لازم نشود |
| فروش | «تو فروش هم باید شماره محصول ثبت بشه» | `ProductUnit.SaleItemId` هنگام ارسال مهر می‌خورد |
| سرچ | «قسمت آخرش رو نادیده بگیریم» | نرمال‌سازی در `ScanBarcodeQuery`، هم کد کالا هم بارکد دانه را می‌پذیرد |

---

## بخش یک — الگوی کد محصول و بارکد

### ۱.۱ سه نمایش از یک شناسه

طراحی بین سه چیز تفکیک قائل می‌شود؛ خلط این سه، منشأ اکثر باگ‌های بارکد است:

| نام | مثال | کجا استفاده می‌شود |
|---|---|---|
| **کد محصول** (`Product.Code`) | `14050512-000123` | نمایش در UI، جستجوی دستی، چاپ زیر بارکد |
| **بارکد دانه** (`ProductUnit.Barcode`) | `14050512-000123-000002` | متن خوانا زیر میله‌های بارکد |
| **payload ماشینی** (`ProductUnit.BarcodePayload`) | `14050512000123000002` | چیزی که واقعاً داخل میله‌ها کد می‌شود و اسکنر برمی‌گرداند |

اجزاء با **عرض ثابت** و **فقط رقم**:

```
کد محصول :  YYYYMMDD  +  productId(6)              = 14 رقم
بارکد دانه:  YYYYMMDD  +  productId(6) + serial(6)  = 20 رقم
             └ تاریخ شمسیِ ساخت محصول
```

مثال کامل برای محصول ۱۲۳ که در ۱۴۰۵/۰۵/۱۲ ثبت شده، دانه‌ی دوم:

```
Product.Code            = "14050512-000123"
Product.BarCode         = "14050512000123"
ProductUnit.Barcode     = "14050512-000123-000002"
ProductUnit.BarcodePayload = "14050512000123000002"
```

### ۱.۲ چرا عرض ثابت و بدون خط تیره؟

دو دلیل فنی، هر دو مهم:

**۱. پارس‌پذیری.** اسکنر رشته‌ی خام را برمی‌گرداند. اگر `productId` عرض متغیر داشته باشد (`12345` یا `123`)، از روی رشته نمی‌شود فهمید مرز فیلدها کجاست — دقیقاً همان چیزی که هادی به شوخی گفت: «اگه محصول اول باشه ۱۰ رقمی، اگه صدم باشه ۱۲ رقمی 😂». با عرض ثابت، `payload.Length` تکلیف را روشن می‌کند: ۱۴ رقم یعنی کد کالا، ۲۰ رقم یعنی بارکد دانه.

**۲. اندازه‌ی برچسب.** Code128 یک زیرمجموعه‌ی «C» دارد که هر **دو رقم** را در یک سمبل جا می‌دهد — یعنی نصف پهنا. این فقط وقتی فعال می‌شود که payload تماماً رقم و تعداد ارقام زوج باشد. مقایسه:

| payload | زیرمجموعه | تعداد ماژول | پهنا در X=0.33mm |
|---|---|---|---|
| `14050512-000123-000002` (با خط تیره) | B | ۲۶۳ | ~۸۷ میلی‌متر |
| `14050512000123000002` (۲۰ رقم) | C | ۱۴۵ | ~۴۸ میلی‌متر |

۸۷ میلی‌متر روی برچسب انباری جا نمی‌شود. ۴۸ میلی‌متر می‌شود. این تنها دلیل حذف خط تیره از payload است — خط تیره‌ها در **متن خوانا** زیر بارکد باقی می‌مانند، پس آدم همان چیزی را می‌بیند که در چت توافق شد.

### ۱.۳ نرمال‌سازی هنگام اسکن

هر ورودی‌ای که از اسکنر یا کیبورد می‌آید، از یک مسیر واحد رد می‌شود:

```
ورودی خام  →  حذف هر کاراکتر غیر رقم  →  بر اساس طول تصمیم‌گیری
                                          ├─ ۱۴ رقم → Product
                                          ├─ ۲۰ رقم → ProductUnit (+ Product آن)
                                          └─ غیره   → NotFoundCustomException
```

این همان «برای سرچ کردن قسمت آخرش رو باید نادیده بگیریم» است: بارکد دانه‌ی ۲۰ رقمی، ۱۴ رقم اولش کد کالاست، پس همیشه به محصول می‌رسیم — چه دانه پیدا شود چه نشود.

### ۱.۴ مشکل مرغ و تخم‌مرغ

`Code` به `Product.Id` نیاز دارد، و `Id` قبل از `SaveChanges` وجود ندارد. راه‌حل: **ذخیره‌ی دومرحله‌ای در همان هندلر**.

```csharp
// CreateProductCommandHandler
var product = _mapper.Map<Domain.Entities.Product>(request);
await _productRepository.AddAsync(product);
await _unitOfWork.SaveChangesAsync();          // اینجا Id ساخته می‌شود

product.Code    = _productCodeService.BuildProductCode(product.Id, product.CreatedAt);
product.BarCode = ProductCodeService.ToPayload(product.Code);
if (product.Stock > 0)
    await _productUnitService.MintUnitsAsync(product, product.Stock, null, cancellationToken);
await _unitOfWork.SaveChangesAsync();          // ذخیره‌ی دوم
```

جایگزین‌ها (`SEQUENCE` در SQL Server، یا `Guid` به‌عنوان کلید) هر دو تغییرات بزرگ‌تری در مدل موجود می‌خواستند. دو بار `SaveChanges` در یک هندلر ساده‌ترین راه است و در این حجم بار، هزینه‌ای ندارد.

**نکته‌ی صداقت مهندسی:** بین دو `SaveChanges` تراکنش صریحی وجود ندارد (`IUnitOfWork` فقط `SaveChangesAsync` دارد). اگر ذخیره‌ی دوم شکست بخورد، محصولی با `Code` خالی باقی می‌ماند. برای پوشش این حالت یک دستور ادمینی `EnsureProductCodesCommand` در بخش ۱.۹ دیده شده که همان کار را برای ردیف‌های بی‌کد انجام می‌دهد.

### ۱.۵ موجودیت جدید: `ProductUnit`

```csharp
namespace Domain.Entities
{
    public class ProductUnit
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int SerialNumber { get; set; }        // شمارنده per-product، از ۱
        public string Barcode { get; set; }          // خوانا، با خط تیره
        public string BarcodePayload { get; set; }   // ۲۰ رقم، چیزی که اسکنر می‌خواند

        public ProductUnitStatusEnum Status { get; set; }

        public int? PurchaseItemId { get; set; }     // با کدام رسید انبار به وجود آمد
        public int? SaleItemId { get; set; }         // با کدام قلم فروش خارج شد

        public DateTime CreatedAt { get; set; }
        public DateTime? SoldAt { get; set; }
        public bool IsActive { get; set; }
    }
}
```

```csharp
namespace Domain.Enums
{
    public enum ProductUnitStatusEnum
    {
        IN_STOCK = 1,
        SOLD = 2,
        RETURNED_TO_SUPPLIER = 3,
        SCRAPPED = 4
    }
}
```

ایندکس‌ها (در `WMSDbContext.OnModelCreating`):

```csharp
modelBuilder.Entity<ProductUnit>()
    .HasOne(x => x.Product).WithMany()
    .HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Restrict);

modelBuilder.Entity<ProductUnit>().HasIndex(x => x.BarcodePayload).IsUnique();
modelBuilder.Entity<ProductUnit>().HasIndex(x => new { x.ProductId, x.SerialNumber }).IsUnique();
modelBuilder.Entity<ProductUnit>().HasIndex(x => x.SaleItemId);
modelBuilder.Entity<Product>().HasIndex(x => x.Code).IsUnique();
```

`SaleItemId`/`PurchaseItemId` عمداً **بدون** ناوبری و بدون FK محدودکننده تعریف می‌شوند (فقط `int?` + ایندکس)، تا به گراف Include فیچرهای مرجوعی که همین الان پیچیده هستند اضافه نشوند.

### ۱.۶ ناوردا (Invariant) — مهم‌ترین بند این سند

```
Product.Stock  ==  COUNT(ProductUnit WHERE ProductId = p AND Status = IN_STOCK)
```

هر جایی که امروز `Product.Stock` را تغییر می‌دهد، باید هم‌زمان `ProductUnit` را هم تغییر دهد. نقاط تغییر امروز (از grep روی `Application/`):

| فایل | تغییر فعلی | کاری که باید اضافه شود |
|---|---|---|
| `ReceivePurchaseCommand.cs:116` | `Stock += ReceivedQuantity` | **Mint** به تعداد دریافتی، با `PurchaseItemId` مهر‌شده |
| `ShipSaleCommand.cs:90` | `Stock -= ShippedQuantity` | **Consume**: N دانه به `SOLD`، مهر `SaleItemId` و `SoldAt` |
| `ConfirmReplacementShipmentCommand.cs:77` | `Stock -= ShippedQuantity` | **Consume**، همان منطق |
| `ConfirmReturnInspectionCommand.cs:125` | `Stock += qty` (فقط سالم‌ها) | **Restore**: دانه‌های `SOLD` همان `SaleItem` به `IN_STOCK` |
| `UpdateProductCommand.cs:73` | `Stock = request.Stock` | **Reconcile** — پایین را ببینید |
| `CreateProductCommand.cs` | `Stock` اولیه از پیلود | **Mint** به همان تعداد |

نکته‌های پیامد‌دار:

- **مرجوعی معیوب هرگز به `IN_STOCK` برنمی‌گردد.** `ConfirmReturnInspectionCommand` امروز فقط مقدار سالم را به `Stock` اضافه می‌کند؛ دانه‌های معیوب باید `SCRAPPED` شوند، نه اینکه رها شوند — وگرنه ناوردا می‌شکند (دانه‌های `SOLD` که هرگز به فروش نرفتند).
- **`EXCESS` در خرید دانه نمی‌سازد.** طبق قانون موجود، مقدار مازاد وارد `Stock` نمی‌شود، پس نباید Mint شود. سازگار است.
- **تصمیم‌های `PurchaseReturn` به `Stock` دست نمی‌زنند**، پس نیازی به تغییر دانه ندارند — به‌جز اگر بعداً «مرجوع به تامین‌کننده» فیزیکی اضافه شود که آن‌وقت `RETURNED_TO_SUPPLIER` جای خود را دارد.
- **`UpdateProductCommand` بزرگ‌ترین ریسک است.** امروز `Stock` را آزادانه بازنویسی می‌کند. دو گزینه:
  - **الف)** ویرایش `Stock` را از `UpdateProductCommand` حذف کنیم (موجودی فقط از مسیر خرید/فروش عوض شود). تمیزتر، ولی رفتار موجود را می‌شکند.
  - **ب)** آشتی‌دهی: اگر عدد جدید بیشتر بود Mint کن، اگر کمتر بود از بزرگ‌ترین سریال‌ها `SCRAPPED` کن.
  - **پیشنهاد: ب**، چون رفتار فعلی فرانت را نمی‌شکند و انبار واقعاً به «اصلاح دستی موجودی» نیاز دارد.

### ۱.۷ تخصیص سریال و همزمانی

`MintUnitsAsync` سریال بعدی را با `MAX(SerialNumber) + 1` روی همان محصول می‌گیرد. این در حالت همزمانی مسابقه دارد (دو رسید انبار هم‌زمان روی یک محصول). پوشش:

- ایندکس یکتای `(ProductId, SerialNumber)` باعث می‌شود مسابقه به‌جای داده‌ی خراب، به خطای درج ختم شود.
- هندلر یک بار retry می‌کند و دوباره `MAX` را می‌خواند.

برای بار کاری این پروژه کافی است. اگر روزی نشد، راه‌حل درست یک `SEQUENCE` per-product یا جدول شمارنده با قفل است.

### ۱.۸ انتخاب دانه هنگام فروش (اسکن برای فروش)

چت: «چون فروشنده بارکد رو اسکن می‌کنه شماره محصول رو هم داره». برای اینکه این جمله واقعاً معنا پیدا کند، `ShipSaleCommand` یک فیلد **اختیاری** می‌گیرد:

```csharp
public class ShipSaleItemDto
{
    public int SaleItemId { get; set; }
    public int ShippedQuantity { get; set; }
    public List<string>? ProductUnitBarcodes { get; set; }   // جدید، اختیاری
}
```

- اگر **داده نشود** → انتخاب FIFO بر اساس `SerialNumber` (رفتار فعلی حفظ می‌شود، پیلود قدیمی همچنان کار می‌کند).
- اگر **داده شود** → اعتبارسنجی: تعداد باید دقیقاً با `ShippedQuantity` برابر باشد، همه باید `IN_STOCK` و متعلق به همان `ProductId` باشند، وگرنه `ValidationCustomException`.

همین الگو برای `ConfirmReplacementShipmentCommand` تکرار می‌شود.

### ۱.۹ سرویس‌ها

مطابق الگوی `IPurchaseReturnCalculationService` (اینترفیس در `Application/Common/Contracts/`، پیاده‌سازی در `Infrastructure/Services/`، ثبت `Scoped`):

**`IProductCodeService`** — `Application/Common/Contracts/ProductCode/`

```csharp
string BuildProductCode(int productId, DateTime createdAtUtc);   // "14050512-000123"
string BuildUnitBarcode(string productCode, int serialNumber);   // "...-000002"
static string ToPayload(string humanReadable);                   // حذف غیر رقم
BarcodeReference Parse(string scannedInput);                     // نرمال‌سازی + تشخیص نوع
```

```csharp
public class BarcodeReference
{
    public BarcodeReferenceKindEnum Kind { get; set; }   // PRODUCT | UNIT | UNKNOWN
    public string NormalizedPayload { get; set; }
    public int? ProductId { get; set; }
    public int? SerialNumber { get; set; }
}
```

**`IProductUnitService`** — `Application/Common/Contracts/ProductUnit/`

```csharp
Task<List<ProductUnit>> MintAsync(Product product, int count, int? purchaseItemId, CancellationToken ct);
Task<List<ProductUnit>> ConsumeAsync(Product product, int count, int saleItemId,
                                     List<string>? explicitBarcodes, CancellationToken ct);
Task RestoreAsync(int saleItemId, int healthyCount, int scrapCount, CancellationToken ct);
Task ReconcileStockAsync(Product product, int newStock, CancellationToken ct);
```

هر چهار متد فقط موجودیت‌ها را تغییر می‌دهند و **`SaveChangesAsync` صدا نمی‌زنند** — دقیقاً مثل `IPurchaseReturnCalculationService`، تا هندلر فراخوان صاحب تراکنش بماند.

**`EnsureProductCodesCommand`** (ادمینی، `POST api/Product/EnsureProductCodes`): برای هر محصولی که `Code` خالی/غیراستاندارد دارد کد می‌سازد، و برای هر محصولی که `COUNT(units IN_STOCK) != Stock` است اختلاف را Mint/Scrap می‌کند. هم برای مهاجرت داده‌ی موجود لازم است هم به‌عنوان تور ایمنی برای حالت شکست بند ۱.۴.

### ۱.۱۰ اندپوینت‌های جدید

`ProductController` (طبق قرارداد نام‌گذاری اکشن‌محور پروژه):

| متد | مسیر | درخواست |
|---|---|---|
| GET | `api/Product/ScanBarcode` | `ScanBarcodeQuery { Code }` → محصول + وضعیت دانه |
| GET | `api/Product/GetProductUnitList` | `GetProductUnitListQuery { ProductId?, Status?, Page, Take }` |
| POST | `api/Product/EnsureProductCodes` | `EnsureProductCodesCommand {}` |

`ScanBarcode` قلب فلوی انبار است: یک رشته می‌گیرد، نرمال می‌کند، و کل اطلاعات محصول را برمی‌گرداند («وقتی اسکنش کرد اطلاعات کامل رو نشون بده» — هادی، خط ۲۱۳).

### ۱.۱۱ تغییرات شکننده در API موجود

- `CreateProductCommand.Code` و `.BarCode` **حذف می‌شوند** (و ولیدیتورهای `NotEmpty` مربوطه). این همان «تو ثبت کالا شما هیچی وارد نمی‌کنید، من خودم می‌زنم» است. فرانت باید فیلد را gray-out کند با متن «به‌صورت خودکار تولید می‌شود».
- `UpdateProductCommand.Code`/`.BarCode` هم حذف می‌شوند — کد محصول پس از ساخت **تغییرناپذیر** است، چون روی برچسب‌های چاپ‌شده رفته است.
- ستون جدید `Product.SupplierBarCode` (`string?`) اضافه می‌شود ولی **هیچ منطقی ندارد**: نه تولید می‌شود، نه اسکن‌پذیر است، نه در جستجو شرکت می‌کند. صرفاً برای اینکه وقتی سعید بعداً بارکد تامین‌کننده را خواست، مهاجرت دوم لازم نشود. اگر ترجیح می‌دهید ستون مرده نداشته باشید، حذفش هزینه‌ای ندارد.

---

## بخش دو — رندر بارکد

### ۲.۱ انتخاب فنی

- **سمبولوژی: Code128** (زیرمجموعه‌ی C خودکار). دلیل: payload ما تماماً رقمی و طول‌متغیر است. EAN-13/GS1 گزینه نیست چون نیازمند ثبت‌نام در GS1 و پیشوند شرکتی است.
- **پکیج انکود: `ZXing.Net`** (کاملاً managed، بدون باینری نیتیو). فقط از هسته‌اش استفاده می‌کنیم: `MultiFormatWriter.encode(...)` که یک `BitMatrix` می‌دهد — یعنی داده‌ی خام ماژول‌ها، بدون رندر.
- **خروجی: SVG برداری**، که خودمان از روی `BitMatrix` می‌سازیم و به QuestPDF می‌دهیم.

**چرا برداری و نه تصویر؟** چون گفتید نمی‌دانید با چه دستگاهی چاپ می‌شود. بارکد رستری که در DPI اشتباه چاپ شود، میله‌هایش گرد/محو می‌شوند و اسکنر نمی‌خواندش — این شایع‌ترین علت بارکد ناخوانا است. SVG برداری در هر DPI دقیقاً همان نسبت میله/فاصله را حفظ می‌کند. با این کار، تصمیمِ «چه چاپگری» را از کد بیرون می‌کشیم و به کانفیگ می‌سپاریم.

### ۲.۲ `IBarcodeRenderer`

`Application/Common/Contracts/Barcode/`، پیاده‌سازی `Infrastructure/Services/ZXingBarcodeRenderer.cs`، ثبت `Singleton` (بدون state).

```csharp
string RenderCode128Svg(string payload, BarcodeRenderOptions options);
string RenderQrSvg(string payload, BarcodeRenderOptions options);
```

```csharp
public class BarcodeRenderOptions
{
    public decimal ModuleWidthMm { get; set; } = 0.33m;   // X-dimension
    public decimal BarHeightMm { get; set; } = 12m;
    public int QuietZoneModules { get; set; } = 10;       // حاشیه‌ی سفید، استاندارد حداقل ۱۰
    public bool ShowHumanReadable { get; set; } = true;
    public decimal HumanReadableFontSizePt { get; set; } = 7m;
}
```

**هشدار چاپ که باید به دست انبار برسد:** `ModuleWidthMm = 0.33` روی چاپگر ۲۰۳dpi (متداول‌ترین لیبل‌پرینتر حرارتی) درست چاپ می‌شود. اگر چاپگر رزولوشن کمتری داشت یا برچسب کوچک‌تر بود، باید این عدد را **بالا** برد نه پایین. زیر ۰٫۲۵ میلی‌متر نروید.

### ۲.۳ چیدمان برگه‌ی برچسب

دو حالت، هر دو از یک مدل تغذیه می‌شوند:

- **`SHEET`** — کاغذ A4 با شبکه‌ی N×M برچسب (برچسب‌های خودچسب معمولی).
- **`ROLL`** — یک برچسب در هر صفحه، اندازه‌ی صفحه = اندازه‌ی برچسب (لیبل‌پرینتر حرارتی رول، Zebra/TSC).

چون هنوز معلوم نیست کدام دستگاه، **هر بُعدی از کانفیگ می‌آید و در خودِ ریکوئست هم قابل override است**. تعویض چاپگر در آینده = تغییر `appsettings.json`، نه تغییر کد.

```json
"Barcode": {
  "Label": {
    "Mode": "SHEET",
    "PageSize": "A4",
    "Columns": 3,
    "Rows": 10,
    "LabelWidthMm": 48,
    "LabelHeightMm": 25,
    "PageMarginMm": 8,
    "HorizontalGapMm": 2,
    "VerticalGapMm": 2,
    "ModuleWidthMm": 0.33,
    "BarHeightMm": 12,
    "ShowProductName": true,
    "ShowPrice": false
  }
}
```

محتوای هر برچسب: نام محصول (اختیاری) / میله‌های Code128 / متن خوانای `14050512-000123-000002` / قیمت (اختیاری).

### ۲.۴ اندپوینت‌های بارکد

`BarcodeController`:

| متد | مسیر | توضیح |
|---|---|---|
| GET | `api/Barcode/GetProductLabelsPdf` | `?productId=&fromSerial=&toSerial=&copies=&mode=` → `application/pdf` |
| GET | `api/Barcode/GetBarcodeSvg` | `?payload=` → `image/svg+xml`، برای نمایش تک بارکد در UI |

`GetProductLabelsPdf` برچسب دانه‌های **موجود** را چاپ می‌کند (از `ProductUnit`)، نه یک بازه‌ی خیالی. اگر انبار برچسب بیشتری بخواهد، اول باید دانه ساخته شود (`ReceivePurchase` یا اصلاح موجودی) — این عمداً است، چون برچسب بدون دانه یعنی بارکدی که در سیستم وجود ندارد.

---

## بخش سه — فاکتور و PDF

### ۳.۱ چه چیزی از قبل هست و چه چیزی نیست

`Sale` تقریباً همه‌ی داده‌ی فاکتور را دارد: `InvoiceNumber`، `InvoiceDate`، `TotalAmount`، `PaidAmount`، `PaymentType`، `PaymentDetails`، `Items`، `Customer`. **پس موجودیت جدیدی برای فاکتور فروش لازم نیست.**

آنچه نیست:

| نیاز | راه‌حل |
|---|---|
| اطلاعات فروشنده (نام شرکت، کد اقتصادی، شناسه ملی، آدرس، تلفن، لوگو) | بخش `Company` در `appsettings.json` |
| تاریخ شمسی | `Common/Extensions/PersianDate.cs` روی `PersianCalendar` توکار |
| مبلغ به حروف | `Common/Extensions/NumberToPersianWords.cs` |
| ارقام فارسی | اکستنشن `ToPersianDigits()` |
| بارکد/QR فاکتور | همان `IBarcodeRenderer` روی `InvoiceNumber` |

### ۳.۲ ریسک پذیرفته‌شده: عدم snapshot

فاکتور امروز **در لحظه‌ی درخواست** از روی `Sale` + `Product` رندر می‌شود. `SaleItem.UnitPrice` قبلاً snapshot شده (خوب است)، ولی **نام و کد محصول** snapshot نشده‌اند. یعنی اگر نام محصولی بعداً عوض شود، چاپ مجدد یک فاکتور قدیمی نام جدید را نشان می‌دهد.

از نظر حسابداری این ایراد است. برای این نسخه **پذیرفته می‌شود** تا در مهلت دو هفته جا شود. راه‌حل بعدی، ساده و بدون شکستن چیزی: افزودن `SaleItem.ProductNameSnapshot` و `SaleItem.ProductCodeSnapshot` که هنگام `CreateSale` پر شوند. اگر ترجیح می‌دهید همین حالا انجام شود، هزینه‌اش دو ستون و چند خط است — بگویید.

### ۳.۳ سرویس PDF

پکیج: **QuestPDF** (لایسنس Community، رایگان زیر ۱ میلیون دلار درآمد سالانه — نیازمند ثبت `QuestPDF.Settings.License = LicenseType.Community;` در `Program.cs`).

فونت: **Vazirmatn** (لایسنس OFL)، فایل‌های `Vazirmatn-Regular.ttf` و `Vazirmatn-Bold.ttf` در `Infrastructure/Assets/Fonts/` کامیت می‌شوند و با `FontManager.RegisterFont(stream)` در استارتاپ ثبت. بدون فونت جاسازی‌شده، متن فارسی روی سرور لینوکس به مربع تبدیل می‌شود.

RTL: `page.ContentFromRightToLeft()` روی کل صفحه.

`IPdfDocumentService` — `Application/Common/Contracts/Documents/`، پیاده‌سازی `Infrastructure/Services/QuestPdfDocumentService.cs`، ثبت `Singleton`:

```csharp
byte[] RenderSaleInvoice(SaleInvoiceModel model);
byte[] RenderPurchaseInvoice(PurchaseInvoiceModel model);
byte[] RenderCreditNote(CreditNoteModel model);
byte[] RenderBarcodeLabels(BarcodeLabelSheetModel model);
```

سرویس **هیچ دسترسی‌ای به دیتابیس ندارد** — فقط مدل می‌گیرد و بایت می‌دهد. جمع‌آوری داده کار هندلر است. این باعث می‌شود قالب PDF بدون DB قابل تست باشد.

### ۳.۴ چیدمان فاکتور فروش

```
┌──────────────────────────────────────────────┐
│ لوگو │      فاکتور فروش       │ QR فاکتور    │
│      │  شماره: 1405-000123    │              │
│      │  تاریخ: ۱۴۰۵/۰۵/۱۲     │              │
├──────────────────────────────────────────────┤
│ فروشنده (از کانفیگ)  │  خریدار (از Customer) │
│ نام، شناسه ملی،      │  نام، تلفن، آدرس،     │
│ آدرس، تلفن           │  کد پستی              │
├──────────────────────────────────────────────┤
│ ردیف │ کد کالا │ شرح │ تعداد │ فی │ تخفیف │ مالیات │ جمع │
│  ۱   │ ...     │ ... │  ۲    │... │  ...  │  ...   │ ... │
├──────────────────────────────────────────────┤
│                      جمع کل      │ ......... │
│                      تخفیف       │ ......... │
│                      مالیات      │ ......... │
│                      قابل پرداخت │ ......... │
│                      پرداخت‌شده  │ ......... │
│                      مانده       │ ......... │
├──────────────────────────────────────────────┤
│ مبلغ به حروف: .............................. │
│ توضیحات: ................................... │
│ مهر و امضای فروشنده  │  امضای خریدار         │
└──────────────────────────────────────────────┘
```

فاکتور خرید همین قالب با جای فروشنده/خریدار جابه‌جا (تامین‌کننده بالا). فاکتور برگشتی همین قالب با تیتر «فاکتور برگشت از فروش» و ستون‌های مبلغ استرداد از `SaleReturnDecision.RefundAmount`.

### ۳.۵ انحراف عمدی از قرارداد `ResponseDto`

قرارداد پروژه می‌گوید هر ریکوئست MediatR باید `ResponseDto` برگرداند. برای PDF این کار غلط است: base64 کردن بایت‌ها حجم را ۳۳٪ زیاد می‌کند و `<iframe>`/دانلود مستقیم در مرورگر را می‌شکند.

**تصمیم:** برای اندپوینت‌های PDF، ریکوئست `IRequest<FileResponseDto>` است و کنترلر `File(...)` برمی‌گرداند:

```csharp
namespace Application.Common.Dtos
{
    public class FileResponseDto
    {
        public byte[] Content { get; set; }
        public string FileName { get; set; }
        public string ContentType { get; set; }
    }
}
```

```csharp
[HttpGet("GetSaleInvoicePdf")]
public async Task<IActionResult> GetSaleInvoicePdf([FromQuery] GetSaleInvoicePdfQuery request)
{
    var file = await _mediator.Send(request);
    Response.Headers.ContentDisposition =
        $"{(request.Inline ? "inline" : "attachment")}; filename=\"{file.FileName}\"";
    return File(file.Content, file.ContentType);
}
```

مدیریت خطا دست‌نخورده می‌ماند: `ExceptionHandlingMiddleware` همچنان استثناها را به JSON استاندارد تبدیل می‌کند، پس فرانت با نگاه به `Content-Type` پاسخ (`application/pdf` در برابر `application/json`) موفقیت/خطا را تشخیص می‌دهد.

در کنارش، **نسخه‌ی JSON هر فاکتور** هم ارائه می‌شود (با `ResponseDto` عادی) تا فرانت بتواند پیش‌نمایش روی صفحه بزند بدون اینکه PDF پارس کند.

### ۳.۶ اندپوینت‌های فاکتور

`InvoiceController`:

| متد | مسیر | خروجی |
|---|---|---|
| GET | `api/Invoice/GetSaleInvoice?saleId=` | `ResponseDto` + `SaleInvoiceDto` |
| GET | `api/Invoice/GetSaleInvoicePdf?saleId=&inline=` | `application/pdf` |
| GET | `api/Invoice/GetPurchaseInvoice?purchaseId=` | `ResponseDto` |
| GET | `api/Invoice/GetPurchaseInvoicePdf?purchaseId=&inline=` | `application/pdf` |
| GET | `api/Invoice/GetSaleReturnCreditNote?saleReturnId=` | `ResponseDto` |
| GET | `api/Invoice/GetSaleReturnCreditNotePdf?saleReturnId=&inline=` | `application/pdf` |

---

## بخش چهار — نقشه‌ی پیاده‌سازی

### ۴.۱ ساختار فایل‌های جدید

```
Domain/
  Entities/ProductUnit.cs
  Enums/ProductUnitStatusEnum.cs
  Enums/BarcodeReferenceKindEnum.cs
Application/
  Common/Contracts/ProductCode/IProductCodeService.cs
  Common/Contracts/ProductUnit/IProductUnitService.cs
  Common/Contracts/Barcode/IBarcodeRenderer.cs  (+ BarcodeRenderOptions)
  Common/Contracts/Documents/IPdfDocumentService.cs
  Common/Contracts/Repositories/IProductUnitRepository.cs
  Common/Dtos/FileResponseDto.cs
  Features/Product/Queries/ScanBarcodeQuery.cs
  Features/Product/Queries/GetProductUnitListQuery.cs
  Features/Product/Commands/EnsureProductCodesCommand.cs
  Features/Invoice/Queries/GetSaleInvoiceQuery.cs
  Features/Invoice/Queries/GetSaleInvoicePdfQuery.cs
  Features/Invoice/Queries/GetPurchaseInvoiceQuery.cs
  Features/Invoice/Queries/GetPurchaseInvoicePdfQuery.cs
  Features/Invoice/Queries/GetSaleReturnCreditNoteQuery.cs
  Features/Invoice/Queries/GetSaleReturnCreditNotePdfQuery.cs
  Features/Invoice/Dtos/*.cs
  Features/Barcode/Queries/GetProductLabelsPdfQuery.cs
  Features/Barcode/Queries/GetBarcodeSvgQuery.cs
Infrastructure/
  Services/ProductCodeService.cs
  Services/ProductUnitService.cs
  Services/ZXingBarcodeRenderer.cs
  Services/QuestPdfDocumentService.cs
  Documents/SaleInvoiceDocument.cs
  Documents/PurchaseInvoiceDocument.cs
  Documents/CreditNoteDocument.cs
  Documents/BarcodeLabelSheetDocument.cs
  Repositories/ProductUnitRepository.cs
  Assets/Fonts/Vazirmatn-{Regular,Bold}.ttf
Common/Extensions/
  PersianDate.cs
  NumberToPersianWords.cs
WMS/Controllers/
  InvoiceController.cs
  BarcodeController.cs
```

### ۴.۲ پکیج‌ها

| پکیج | پروژه | لایسنس |
|---|---|---|
| `QuestPDF` | Infrastructure | Community (رایگان زیر ۱M$) |
| `ZXing.Net` | Infrastructure | Apache 2.0 |
| فونت Vazirmatn | فایل، نه پکیج | OFL |

هیچ باینری نیتیوی اضافه نمی‌شود — هر دو کاملاً managed، پس دیپلوی روی لینوکس بدون دردسر است.

### ۴.۳ مهاجرت

یک مهاجرت: `product-unit-and-codes`

- جدول `ProductUnits` + ایندکس‌های بند ۱.۵
- `Products.SupplierBarCode` (`nvarchar(64) NULL`)
- ایندکس یکتا روی `Products.Code`

**ترتیب اجرا مهم است:** ایندکس یکتای `Products.Code` قبل از پرکردن کدهای موجود شکست می‌خورد اگر ردیف‌های تکراری/خالی وجود داشته باشد. پس:

۱. مهاجرت را **بدون** ایندکس یکتا اعمال کنید.
۲. `POST api/Product/EnsureProductCodes` را بزنید تا کدها ساخته و دانه‌ها هم‌تراز شوند.
۳. مهاجرت دوم و کوچک، فقط برای افزودن ایندکس یکتا.

این امن‌ترین مسیر برای دیتابیس محلی `WMS` است که هم‌اکنون داده‌ی seed دارد.

### ۴.۴ ترتیب پیشنهادی کار

۱. `PersianDate` + `NumberToPersianWords` + `IProductCodeService` (خالص، بدون DB — سریع و قابل اتکا)
۲. موجودیت `ProductUnit` + مهاجرت + `IProductUnitService` + `EnsureProductCodes`
۳. اتصال به شش نقطه‌ی تغییر `Stock` (بند ۱.۶) — پرریسک‌ترین قدم، چون فیچرهای مرجوعی موجود را لمس می‌کند
۴. `ScanBarcode` + `GetProductUnitList`
۵. `IBarcodeRenderer` + `GetBarcodeSvg`
۶. QuestPDF + فونت + فاکتور فروش (PDF و JSON)
۷. برگه‌ی برچسب بارکد
۸. فاکتور خرید و فاکتور برگشتی (تکرار قالب)

قدم‌های ۱ تا ۴ ماژول بارکد را کامل می‌کنند؛ ۵ تا ۸ ماژول چاپ را. اگر مهلت تنگ شد، ۸ اولین چیزی است که حذف می‌شود.

---

## بخش پنج — سوالات باز

مواردی که پیش از پیاده‌سازی نیاز به پاسخ دارند. برای هرکدام یک پیش‌فرض گذاشته‌ام تا کار متوقف نشود:

۱. **`SaleItem.Discount` درصد است یا مبلغ؟** امروز `int` است و **هیچ‌جا استفاده نمی‌شود**، پس نمی‌شود از کد فهمید. پیش‌فرض: **درصد** (هم‌راستا با `Product.Tax`). اگر مبلغ است، محاسبه‌ی جمع فاکتور عوض می‌شود.
۲. **`Product.Tax` درصد است؟** پیش‌فرض: بله، درصد. مالیات ارزش افزوده جداگانه‌ای از کانفیگ اعمال نمی‌شود مگر بگویید.
۳. **واحد پول روی فاکتور: ریال یا تومان؟** پیش‌فرض: **ریال**، قابل تغییر از کانفیگ.
۴. **اطلاعات فروشنده در کانفیگ بماند یا موجودیت شود؟** پیش‌فرض: کانفیگ. اگر می‌خواهید ادمین از UI ویرایشش کند، باید یک `CompanyProfile` با CRUD اضافه شود.
۵. **`UpdateProductCommand.Stock`**: گزینه‌ی الف یا ب از بند ۱.۶؟ پیش‌فرض: **ب** (آشتی‌دهی).
۶. **ستون مرده‌ی `SupplierBarCode` اضافه شود؟** پیش‌فرض: بله، چون ارزان است. اگر نمی‌خواهید، حذفش کنم.
۷. **snapshot نام محصول در `SaleItem`** الان انجام شود یا بعداً؟ پیش‌فرض: بعداً (بند ۳.۲).
۸. **چاپگر برچسب** هنوز نامعلوم است. تا وقتی مدلش مشخص شود، پیش‌فرض `SHEET` روی A4 است و همه‌ی ابعاد از کانفیگ می‌آید. وقتی دستگاه مشخص شد، فقط `appsettings.json` عوض می‌شود.

---

## پیوست — چیزی که عمداً پیاده نمی‌شود

- **بارکد تامین‌کننده** — در چت به‌صراحت به بعد موکول شد («ولش کن سخت میشه، بعداً خواست اضافه می‌کنیم»). فقط ستون خالی‌اش گذاشته می‌شود.
- **دفتر حرکات انبار (Stock Ledger)** — همچنان وجود ندارد؛ `Product.Stock` مستقیم تغییر می‌کند. `ProductUnit` تا حدی جایش را می‌گیرد (تاریخچه‌ی هر دانه) ولی جایگزین یک ledger واقعی نیست.
- **استاندارد GS1/EAN-13** — نیازمند ثبت‌نام شرکتی است، خارج از دامنه.
- **امضای دیجیتال فاکتور / سامانه مودیان** — خارج از دامنه‌ی این مرحله.
