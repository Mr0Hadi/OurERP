# مشخصاتِ پیاده‌سازی: چندانبارِ کامل (GAP-08، مرحله‌ی دوم)

> **وضعیت:** آماده‌ی پیاده‌سازی (۲۰۲۶-۱۱-۰۴، فرانت؛ بندِ §۳۹ِ `frontend-requests.fa.md`). جایگزینِ §۳۷ و §۳۸ هم هست.
>
> **روشِ کار با Claude Code:**
> - فاز به فاز (بخش‌های ۳ و ۴)؛ هر فاز یک شاخه، با تست‌ها و به‌روزرسانیِ مستندها.
> - همه‌ی قواعدِ `Backend-Net/CLAUDE.md` برقرار است، مخصوصاً ۶b (سوییچ داده را عوض یا پاک نمی‌کند و داده همیشه مدلِ «روشن» است) و §۷.
> - بندهایی که «تصمیمِ فنیِ پیشنهادی» دارند را اگر تیمِ بکند قبول ندارد، **پیش از ساخت** بگوید.
> - هر جا این سند ساکت است، الگوی موجودِ کد ملاک است (مثلاً `SaleWarehouseIssue` برای رسیدگیِ حسابداری، `ReceivePurchase` برای سربرگِ راننده).

## ۰. خلاصه و قواعدِ ثابت

- **انبار صفتِ سند است.** خرید، فروش و هر دو مرجوعی یک `WarehouseId` دارند و همه‌ی مراحلِ آن سند (رزرو، ارسال، دریافت، دورِ کالا) پیش‌فرض
  از همان انبار کار می‌کنند. پارامترِ `warehouseId`ِ دستورها فقط جایگزینِ همان یک دور است.
- **هر دانه همیشه در یک انبار است**؛ موجودیِ هر انبار از شمردنِ دانه‌ها می‌آید. `Product.Stock` همچنان جمعِ موجودیِ آزادِ همه‌ی انبارهاست.
- **بهای تمام‌شده یکی است** (یک میانگین برای همه‌ی انبارها). حواله ردیفِ دفترِ بها نمی‌سازد، مگر زیان (گم‌شدن) یا رفتن به قرنطینه.
- **انبار فقط مکانِ فیزیکیِ کالاست.** فیلدِ فروش یا حسابداری (صندوق، شماره‌ی فاکتور، قیمت) روی `Warehouse` نرود، تا «شعبه» بعداً بالای
  انبار اضافه شود (بخشِ ۶).
- **اصلاحِ دستی همیشه ممکن است**، ولی با دسترسیِ جدا، علت و ثبت در تاریخچه. هیچ ردیفی پاک یا بی‌صدا بازنویسی نمی‌شود.
- **سوییچِ `Warehouse.MultiWarehouseEnabled` خاموش:**
  - همه‌ی `WarehouseId`های تازه انبارِ پیش‌فرض‌اند و ورودیِ انبار نادیده گرفته می‌شود (مثلِ امروز، `WarehouseScope`).
  - حواله‌ی تازه، تعدیل در انبارِ غیرپیش‌فرض و آستانه‌ی هر انبار پذیرفته نمی‌شود.
  - کارِ نیمه‌تمام (حواله‌ی در راه، مغایرتِ باز) همیشه تمام‌کردنی است.

## ۱. تصمیم‌ها

| موضوع | تصمیم | از طرفِ |
|---|---|---|
| محدودیتِ کاربر به انبارهای خودش | تنظیمِ `Warehouse.RestrictUsersToAssigned`، پیش‌فرض خاموش (فقط پیش‌فرض و فیلتر). فاز ۴. | کسب‌وکار |
| کالای گم‌شده در راه | انباردارِ مقصد فقط کسری را گزارش می‌کند؛ تصمیم (زیان / برگشت به مبدأ / پیدا شد) با **حسابداری**، مثلِ `SaleWarehouseIssue`. | کسب‌وکار |
| شروعِ حواله | هر دو: مبدأ می‌سازد و ارسال می‌کند، یا مقصد «درخواستِ کالا» (پیش‌نویس) می‌دهد و مبدأ ارسالش می‌کند. | کسب‌وکار |
| انبارِ مرجوعی | انبارِ جدا لازم نیست؛ مرجوعی در انبارهای معمولی، کالای خراب در قرنطینه‌ی همان انبار. | کسب‌وکار |
| موجودی و آستانه | برای هر انبار موجودی و آستانه‌ی هشدار جدا. | کسب‌وکار |
| ویرایشِ دستیِ موجودی | مجاز، ولی **برای هر انبار** (فقط دانه‌های همان انبار)، با دسترسیِ جدا و علتِ الزامی. | کسب‌وکار |
| موجودیِ اولِ کالا | با انتخابِ انبار. | کسب‌وکار |
| بهای تمام‌شده | یک میانگین برای همه‌ی انبارها؛ ارزشِ هر انبار = تعداد × میانگین. | کسب‌وکار |
| فروش و خرید | محدود نمی‌شوند؛ همه موجودیِ همه‌ی انبارها را می‌بینند. فروش از انبارِ دیگر با انتخابِ انبارِ پیش‌فاکتور. | کسب‌وکار |
| حواله در محموله | دورِ ارسال و دورِ دریافتِ حواله هر کدام یک دستورِ مستقل‌اند و `DispatchShipment`/`ReceiveShipment` هم آن‌ها را مثلِ دورهای مرجوعی در خودشان می‌پذیرند. | تصمیمِ فنیِ پیشنهادی |
| تعدادِ دورها | **یک دورِ ارسال** (می‌شود کمتر از درخواست فرستاد؛ باقی می‌افتد) و **چند دورِ دریافت**. | تصمیمِ فنیِ پیشنهادی |
| صفِ ورودی/خروجیِ هر انبار | endpointِ تازه نه؛ فهرست‌های موجود فیلترِ `warehouseId` می‌گیرند. | تصمیمِ فنیِ پیشنهادی |
| نوعِ انبار، شعبه، قفسه‌ی هر انبار، بهای هر انبار | بیرون از این کار (بخشِ ۶). | — |

