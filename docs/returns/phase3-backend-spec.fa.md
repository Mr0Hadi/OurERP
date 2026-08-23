# فاز ۳ — مشخصات بک‌اند مرجوعی (سند تحویلی)

مخاطب: تیم بک‌اند (`Backend-Net`).
پیش‌نیاز خواندن: [`phase1-analysis.fa.md`](./phase1-analysis.fa.md) — تحلیل شکاف فعلی.

**وضعیت فرانت:** لایه‌ی `api-v1.js` در هر دو سمت مرجوعی و در دریافت/ارسال انبار نوشته و تثبیت شده. آنچه در این سند می‌آید *همان قراردادی است که فرانت امروز پیاده کرده* — نه یک پیشنهاد. فرانت فعلاً روی mock کار می‌کند و روزِ اتصال، فقط یک خط در `services/api.js` هر ماژول عوض می‌شود.

**تصمیم معماری:** مدل هدف، مدل «اثر» (Effect) است. مدل فعلی بک‌اند (`Decision` با enum بسته) نمی‌تواند ترکیب‌های واقعی را بیان کند: «تعویض با کالای دیگر»، «تعویض + مابه‌التفاوت نقدی»، «بخشی نقد بخشی اعتبار». در عوض، نقاط قوت بک‌اند فعلی (سهمیه، انتشار به سند مبدأ، بازرسی چنددوره‌ای، تفکیک ادعا از مشاهده) باید در مدل جدید بازتولید شوند — بند ۲ دقیقاً همان‌هاست.

---

## ۰. مفهوم مرکزی: تصمیم = ترکیبی از چهار اثر

تصمیم‌های مرجوعی یک فهرست بسته نیستند. هر تصمیم ترکیبی از چهار حرکتِ ممکن است:

| اثر | در مرجوعی فروش | در مرجوعی خرید |
|---|---|---|
| `goods_in` | مشتری کالا را پس می‌دهد | تامین‌کننده جایگزین می‌فرستد |
| `goods_out` | برای مشتری می‌فرستیم | به تامین‌کننده عودت می‌دهیم |
| `money_in` | مشتری پول می‌دهد | تامین‌کننده پول برمی‌گرداند |
| `money_out` | به مشتری پس می‌دهیم | به تامین‌کننده می‌پردازیم |

جهت‌ها نسبت به **ما** تعریف شده‌اند، نه نسبت به طرف حساب — به همین دلیل یک مدل هر دو سمت را پوشش می‌دهد و تفاوت دو سمت فقط در برچسب‌های UI است.

«بازگشت وجه»، «تعویض» و «اعتبار خرید» صرفاً نام‌های ترکیب‌های پرتکرارِ همین چهارتا هستند و **نباید** به‌صورت enum ذخیره شوند.

ساختار:

```
Return
 └─ Claim[]           ادعا: یک کالا، یک مشکل، یک تعداد
     └─ Resolution[]  تصمیم برای بخشی از آن تعداد
         └─ Effect[]  اثرهای پایه — تنها چیزی که واقعاً اجرا می‌شود
             └─ GoodsRound[]  دورهای اجرای فیزیکی (فقط اثر کالایی)
                 └─ Observation[]  مشاهده‌ی انباردار
```

---

## ۱. مدل داده‌ی هدف

### ۱.۱ ساختار جدول‌ها

**پیشنهاد: یک درخت مشترک با تمایزدهنده‌ی `Side`.** امروز خرید و فروش دو درختِ آینه‌ایِ واگرا هستند (فروش ۴ سطحی با `Claim`، خرید ۳ سطحی بدون آن) و همین باعث شده منطق یکسان دو بار و ناهماهنگ نوشته شود. اگر ترجیح می‌دهید دو جدول جدا بماند، دست‌کم **شکل و نام فیلدها باید دقیقاً یکی باشد** تا یک لایه‌ی منطق به هر دو سرویس بدهد.

#### `Returns`

| فیلد | نوع | توضیح |
|---|---|---|
| `Id` | int | |
| `Side` | enum | `sales` / `purchase` |
| `ReturnNumber` | string | `SRET-YYYY-NNN` / `PRET-YYYY-NNN` |
| `SaleId` | int? | برای `side=sales` پر است |
| `PurchaseId` | int? | برای `side=purchase` پر است |
| `ReturnDate` | date | تاریخ ثبت ادعا (نامش در قرارداد `returnDate` است، نه `requestDate`) |
| `Status` | enum | `open` / `in_progress` / `settled` / `rejected` / `cancelled` |
| `Description` | string? | |
| `PreviousReturnId` | int? | زنجیره‌ی مرجوعی روی مرجوعی |
| `SourceEffectId` | int? | اثری که این مرجوعی از دلش متولد شده |
| `CreatedAt`, `UpdatedAt` | datetime | |

#### `ReturnClaims`

| فیلد | نوع | توضیح |
|---|---|---|
| `Id` | int | |
| `ReturnId` | int | |
| `Scope` | enum | `on_order` / `off_order` |
| `OffScopeKind` | enum? | `excess` / `unlisted` — فقط وقتی `scope=off_order` |
| `OrderLineId` | int? | **`SaleItem.Id` یا `PurchaseItem.Id`** — برای `off_order` تهی است |
| `ProductId` | int? | برای کالای `unlisted` می‌تواند تهی باشد |
| `ProductCode`, `ProductName`, `Unit` | string | اسنپ‌شات لحظه‌ی ثبت |
| `UnitPrice` | UInt64 | برای `off_order` دستی وارد می‌شود |
| `Qty` | int | |
| `Problem` | enum | بند ۱.۲ |
| `Note` | string? | |
| `CreatedAt` | datetime | |

