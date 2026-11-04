# مشخصاتِ اجرا: چندانبارِ کامل

> **وضعیت (۲۰۲۶-۱۱-۰۴): آماده برای اجرا، پس از تأییدِ تیمِ بکند.** این سند را می‌شود مستقیم به Claude Code داد.
>
> تصمیم‌های کسب‌وکار (بخشِ ۱) قطعی‌اند. چند تصمیمِ فنی که در گفت‌وگو باز مانده بود، در بخشِ ۲ با **پیش‌فرضِ طرح** بسته شده‌اند.
> اگر تیمِ بکند با یکی مخالف است، پیش از اجرا همان بند را در این سند عوض کند؛ بقیه‌ی سند به آن وابسته است.
>
> پیش‌زمینه: GAP-08 (`api-guide.fa.md` بخشِ ۲۵) و درخواست‌های §۳۷ و §۳۸ در `frontend-requests.fa.md`، که هر دو در این سند حل می‌شوند.

## ۰. قواعدِ کار برای اجراکننده (Claude Code)

- **قراردادهای `Backend-Net/CLAUDE.md` همه برقرارند:**
  - یک فایل برای دستور، اعتبارسنج و هندلر.
  - خواندن مستقیم از `IWMSDbContext` و نوشتن با repository/UnitOfWork.
  - همه‌چیز async با `CancellationToken`.
  - استثناهای سفارشی.
  - فهرستِ صفحه‌ای با `SortBy` و `ThenSortBy(Id)`، و یک case در `ListSortingTests`.
  - `[AuditAction]` روی هر دستور و `[HasPermission]` روی هر اکشن (آزمون‌های پوشش باید سبز بمانند).
- **قاعده‌ی ۶b:**
  - داده همیشه مدلِ «روشن» است. سوییچِ `Warehouse.MultiWarehouseEnabled` فقط ورودیِ تازه را محدود می‌کند و داده را عوض نمی‌کند.
  - با سوییچِ خاموش هر فیلدِ انبار انبارِ پیش‌فرض است.
- **`ProductUnitService` تنها نویسنده‌ی وضعیت و انبارِ دانه است.** هر جابه‌جایی یک `ProductUnitMovement` با `WarehouseId` دارد.
- **عددِ audit:** دستورهای تازه از `820` به بعد (`800`–`819` گرفته شده‌اند).
- **عددهای enum ذخیره می‌شوند و قراردادِ فرانت‌اند.** فقط به ته اضافه کنید و هیچ عددی را دوباره استفاده نکنید. عددهای پیشنهادیِ این
  سند از کدِ فعلی بررسی شده‌اند و آزادند.
- **Migration:**
  - ساخته شود ولی اعمال نشود (کاربر خودش اعمال می‌کند).
  - هر migration داده‌های قبلی را با انبارِ پیش‌فرض (`Id = 1` یا `IsDefault`) پر کند.
- **مستندات:** `api-guide.fa.md` (بخشِ ۲۵ و یک جدولِ تازه در بخشِ ۱۶ برای هر مرحله) و بخشِ «Current state»ِ `CLAUDE.md`.
- **تست‌ها:** هر مرحله تست‌های یکپارچه‌ی خودش را دارد (بخشِ ۸). شمارِ شکست‌های محیطیِ مستندشده نباید بیشتر شود.

## ۱. تصمیم‌های کسب‌وکار (قطعی)

| موضوع | تصمیم |
|---|---|
| انبارِ مرجوعی‌ها | در همان انبارهای معمولی. کالای خراب در همان انبار «قرنطینه» است (وضعیتِ دانه، نه انبارِ جدا). |
| موجودی و آستانه | برای **هر انبار** موجودی و آستانه‌ی هشدار لازم است. |
| فروش و خرید | محدود نمی‌شوند. همه موجودیِ همه‌ی انبارها را می‌بینند. فروش از انبارِ دیگر مجاز است (انبارِ تحویلِ پیش‌فاکتور همان انبار، یا اول حواله). |
| انبارِ کاربر | هر کاربر یک انبارِ پیش‌فرض دارد. تعریفِ «انباردار» برای هر انبار لازم نیست. |
| محدودیتِ انباردار | تنظیمی که پیش‌فرضش «فقط پیش‌فرض و فیلتر» است (اجرایش در مرحله‌ی ۴). |
| شروعِ حواله | هر دو: مبدأ ارسال می‌کند، یا مقصد درخواستِ کالا می‌دهد که یک پیش‌نویس است و مبدأ ارسالش می‌کند. |
| کالای گم‌شده در راه | تصمیم با **حسابداری** است، مثلِ «مشکلاتِ انبار»ِ پیش‌فاکتور. انباردارِ مقصد فقط کسری را ثبت می‌کند. |
| اصلاحِ دستی (قاعده‌ی کلی) | هر اشتباه راهِ اصلاحِ دستی دارد، محدود به دسترسی، با علت، و ثبت در ممیزی. ردیفی پاک یا بی‌صدا بازنویسی نمی‌شود. |
| ویرایشِ دستیِ موجودی | مجاز است، ولی **برای هر انبار جدا** و با دسترسیِ جدا و علتِ الزامی. |
| موجودیِ اول | هنگامِ ساختِ کالا با انتخابِ انبار. |
| بهای تمام‌شده | یک میانگین برای همه‌ی انبارها. ارزشِ هر انبار = تعدادِ دانه‌ها × میانگین. `InventoryCostLedgerEntry` انبار نمی‌گیرد. |
| شعبه | در آینده یک موجودیتِ جدا **بالای** انبار است. پس فیلدِ فروش یا حسابداری (صندوق، شماره‌ی فاکتور، قیمت) روی `Warehouse` نگذارید. |