## ۲. وضعیتِ امروز (کدِ موجود)

- **`Warehouse`:** `Code`، `Name`، `Address`، `Description`، `IsDefault`، `IsActive`. دستورها در `Application/Features/Warehousing/`.
- **`ProductUnit.WarehouseId`** همیشه پر است. `ProductUnitService` با `UnitMovementContext.WarehouseId` و `WarehouseScope.ResolveAsync`
  انبار را می‌گیرد.
- **`warehouseId`ِ اختیاری روی** `ReceivePurchase`، `ShipSale`، هر دو `ExecuteGoodsRound` و `CreateStocktake`؛ روی `CheckSaleWarehouse` نیست.
- **حواله‌ی امروز:**
  - `CreateStockTransfer` همان لحظه دانه‌ها را `IN_TRANSIT` می‌کند.
  - `ReceiveStockTransfer` همه را یک‌جا تحویل می‌دهد و `CancelStockTransfer` همه را برمی‌گرداند.
  - `StockTransferStatusEnum`: `IN_TRANSIT=1، RECEIVED=2، CANCELLED=3`. جدول‌ها `StockTransfer` و `StockTransferUnit`.
- **ویرایشِ موجودی:**
  - `UpdateProduct.Stock` ← `ReconcileStockAsync`: افزایش در انبارِ پیش‌فرض ساخته می‌شود و کاهش از هر انباری.
  - دفترِ بها با `RecordManualAdjustmentIn/OutAsync`.
  - `CreateProduct.Stock` همیشه در انبارِ پیش‌فرض.
- **هیچ‌کدام انبار ندارند:** `InventoryCostLedgerEntry`، `GetInventoryValuation`، `GetProductList` (`stock`، `isLowOnStock`) و `GetReorderSuggestionList`.
- **عددهای آزاد** (هرگز عددِ موجودی را عوض نکنید؛ فقط اضافه):

  | enum | اعدادِ آزاد |
  |---|---|
  | `PermissionEnum` | ۱۸۰ تا ۱۸۹ (گروهِ انبار)، ۲۶۶ به بعد (گروهِ حسابداری) |
  | `AuditActionEnum` | ۸۲۰ به بعد |
  | `ProductUnitMovementReasonEnum` | ۲۲ به بعد |
  | `InventoryCostEventTypeEnum` | ۲۵ به بعد |
  | `UnitCustodyReasonEnum` | ۶ به بعد |
  | `StockTransferStatusEnum` | ۴ به بعد |
  | `ImageFolderEnum` | ۵ به بعد |

## ۳. فاز ۱ — انبار روی سند و کاربر، اطلاعاتِ انبار، تعدیلِ موجودی

### ۳.۱ اطلاعاتِ انبار (§۳۸)

- **`Warehouse`:** همه nullable، با همان نام و اعتبارسنجیِ `Customer`/`Supplier`:
  - `Province`، `City`
  - `PostalCode` (۱۰ رقم)
  - `Latitude`، `Longitude` (`decimal?`)
  - `PhoneNumber`، با همان قاعده‌ی `PhoneNumber`ِ تأمین‌کننده (موبایل یا ثابت)
  - `ManagerUserId` (FK به `User`، `Restrict`)
- **ورودی و خروجی:** همین‌ها در `WarehouseInput` (Create/Update) و `WarehouseDto`، به‌علاوه‌ی `ManagerName`.
- **کد:** `Code` در Create اختیاری می‌شود. خالی ⇒ سرور `W{n}` می‌سازد: کوچک‌ترین n ≥ ۱ که کدِ هیچ انباری (فعال یا غیرفعال) نیست.
  یکتایی همان‌جا تضمین می‌شود. کدِ دستی مثلِ امروز (بزرگ، یکتا، حداکثر ۳۰).

### ۳.۲ انبارِ هر کاربر

- **`User.DefaultWarehouseId`** (`int?`، FK `Restrict`):
  - در `CreateUser`/`UpdateUser` اختیاری؛ باید انبارِ فعال باشد.
  - در DTOهای کاربر (`UserInfoDto`، `UserListDto`، `UserUpdateDto`) هم بیاید، به‌علاوه‌ی `DefaultWarehouseName`.
- **`GET api/Warehouse/GetMyWarehouses`** (فقط واردشده؛ در فهرستِ `AuthenticatedOnly`ِ تستِ پوشش):
  - `{ defaultWarehouseId, warehouses: [ردیفِ GetWarehouseList] }`
  - در این فاز `warehouses` همه‌ی انبارهای فعال است؛ در فاز ۴ با `UserWarehouse` محدود می‌شود.
  - `defaultWarehouseId` = انبارِ پیش‌فرضِ کاربر، وگرنه انبارِ پیش‌فرضِ سیستم.
