# قرارداد enum های فرانت — چه چیزی در بکند باید تغییر کند

**تاریخ:** ۱۴۰۵/۰۶/۰۳ (۲۰۲۶-۰۸-۲۵) · **وضعیت فرانت:** انجام‌شده، روی برنچ `feat/frontend-numeric-enums`

## چرا این سند

فرانت تا پیش از این، مقادیر enum را به‌صورت رشته نگه می‌داشت (`"pending"`, `"cash"`, `"دست"`). طبق [`api-guide.fa.md` بخش ۱۵](./api-guide.fa.md)، بکند enum ها را **عدد صحیح** سریالایز می‌کند. کل فرانت عددی شد.

جایی که بکند همان enum را با همان اعضا داشت، **شماره‌ها عیناً از بکند گرفته شد** تا نیازی به نگاشت نباشد. ولی فرانت در چند جا از بکند جلوتر است: اعضایی دارد که بکند ندارد، و در حوزه‌ی مرجوعی اساساً مدل متفاوتی دارد.

این سند دقیقاً می‌گوید بکند چه کاری باید انجام دهد. سه بخش دارد:

| بخش | موضوع | کار لازم | حجم |
|---|---|---|---|
| ۱ | enum های هماهنگ | هیچ | — |
| ۲ | `ProductUnitStatusEnum` | ~~افزودن ۴ عضو~~ — **حل شد، کاری لازم نیست** | — |
| ۳ | حوزه‌ی مرجوعی | تصمیم معماری + پیاده‌سازی | **زیاد** |
| ۴ | enum های نبودهٔ بکند | ساخت enum جدید (در صورت نیاز) | متوسط |
| ۵ | نکات پراکنده | چند اصلاح کوچک در مستندات/API | کم |

---

## ۱. هماهنگ — کاری لازم نیست

این‌ها در فرانت **دقیقاً** با شماره‌های بکند پیاده شدند. هیچ تغییری لازم نیست.

| Enum | مقادیر | فایل فرانت |
|---|---|---|
| `BalanceTypeEnum` | `0` Creditor · `1` Debtor · `2` Balanced | `shared/domain/enums/balanceType.js` |
| `PaymentTypeEnum` | `0` CASH · `1` CREDIT · `2` CHECK · `3` TRANSFER · `4` MIXED | `shared/domain/enums/paymentType.js` |
| `ProductUnitEnum` | `0` Hand · `1` Number · `2` Box · `3` Liter · `4` Kg · `5` Kit · `6` Package · `7` Pair | `shared/domain/enums/productUnit.js` |
| `BarcodeReferenceKindEnum` | `1` PRODUCT · `2` UNIT · `3` UNKNOWN | `shared/domain/enums/barcodeReferenceKind.js` |
| `PurchaseStatusEnum` | `0` PENDING · `1` SHIPPED · `2` PARTIALLY_RECEIVED · `3` RECEIVED · `4` RETURNED · `5` CANCELLED | `shared/domain/enums/purchaseStatus.js` |
| `SalesStatusEnum` | `0` PENDING · `1` PROCESSING · `2` PARTIALLY_DELIVERED · `3` DELIVERED · `4` RETURNED · `5` CANCELLED · `6` SHIPPED | `shared/domain/enums/saleStatus.js` |

> **یک نکته درباره‌ی `SalesStatusEnum.PENDING`:** فرانت این عضو را می‌شناسد و اگر سرور بفرستد درست نمایش می‌دهد، ولی خودش هرگز تولیدش نمی‌کند — فروش تازه همیشه با `PROCESSING` ساخته می‌شود. در UI هم `PENDING` و `PROCESSING` یک برچسب واحد («در حال پردازش») دارند. اگر بکند روی این دو تفکیک معنادار قائل است، بگویید تا در فرانت جدا شوند.

---

## ۲. عضو کم دارد — فقط افزودن عضو

### `ProductUnitStatusEnum` — حل شد (فرانت عقب‌نشینی کرد)