## ۲. تصمیم‌های فنی (پیش‌فرضِ طرح؛ تیمِ بکند می‌تواند پیش از اجرا عوض کند)

1. **حواله مستقل از محموله است.** دستورهای حواله جدا ساخته می‌شوند و `ReceiveShipment`/`DispatchShipment` آن‌ها را، مثلِ
   خرید و مرجوعی، از طریقِ `IMediator` در یک تراکنش صدا می‌زنند (بخشِ ۵.۴).
2. **انبار صفتِ سند است:** روی خرید، فروش و هر دو مرجوعی. پارامترِ `warehouseId`ِ دستورهای عملیات می‌ماند، ولی فقط برای استثنا
   (بخشِ ۴.۲).
3. **حواله چند دورِ ارسال و چند دورِ دریافت دارد.**
4. **آستانه‌ی هر انبار در جدولِ جدای `ProductWarehouseSetting` است.** فیلدهای خودِ کالا آستانه‌ی **کل** می‌مانند.
5. **قفسه** (`ProductUnit.BinLocation`) همین حالا هم روی دانه است و دانه انبار دارد. پس قفسه عملاً زیرمجموعه‌ی انبار است. جدولِ قفسه
   (GAP-09) خارج از این کار است.

## ۳. مرحله‌ها

| مرحله | محتوا | این سند |
|---|---|---|
| ۱ | اطلاعاتِ انبار (§۳۸)، انبار روی سندها (§۳۷)، انبارِ پیش‌فرضِ کاربر، تعدیلِ دستیِ موجودیِ هر انبار، موجودیِ اول با انبار، آستانه‌ی هر انبار، ارزشِ موجودیِ هر انبار، گسترشِ قواعدِ غیرفعال‌سازی | **اجرا** |
| ۲ | حواله‌ی کامل: پیش‌نویس و درخواست، دورهای ارسال و دریافت با راننده و اسکن و خرابی و کسری، کسری به حسابداری، جابه‌جاییِ مستقیم، حواله در محموله | **اجرا** |
| ۳ | پیشنهادِ تأمینِ هر انبار (حواله یا خرید)، گزارشِ گردشِ کالا در انبار، ستونِ موجودیِ هر انبار در خروجیِ کالا | **اجرا** |
| ۴ | تنظیمِ محدودیتِ انباردار و `UserWarehouse`، جدولِ قفسه‌ها (GAP-09)، هشدارِ کم‌شدنِ موجودی (با GAP-15) | بعداً، سندِ جدا |
| ۵ | شعبه بالای انبار | بعداً، سندِ جدا |

## ۴. مرحله‌ی ۱ — پایه

### ۴.۱ اطلاعاتِ انبار (§۳۸)

- **فیلدهای تازه روی `Warehouse`، `WarehouseInput` و `WarehouseDto` (همه اختیاری):**
  - `Province`، `City`، `PostalCode`، `Latitude`، `Longitude`، `PhoneNumber`: همان نام‌ها و قواعدِ `Customer`/`Supplier`.
  - `ManagerUserId` (FK به `Users`، `Restrict`) و `ManagerName` در DTO.
- **کد:**
  - `Code` اختیاری شود. خالی ⇒ سرور `W{n}` می‌سازد: کوچک‌ترین `n ≥ 1` که کدِ هیچ انباری (فعال یا غیرفعال) نیست.
  - کدِ دستی مثلِ امروز (یکتا، با حروفِ بزرگ).

### ۴.۲ انبار روی سندها (§۳۷)

- **ستون‌ها:** `WarehouseId` (int، NOT NULL، FK `Restrict`) روی `Purchase`، `Sale`، `PurchaseReturn` و `SaleReturn`.
  - **Backfill:** خرید و فروش با انبارِ پیش‌فرض. مرجوعی با انبارِ سندِ اصلیش.
  - DTOهای فهرست و جزئیات `warehouseId` و `warehouseName` بگیرند.
  - هر چهار فهرست فیلترِ `warehouseId` بگیرند.