- **پیش‌فرضِ سندهای تازه** (بخشِ ۳.۳): `warehouseId`ِ فرستاده، وگرنه انبارِ پیش‌فرضِ کاربر، وگرنه انبارِ پیش‌فرضِ سیستم. با سوییچِ خاموش همیشه
  انبارِ پیش‌فرضِ سیستم. یک helper برای این، کنارِ `WarehouseScope`.

### ۳.۳ انبار روی سند

| سند | فیلد | ساخت و ویرایش | اثر |
|---|---|---|---|
| `Purchase` | `WarehouseId` (انبارِ مقصد)، `int` غیرِ null | `CreatePurchase`/`UpdatePurchase`: `warehouseId` اختیاری (پیش‌فرضِ ۳.۲). فقط تا وقتی سند ویرایش‌پذیر است (PROFORMA). | `ReceivePurchase` بی `warehouseId` در همین انبار دریافت می‌کند؛ پارامتر برای همان دور جایگزین است. |
| `Sale` | `WarehouseId` (انبارِ تحویل) | `CreateSale`/`UpdateSale`/`CreateInPersonProforma`: `warehouseId` اختیاری. فقط در PROFORMA. | ببینید ۳.۴. |
| `SaleReturn` | `WarehouseId` | `CreateSaleReturn`: اختیاری، پیش‌فرض `Sale.WarehouseId`. | `ExecuteGoodsRound` بی `warehouseId` از همین انبار. پارامتر برای دریافتِ مرجوعی در شعبه‌ی دیگر. |
| `PurchaseReturn` | `WarehouseId` | `CreatePurchaseReturn`: اختیاری، پیش‌فرض `Purchase.WarehouseId`. | همان. خروج از قفسه یا قرنطینه‌ی همین انبار. |

- **DTOها:** `warehouseId` و `warehouseName` روی جزئیات و فهرستِ هر چهار.
- **فیلتر:** `warehouseId` روی `GetPurchaseList`، `GetSaleList`، فهرستِ هر دو مرجوعی و هر دو `Get…PendingEffects`، تا صفِ هر انبار ساخته شود.
- **انبارِ غیرفعال:** روی سندِ تازه پذیرفته نمی‌شود. سندِ قدیمیِ آن انبار خواندنی و تمام‌کردنی می‌ماند (۶b).
- **migration:** همه‌ی سندهای موجود ⇒ انبارِ پیش‌فرض (`Warehouses.IsDefault = 1`).

### ۳.۴ پیش‌فاکتور و ارسال از انبارِ سند (§۳۷)

- **`CheckSaleWarehouse`:** رزروِ FIFO (کالای بی‌اسکن) فقط از دانه‌های `IN_STOCK`ِ `Sale.WarehouseId`. بارکدِ اسکن‌شده‌ای که در انبارِ دیگر است
  با این پیام رد شود: «دانه‌ی … در انبارِ X است، نه انبارِ این پیش‌فاکتور». کسری مثلِ امروز.
- **`CreateInPersonProforma`:** همین قاعده.
- **تغییرِ `Sale.WarehouseId` در `UpdateSale`:** هم‌ردیفِ «تغییرِ کالا یا تعداد» است: همه‌ی رزروها آزاد می‌شوند و مرحله به `DRAFT` برمی‌گردد
  (`SaleProformaPipeline`).
- **`ShipSale`:** دانه‌های رزروشده مثلِ امروز همان‌هایی‌اند که رزرو شدند. برداشتِ بی‌رزرو (مازاد، فروشِ قدیمی) از `Sale.WarehouseId`، مگر
  پارامتر چیز دیگری بگوید.

### ۳.۵ تعدیلِ دستیِ موجودی برای هر انبار

- **`POST api/Warehouse/AdjustWarehouseStock`**، دسترسیِ تازه‌ی **`StockAdjust = 182`**:

  ```json
  { "productId": 87, "warehouseId": 2, "quantity": 5, "reason": 1, "note": "اشتباهِ ورودِ اول" }
  ```

  - `quantity` = تعدادِ **تازه‌ی** دانه‌های `IN_STOCK`ِ این کالا در این انبار (≥ ۰)، نه اختلاف.
  - `StockAdjustmentReasonEnum` (تازه): `DATA_ENTRY_ERROR = 1`، `OPENING_BALANCE = 2`، `COUNT_CORRECTION = 3`، `OTHER = 9`.
  - `note`: برای `OTHER` الزامی؛ حداکثر ۵۰۰.
  - **افزایش:** دانه در همین انبار ساخته می‌شود؛ دفترِ بها `RecordManualAdjustmentInAsync` به قیمتِ خرید (مثلِ امروزِ `UpdateProduct`).
  - **کاهش:** تازه‌ترین دانه‌های `IN_STOCK`ِ **همین انبار** اسقاط می‌شوند؛ `RecordManualAdjustmentOutAsync`. دانه‌ی رزرو، قرنطینه یا
    در راه دست نمی‌خورد. اگر کم است، ۴۰۰ با عددِ موجود.
  - **حرکتِ دانه:** `MANUAL_ADJUSTMENT` (۲) با `Note` = عنوانِ علت + توضیح.
  - `Product.Stock` همان‌قدر جابه‌جا می‌شود. ردیفِ ممیزی با عددِ قبل و بعد (خودکار).
  - **پاسخ:** همان شکلِ `GetProductWarehouseStock` برای این کالا.
  - با سوییچِ خاموش فقط انبارِ پیش‌فرض پذیرفته است.