> **`OrderLineId` حیاتی است.** امروز فرانت (و بک‌اند در بعضی مسیرها) خط سند را با `ProductId` می‌شناسد. اگر یک کالا در دو خط فاکتور با قیمت یا تخفیف متفاوت بیاید، دو خط قابل تفکیک نیستند و سهمیه‌ی مرجوعی روی هم می‌افتد. این در فاز ۲ سمت فرانت اصلاح شد.

#### `ReturnResolutions`

`Id`, `ClaimId`, `Qty`, `Note?`, `CreatedAt`, `CreatedByUserId`

#### `ReturnEffects`

| فیلد | نوع | توضیح |
|---|---|---|
| `Id` | int | |
| `ResolutionId` | int | |
| `Kind` | enum | `goods_in` / `goods_out` / `money_in` / `money_out` |
| `Qty` | int | فقط اثر کالایی |
| `DoneQty` | int | **تجمعی** — چقدر واقعاً جابه‌جا شده |
| `RestockedQty` | int? | فقط `goods_in`؛ همیشه ≤ `DoneQty` |
| `ProductId` | int? | کالای *اثر*، نه لزوماً کالای ادعا (تعویض با کالای دیگر) |
| `ProductCode`, `ProductName`, `Unit` | string | |
| `Amount` | UInt64 | فقط اثر پولی |
| `Method` | enum? | `cash`/`check`/`transfer`/`on_account`/`store_credit`/`mixed` |
| `Reference` | string? | شماره چک یا پیگیری |
| `Status` | enum | `pending` / `applied` / `void` |
| `Note` | string? | |
| `CreatedAt`, `AppliedAt?` | datetime | |

#### `ReturnEffectParts` (پرداخت ترکیبی)

`Id`, `EffectId`, `Type` (`cash`/`check`/`transfer`), `Amount`, `CheckNumber?`, `TransferRef?`
مجموع `Amount` قطعاتِ یک اثر باید برابر `Effect.Amount` باشد.

#### `ReturnGoodsRounds`

`Id`, `EffectId`, `Date`, `Qty`, `HealthyQty?`, `PartyName?`, `PartyNationalId?`, `VehiclePlate?`, `Note?`, `CreatedAt`

#### `ReturnGoodsObservations`

`Id`, `RoundId`, `Problem` (enum بند ۱.۲), `Qty`, `Note?`

> این جدول جانشین `SaleReturnItem.IssueType` امروز است و همان ارزش را حفظ می‌کند: تفکیک «آنچه طرف حساب ادعا کرد» از «آنچه انباردار دید». مشتری می‌گوید «معیوب بود»، انباردار می‌بیند «آسیب حمل» — هرکدام یک مقصرِ متفاوت را نشان می‌دهند و هر دو باید بمانند و **کوئری‌پذیر** باشند.

#### `IdempotencyKeys`

`Key` (PK), `Endpoint`, `RequestHash`, `ResponseBody`, `CreatedAt` — بند ۳.۵.

### ۱.۲ enumها (مقادیر دقیقاً همین رشته‌ها)

**`Problem`** — یک فضای مقدار برای ادعای فروش، ادعای خرید و مشاهده‌ی انبار:

```
wrong_item_shipped, wrong_item_invoiced, wrong_item_ordered,
short_shipped, over_shipped, wrong_qty_invoiced, wrong_qty_ordered,
defective, damaged_in_transit, quality_issue, expired,
changed_mind, unlisted_item, other
```

زیرمجموعه‌ی مجاز هر سمت:

| سمت | مقادیر |
|---|---|
| ادعای فروش | همه به‌جز `unlisted_item` |
| ادعای خرید | `short_shipped, defective, damaged_in_transit, wrong_item_shipped, expired, quality_issue, over_shipped, unlisted_item, other` |
| مشاهده‌ی انبار | `short_shipped, defective, damaged_in_transit, wrong_item_shipped, expired, quality_issue, other` |

**بقیه‌ی enumها:**

| enum | مقادیر |
|---|---|
| `ReturnStatus` | `open`, `in_progress`, `settled`, `rejected`, `cancelled` |
| `ClaimScope` | `on_order`, `off_order` |
| `OffScopeKind` | `excess`, `unlisted` |
| `EffectKind` | `goods_in`, `goods_out`, `money_in`, `money_out` |
| `EffectStatus` | `pending`, `applied`, `void` |
| `PaymentMethod` | `cash`, `check`, `transfer`, `on_account`, `store_credit`, `mixed` |

نگاشت `PaymentMethod` به `PaymentTypeEnum` فعلی: `on_account ↔ CREDIT`. مقدارِ `store_credit` معادلی ندارد — بند ۲.۴.

---

## ۲. قوانین کسب‌وکار

### ۲.۱ سهمیه‌ی قابل‌ادعا (باید سروری بماند)

فرانت این عدد را فقط *نمایش* می‌دهد؛ اعتبارسنجیِ واقعی سمت سرور است.

```
claimableQty(line) = max(0, deliveredQty(line) − openClaimQty(line))

openClaimQty(line) = Σ (claim.Qty − decidedQty(claim))
                     روی همه‌ی مرجوعی‌های فعالِ همان سند
decidedQty(claim)  = Σ resolution.Qty
```