- **قاعده‌ی تعیین:** `ResolveDocumentWarehouseAsync(requested, userId)`:
  - با سوییچِ خاموش ⇒ همیشه انبارِ پیش‌فرض.
  - با سوییچِ روشن:
    - انبارِ فرستاده‌شده، به شرطی که فعال باشد؛
    - وگرنه `User.DefaultWarehouseId` (بخشِ ۴.۳)؛
    - وگرنه انبارِ پیش‌فرض.
  - یک‌جا تعریف شود، کنارِ `WarehouseScope`.
- **خرید:**
  - `CreatePurchase`/`UpdatePurchase` فیلدِ `WarehouseId` می‌گیرند. فقط تا وقتی پیش‌نویس (`PROFORMA`) است عوض می‌شود.
  - `ReceivePurchase`: انبار از سند می‌آید. `request.WarehouseId` اگر فرستاده شد و با سند فرق داشت، استثنای همین دور است (مثلاً
    کامیون به انبارِ دیگر رفت) و در حرکتِ دانه‌ها ثبت می‌شود.
- **فروش:**
  - `CreateSale`/`UpdateSale`/`CreateInPersonProforma` فیلدِ `WarehouseId` می‌گیرند.
  - عوض کردنِ انبارِ پیش‌فاکتورِ رزروشده همه‌ی رزروها را آزاد می‌کند و پیش‌فاکتور را به `DRAFT` برمی‌گرداند؛ همان رفتارِ تغییرِ کالا
    (`SaleProformaPipeline`).
  - `CheckSaleWarehouse` **فقط از `Sale.WarehouseId`** رزرو می‌کند، چه FIFO چه با بارکد. بارکدِ دانه‌ای که در انبارِ دیگری است با
    پیامِ روشن رد می‌شود: «این دانه در انبارِ X است».
  - `ShipSale`: دانه‌های رزروشده همان‌هایی‌اند که رزرو شدند. برداشتِ آزاد (مازاد، فروشِ قدیمیِ بی‌رزرو) از `Sale.WarehouseId` است،
    مگر `request.WarehouseId` آمده باشد.
- **مرجوعی‌ها:**
  - `CreateSaleReturn`/`CreatePurchaseReturn` فیلدِ `WarehouseId` می‌گیرند؛ پیش‌فرض انبارِ سندِ اصلی است.
  - `ExecuteGoodsRound` (هر دو): پیش‌فرض انبارِ مرجوعی است و `request.WarehouseId` استثنای همین دور.

### ۴.۳ انبارِ پیش‌فرضِ کاربر

- **داده:** `User.DefaultWarehouseId` (nullable، FK `Restrict`).
  - `UpdateUser` و `CreateUser` آن را می‌گیرند.
  - `UserInfoDto` و `UserListDto` فیلدهای `defaultWarehouseId` و `defaultWarehouseName` را دارند.
- **`PUT api/User/SetMyDefaultWarehouse`** `{ warehouseId | null }`:
  - برای هر کاربرِ واردشده (در فهرستِ `AuthenticatedOnly`ِ آزمونِ پوشش).
  - مثلِ `SaveMyDashboardLayout`؛ فرانت «انبارِ فعال»ِ سرتیتر را با آن نگه می‌دارد.

### ۴.۴ تعدیلِ دستیِ موجودیِ هر انبار

- **دسترسیِ تازه:** `StockAdjust = 180` (گروهِ `Warehouse`): «تعدیلِ دستیِ موجودیِ انبار».
- **`StockAdjustmentReasonEnum`:** `ENTRY_ERROR = 1` (خطای ورود)، `OPENING_BALANCE = 2` (موجودیِ اول)، `COUNT_CORRECTION = 3` (اصلاحِ شمارش)،
  `OTHER = 9`؛ با `[Description]`ِ فارسی.
- **`POST api/Warehouse/AdjustWarehouseStock`** (`StockAdjust`، audit `820`):
  ```json
  { "productId": 87, "warehouseId": 2, "newQuantity": 12, "reason": 1, "note": "سه عدد اشتباه وارد شده بود",
    "productUnitBarcodes": null }
  ```
  - `newQuantity` تعدادِ تازه‌ی **روی قفسه** (`IN_STOCK`) در همین انبار است. `note` برای `OTHER` الزامی است.
  - **افزایش:** دانه در همین انبار ساخته می‌شود. ردیفِ دفتر `MANUAL_ADJUSTMENT_IN` است به `UnitCostOrAverageAsync`.
  - **کاهش:** دانه‌ها فقط از قفسه‌ی همین انبار اسقاط می‌شوند: با بارکد اگر آمده باشد، وگرنه تازه‌ترین‌ها؛ همان رفتارِ امروزِ
    `ReconcileStockAsync`. ردیفِ دفتر `MANUAL_ADJUSTMENT_OUT` به میانگین. برای کالای `RequiresUnitTracking` بارکد الزامی است.
  - حرکتِ دانه با `MANUAL_ADJUSTMENT` و `Note` = علت و توضیح. `Product.Stock` هم‌زمان به‌روز می‌شود.
  - **پاسخ:** همان شکلِ `GetProductWarehouseStock` برای این کالا.