- **`UpdateProduct.Stock`:**
  - **سوییچِ روشن:** اگر با موجودیِ فعلی فرق دارد ⇒ ۴۰۰: «موجودیِ هر انبار را از «تعدیلِ موجودی» عوض کنید».
  - **سوییچِ خاموش:** مثلِ امروز (انبارِ پیش‌فرض)، ولی تغییرِ `Stock` حالا **`StockAdjust`** هم می‌خواهد (چک در handler، چون `ProductUpdate`
    برای بقیه‌ی فیلدها کافی است).
- **`CreateProduct`:** `warehouseId` اختیاری برای `Stock`ِ اول (پیش‌فرضِ ۳.۲). حرکتِ دانه `OPENING_BALANCE` (۱) مثلِ امروز.

### ۳.۶ آستانه و هدفِ هر انبار

- **جدولِ `ProductWarehouseSetting`:**
  - ستون‌ها: `ProductId` (Cascade)، `WarehouseId` (Restrict)، `LowStockThreshold int`، `TargetStock int?`، `UpdatedAt`، `UpdatedByUserId`.
  - کلید `(ProductId, WarehouseId)`؛ ردیف‌نداشتن = تعریف‌نشده.
  - `Product.LowStockThreshold`/`TargetStock` آستانه‌ی **کل** می‌مانند.
- **`PUT api/Warehouse/SetProductWarehouseSettings`** (دسترسیِ `ProductUpdate`):
  - بدنه: `{ productId, settings: [{ warehouseId, lowStockThreshold, targetStock }] }`، جایگزینیِ کامل برای این کالا.
  - با سوییچِ خاموش ۴۰۰.
- **`GetProductWarehouseStock`:** هر ردیف `lowStockThreshold`، `targetStock` و `isLow` (`inStock <= lowStockThreshold`) بگیرد. **همه‌ی انبارهای فعال**
  بیایند، حتی بی دانه، تا ستونِ آستانه برای همه پرشدنی باشد.
- **`GetProductList` و خروجیِ داده‌ی کالا** — `warehouseId` اختیاری. با آن:
  - `stock` = دانه‌های `IN_STOCK`ِ آن انبار.
  - `lowStockThreshold` از جدولِ بالا (نبود ⇒ `null`).
  - `isLowOnStock` با همان (نبودِ آستانه ⇒ «کم نیست»).
  - مرتب‌سازیِ `STOCK` روی همان عدد.
  - بی `warehouseId` مثلِ امروز.

### ۳.۷ ارزشِ موجودی

- **`GetInventoryValuation`:** `warehouseId` اختیاری.
  - **با آن:** تعداد = دانه‌های `IN_STOCK + RESERVED + QUARANTINED`ِ آن انبار (همان دسته‌بندیِ امروزِ گزارش)، ارزش = تعداد × میانگینِ کالا.
  - **بی آن:** مثلِ امروز.
  - دانه‌ی `IN_TRANSIT` مالِ هیچ انباری نیست و فقط در گزارشِ کل می‌آید.

### ۳.۸ تست‌ها و مستندهای فاز ۱

- **تست‌ها:**
  - پیش‌فرضِ انبار در سندها (فرستاده / کاربر / سیستم / سوییچِ خاموش).
  - رزروِ FIFO فقط از انبارِ پیش‌فاکتور و ردِ بارکدِ انبارِ دیگر.
  - تغییرِ انبارِ پیش‌فاکتور ⇒ آزادشدنِ رزرو.
  - دریافتِ خرید و دورِ مرجوعی بی پارامتر در انبارِ سند، با پارامتر در انبارِ دیگر.
  - تعدیلِ افزایش/کاهش فقط در همان انبار، کاهشِ بیش از موجود ۴۰۰، دانه‌ی رزرو دست‌نخورده.
  - ۴۰۰ِ `UpdateProduct.Stock` با سوییچِ روشن، و نیاز به `StockAdjust` با سوییچِ خاموش.
  - کدِ خودکارِ `W{n}`.
  - `GetProductList` با `warehouseId`، `isLow` در `GetProductWarehouseStock`، و ارزشِ موجودیِ یک انبار.
  - یک موردِ `ListSortingTests` برای `GetProductList` با `warehouseId`.
- **مستندها:**
  - `api-guide.fa.md`: بخش‌های ۲۵، ۳، ۹، ۱۱، ۱۰/۱۲، ۲۰ و ۱۵ (enumِ تازه)، و جدولِ تغییراتِ شکننده‌ی ۱۶.
  - `CLAUDE.md` (Current state).
  - زیرِ §۳۷، §۳۸ و §۳۹ِ `frontend-requests.fa.md` بنویسید چه ساخته شد.

## ۴. فاز ۲ — حواله‌ی کامل

### ۴.۱ وضعیت‌ها (`StockTransferStatusEnum`؛ فقط اضافه)

| مقدار | نام | معنا |
|---|---|---|
| 4 | `DRAFT` | پیش‌نویس یا درخواستِ کالا؛ ردیف‌ها «درخواستی»اند و دانه‌ای جابه‌جا نشده. |
| 1 | `IN_TRANSIT` | ارسال شده و هنوز هیچ دانه‌ای در مقصد تحویل نشده. |
| 5 | `PARTIALLY_RECEIVED` | بخشی تحویل شده یا مغایرتِ حل‌نشده دارد. |
| 2 | `RECEIVED` | همه‌ی دانه‌ها در مقصد (سالم یا قرنطینه). |
| 6 | `CLOSED_WITH_DISCREPANCY` | چیزی در راه نمانده، ولی دست‌کم یک مغایرت (گم‌شده یا برگشته به مبدأ) داشته. |
| 3 | `CANCELLED` | لغو، پیش از هر تحویلی. |