> **به‌روزرسانی ۱۴۰۵/۰۶/۰۸:** این درخواست **پس گرفته شد.** فرانت چهار عضو اضافه‌اش
> (`SHIPPED`, `DAMAGED`, `LOST`, `RETURNED_BY_CUSTOMER`) را حذف کرد و حالا دقیقاً
> همان چهار عضو بکند را دارد. کاری برای انجام نمانده.

| مقدار | عضو | وضعیت |
|---|---|---|
| `1` | `IN_STOCK` | ✅ هر دو طرف |
| `2` | `SOLD` | ✅ هر دو طرف |
| `3` | `RETURNED_TO_SUPPLIER` | ✅ هر دو طرف (فرانت هنوز تولیدش نمی‌کند) |
| `4` | `SCRAPPED` | ✅ هر دو طرف |

**چرا پس گرفته شد:** وضعیتی که سرور نمی‌شناسد یا هرگز از سرور نمی‌آید یا موقع
ارسال رد می‌شود؛ تنها کارش این بود که UI حالتی را نشان بدهد که هیچ‌وقت ذخیره
نمی‌شود. `SHIPPED` هم لازم نبود: خروج از انبار در بکند همان مصرفِ دانه
(`IN_STOCK → SOLD` در `ProductUnitService.ConsumeAsync`) است و وضعیت جدایی
نمی‌خواهد.

اگر روزی خودتان به این اعضا نیاز پیدا کردید، شماره‌های پیشنهادی همان‌هایی است که
قبلاً اینجا نوشته شده بود: `SHIPPED=5`, `DAMAGED=6`, `LOST=7`,
`RETURNED_BY_CUSTOMER=8` — با این هشدار که `RETURNED_BY_CUSTOMER` جهتش **معکوس**
`RETURNED_TO_SUPPLIER` است و هم‌نام‌کردنشان منشأ اشتباه می‌شود.

---

## ۳. حوزه‌ی مرجوعی — نیاز به تصمیم معماری

**این بزرگ‌ترین بخش کار است.** اینجا مسئله «رشته در برابر عدد» نیست؛ دو طرف **مدل داده‌ی متفاوتی** دارند.

### ۳.۱ تفاوت ساختاری

**بکند** دو مدل جدا دارد (یکی ۳ سطحی، یکی ۴ سطحی) و برای «نوع تصمیم» یک enum بسته:

```
PurchaseReturn → PurchaseReturnItem → PurchaseReturnDecision(DecisionType: REFUND|REPLACEMENT|CREDIT|WRITE_OFF)
SaleReturn → SaleReturnClaim → SaleReturnItem → SaleReturnDecision(DecisionType: REFUND|REPLACEMENT|STORE_CREDIT|NO_COMPENSATION)
```

**فرانت** یک مدل واحد برای هر دو سمت دارد و تصمیم را **ترکیبی** می‌سازد، نه از یک فهرست بسته:

```
returnDoc → claims[] → resolutions[] → effects[]
```

هر «اثر» (effect) یکی از چهار حرکت پایه است، و جهت‌ها **نسبت به شرکت ما** تعریف شده‌اند — به همین دلیل یک مدل برای هر دو سمت کار می‌کند:

| `EFFECT_KINDS` | مقدار | در مرجوعی فروش | در مرجوعی خرید |
|---|---|---|---|
| `GOODS_IN` | `0` | مشتری کالا را پس می‌دهد | تامین‌کننده جایگزین می‌فرستد |
| `GOODS_OUT` | `1` | جایگزین برای مشتری می‌فرستیم | به تامین‌کننده عودت می‌دهیم |
| `MONEY_OUT` | `2` | به مشتری پس می‌دهیم | به تامین‌کننده می‌پردازیم |
| `MONEY_IN` | `3` | مشتری پول می‌دهد | تامین‌کننده پول برمی‌گرداند |

### ۳.۲ نگاشت نوع تصمیمِ بکند به ترکیب اثرها