- **`UpdateProduct.Stock`:**
  - با سوییچِ روشن تغییرِ این عدد ۴۰۰ می‌گیرد، با پیام «موجودی را از جدولِ موجودی در انبارها تعدیل کنید». عددِ برابر نادیده گرفته
    می‌شود.
  - با سوییچِ خاموش تغییر از طریقِ همان منطقِ `AdjustWarehouseStock` روی انبارِ پیش‌فرض اجرا می‌شود و `StockAdjust` می‌خواهد. علت
    `ENTRY_ERROR` است.
  - `ReconcileStockAsync`ِ کور به انبار دیگر از هیچ‌جا صدا زده نشود.

### ۴.۵ موجودیِ اول با انبار

`CreateProduct.WarehouseId` (اختیاری، با `ResolveDocumentWarehouseAsync`). دانه‌های `Stock` در همان انبار ساخته می‌شوند و
`OPENING_BALANCE` می‌گیرند. همان برای ورودِ کالا از فایل (`DataTransfer`، اگر ستونِ موجودی دارد).

### ۴.۶ آستانه‌ی هر انبار

- **جدولِ `ProductWarehouseSetting`:** `ProductId`، `WarehouseId` (کلیدِ ترکیبی، FKها `Cascade` از کالا و `Restrict` از انبار)،
  `LowStockThreshold` (int)، `TargetStock` (int?)، `UpdatedAt`.
- **`PUT api/Warehouse/SetProductWarehouseSettings`** (`ProductUpdate`، audit `825`):
  `{ productId, items: [{ warehouseId, lowStockThreshold, targetStock }] }`.
  - جایگزینیِ کامل برای همان کالا. ردیفی که نیامده حذف می‌شود.
  - `TargetStock` اگر هست باید ≥ `LowStockThreshold` باشد.
- **`GetProductWarehouseStock`** هر ردیف را با این‌ها برگرداند:
  - `lowStockThreshold`، `targetStock` و `isLow` (`inStock <= lowStockThreshold`، فقط اگر آستانه تعریف شده باشد).
  - برای **همه‌ی انبارهای فعال**، حتی بی‌دانه، تا فرانت آستانه را برای انبارِ خالی هم بگذارد.
- **`GetProductList`:**
  - `warehouseId` اختیاری: `stock` و وضعیتِ کم/تمام برای همان انبار حساب شود (شمارِ `IN_STOCK`ِ آن انبار و آستانه‌ی همان انبار).
  - فیلترِ موجودِ `IsLowOnStock` با `warehouseId` روی موجودی و آستانه‌ی همان انبار اعمال شود.

### ۴.۷ ارزشِ موجودیِ هر انبار

`GetInventoryValuation` پارامترِ `warehouseId` اختیاری بگیرد و هر ردیف `byWarehouse: [{ warehouseId, warehouseName, quantity, value }]`
داشته باشد. `quantity` = `IN_STOCK` + `RESERVED` + `QUARANTINED`ِ آن انبار، و `value` = `quantity` × میانگینِ کالا. دانه‌ی «در راه» جدا
می‌ماند، مثلِ امروز.

### ۴.۸ غیرفعال‌سازیِ انبار

قواعدِ `DeleteWarehouse` گسترش پیدا کند. رد شود اگر:
- خرید یا فروشِ باز روی این انبار هست (خریدی که کاملاً دریافت نشده، یا فروشی که کاملاً ارسال نشده و لغو نشده)؛
- مرجوعیِ باز روی این انبار هست؛
- حواله‌ی `DRAFT` از یا به این انبار هست.

با غیرفعال‌شدن، `User.DefaultWarehouseId`هایی که به این انبار اشاره می‌کنند `null` شوند و ردیف‌های `ProductWarehouseSetting` این انبار
بمانند (قاعده‌ی ۶b: پاک نکن).

## ۵. مرحله‌ی ۲ — حواله‌ی کامل

### ۵.۱ مدل

- **`StockTransferStatusEnum`** (به ته اضافه می‌شود): `DRAFT = 4`، `PARTIALLY_RECEIVED = 5`، `CLOSED_WITH_DISCREPANCY = 6`. عددهای ۱ تا ۳
  همان می‌مانند.
- **`StockTransfer` فیلدهای تازه:**
  - `RequestedByWarehouseId` (مقصد اگر مقصد ساخته، وگرنه `null`)
  - `IsDirect` (bool)
  - `ExpectedArrivalAt` (DateTime?)
  - `CreatedByUserId`
  - `DispatchedAt` nullable شود (پیش‌نویس هنوز ارسال نشده).