### ۴.۲ مدل

- **`StockTransfer`** (موجود): به‌علاوه‌ی
  - `IsDirect bool`
  - `ExpectedArrivalAt DateTime?`
  - `RequestedByUserId int?`
  - `UpdatedAt`
  - `DispatchedAt` nullable می‌شود (پیش‌نویس هنوز ارسال نشده).
- **`StockTransferLine`** (تازه): `StockTransferId`، `ProductId`، `RequestedQuantity`. ردیفِ پیش‌نویس. پس از ارسال، `RequestedQuantity` همان
  درخواست می‌ماند و عددهای ارسال و دریافت از دانه‌ها شمرده می‌شوند.
- **`StockTransferRound`** (تازه): یک دورِ ارسال یا دریافت با سربرگِ خودش:
  - `StockTransferId`، `Kind` (`DISPATCH = 1`، `RECEIPT = 2`)، `OccurredAt`
  - `DriverFullName`، `DriverPhoneNumber`، `VehiclePlate`
  - `PartyName` (تحویل‌دهنده در ارسال، تحویل‌گیرنده در دریافت)، `PartyPhoneNumber`
  - `Note`، `RecordedByUserId`، `RecordedAt`
  - نام‌ها و اعتبارسنجی مثلِ سربرگِ `ReceivePurchase`/`ExecuteGoodsRound`.
- **`StockTransferRoundImage`** (تازه): `StockTransferRoundId`، `ObjectKey`، `FileName?`، `Note?`، `UploadedAt`. مثلِ
  `PurchaseReceivingImage`، با `ImageFolderEnum.TRANSFER = 5`.
- **`StockTransferUnit`** (موجود): به‌علاوه‌ی
  - `DispatchRoundId`، `ReceiptRoundId?`
  - `State` (`StockTransferUnitStateEnum` تازه): `IN_TRANSIT = 1`، `RECEIVED = 2`، `RECEIVED_DAMAGED = 3`، `MISSING = 4`، `LOST = 5`، `RETURNED = 6`
- **`StockTransferDiscrepancy`** (تازه، الگوی `SaleWarehouseIssue`):
  - `StockTransferId`، `ProductUnitId`، `ProductId`
  - `ReportedByUserId`، `ReportedAt`، `Note`
  - `Resolution?` (`StockTransferDiscrepancyResolutionEnum`: `LOST = 1`، `RETURN_TO_SOURCE = 2`، `FOUND_AT_DESTINATION = 3`)
  - `ResolutionNote?`، `ResolvedByUserId?`، `ResolvedAt?`
- **`UnitCustodyReasonEnum.TRANSIT_DAMAGE = 6`:** خرابیِ رسیده با حواله. `ApplyProductUnitAction` (آزادسازی و اسقاط) آن را مثلِ
  `WAREHOUSE_HOLD` بپذیرد. در کامنتِ enum بیاید که خوانندگانش کیستند.
- **حرکتِ دانه (`ProductUnitMovementReasonEnum`):** `STOCK_TRANSFER_DAMAGED = 22`، `STOCK_TRANSFER_LOST = 23`، `STOCK_TRANSFER_RETURNED = 24`.
- **دفترِ بها (`InventoryCostEventTypeEnum`):** `TRANSIT_LOSS = 25`. خروج از استخر به میانگین؛ گزارشِ فروش آن را مثلِ `STOCK_SCRAPPED`
  در `ScrapLoss` بشمرد. خرابیِ رسیده همان رفتارِ `STOCK_QUARANTINED = 24` را دارد: از استخر به بیرونِ استخر به میانگین، و
  `QuarantineCost` = میانگین.

### ۴.۳ دسترسی‌ها (تازه)

| عدد | نام | برای |
|---|---|---|
| 180 | `StockTransferRequest` | ساخت و ویرایش و حذفِ **پیش‌نویس** (درخواستِ کالا) |
| 181 | `StockTransferReceive` | دورِ دریافت، گزارشِ کسری |
| 266 | `StockTransferDiscrepancyResolve` (گروهِ حسابداری) | رسیدگی به مغایرت‌ها |

- `StockTransferManage` (۱۷۵) می‌ماند برای ارسال، جابه‌جاییِ مستقیم و لغو.
- **خواندنِ فهرست و جزئیات:** هر کدام از `StockTransferView`، `StockTransferManage`، `StockTransferRequest`، `StockTransferReceive`.
- **فهرستِ مغایرت‌ها:** `AccountingView` یا `StockTransferDiscrepancyResolve`.
- **audit:** هر دستورِ تازه عضوِ خودش در `AuditActionEnum` از ۸۲۰ به بعد (تستِ پوشش اجبار می‌کند). `AdjustWarehouseStock` و
  `SetProductWarehouseSettings`ِ فاز ۱ هم همین‌طور.

### ۴.۴ دستورها

همه در `api/Warehouse`. پاسخِ همه‌ی دستورهای حواله سندِ کاملِ `GetStockTransferDetail` است (بخشِ ۴.۵). فقط حذف `{ id }` برمی‌گرداند.