- «فعال» یعنی وضعیتش `rejected` یا `cancelled` نیست. مرجوعیِ ردشده سهمیه را آزاد می‌کند.
- ادعای `off_order` **سهمیه‌ی هیچ خطی را مصرف نمی‌کند** و سقف ندارد — کالای اضافه‌ای که فرستاده شده، بیرون از سند است.
- `deliveredQty` با هر دور جابه‌جایی کالا تغییر می‌کند، نه فقط با ارسال/دریافتِ خودِ سند:
  - **فروش:** `shippedQty − Σ goods_in.DoneQty + Σ goods_out.DoneQty`
  - **خرید:** `receivedQty + Σ goods_in.DoneQty`
    (عودتِ کالای معیوب چیزی کم نمی‌کند، چون `receivedQty` از ابتدا فقط کالای سالم را می‌شمرد.)

### ۲.۲ ماشین وضعیت

وضعیت **مشتق** می‌شود و دستی انتخاب نمی‌شود:

```
اگر status ∈ {rejected, cancelled} → همان می‌ماند (اکشن صریح است)
totalDecided = Σ claim.decidedQty
totalClaimed = Σ claim.Qty
اگر totalDecided == 0                                → open
اگر totalDecided >= totalClaimed و هیچ اثر pending نیست → settled
در غیر این صورت                                       → in_progress
```

> **تغییر نسبت به امروز:** بازرسی دیگر ورودی وضعیت نیست. مرجوعی‌ای که تصمیمش «فقط بازگشت وجه» است هرگز پای انبار را وسط نمی‌کشد و مستقیم از `open` به `settled` می‌رود. وضعیت `pending_inspection` حذف می‌شود.

### ۲.۳ ترتیب کار: تصمیم مقدم بر انبار

امروز در سمت فروش، تصمیم فقط روی `SaleReturnItem` می‌نشیند که خودش محصول `ConfirmReturnInspection` است — یعنی تا انبار کالا را ندیده هیچ تصمیمی ثبت‌شدنی نیست.

در مدل هدف برعکس است: تصمیم روی **ادعا** ثبت می‌شود، اثر کالایی `pending` می‌ماند، و انبار بعداً در یک یا چند دور می‌بندد. کالای برگشتی اصلاً وارد انبار نمی‌شود مگر تصمیمی آن را خواسته باشد.

### ۲.۴ پول

این بخش امروز **کاملاً وجود ندارد**: `RefundAmount` فقط یک عدد روی ردیف تصمیم است و هیچ‌جا `TotalAmount`، `PaidAmount` یا `PaymentDetail` را تکان نمی‌دهد.

قواعد مدل هدف:

1. اثر پولی **در لحظه‌ی ثبتِ تصمیم** `applied` می‌شود (ثبتش توسط واحد فروش/خرید خودش همان اقدام مالی است). اثر کالایی همیشه `pending` شروع می‌شود.
2. هر اثر پولی باید یک `PaymentDetail` واقعی بسازد.
3. اثر روی مبلغ سند:
   - فروش: `money_in` مبلغ فاکتور را **زیاد** و `money_out` **کم** می‌کند.
   - خرید: `money_in` بدهی ما را **کم** و `money_out` آن را **زیاد** می‌کند.
4. **استثنا:** `store_credit` مبلغ همین سند را تغییر نمی‌دهد — تعهدی برای معامله‌ی *بعدی* است. اگر قرار است به اعتبارِ قابل‌استفاده تبدیل شود، به یک ledger جدا نیاز دارد (امروز نه در فرانت هست نه در بک‌اند). تا آن روز، فقط ثبت می‌شود بدون اثر مالی — و این باید یک تصمیم صریح باشد، نه یک فراموشی.
5. `mixed` مبلغش از مجموع `ReturnEffectParts` می‌آید، نه از فیلد `Amount` ورودی.

### ۲.۵ انبار و موجودی

```
goods_in:  Product.Stock += RestockedQty        (فقط بخش سالم)
goods_out: Product.Stock -= DoneQty             (همه‌ی آنچه خارج شد)
```

- `HealthyQty` یک ورودیِ مستقل **نیست**؛ از روی مشاهده‌ها مشتق می‌شود:
  `HealthyQty = Qty − Σ observations.Qty` (کف صفر). دو ورودیِ جدا یعنی دو عددی که می‌توانند با هم نخوانند.
- کالای معیوبِ برگشتی **دریافت می‌شود** (`DoneQty` بالا می‌رود و ادعا بسته می‌شود) ولی وارد موجودی قابل‌فروش نمی‌شود.
- اثر وقتی `applied` می‌شود که `DoneQty >= Qty`؛ تا آن لحظه `pending` می‌ماند و در صف انبار دیده می‌شود.
- **ورود به صف انبار فقط از روی وجود اثرِ `pending` است**، نه از روی وضعیت مرجوعی.

### ۲.۶ انتشار به سند مبدأ

- `SaleItem.SettledQuantity` / `PurchaseItem.SettledQuantity` باید از روی اثرها به‌روز شود، نه از روی نوع تصمیم.
- `RecomputeSaleStatus` / `RecomputePurchaseStatus` بعد از هر اقدام اجرا شود.
- منطق `ResolveAwaitingReplacements` امروز یک **heuristic** است: حدس می‌زند محموله‌ی رسیده همان جایگزینِ وعده‌داده‌شده است. در مدل جدید این حدس لازم نیست — دورِ کالا صریحاً به `EffectId` اشاره می‌کند. این heuristic باید حذف و با اتصال صریح جایگزین شود.

### ۲.۷ چرخه‌ی عمر

```
canDelete = canCancel = canReject = هیچ اثری status=applied ندارد
```

معیار عمداً «اعمال‌شده» است نه «ثبت‌شده»: تصمیمی که ثبت شده ولی اثر کالاییِ معلق دارد، هنوز هیچ ردی در دنیای بیرون نگذاشته و برگرداندنش بی‌ضرر است.