- **`StockTransferLine`** (تازه): `StockTransferId`، `ProductId`، `RequestedQuantity`، `DispatchedQuantity`، `ReceivedQuantity`، `DamagedQuantity`،
  `MissingQuantity`، `LostQuantity`، `ReturnedToSourceQuantity`.
  - همه شمارنده‌های تجمعی‌اند.
  - `InTransit = Dispatched − Received − Damaged − Lost − ReturnedToSource` در `[NotMapped]` حساب می‌شود.
- **`StockTransferRound`** (تازه، append-only):
  - `StockTransferId`، `Kind` (`StockTransferRoundKindEnum`: `DISPATCH = 1`، `RECEIPT = 2`)، `OccurredAt`، `UserId`.
  - `DriverFullName`، `DriverPhoneNumber`، `VehiclePlate`، `PartyName` (تحویل‌دهنده یا تحویل‌گیرنده)، `Note`.
  - عکس‌ها با `DocumentAttachment`ِ `DocumentKindEnum.STOCK_TRANSFER = 5` و `DocumentId` = شناسه‌ی حواله.
- **`StockTransferUnit`** (موجود): هر دانه‌ی ارسال‌شده یک ردیف دارد. ستونِ `Outcome` اضافه شود (`StockTransferUnitOutcomeEnum`:
  `IN_TRANSIT = 1`، `RECEIVED = 2`، `DAMAGED = 3`، `LOST = 4`، `RETURNED_TO_SOURCE = 5`) به‌اضافه‌ی `RoundId`ِ دورِ دریافتش.
- **`StockTransferShortage`** (تازه، مثلِ `SaleWarehouseIssue`): کسریِ گزارش‌شده که تصمیمش با حسابداری است.
  - `StockTransferId`، `ProductId`، `Quantity`، `ReportedAt`، `ReportedByUserId`، `Note`.
  - `Resolution` (`StockTransferShortageResolutionEnum`: `LOST = 1`، `RETURNED_TO_SOURCE = 2`، `FOUND = 3`)، `ResolvedAt`، `ResolvedByUserId`،
    `ResolutionNote`.
- **علت و رویدادهای تازه:**
  - `UnitCustodyReasonEnum.TRANSIT_DAMAGE = 6`
  - `ProductUnitMovementReasonEnum`: `STOCK_TRANSFER_DAMAGED = 22`، `STOCK_TRANSFER_LOST = 23`، `STOCK_TRANSFER_RETURNED = 24`،
    `STOCK_ADJUSTED = 25` (اگر برای ۴.۴ از `MANUAL_ADJUSTMENT` جدا شود؛ پیش‌فرض: همان `MANUAL_ADJUSTMENT`)
  - `InventoryCostEventTypeEnum.STOCK_TRANSFER_LOST = 25`: خروج به میانگین، مثلِ `STOCK_SCRAPPED`، و در گزارشِ فروش زیرِ `ScrapLoss`.
  - خرابی در راه همان `STOCK_QUARANTINED`ِ امروز است، با `QuarantineCost` = میانگین.
- **Migration:**
  - حواله‌های موجود به این شکل پر می‌شوند: برای هر کالا یک ردیف از `StockTransferUnit`ها (requested = dispatched = شمارِ دانه‌ها).
  - حواله‌ی `RECEIVED` ⇒ `ReceivedQuantity` = همان.
  - حواله‌ی `CANCELLED` ⇒ `ReturnedToSourceQuantity` = همان.
  - `Outcome` دانه‌ها هم مطابقِ همین.

### ۵.۲ چرخه و دستورها

همه زیرِ `api/Warehouse`. هر دستور سندِ کاملِ حواله را برمی‌گرداند (`StockTransferReader`) و ایدمپوتنت است.