| دستور | از وضعیت | کار |
|---|---|---|
| `CreateStockTransfer` | — | `{ fromWarehouseId, toWarehouseId, description, expectedArrivalAt, isDirect, lines: [{ productId, quantity, productUnitBarcodes }] }`. بی `isDirect` ⇒ **`DRAFT`** با `RequestedQuantity` (بارکد نادیده). `isDirect: true` ⇒ بخشِ ۴.۶. با سوییچِ خاموش ۴۰۰. |
| `UpdateStockTransfer` | `DRAFT` | همان بدنه با `id`؛ جایگزینیِ کامل. `UpdatedAt` برای همزمانی، مثلِ `DocumentVersion`ِ خرید و فروش. |
| `DeleteStockTransfer` | `DRAFT` | پاک‌کردنِ واقعیِ پیش‌نویس (هنوز اثری ندارد). |
| `DispatchStockTransfer` | `DRAFT` | `{ stockTransferId, occurredAt, driverFullName, driverPhoneNumber, vehiclePlate, partyName, partyPhoneNumber, note, images, expectedArrivalAt, lines: [{ productId, quantity, productUnitBarcodes }] }`. هر `quantity` بین ۱ و `RequestedQuantity`؛ کالای بیرون از درخواست ۴۰۰. باقی‌مانده می‌افتد. دانه‌ها از `IN_STOCK`ِ مبدأ (بارکد یا FIFO؛ برای `RequiresUnitTracking` بارکد الزامی) ⇒ `IN_TRANSIT`، ردیفِ `StockTransferUnit` با `DispatchRoundId`، حرکتِ `STOCK_TRANSFER_DISPATCHED`. وضعیت ⇒ `IN_TRANSIT`. |
| `ReceiveStockTransferRound` | `IN_TRANSIT`، `PARTIALLY_RECEIVED` | `{ stockTransferId, occurredAt, سربرگِ دریافت, images, lines: [{ productId, arrivedQuantity, productUnitBarcodes, defects: [{ quantity, problem, note, productUnitBarcodes }] }] }`. `arrivedQuantity` ≤ در راهِ این کالا در این حواله و شاملِ خراب‌هاست. بارکدها باید در راهِ **همین حواله** باشند (برای `RequiresUnitTracking` الزامی؛ وگرنه FIFO از در راهِ همین حواله). سالم ⇒ `IN_STOCK` در مقصد (`STOCK_TRANSFER_RECEIVED`). خراب ⇒ `QUARANTINED` در مقصد، `TRANSIT_DAMAGE`، `STOCK_TRANSFER_DAMAGED`، دفترِ بها مثلِ `STOCK_QUARANTINED`. `problem` از `ObservedProblems`. وضعیت از ۴.۷. |
| `ReceiveStockTransfer` (موجود) | `IN_TRANSIT`، `PARTIALLY_RECEIVED` | میان‌بُر: یک دورِ دریافتِ همه‌ی در راه‌ها، سالم و بی سربرگ. قرارداد عوض نمی‌شود. |
| `ReportStockTransferShortage` | `IN_TRANSIT`، `PARTIALLY_RECEIVED` | `{ stockTransferId, note }` (یادداشت الزامی). هر دانه‌ی هنوز در راه ⇒ یک `StockTransferDiscrepancy` و `State = MISSING`. دانه `IN_TRANSIT` می‌ماند تا حسابداری تصمیم بگیرد. وضعیت ⇒ `PARTIALLY_RECEIVED`. |
| `ResolveStockTransferDiscrepancy` | — | `{ discrepancyIds: [], resolution, note }`، همه یا هیچ. `LOST` ⇒ دانه `SCRAPPED`، `STOCK_TRANSFER_LOST`، دفترِ بها `TRANSIT_LOSS`. `RETURN_TO_SOURCE` ⇒ `IN_STOCK` در مبدأ، `STOCK_TRANSFER_RETURNED`. `FOUND_AT_DESTINATION` ⇒ `IN_STOCK` در مقصد، `STOCK_TRANSFER_RECEIVED`. مغایرتِ رسیدگی‌شده دوباره رسیدگی نمی‌شود. وضعیت از ۴.۷. |
| `CancelStockTransfer` (موجود) | `DRAFT`، `IN_TRANSIT` | `DRAFT` ⇒ `CANCELLED`. `IN_TRANSIT` (هیچ دانه‌ای تحویل نشده) ⇒ همه به `IN_STOCK`ِ مبدأ، مثلِ امروز. پس از اولین دورِ دریافت ۴۰۰: «کسری را گزارش کنید». |
| `GetStockTransferDiscrepancyList` | — | صفحه‌ای؛ فیلترِ `resolved` (bool)، `warehouseId` (مبدأ یا مقصد)، `fromDate`/`toDate`. ردیف با شماره‌ی حواله، کالا، بارکد، مبدأ، مقصد، گزارش‌دهنده، یادداشت، تصمیم و ارزش (میانگین). |

- **در محموله:**
  - `DispatchShipment` آرایه‌ی `stockTransferDispatches` (بدنه‌ی `DispatchStockTransfer`) و `ReceiveShipment` آرایه‌ی `stockTransferReceipts`
    (بدنه‌ی `ReceiveStockTransferRound`) را می‌پذیرند و از راهِ `IMediator` در همان تراکنش می‌فرستند، مثلِ دورهای مرجوعی.
  - حداقلِ «دست‌کم یک بخش» حواله را هم بشمرد.
  - پاسخِ محموله `stockTransfers: [...]` هم بگیرد.
- **انبار و محدودیت:** مبدأ و مقصد فعال و متفاوت باشند (برای ساخت و ارسال). دریافت و رسیدگی برای انبارِ غیرفعال‌شده هم ممکن است (۶b).

### ۴.۵ `GetStockTransferDetail` و فهرست

- **سند:** فیلدهای امروز، به‌علاوه‌ی
  - `isDirect`، `expectedArrivalAt`
  - `isOverdue` (در راه و `expectedArrivalAt < now`)
  - `requestedByUserId/Name`، `updatedAt`