**حذف یک تصمیم:** تا وقتی هیچ کالایی از اثرهایش جابه‌جا نشده (`DoneQty == 0`) مجاز است؛ اثرهای پولی‌اش باید با یک تعدیل معکوس خنثی شوند.

> این با قاعده‌ی امروز فرق دارد: الان فقط تصمیم `AWAITING` (یعنی فقط `REPLACEMENT`) قابل حذف است، پس یک بازگشت وجه با مبلغ اشتباه **برای همیشه** در سیستم می‌ماند.

**`reopen`** فقط از `rejected` مجاز است و وضعیت را دوباره مشتق می‌کند.

### ۲.۸ ادعای خارج از سند

امروز اصلاً وجود ندارد (`SaleItemId` اجباری است). دو حالت:

- `excess` — بیشتر از مقدار سند رسیده/فرستاده شده. قیمت واحد از همان خط سند می‌آید.
- `unlisted` — کالایی که اصلاً در سند نیست. ممکن است `ProductId` نداشته باشد (انباردار فقط شرح و تعداد ثبت می‌کند) و قیمتش دستی وارد می‌شود.

هیچ‌کدام سهمیه‌ی خطوط سند را مصرف نمی‌کنند و در محاسبات وابسته به `Qty`/`ReceivedQty` شرکت نمی‌کنند.

### ۲.۹ چند مرجوعی فعال

- **فروش:** امروز هم چند مرجوعی فعال روی یک فاکتور مجاز است. ✅
- **خرید:** امروز فقط یک مرجوعی فعال ممکن است و مرجوعی فقط به‌عنوان عارضه‌ی `ReceivePurchaseCommand` متولد می‌شود. **باید تغییر کند**: `POST /purchase-returns` مستقل لازم است و چند مرجوعی هم‌زمان باید پشتیبانی شود — نیمی از صفحات فرانت خرید روی این فرض ساخته شده‌اند.

---

## ۳. قراردادهای عرضی HTTP

### ۳.۱ آدرس‌دهی

- پایه: `/api/v1/...` (فرانت `VITE_API_BASE_URL` را روی همین تنظیم کرده).
- REST با زیرمنبعِ فعل. ساختار داخلی CQRS/MediatR دست‌نخورده می‌ماند؛ فقط مسیرهای کنترلر عوض می‌شوند: همان `CreateSaleReturnCommand` را از `[HttpPost("sales-returns")]` صدا بزنید.

### ۳.۲ پوششِ پاسخ

`ResponseDto { Data, Message, ResponseMessageType }` می‌ماند. فرانت آن را در interceptor باز می‌کند و `Message` را برای toast استفاده می‌کند. **کد وضعیت HTTP باید واقعی باشد** (`400` برای `ValidationCustomException`، `404` برای `NotFound`) — نه `200` با پیام خطا.

### ۳.۳ enumها به‌صورت رشته

امروز هیچ `JsonStringEnumConverter` ثبت نشده، پس enumها **عدد** سریالایز می‌شوند در حالی که فرانت رشته می‌فرستد و انتظار رشته دارد.

```csharp
builder.Services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
```

مقادیر باید دقیقاً `snake_case` بند ۱.۲ باشند (نه `PascalCase`).

### ۳.۴ فهرست‌ها

پارامترها camelCase: `page`, `limit`, `search`, `fromDate`, `toDate`, `sortBy`, `sortOrder` + فیلترهای اختصاصی هر endpoint.

شکل پاسخ:

```json
{ "items": [...], "total": 128, "page": 2, "totalPages": 13 }
```

(فرانت شکل قدیمیِ `{ XList, Page: { Page, PageCount, Take, Total } }` را هم تحمل می‌کند، ولی آن یک تورِ ایمنی است نه بخشی از قرارداد.)

### ۳.۵ ایدمپوتنسی — اجباری

هدر `Idempotency-Key` روی این endpointها می‌آید و **باید** رعایت شود:

- `POST /sales-returns`, `POST /purchase-returns`
- `POST .../resolutions`
- `POST .../goods-rounds`
- `POST /purchases/{id}/receiving/confirm`
- `POST /sales-returns/{id}/intake`
- `POST /sales/{id}/shipping/confirm`
- `POST /purchase-returns/{id}/dispatch`

قاعده: اگر کلید تکراری بود، **همان پاسخِ بار اول** برگردد بدون اجرای دوباره. خطاها کش نشوند (تلاش دوباره با همان کلید باید واقعاً اجرا شود، چون عملیاتِ ناموفق اثری نگذاشته).

دلیل: این عملیات‌ها تجمعی‌اند. یک retry شبکه بدون این محافظ، موجودی یا مبلغ فاکتور را دو بار جابه‌جا می‌کند.

### ۳.۶ پاسخِ عملیات نوشتن

هر عملیاتِ نوشتنِ مرجوعی باید **سندِ کاملِ به‌روزشده‌ی مرجوعی** را برگرداند (همان شکل `GET /sales-returns/{id}`)، نه `{ ReturnId, ReturnStatus }`. لایه‌ی کش فرانت روی این بنا شده؛ در غیر این صورت هر اقدام یک درخواست اضافه می‌خورد و صفحه پرش می‌کند.

---

## ۴. Endpointها

سمت خرید در همه‌ی موارد قرینه‌ی دقیق است: `sales-returns → purchase-returns`، `sales → purchases`، `customerIds → supplierIds`، `saleId → purchaseId`.

### ۴.۱ فهرست مرجوعی

```
GET /api/v1/sales-returns
    ?page&limit&search&customerIds[]&status&problem&scope&fromDate&toDate&sortBy&sortOrder
```