| دستور | دسترسی | audit | قاعده |
|---|---|---|---|
| `CreateStockTransfer` | `StockTransferManage` یا `StockTransferRequest = 181` | ۸۰۸ (موجود) | **تغییرِ رفتار:** یک `DRAFT` می‌سازد: `fromWarehouseId`، `toWarehouseId`، `lines: [{ productId, quantity }]`، `description`، `expectedArrivalAt`، `isDirect`. کسی که فقط `StockTransferRequest` دارد ساخته‌اش را «درخواستِ مقصد» ثبت می‌کند (`RequestedByWarehouseId = toWarehouseId`). برای سازگاری: اگر `dispatch` (همان شکلِ بدنه‌ی `DispatchStockTransfer` بی `id`) هم آمد، در همان تراکنش ارسال می‌شود. اگر `isDirect` و `dispatch` با هم آمدند، دریافت هم انجام می‌شود (بخشِ ۵.۳). فقط با سوییچِ روشن. |
| `UpdateStockTransfer` | `StockTransferManage` | ۸۲۴ | فقط `DRAFT`: ردیف‌ها، مقصد، توضیح و تاریخِ پیش‌بینی. |
| `DispatchStockTransfer` | `StockTransferManage` | ۸۲۱ | `DRAFT` یا `IN_TRANSIT`. بدنه: `{ id, warehouseId?, driverFullName, driverPhoneNumber, vehiclePlate, partyName, note, occurredAt, images[], lines: [{ productId, quantity, productUnitBarcodes }] }`. از قفسه‌ی مبدأ (بارکد، یا FIFO برای کالای بی‌ردیابی) برداشته می‌شود. `Dispatched` ≤ `Requested` نیست، بیشتر هم مجاز است. دانه‌ها `IN_TRANSIT` می‌شوند و `Product.Stock` کم می‌شود. فقط با سوییچِ روشن. |
| `ReceiveStockTransferRound` | `StockTransferManage` یا `StockTransferReceive = 182` | ۸۲۲ | `IN_TRANSIT` یا `PARTIALLY_RECEIVED`. بدنه: `{ id, driverFullName, …, lines: [{ productId, arrivedQuantity, productUnitBarcodes, defects: [{ quantity, problem, note, productUnitBarcodes }], missingQuantity, missingNote }] }`. توضیحِ کامل زیرِ جدول. **مستقل از سوییچ** (قاعده‌ی ۶b: کارِ نیمه‌کاره گیر نمی‌کند). |
| `ReceiveStockTransfer` (موجود) | همان | ۸۰۹ (موجود) | میان‌بُر می‌ماند: «همه‌ی در راه سالم رسید»، یعنی یک `ReceiveStockTransferRound` بی سربرگ. |
| `CancelStockTransfer` (موجود) | `StockTransferManage` | ۸۱۰ (موجود) | `DRAFT` ⇒ بی‌اثر. `IN_TRANSIT` بی هیچ دریافتی ⇒ همه‌ی دانه‌ها به قفسه‌ی مبدأ، مثلِ امروز. بعد از اولین دورِ دریافت ۴۰۰: باید کسری‌ها حل شوند. |
| `ResolveStockTransferShortage` | `StockTransferShortageResolve = 183` (حسابداری) | ۸۲۳ | `{ shortageId, resolution, note }`. `LOST` ⇒ دانه‌ها `SCRAPPED`، حرکتِ `STOCK_TRANSFER_LOST` و ردیفِ دفترِ `STOCK_TRANSFER_LOST`. `RETURNED_TO_SOURCE` ⇒ `IN_STOCK` در مبدأ و حرکتِ `STOCK_TRANSFER_RETURNED`. `FOUND` ⇒ کسری بسته می‌شود و دانه‌ها `IN_TRANSIT` می‌مانند تا با دورِ دریافتِ بعدی برسند. وقتی چیزی در راه نماند، وضعیت `RECEIVED` می‌شود (اگر کسریِ `LOST` یا `RETURNED` داشته، `CLOSED_WITH_DISCREPANCY`). |
| `GetStockTransferShortageList` | `StockTransferShortageResolve` یا `AccountingView` | — | صفحه‌ای؛ فیلترِ وضعیت، انبار و تاریخ؛ در `ListSortingTests`. |

**جزئیاتِ `ReceiveStockTransferRound`:**
- `arrivedQuantity` (همه‌ی رسیده، سالم و خراب) + `missingQuantity` ≤ در راهِ همان کالا.
- **بارکدها:** برای کالای `RequiresUnitTracking` الزامی‌اند، به تعدادِ `arrivedQuantity`، و باید دانه‌های **همین حواله** باشند. برای کالای
  بی‌ردیابی FIFO از دانه‌های در راهِ همین حواله.
- **سالم‌ها:** `IN_STOCK` در مقصد.
- **خراب‌ها (`defects`):** `QUARANTINED` در مقصد با `TRANSIT_DAMAGE` و `QuarantineCost` = میانگین. `problem` از `ObservedProblems` است.
- **`missingQuantity > 0`:**
  - یک `StockTransferShortage` ساخته می‌شود و دانه‌ها `IN_TRANSIT` می‌مانند.
  - این کسری، مثلِ «مشکلاتِ انبار»ِ پیش‌فاکتور، به حسابداری می‌رود.
- **وضعیتِ حواله:**
  - چیزی در راه نمانده و کسریِ باز نیست ⇒ `RECEIVED`.
  - کسریِ بازی هست ⇒ `PARTIALLY_RECEIVED` تا حلِ کسری.
  - بخشی هنوز در راه است ⇒ `PARTIALLY_RECEIVED`.

### ۵.۳ جابه‌جاییِ مستقیم

برای انبارهای کنارِ هم. `IsDirect = true` یعنی ارسال و دریافت در یک تراکنش، بی سربرگِ راننده و بی صفِ دریافت.
- با `CreateStockTransfer` + `dispatch` (یا `DispatchStockTransfer` روی پیش‌نویسِ `isDirect`) همه‌ی دانه‌های ارسالی بلافاصله در مقصد
  `IN_STOCK` می‌شوند.
- حرکت‌ها همان دو حرکتِ ارسال و دریافت‌اند، تا گزارشِ گردش یکی بماند.

### ۵.۴ حواله در محموله