- **`lines[]`:** `productId`، `productCode`، `productName`، `requiresUnitTracking`، `requestedQuantity`، `dispatchedQuantity`، `receivedQuantity`،
  `damagedQuantity`، `inTransitQuantity`، `missingQuantity`، `lostQuantity`، `returnedQuantity`، و `units: [{ productUnitId, barcode, state }]`.
  جایگزینِ `products[]`ِ امروز.
- **`rounds[]`:** `kind`، `occurredAt`، سربرگ، `images: [{ objectKey, url, fileName, note }]`، `recordedByName`.
- **`discrepancies[]`:** شکلِ ردیفِ `GetStockTransferDiscrepancyList`.
- **پرچم‌ها** (یک قاعده برای دستور و پرچم، الگوی `PurchaseDocumentRules`): `canEdit`، `canDelete`، `canDispatch`، `canReceive`،
  `canReportShortage`، `canCancel`.
- **فهرست:** `statuses` با مقدارهای تازه. فیلترِ تازه‌ی `warehouseId` (مبدأ **یا** مقصد) و `isOverdue`. ردیف `isOverdue` و `isDirect` می‌گیرد.

### ۴.۶ جابه‌جاییِ مستقیم (`isDirect: true`)

برای انبارهای کنارِ هم: `CreateStockTransfer` در یک تراکنش می‌سازد، یک دورِ ارسال و یک دورِ دریافتِ سالم ثبت می‌کند (بی سربرگ) و وضعیت ⇒
`RECEIVED`. همان قواعدِ دانه و بارکدِ `DispatchStockTransfer`. فقط `StockTransferManage`.

### ۴.۷ قاعده‌ی وضعیت (یک تابع، مثلِ `RecomputePurchaseStatus`)

| اگر | وضعیت |
|---|---|
| ارسال نشده | `DRAFT` یا `CANCELLED` (دستی) |
| ارسال شده و هیچ دانه‌ای `RECEIVED`، `RECEIVED_DAMAGED` یا با مغایرت نیست | `IN_TRANSIT` |
| دانه‌ای `IN_TRANSIT` مانده، یا مغایرتِ رسیدگی‌نشده هست | `PARTIALLY_RECEIVED` |
| هیچ‌کدام از بالا، و دست‌کم یک دانه `LOST` یا `RETURNED` | `CLOSED_WITH_DISCREPANCY` |
| وگرنه | `RECEIVED` |

`ReceivedAt`/`ReceivedByUserId` هنگامِ رسیدن به `RECEIVED` یا `CLOSED_WITH_DISCREPANCY` پر می‌شوند.

### ۴.۸ migrationِ حواله‌های موجود

- **ردیف‌ها:** برای هر حواله، `StockTransferLine` از روی دانه‌هایش (`RequestedQuantity` = تعداد).
- **دور:** یک دورِ `DISPATCH` با `OccurredAt = DispatchedAt` و همه‌ی دانه‌ها روی آن.
- **حواله‌های `RECEIVED`:** یک دورِ `RECEIPT` با `OccurredAt = ReceivedAt`؛ دانه‌ها `State = RECEIVED`.
- **حواله‌های `IN_TRANSIT`:** دانه‌ها `State = IN_TRANSIT`.
- **حواله‌های `CANCELLED`:** دانه‌ها `State = RETURNED`.
- `DispatchedAt` برای همه می‌ماند.

### ۴.۹ تست‌های فاز ۲

- **چرخه:** پیش‌نویس ⇒ ارسالِ کمتر از درخواست ⇒ دو دورِ دریافت (یکی با خرابی) ⇒ `RECEIVED`. موجودیِ هر انبار و `Product.Stock` در هر قدم.
- **کسری:** ⇒ مغایرت ⇒ هر سه نوعِ رسیدگی و حرکتِ دانه. `TRANSIT_LOSS` در دفترِ بها و در `ScrapLoss`ِ گزارشِ فروش.
  ⇒ `CLOSED_WITH_DISCREPANCY`.
- **ردهای دریافت:** بارکدِ حواله‌ی دیگر یا دانه‌ی غیرِ در راه، `arrivedQuantity` بیش از در راه، و کالای `RequiresUnitTracking` بی بارکد.
- **لغو:** پس از دریافتِ جزئی رد شود، و لغوِ `IN_TRANSIT` همه را برگرداند.
- **مستقیم:** یک قدم.
- **محموله:** خرید + حواله در یک `ReceiveShipment`، و rollbackِ همه با خطای یک بخش.
- **انبارگردانی:** هم‌زمان با حواله (ارسال در حینِ شمارش «مفقود» نیست؛ رسیده «ناخواسته» است).
- **قرنطینه:** `ApplyProductUnitAction` روی `TRANSIT_DAMAGE`.
- **پرچم‌ها:** `can*` در هر وضعیت.
- **دیگر:** `ListSortingTests` برای فهرستِ مغایرت‌ها، و تستِ پوششِ دسترسی و audit.

مستندها: بخشِ ۲۵ِ `api-guide.fa.md` بازنویسی شود، به‌علاوه‌ی ۱۵ (enumها) و جدولِ ۱۶. `CLAUDE.md` و `frontend-requests.fa.md` هم مثلِ فاز ۱.

## ۵. فاز ۴ — بعدی (فاز ۳ کارِ فرانت است)