«بازگشت وجه» و «تعویض» و «اعتبار» در فرانت **نام**هایی برای ترکیب‌های پرتکرار همین چهارتا هستند:

| `DecisionType` بکند | معادل ترکیبی در فرانت |
|---|---|
| `REFUND` (فروش) | `GOODS_IN` + `MONEY_OUT` |
| `REFUND` (خرید) | `GOODS_OUT` + `MONEY_IN` |
| `REPLACEMENT` (فروش) | `GOODS_IN` + `GOODS_OUT` |
| `REPLACEMENT` (خرید) | `GOODS_OUT` + `GOODS_IN` |
| `STORE_CREDIT` / `CREDIT` | `GOODS_IN` + `MONEY_OUT` با `method = STORE_CREDIT` |
| `NO_COMPENSATION` / `WRITE_OFF` | فقط `GOODS_IN` (یا `GOODS_OUT`)، بدون اثر پولی |

**چرا فرانت این مدل را انتخاب کرده:** ترکیب‌هایی لازم می‌شود که در enum بسته جا نمی‌شوند — مثلاً «نصف را پس بگیر و پولش را بده، نصف دیگر را جایگزین بفرست»، یا «کالای مازاد را نگه می‌داریم و بابتش به تامین‌کننده پول می‌دهیم» (که `MONEY_OUT` بدون هیچ حرکت کالایی است). با enum بسته، هرکدام از این‌ها یک عضو جدید می‌خواهد.

### ۳.۳ تصمیمی که باید گرفته شود

**دو راه دارید:**

**راه اول (توصیه‌ی ما): بکند مدل ترکیبی فرانت را بپذیرد.** یعنی `PurchaseReturnDecision`/`SaleReturnDecision` به‌جای یک `DecisionType`، یک مجموعه‌ی `Effects` بگیرد. مزیت: هیچ ترکیبی از دست نمی‌رود، و دو مدل ۳ و ۴ سطحیِ فعلی به یک مدل واحد تبدیل می‌شوند.

**راه دوم: بکند enum بسته را نگه دارد و لایه‌ی نگاشت بنویسد.** آن‌وقت ترکیب‌هایی که در جدول بالا نیستند (تصمیم‌های چندبخشی، پولِ بدون کالا) قابل ذخیره نخواهند بود و فرانت باید محدود شود.

هر تصمیمی گرفتید به ما بگویید تا فرانت را هماهنگ کنیم. تا آن زمان، مقادیر فعلی فرانت این‌هاست:

### ۳.۴ مقادیر فعلی فرانت در حوزه‌ی مرجوعی

**`RETURN_STATUSES` — وضعیت مرجوعی (مشترک بین خرید و فروش)**

خوشبختانه شماره‌ها با بکند یکی است؛ فقط **نام اعضا فرق دارد**:

| مقدار | نام در فرانت | `PurchaseReturnStatusEnum` | `SaleReturnStatusEnum` |
|---|---|---|---|
| `0` | `OPEN` | `PENDING` | `PENDING_INSPECTION` |
| `1` | `IN_PROGRESS` | `COORDINATING` | `COORDINATING` |
| `2` | `SETTLED` | `RESOLVED` | `RESOLVED` |
| `3` | `REJECTED` | `REJECTED` | `REJECTED` |
| `4` | `CANCELLED` | `CANCELLED` | `CANCELLED` |

چون شماره‌ها یکی است، **روی سیم مشکلی نیست** و می‌شود همین‌طور ماند. فقط بدانید فرانت این دو enum بکند را عمداً در یک enum واحد ادغام کرده، چون رفتارشان یکسان است.

**`RETURN_PROBLEMS` — جانشین سه enum بکند**

فرانت یک فضای مقدار واحد ۱۴ عضوی دارد که جای این سه enم بکند را می‌گیرد: `PurchaseIssueTypeEnum` (۷ عضو)، `SalesReturnReasonEnum` (۷ عضو)، `SalesReturnIssueTypeEnum` (۵ عضو).