- `DispatchShipmentCommand.StockTransferDispatches: List<DispatchStockTransferCommand>`
- `ReceiveShipmentCommand.StockTransferReceipts: List<ReceiveStockTransferRoundCommand>`

مثلِ بخش‌های دیگرِ محموله، از طریقِ `IMediator` و در همان `ExecuteInTransactionAsync`. اعتبارسنجِ «دست‌کم یک بخش» این‌ها را هم
بشمارد. پاسخِ محموله `stockTransfers` (سندهای حواله) هم بدهد.

### ۵.۵ فهرست‌ها و صف‌ها

- `GetStockTransferList`:
  - `statuses` شاملِ وضعیت‌های تازه.
  - `warehouseId` (مبدأ **یا** مقصد)، `requestedOnly` (فقط درخواست‌های مقصد)، `hasOpenShortage`.
  - ردیف‌ها `requestedQuantity`، `dispatchedQuantity`، `receivedQuantity`، `inTransitQuantity`، `expectedArrivalAt` و `isOverdue`
    (`IN_TRANSIT` و گذشته از `expectedArrivalAt`) را دارند.
- **صف‌ها:** دستورِ جدای صف لازم نیست؛ فرانت صف‌ها را از فهرست‌های موجود با فیلترِ `warehouseId` می‌سازد:
  - **ورودیِ انبار:** حواله‌های `IN_TRANSIT`/`PARTIALLY_RECEIVED` با `toWarehouseId`.
  - **خروجیِ انبار:** حواله‌های `DRAFT` با `fromWarehouseId`.
- `GetStockTransferDetail` ردیف‌ها (با شمارنده‌ها)، دورها (با سربرگ و عکس)، کسری‌ها و دانه‌ها (با `Outcome`) را برگرداند. همین داده
  برای برگه‌ی چاپیِ حواله در استودیوی چاپِ فرانت کافی است.

### ۵.۶ دسترسی‌ها (گروهِ `Warehouse`)

| عدد | نام | توضیح |
|---|---|---|
| ۱۸۱ | `StockTransferRequest` | ساختِ درخواستِ کالا (پیش‌نویسِ مقصد) |
| ۱۸۲ | `StockTransferReceive` | ثبتِ دورِ دریافتِ حواله (انباردارِ مقصد) |
| ۱۸۳ | `StockTransferShortageResolve` | تصمیم برای کسریِ حواله (حسابداری) |

`GetStockTransferList`/`Detail` هر کدام از `StockTransferView`، `StockTransferManage`، `StockTransferRequest` و `StockTransferReceive`
را بپذیرند.

## ۶. مرحله‌ی ۳ — تأمین و گزارش

### ۶.۱ پیشنهادِ تأمینِ هر انبار

- **`GetReorderSuggestionList`** پارامترِ `warehouseId` می‌گیرد. با آن، آستانه و هدف از `ProductWarehouseSetting`ِ همان انبار می‌آید
  و «موقعیت» = موجودیِ آن انبار + در راه به آن انبار + خریدهای باز با همین انبار.
- **هر ردیف `source` (`ReorderSourceEnum`: `PURCHASE = 1`، `TRANSFER = 2`) دارد:**
  - `TRANSFER` اگر انبارِ دیگری مازادِ کافی دارد. مازاد = موجودی − آستانه‌ی خودش؛ برای انبارِ بی‌آستانه = کلِ موجودی. انبار با
    بیشترین مازاد انتخاب می‌شود.
  - ردیفِ `TRANSFER` فیلدهای `sourceWarehouseId`، `sourceWarehouseName` و `availableInSource` را دارد.
  - وگرنه `PURCHASE`، مثلِ امروز.
- **`POST api/Reorder/CreateTransferDraftsFromReorder`** (`StockTransferManage` یا `StockTransferRequest`، audit `827`):
  `{ warehouseId, lines: [{ productId, quantity, sourceWarehouseId }] }`. برای هر انبارِ مبدأ یک `DRAFT` می‌سازد.
- **`CreatePurchaseDraftsFromReorder`** موجود `warehouseId` بگیرد و روی پیش‌نویس‌های خرید بنشاند.

### ۶.۲ گزارشِ گردشِ کالا در انبار (کاردکس)

**`GET api/Warehouse/GetStockMovementReport`** (`ProductUnitView` یا `AccountingView`):
- **پارامترها:** `productId`، `warehouseId` (اختیاری)، `fromDate`، `toDate`، `page`/`take`.
- **منبع:** `ProductUnitMovement`.
- **خروجی:**
  - `openingQuantity`
  - ردیف‌ها: تاریخ، نوعِ حرکت (`reason`)، سند (`documentKind`/`documentId`/`documentNumber`)، `inQuantity`، `outQuantity`،
    `balance`
  - `closingQuantity`