`problem` و `scope` روی **ادعاها** فیلتر می‌زنند (`claims.Any(...)`)، نه روی خودِ سند.

هر آیتم فهرست:

```json
{
  "id": 9,
  "returnNumber": "SRET-2026-009",
  "saleId": 1,
  "saleInvoiceNumber": "SALE-2026-001",
  "customerId": 1,
  "customerName": "علی محمدی",
  "returnDate": "2026-06-14",
  "status": "in_progress",
  "totalClaimedAmount": 20000000,
  "claims": [{ "problem": "defective", "scope": "on_order" }],
  "createdAt": "...", "updatedAt": "..."
}
```

> ستون «مشکل‌ها» در جدول از روی `claims` ساخته می‌شود؛ فرستادن یک `dominantReason` کافی نیست.

### ۴.۲ جزئیات مرجوعی

```
GET /api/v1/sales-returns/{id}
```

```json
{
  "id": 9,
  "returnNumber": "SRET-2026-009",
  "saleId": 1,
  "saleInvoiceNumber": "SALE-2026-001",
  "customerId": 1,
  "customerName": "علی محمدی",
  "returnDate": "2026-06-14",
  "status": "in_progress",
  "description": "",
  "previousReturnId": null,
  "sourceEffectId": null,
  "totalClaimedAmount": 20000000,
  "claims": [
    {
      "id": 31,
      "scope": "on_order",
      "offScopeKind": null,
      "orderLineId": 12,
      "productId": 1,
      "productCode": "BRK-001",
      "productName": "لنت ترمز جلو",
      "unit": "دست",
      "unitPrice": 2000000,
      "qty": 10,
      "problem": "defective",
      "note": "",
      "createdAt": "...",
      "resolutions": [
        {
          "id": 77,
          "qty": 10,
          "note": "",
          "createdAt": "...",
          "effects": [
            {
              "id": 501,
              "kind": "goods_in",
              "qty": 10,
              "doneQty": 3,
              "restockedQty": 1,
              "productId": 1,
              "productCode": "BRK-001",
              "productName": "لنت ترمز جلو",
              "unit": "دست",
              "amount": 0,
              "method": null,
              "reference": "",
              "parts": [],
              "status": "pending",
              "note": "",
              "createdAt": "...",
              "appliedAt": null,
              "history": [
                {
                  "id": 900,
                  "date": "2026-08-23",
                  "qty": 3,
                  "healthyQty": 1,
                  "observations": [
                    { "problem": "defective", "qty": 2, "note": "۲ عدد شکسته" }
                  ],
                  "partyName": "پیک مشتری",
                  "partyNationalId": "",
                  "vehiclePlate": "",
                  "note": ""
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "...", "updatedAt": "..."
}
```

> نام فیلد در بدنه `orderLineId` است؛ اگر ترجیح می‌دهید `saleItemId` بفرستید، فرانت هر دو را می‌پذیرد (`services/apiMapping.js`) — ولی یکی را انتخاب و ثابت نگه دارید.

### ۴.۳ ثبت ادعا

```
POST /api/v1/sales-returns
Idempotency-Key: <uuid>
```

```json
{
  "saleId": 1,
  "returnDate": "2026-08-23",
  "description": "",
  "previousReturnId": null,
  "claims": [
    {
      "saleItemId": 12,
      "scope": "on_order",
      "offScopeKind": null,
      "productId": 1,
      "productName": "لنت ترمز جلو",
      "unit": "دست",
      "unitPrice": 2000000,
      "qty": 10,
      "problem": "defective",
      "note": ""
    },
    {
      "saleItemId": null,
      "scope": "off_order",
      "offScopeKind": "excess",
      "productId": 4,
      "productName": "لامپ هدلایت H4",
      "unit": "عدد",
      "unitPrice": 400000,
      "qty": 2,
      "problem": "over_shipped",
      "note": ""
    }
  ]
}
```

اعتبارسنجی: فقط فروش‌های `shipped`/`partially_delivered`/`delivered`؛ هر ادعای `on_order` در برابر `claimableQty` (بند ۲.۱)؛ ادعای `off_order` بدون سقف.
پاسخ: سند کامل (۴.۲).

### ۴.۴ ثبت تصمیم

```
POST /api/v1/sales-returns/{id}/claims/{claimId}/resolutions
Idempotency-Key: <uuid>
```

بدنه، «ترکیب» است — نه اثرهای از پیش باز شده. باز کردنش کارِ سرور است:

```json
{
  "qty": 10,
  "note": "",
  "goodsIn": { "enabled": true, "items": [] },
  "goodsOut": {
    "enabled": true,
    "items": [
      { "productId": 7, "productCode": "X-7", "productName": "کالای جایگزین", "unit": "عدد", "qty": 10 }
    ]
  },
  "money": {
    "direction": "pay",
    "method": "mixed",
    "amount": "",
    "reference": "",
    "parts": [
      { "type": "cash", "amount": 5000000 },
      { "type": "check", "amount": 3000000, "checkNumber": "123456" }
    ]
  }
}
```

قواعد بسط:

- `goodsIn.enabled` با `items` خالی → یک اثر `goods_in` با کالای همان ادعا و تعدادِ `qty`.
- `items` پرشده → یک اثر به‌ازای هر ردیف (تعویض با کالای دیگر یا چند کالا).
- `money.direction`: `none` / `receive` (→ `money_in`) / `pay` (→ `money_out`).
- `method=mixed` → مبلغ از مجموع `parts`.
- `store_credit` فقط در جهت `pay` مجاز است.