| مقدار | عضو | معادل در بکند |
|---|---|---|
| `0` | `WRONG_ITEM_SHIPPED` | `WRONG_ITEM` (هر سه enum) |
| `1` | `WRONG_ITEM_INVOICED` | ❌ ندارد |
| `2` | `WRONG_ITEM_ORDERED` | ❌ ندارد |
| `3` | `SHORT_SHIPPED` | `SHORTAGE` |
| `4` | `OVER_SHIPPED` | `EXCESS` / `EXCESS_ORDER` |
| `5` | `WRONG_QTY_INVOICED` | ❌ ندارد |
| `6` | `WRONG_QTY_ORDERED` | ❌ ندارد |
| `7` | `DEFECTIVE` | `DEFECTIVE` |
| `8` | `DAMAGED_IN_TRANSIT` | `DAMAGED` / `DAMAGED_IN_TRANSIT` |
| `9` | `QUALITY_ISSUE` | `QUALITY_ISSUE` (فقط در enum های فروش) |
| `10` | `EXPIRED` | `EXPIRED` (فقط `PurchaseIssueTypeEnum`) |
| `11` | `CHANGED_MIND` | `CHANGED_MIND` (فقط `SalesReturnReasonEnum`) |
| `12` | `UNLISTED_ITEM` | ❌ ندارد |
| `13` | `OTHER` | `OTHER` |

**چرا فرانت `WRONG_ITEM` را به سه عضو شکسته:** «انبار اشتباه فرستاد» / «فروش اشتباه فاکتور زد» / «مشتری اشتباه سفارش داد» از بیرون یک شکل دارند ولی **مقصرشان فرق می‌کند**. برای گزارش‌گیری باید از هم قابل تفکیک باشند. همین منطق برای `WRONG_QTY_*` هم هست.

فرانت از این فهرست واحد سه زیرمجموعه می‌سازد (معادل سه enum بکند):

- `PURCHASE_CLAIM_PROBLEMS` = `3, 7, 8, 0, 10, 9, 4, 12, 13` → معادل `PurchaseIssueTypeEnum`
- `SALES_CLAIM_PROBLEMS` = `0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13` → معادل `SalesReturnReasonEnum`
- `OBSERVED_PROBLEMS` = `3, 7, 8, 0, 10, 9, 13` → معادل `SalesReturnIssueTypeEnum` (مشاهده‌ی انباردار هنگام بازرسی)

**`EFFECT_STATUSES` — وضعیت اجرای یک اثر**

| مقدار | عضو | معادل بکند |
|---|---|---|
| `0` | `PENDING` | `AWAITING` |
| `1` | `APPLIED` | `RESOLVED` |
| `2` | `VOID` | ❌ **ندارد — باید اضافه شود** |

`VOID` برای اثری است که **پیش از اجرا لغو شده**. پاک نمی‌شود تا رد تصمیم‌های عوض‌شده در تاریخچه بماند. بدون این عضو، تاریخچه‌ی تغییر تصمیم از دست می‌رود.

**بقیه‌ی مقادیر مرجوعی که بکند اصلاً ندارد:**

| فهرست | مقادیر | کاربرد |
|---|---|---|
| `PAYMENT_METHODS` | `0` CASH · `1` CHECK · `2` TRANSFER · `3` ON_ACCOUNT · `4` STORE_CREDIT · `5` MIXED | روش پرداختِ یک اثر پولی. **با `PaymentTypeEnum` سطح سند یکی نیست** — `ON_ACCOUNT` و `STORE_CREDIT` را آن یکی ندارد. |
| `MONEY_DIRECTIONS` | `0` NONE · `1` RECEIVE · `2` PAY | جهت پول در فرم تصمیم |
| `CLAIM_SCOPES` | `0` ON_ORDER · `1` OFF_ORDER | ادعا روی خط سند است یا خارج از آن |
| `OFF_SCOPE_KINDS` | `0` EXCESS · `1` UNLISTED | نوع ادعای خارج از سند (مازاد در برابر کالای اصلاً تعریف‌نشده) |