- **تعریفِ ورود و خروج:** هر حرکتی که دانه را به «در اختیار و روی قفسه یا قرنطینه‌ی این انبار» می‌آورد ورود است و برعکس خروج.
  حواله برای مبدأ خروج و برای مقصد ورود است.
- **مرتب‌سازی:** تاریخ، صعودی.

### ۶.۳ خروجیِ کالا

در `DataTransfer`ِ `products` برای هر انبارِ فعال یک ستونِ «موجودی — {نامِ انبار}» بیاید. چون ستون‌ها پویا‌اند، اگر `ExportSpec` آن را
پشتیبانی نمی‌کند، یک ستونِ متنیِ «موجودی در انبارها» به شکلِ `MAIN: 3، T2: 7` کافی است.

## ۷. آنچه در این کار **نیست**

- **محدودیتِ انباردار به انبارهای خودش** (تنظیم و `UserWarehouse`): مرحله‌ی ۴.
- **جدولِ قفسه‌ها** (GAP-09)، **هشدارِ کم‌شدنِ موجودی** (GAP-15) و **شعبه**: هر کدام بعداً.
- **بهای جدا برای هر انبار:** نه (بخشِ ۱).
- **هزینه‌ی حملِ حواله:** با GAP-12 (هزینه‌های جانبی)؛ فعلاً یک هزینه‌ی عادی است.
- **اصلاحِ دستی در بخش‌های دیگر** (سندهای صادرشده، پرداخت‌ها، دفترِ اشخاص): قاعده‌ی کلیِ بخشِ ۱ در سندِ جدایی بررسی می‌شود. تیمِ بکند
  فهرستِ جاهایی را که امروز راهِ اصلاح ندارند بدهد.

## ۸. تست‌ها (حداقل)

**مرحله‌ی ۱:**
- انبارِ سند از کاربر و پیش‌فرض.
- عوض کردنِ انبارِ پیش‌فاکتورِ رزروشده رزروها را آزاد می‌کند.
- `CheckSaleWarehouse` فقط از انبارِ سند رزرو می‌کند و بارکدِ انبارِ دیگر را رد می‌کند.
- `ShipSale` با رزرو و بی‌رزرو.
- `ReceivePurchase` با انبارِ سند و با استثنا.
- `AdjustWarehouseStock` افزایش و کاهش فقط در همان انبار، و نیازِ بارکد برای کالای ردیابی‌دار.
- `UpdateProduct.Stock` با سوییچِ روشن ۴۰۰ و با سوییچِ خاموش روی انبارِ پیش‌فرض.
- موجودیِ اول با انبار.
- آستانه‌ی هر انبار و `GetProductList` با `warehouseId`.
- ارزشِ موجودیِ هر انبار.
- قواعدِ غیرفعال‌سازی.
- کدِ خودکار.

**مرحله‌ی ۲:**
- پیش‌نویس، ویرایش و لغو.
- درخواستِ مقصد.
- دو دورِ ارسال.
- دریافتِ جزئی با خرابی و کسری.
- هر سه تصمیمِ کسری و ردیفِ دفترِ گم‌شده.
- جابه‌جاییِ مستقیم.
- حواله داخلِ `ReceiveShipment`/`DispatchShipment` و برگشتِ همه‌چیز با یک خطا.
- دریافت با سوییچِ خاموش.
- backfillِ migration.
- انبارگردانیِ هم‌زمان با حواله: دانه‌ی ارسالی «مفقود» نمی‌شود و دانه‌ی رسیده «ناخواسته» گزارش می‌شود.

**مرحله‌ی ۳:**
- پیشنهادِ حواله در برابرِ خرید.
- ساختِ پیش‌نویس‌ها.
- کاردکس با حواله، فروش و تعدیل.
- ستونِ خروجی.

## ۹. سمتِ فرانت (کارِ ما، پس از هر مرحله)

- **«انبارِ فعال» در سرتیتر:** با `SetMyDefaultWarehouse`. پیش‌فرضِ همه‌ی فرم‌ها و فیلترِ همه‌ی صف‌هاست.
- **انتخابِ انبار هنگامِ ساختِ سند:** خرید، پیش‌فاکتور و مرجوعی. حذفِ انتخابگرِ جدا از صفحه‌ی ارسال، چون از سند می‌آید.
- **جدولِ «موجودی در انبارها» در جزئیاتِ کالا:** با آستانه، هدف و دکمه‌ی تعدیل.
- **قطعه‌های مشترکِ جابه‌جایی** (`MovementHeader`، `MovementLineCard`) و صف‌های ورودی و خروجیِ هر انبار.
- **صفحه‌های تازه‌ی حواله:**
  - پیش‌نویس و درخواست، ارسال، دریافت با اسکن و خرابی و کسری.
  - صفحه‌ی کسری‌ها برای حسابداری.
  - برگه‌ی چاپیِ حواله.
- **پیشنهادِ تأمینِ هر انبار، کاردکس، و فرمِ نشانیِ کاملِ انبار** (`PartyAddressForm`).