اعتبارسنجی سرور (هم‌سنگ با `validateComposition` فرانت):

1. `qty` صحیح و > 0 و ≤ باقیمانده‌ی ادعا (`claim.qty − Σ resolutions.qty`).
2. **دست‌کم یکی از سه محور فعال باشد.** تصمیمِ بی‌اثر، باقیمانده‌ی ادعا را بی‌صدا مصرف می‌کند؛ برای بستن بدون جبران، مسیر صریحِ `reject` وجود دارد.
3. روش پرداخت با جهت سازگار باشد؛ برای `mixed` دست‌کم یک ردیف با مبلغ > 0 و همه از `cash`/`check`/`transfer`.
4. مرجوعی در وضعیت پایانی (`rejected`/`cancelled`) نباشد.

پاسخ: سند کامل.

### ۴.۵ حذف تصمیم

```
DELETE /api/v1/sales-returns/{id}/claims/{claimId}/resolutions/{resolutionId}
```

مجاز تا وقتی هیچ اثر کالایی‌اش `DoneQty > 0` ندارد. اثرهای پولی با تعدیل معکوس خنثی می‌شوند. پاسخ: سند کامل.

### ۴.۶ دور اجرای کالا

```
POST /api/v1/sales-returns/{id}/goods-rounds
Idempotency-Key: <uuid>
```

```json
{
  "rounds": [
    {
      "effectId": 501,
      "qty": 3,
      "observations": [
        { "problem": "defective", "qty": 2, "note": "۲ عدد شکسته" }
      ]
    }
  ],
  "date": "2026-08-23",
  "partyName": "پیک مشتری",
  "partyNationalId": "0012345678",
  "vehiclePlate": "12 ب 345 ایران 67",
  "note": ""
}
```

- `qty` به باقیمانده‌ی اثر محدود می‌شود (`Qty − DoneQty`).
- `observations` فقط برای اثر ورودی معنا دارد؛ مقدار سالم مشتق می‌شود (بند ۲.۵).
- **`healthyQty` را قبول نکنید.**

### ۴.۷ چرخه‌ی عمر

```
POST   /api/v1/sales-returns/{id}/reject   { "reason": "..." }
POST   /api/v1/sales-returns/{id}/cancel   { "reason": "..." }
POST   /api/v1/sales-returns/{id}/reopen
DELETE /api/v1/sales-returns/{id}
```

همه تابع بند ۲.۷ و همه سندِ کامل برمی‌گردانند.

### ۴.۸ داده‌ی فرمِ ثبت ادعا

```
GET /api/v1/sales?search=&returnable=true&limit=30
GET /api/v1/sales/{saleId}/for-return?excludeReturnId=9
```

```json
{
  "saleId": 1,
  "saleUpdatedAt": "...",
  "invoiceNumber": "SALE-2026-001",
  "invoiceDate": "2026-06-04",
  "customerId": 1,
  "customerName": "علی محمدی",
  "items": [
    {
      "id": 12,
      "orderLineId": 12,
      "productId": 1,
      "productCode": "BRK-001",
      "productName": "لنت ترمز جلو",
      "unit": "دست",
      "qty": 10,
      "unitPrice": 2000000,
      "discount": 0,
      "lineTotal": 20000000,
      "deliveredQty": 10,
      "returnableQty": 10,
      "claimedHereQty": 0,
      "activeClaimedQty": 3
    }
  ],
  "relatedReturns": [
    { "id": 1, "returnNumber": "SRET-2026-001", "returnDate": "2026-06-20",
      "status": "open", "totalClaimedAmount": 1500000, "claimsCount": 1 }
  ]
}
```

- `returnableQty` سقف ادعای همین خط است (بند ۲.۱).
- `claimedHereQty` سهم مرجوعیِ جاری، `activeClaimedQty` سهم بقیه‌ی مرجوعی‌ها — فقط برای اطلاع کاربر.
- اقلامی که سهمیه‌شان صفر شده هم باید برگردند (با `returnableQty: 0`)، چون ادعای `off_order` روی همان کالا هنوز ممکن است.
- **نام فیلد سقف در هر دو سمت `returnableQty` است** (سمت خرید هم، نه `claimableQty`).

### ۴.۹ صف و عملیات انبار

```
GET  /api/v1/warehouse/receiving/queue ?page&limit&search&type&counterpartyIds[]&fromDate&toDate&sortBy&sortOrder
GET  /api/v1/purchases/{id}/receiving
POST /api/v1/purchases/{id}/receiving/confirm      (Idempotency-Key)
POST /api/v1/sales-returns/{id}/intake             (Idempotency-Key)

GET  /api/v1/warehouse/shipping/queue  (همان پارامترها)
GET  /api/v1/sales/{id}/shipping
POST /api/v1/sales/{id}/shipping/confirm           (Idempotency-Key)
POST /api/v1/purchase-returns/{id}/dispatch        (Idempotency-Key)
```

**ردیف صف** (`type`: `purchase` | `sales_return` در دریافت، `sale` | `return_to_supplier` در ارسال):

```json
{
  "id": 2,
  "type": "purchase",
  "refNumber": "INV-2026-002",
  "counterpartyId": 3,
  "counterpartyType": "supplier",
  "counterpartyName": "لنت پارس موتور",
  "date": "2026-03-19",
  "itemsCount": 1,
  "returnLinesCount": 0,
  "remainingQty": 3,
  "amount": 28500000,
  "createdAt": "...", "updatedAt": "..."
}
```