`CLAIM_SCOPES`/`OFF_SCOPE_KINDS` مفهوم مهمی را حمل می‌کنند: **ادعای خارج از سند سهمیه‌ی هیچ خطی را مصرف نمی‌کند.** اگر بکند این تفکیک را نداشته باشد، محاسبه‌ی «چقدر از این خط هنوز قابل ادعاست» خراب می‌شود.

---

## ۴. enum هایی که بکند اصلاً ندارد

این‌ها فعلاً فقط در فرانت‌اند. اگر روزی به سرور مهاجرت کردند، شماره‌ها آماده است:

| Enum | مقادیر | کاربرد |
|---|---|---|
| `INCOMING_TYPES` | `0` PURCHASE · `1` SALES_RETURN | نوع ردیف در صف دریافت انبار |
| `OUTGOING_TYPES` | `0` SALE · `1` RETURN_TO_SUPPLIER | نوع ردیف در صف ارسال انبار |
| `RECEIVING_SOURCES` | `0` ORDER · `1` RETURN | منبع هر خط یک رسید دریافت |
| `SHIPPING_SOURCES` | `0` ORDER · `1` RETURN | منبع هر خط یک حواله‌ی ارسال |
| `SURPLUS_KINDS` | `0` EXCESS · `1` UNKNOWN | نوع مازادِ دریافت‌شده |
| `UNIT_SOURCE_TYPES` | `0` PURCHASE · `1` SALES_RETURN · `2` MANUAL | این دانه‌ی کالا از کجا آمده |
| `RETURN_SIDES` | `0` SALES · `1` PURCHASE | فقط کلید داخلی UI — **روی سیم نمی‌رود** |

**`UserRolesEnum`** (بکند: `1` Admin، `2` User) هنوز در فرانت **هیچ معادلی ندارد** — ماژول مدیریت نقش‌ها ساخته نشده. فرانت فعلاً از `isSuperAdmin` (بولین) و `permissions` (آرایه‌ی رشته) استفاده می‌کند. وقتی آن ماژول را ساختیم هماهنگ می‌کنیم.

---

## ۵. نکات پراکنده

### ۵.۱ فیلد `unit` — دو معنای متفاوت (تأیید شد، تغییری لازم نیست)

در سند بکند این تفکیک هست و **درست است**؛ فقط چون جای دیگری صریح نوشته نشده اینجا ثبتش می‌کنیم:

- `Product.unit` → **عدد** (`ProductUnitEnum`) — مثلاً `"unit": 1`
- `PurchaseReturnItem.unit` و قرینه‌هایش روی خطوط سند → **رشته‌ی نمایشی** — مثلاً `"unit": "عدد"`

فرانت دقیقاً همین کار را می‌کند و برای تبدیل، یک تابع واحد `unitLabelOf()` دارد. **دلیل معماری‌اش هم درست است:** خط سند یک عکس لحظه‌ای از کالاست و باید حتی اگر بعداً واحد کالا عوض شد، همان چیزی را نشان بدهد که موقع ثبت سند بوده. لطفاً همین‌طور نگه دارید.

### ۵.۲ فیلتر `balanceType` در لیست مشتری/تامین‌کننده — مستند نشده

فرانت در صفحه‌ی لیست مشتریان و تامین‌کنندگان فیلتر «نوع حساب» (بدهکار / بستانکار / تسویه‌شده) دارد و پارامتر `balanceType` را می‌فرستد. ولی در [`api-guide.fa.md`](./api-guide.fa.md) پارامترهای query این دو endpoint فقط `page`, `take`, `id`, `fullName`, `minBalance`, `maxBalance` ذکر شده.