1. **پیشنهادِ تأمینِ هر انبار** — `GetReorderSuggestionList` با `warehouseId`:
   - برای هر کالای `isLow` در آن انبار، مقدارِ لازم = `TargetStock ?? LowStockThreshold` منهای (موجودیِ انبار + در راه به این انبار + پیش‌نویس‌های
     حواله به این انبار).
   - **منبع:** اگر انبارِ دیگری مازاد بر آستانه‌ی خودش دارد، `{ kind: TRANSFER, fromWarehouseId, quantity }`؛ وگرنه `{ kind: PURCHASE, supplierId }`
     مثلِ امروز.
   - **`CreateStockTransferDraftsFromReorder`:** یک پیش‌نویسِ حواله برای هر انبارِ مبدأ، در یک تراکنش. همتای
     `CreatePurchaseDraftsFromReorder` که آن هم `warehouseId` می‌گیرد و روی خرید می‌گذارد.
2. **محدودیتِ کاربر:**
   - جدولِ `UserWarehouse` (کاربر ↔ انبار)، از صفحه‌ی کاربر، دسترسیِ `UserUpdate`.
   - تنظیمِ `Warehouse.RestrictUsersToAssigned` (BOOLEAN، پیش‌فرض false، public، گروهِ `WAREHOUSE`). وقتی روشن است:
     - `GetMyWarehouses` فقط انبارهای کاربر را می‌دهد.
     - هر دستوری که انبار می‌گیرد یا از سند می‌خواند، اگر انبار از آنِ کاربر نیست ۴۰۳ می‌دهد (یک helper، کنارِ `WarehouseScope`).
     - استثنا: دسترسیِ `WarehouseManage`.
   - کاربرِ بی‌ردیف = همه‌ی انبارها.
3. **گزارشِ گردشِ کالا در انبار (کاردکس)** — `GET api/Warehouse/GetStockMovementReport`:
   - پارامترها: `warehouseId?`، `productId?`، `fromDate`، `toDate`.
   - خروجی: مانده‌ی اول، ردیف‌های ورود و خروج از `ProductUnitMovement` (دلیل، سند، تعداد) و مانده‌ی آخر. صفحه‌ای با جمعِ کل.
4. **غیرفعال‌کردنِ انبار:** علاوه بر امروز، رد شود اگر سندِ بازی (خرید یا فروشِ تحویل‌نشده، مرجوعیِ باز، پیش‌نویسِ حواله، مغایرتِ
   رسیدگی‌نشده) روی آن است. `User.DefaultWarehouseId` و `ProductWarehouseSetting`های آن انبار پاک شوند (در همان تراکنش، با ممیزی).
5. **خروجیِ داده:** ستونِ موجودیِ هر انبارِ فعال در خروجیِ `products`.

## ۶. بیرون از این کار (عمداً)

- **شعبه:** `Branch` بالای `Warehouse`، با صندوق، کارتخوان، کاربر و شماره‌گذاری. فقط قاعده‌ی «انبار = مکانِ فیزیکی» (بخشِ ۰) رعایت شود.
- **قفسه به‌عنوانِ موجودیت** (GAP-09). `ProductUnit.BinLocation` مثلِ امروز می‌ماند و چون دانه انبار دارد، قفسه عملاً مالِ همان انبار است.
- **بهای جدا برای هر انبار.**
- **هزینه‌ی حملِ حواله** روی بهای کالا (با GAP-12).
- **فهرستِ کلیِ «اصلاحِ دستی»** برای بخش‌های دیگر (سندِ صادرشده، پرداخت، دفترِ اشخاص): جدا بررسی می‌شود. تیمِ بکند فهرستِ جاهایی که امروز
  راهِ اصلاح ندارند را بدهد.
- **نوعِ انبار** (اصلی، شعبه، فروشگاه): تا نیازی واقعی نباشد ساخته نشود.

## ۷. تغییراتِ شکننده برای فرانت (برای جدولِ ۱۶ِ `api-guide`)

- `StockTransferDto.products[]` ⇒ `lines[]`. `dispatchedAt` nullable. وضعیت‌های تازه.
- `CreateStockTransfer` بی `isDirect` پیش‌نویس می‌سازد، نه ارسال. فرانت باید `DispatchStockTransfer` را صدا بزند.
- `UpdateProduct` با سوییچِ روشن و `stock`ِ متفاوت ۴۰۰ می‌دهد. با سوییچِ خاموش تغییرِ `stock` دسترسیِ `StockAdjust` می‌خواهد.
- `CheckSaleWarehouse` بارکدِ انبارِ دیگر را رد می‌کند.
- `GetProductWarehouseStock` همه‌ی انبارهای فعال را برمی‌گرداند، حتی بی دانه.

## ۸. پرسش‌های غیرمسدودکننده

این‌ها جلوی ساخت را نمی‌گیرند و پاسخِ پیش‌فرضشان در متن آمده؛ اگر تیم نظرِ دیگری دارد، پیش از فازِ مربوط بگوید:

1. **تعدیلِ افزایشی** با قیمتِ خرید (مثلِ امروز) یا میانگین؟ *پیش‌فرض: قیمتِ خرید، برای هم‌خوانی با `UpdateProduct`ِ امروز.*
2. **یک دورِ ارسال** کافی است، یا ارسالِ چندمرحله‌ای (مثلاً با دو کامیون) هم لازم است؟ *پیش‌فرض: یک دور؛ برای دو کامیون دو حواله.*
3. **`ExpectedArrivalAt`:** فقط اطلاع است، یا بعداً اعلانِ دیرکرد (GAP-15) هم می‌خواهد؟ *پیش‌فرض: فقط پرچمِ `isOverdue`.*