> **`itemsCount` = تعداد خطوطی که هنوز کارِ انبار دارند**، نه تعداد کل اقلام سند. `remainingQty` = مجموع تعدادِ باقی‌مانده. این دقیقاً باید با چیزی که صفحه‌ی جزئیات نشان می‌دهد بخواند — همین ناهمخوانی در فرانت یک باگ واقعی بود که رفع شد.
> یک سند تا وقتی در صف می‌ماند که یا باقیمانده‌ی خودش را داشته باشد، یا اثر کالاییِ `pending` بابت مرجوعی‌هایش.

**جزئیات دریافت** (`GET /purchases/{id}/receiving`): خودِ خرید + برای هر قلم `receivableQty` + آرایه‌ی `returnLines` (اثرهای `goods_in` معلقِ همه‌ی مرجوعی‌های آن خرید، هر خط با `effectId`, `returnId`, `returnNumber`, `productId`, `remainingQty`).

**ثبت دریافت** (`POST /purchases/{id}/receiving/confirm`):

```json
{
  "receivedItems": [
    {
      "lineId": "order:1", "source": "order",
      "productId": 1, "expectedQty": 15, "receivedQty": 10,
      "issues": [{ "type": "defective", "qty": 2, "note": "بدنه شکسته" }],
      "excessQty": 0, "excessNote": ""
    },
    {
      "lineId": "return:501", "source": "return",
      "returnId": 4, "effectId": 501,
      "productId": 7, "expectedQty": 3, "receivedQty": 3,
      "issues": [{ "type": "damaged_in_transit", "qty": 1, "note": "" }]
    }
  ],
  "unknownItems": [{ "productName": "واشر ناشناس", "qty": 5, "unit": "عدد", "note": "" }],
  "receivingNote": "", "receivedDate": "2026-08-23",
  "transporterName": "رضا راننده", "transporterNationalId": "0012345678",
  "vehiclePlate": "12 ب 345 ایران 67"
}
```

`issues` دو معنای متفاوت دارد که با `source` تعیین می‌شود — و این تفاوت را حتماً رعایت کنید:

| `source` | معنای `issues` | رفتار سرور |
|---|---|---|
| `order` | بخشی از سفارش که سالم نرسیده | یک **ادعا** روی تامین‌کننده ساخته می‌شود (مرجوعی خودکار) |
| `return` | مشاهده‌ی انباردار روی کالای برگشتی | به‌عنوان `observations` روی اثرِ همان مرجوعی ثبت می‌شود |

- `receivedQty` فقط کالای سالم را می‌شمرد؛ `issues` بیرون از آن است.
- `excessQty` و `unknownItems` مازادند: بیرون از سقف سند، وارد موجودی قابل‌فروش نمی‌شوند، و به ادعای `off_order` تبدیل می‌شوند (`excess` / `unlisted`).
- باقیمانده‌ی گزارش‌نشده یعنی «در انتظار محموله‌ی بعدی» و سند را در صف نگه می‌دارد.

**ثبت ارسال** (`POST /sales/{id}/shipping/confirm`) قرینه است با `shippedItems` و `driverName`/`driverNationalId`/`vehiclePlate`، بدون `issues` (وقتی *ما* می‌فرستیم چیزی برای بازرسی نیست).

`intake` و `dispatch` همان شکلِ payload را می‌گیرند و همه‌ی ردیف‌هایشان `source: return` است؛ پاسخشان **سندِ کاملِ مرجوعی** است.

---

## ۵. مهاجرت داده

1. جدول‌های جدید بند ۱ ساخته شوند (جدول‌های فعلی موقتاً بمانند).
2. Backfill:
   - `SaleReturnClaim` → `ReturnClaims` (نگاشت `Reason` → `Problem`؛ `SaleItemId` → `OrderLineId`).
   - `PurchaseReturnItem` → `ReturnClaims` با `Scope=on_order` (نگاشت `IssueType` → `Problem`؛ `EXCESS` → `Scope=off_order, OffScopeKind=excess, Problem=over_shipped`).
   - هر `Decision` → یک `Resolution` + اثرهایش:

     | تصمیم قدیم | اثرها |
     |---|---|
     | `REFUND` | `money_out` (فروش) / `money_in` (خرید) با `RefundAmount` + `goods_in` (فروش) / `goods_out` (خرید) |
     | `REPLACEMENT` | `goods_out` (فروش) / `goods_in` (خرید) با `DoneQty = ReplacementShippedQuantity` |
     | `STORE_CREDIT` / `CREDIT` | اثر پولی با `method=store_credit` |
     | `NO_COMPENSATION` / `WRITE_OFF` | فقط اثر کالاییِ مربوطه، بدون اثر پولی |

   - `SaleReturnItem` (بازرسی) → `ReturnGoodsRounds` + `ReturnGoodsObservations` روی اثرِ `goods_in` همان ادعا؛ ردیف با `IssueType = null` همان `HealthyQty` است.
   - وضعیت‌ها: `PENDING_INSPECTION`/`PENDING` → `open` یا `in_progress` (طبق فرمول ۲.۲ دوباره محاسبه شود، نه نگاشت مستقیم).
3. صحت‌سنجی: برای هر مرجوعی، `Σ resolution.qty` و مجموع اثرها با داده‌ی قدیم مقایسه شود.
4. جدول‌های قدیمی بعد از یک دوره‌ی موازی حذف شوند.

---

## ۶. باگ‌ها و بدهی‌های تاییدشده (مستقل از مهاجرت)