> **پاسخ (از روی کد، ۱۴۰۵/۰۶/۰۸):** بله، **هر دو** پشتیبانی می‌کنند —
> `GetCustomerListQuery.BalanceType` و `GetSupplierListQuery.BalanceType`، هر دو
> `BalanceTypeEnum?`. فقط در `api-guide.fa.md` مستند نشده بود. کاری لازم نیست جز
> اضافه‌کردنش به سند.
>
> ولی **نامِ بقیه‌ی پارامترها بین این دو یکی نیست** و سند هیچ‌کدام را کامل
> نمی‌گوید: مشتری `fullName`/`minBalance`/`maxBalance` می‌گیرد و تامین‌کننده
> `companyNameOrContactName`/`fromBalance`/`toBalance`. فرانت هر دو را درست
> می‌فرستد؛ یکدست‌کردنشان (یا دست‌کم مستندکردنشان) از باگِ بعدی جلوگیری می‌کند.

### ۵.۳ `SupplierListDto.status` — استثنای رشته‌ای

طبق سند، این تنها فیلد enum در کل سیستم است که رشته می‌ماند (`"Creditor"`). فرانت به این استثنا دست نزده و همان‌طور رهایش کرده. اگر تصمیم دارید یکدستش کنید بگویید.

---

## چک‌لیست کارهای بکند

- [x] ~~**`ProductUnitStatusEnum`**: افزودن ۴ عضو~~ — پس گرفته شد؛ فرانت به همان ۴ عضو بکند برگشت (بخش ۲)
- [ ] **حوزه‌ی مرجوعی**: تصمیم‌گیری بین «پذیرش مدل ترکیبی» و «نگه‌داشتن enum بسته + لایه‌ی نگاشت» (بخش ۳.۳) — **مهم‌ترین قلم**
- [ ] **`EFFECT_STATUSES`**: افزودن معادل `VOID` به `*DecisionStatusEnum` (بخش ۳.۴)
- [ ] بررسی افزودن اعضای گمشده‌ی `RETURN_PROBLEMS` (`WRONG_ITEM_INVOICED`, `WRONG_ITEM_ORDERED`, `WRONG_QTY_INVOICED`, `WRONG_QTY_ORDERED`, `UNLISTED_ITEM`) — بخش ۳.۴
- [ ] بررسی نیاز به `CLAIM_SCOPES` / `OFF_SCOPE_KINDS` برای محاسبه‌ی درست سهمیه‌ی خط (بخش ۳.۴)
- [x] ~~پاسخ درباره‌ی فیلتر `balanceType`~~ — هر دو کنترلر دارندش؛ فقط مستند نشده بود (بخش ۵.۲)
- [ ] پاسخ درباره‌ی تفکیک `SalesStatusEnum.PENDING` از `PROCESSING` (بخش ۱)

## نقشه‌ی فایل‌های فرانت

همه‌ی enum های هماهنگ با بکند یک‌جا هستند:

```
Frontend/src/shared/domain/enums/
├── balanceType.js          BalanceTypeEnum
├── paymentType.js          PaymentTypeEnum
├── productUnit.js          ProductUnitEnum + unitLabelOf()
├── purchaseStatus.js       PurchaseStatusEnum
├── saleStatus.js           SaleStatusEnum
├── unitStatus.js           ProductUnitStatusEnum
└── barcodeReferenceKind.js BarcodeReferenceKindEnum
```

مقادیر حوزه‌ی مرجوعی جدا هستند، چون مدلشان با بکند یکی نیست:

```
Frontend/src/shared/domain/returns/
├── statuses.js      RETURN_STATUSES
├── effects.js       EFFECT_KINDS · PAYMENT_METHODS · EFFECT_STATUSES
├── problems.js      RETURN_PROBLEMS + سه زیرمجموعه
├── scopes.js        CLAIM_SCOPES · OFF_SCOPE_KINDS
├── resolutions.js   MONEY_DIRECTIONS + منطق ترکیب تصمیم
└── apiEnums.js      وارسی مقادیر ورودی از سرور (فقط حالت توسعه)
```

`apiEnums.js` در حالت توسعه هر مقدار enum ورودی از سرور را با فضای مقدار فرانت می‌سنجد و هر ناسازگاری را در کنسول گزارش می‌کند — **موقع اتصال واقعی، این اولین جایی است که ناهماهنگی را نشان می‌دهد.**