| # | مورد | فایل |
|---|---|---|
| ۱ | `JsonStringEnumConverter` ثبت نشده — همه‌ی enumها عدد سریالایز می‌شوند | `WMS/Program.cs` |
| ۲ | `PaymentDetail.PurchaseId` از نوع `Guid` است ولی `Purchase.Id` عدد صحیح؛ EF یک FK سایه به نام `PurchaseId1` ساخته. قبل از اتصال اثر مالی باید پاک شود | `Domain/Entities/PaymentDetail.cs`, `Migrations/20260730143015_stuff-4.cs` |
| ۳ | `UpdatePurchaseCommand` وضعیت خرید را مستقیم می‌نویسد و `RecomputePurchaseStatus` را دور می‌زند | `Application/Features/Purchase/Commands/UpdatePurchaseCommand.cs` |
| ۴ | `GetWarehouseReceiveSaleListQuery` روی `SalesStatusEnum.RETURNED` فیلتر می‌زند که هیچ‌جا ست نمی‌شود → همیشه لیست خالی | `Application/Features/WarehouseReceiving/Queries/` |
| ۵ | `PurchaseStatusEnum.RETURNED` مقدار مرده است | `Domain/Enums/PurchaseStatusEnum.cs` |
| ۶ | `ReopenSaleReturnCommand` بدون محافظ، وضعیت را از `RecomputeReturnStatus` می‌گیرد | `Application/Features/SaleReturn/Commands/` |
| ۷ | حذف تصمیم فقط برای `AWAITING` مجاز است → بازگشت وجهِ اشتباه اصلاح‌ناپذیر است | `RemoveSaleReturnDecisionCommand.cs` |
| ۸ | `ResolveAwaitingReplacements` یک heuristic است؛ در مدل جدید با اتصال صریحِ دور کالا به اثر جایگزین می‌شود | `Infrastructure/Services/PurchaseReturnCalculationService.cs` |

---

## ۷. ترتیب کار پیشنهادی

| گام | کار | چرا این ترتیب |
|---|---|---|
| ۱ | بند ۳ (قراردادهای عرضی): `JsonStringEnumConverter`، مسیرهای REST، شکل فهرست‌ها، کدهای وضعیت | کم‌هزینه، مستقل از مدل، و بدون آن هیچ endpointای قابل تست نیست |
| ۲ | جدول‌های جدید + مهاجرت (بند ۱ و ۵) | پایه‌ی همه‌چیز |
| ۳ | منطق اثر: بسط ترکیب، اعتبارسنجی، ماشین وضعیت، سهمیه (۲.۱–۲.۳) | هسته‌ی دامنه |
| ۴ | endpointهای مرجوعی (۴.۱–۴.۸) + ایدمپوتنسی | فرانت از همین‌جا قابل اتصال است |
| ۵ | دور کالا و صف‌های انبار (۴.۹، ۲.۵، ۲.۶) | وابسته به گام ۳ |
| ۶ | اثر مالی واقعی (۲.۴) + رفع باگ‌های بند ۶ | می‌تواند موازی گام ۵ برود |

### تعریف «انجام‌شده»

- [ ] enumها رشته‌ای سریالایز می‌شوند و مقادیرشان دقیقاً بند ۱.۲ است.
- [ ] هر عملیات نوشتن، سندِ کاملِ مرجوعی را برمی‌گرداند.
- [ ] فرستادن دوباره‌ی یک درخواست با همان `Idempotency-Key` هیچ اثر دومی نمی‌گذارد.
- [ ] تصمیم با ترکیب `goodsIn + goodsOut + money` هم‌زمان پذیرفته می‌شود و سه اثر می‌سازد.
- [ ] تصمیمِ بدون هیچ محور فعالی با خطای ۴۰۰ رد می‌شود.
- [ ] ادعای `off_order` بدون `saleItemId` پذیرفته می‌شود و سهمیه‌ی هیچ خطی را کم نمی‌کند.
- [ ] دورِ کالای جزئی، `DoneQty` را جلو می‌برد و اثر `pending` می‌ماند؛ فقط `RestockedQty` وارد موجودی می‌شود.
- [ ] مرجوعیِ فقط-نقدی مستقیم `settled` می‌شود بدون اینکه در صف انبار ظاهر شود.
- [ ] یک تصمیم پولی، `PaymentDetail` و مبلغ سند را واقعاً تغییر می‌دهد.
- [ ] `itemsCount` صف انبار با تعداد خطوطِ بازِ صفحه‌ی جزئیات یکی است.
- [ ] چند مرجوعی فعال روی یک خرید ممکن است و `POST /purchase-returns` مستقل کار می‌کند.

---

## ۸. مرجع‌های فرانت برای رفع ابهام

| موضوع | فایل |
|---|---|
| قرارداد نهایی endpointها | `Frontend/src/features/{sales,purchases}/returns/services/api-v1.js` |
| منطق اثر و جمع‌بندی | `Frontend/src/shared/domain/returns/effects.js` |
| بسط ترکیب، اعتبارسنجی، ماشین وضعیت | `Frontend/src/shared/domain/returns/resolutions.js` |
| فضای مقدار مشکل | `Frontend/src/shared/domain/returns/problems.js` |
| سهمیه و نمای چند-مرجوعی | `Frontend/src/shared/domain/returns/orderContext.js` |
| «سرورِ» مرجع (پیاده‌سازی mock همه‌ی این قواعد) | `Frontend/src/features/*/returns/services/api-mockData.js` |
| سناریوهای اجرایی به‌عنوان تست پذیرش | `Frontend/scripts/check-sales-returns.js`, `check-warehouse-queues.js` |

دو اسکریپت آخر با `pnpm check:returns` و `pnpm check:queues` اجرا می‌شوند و همان رفتاری را می‌سنجند که بک‌اند باید تحویل بدهد — می‌توانند به‌عنوان فهرست سناریوهای تست پذیرش استفاده شوند.
