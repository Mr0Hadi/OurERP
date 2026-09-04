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
| ۳ | حوزه‌ی مرجوعی | ~~تصمیم معماری + پیاده‌سازی~~ — **✅ SOLVED، از ۲۰۲۶-۰۸-۲۸** | — |
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
| `PurchaseStatusEnum` | `0` PROFORMA · `1` PENDING · `2` SHIPPED · `3` PARTIALLY_RECEIVED · `4` RECEIVED · `5` CANCELLED | `shared/domain/enums/purchaseStatus.js` |
| `SalesStatusEnum` | `0` PROFORMA · `1` PROCESSING · `2` PARTIALLY_DELIVERED · `3` SHIPPED · `4` DELIVERED · `5` CANCELLED · `6` RETURNED (بکند-فقط) | `shared/domain/enums/saleStatus.js` |

> **به‌روزرسانی ۱۴۰۵/۰۶/۱۱ (۲۰۲۶-۰۹-۰۲) — بکند هم بازشماره‌گذاری کرد؛ یادداشت قبلی منتفی شد.**
> یادداشت ۲۰۲۶-۰۹-۰۱ زیر (که می‌گفت بکند append-only می‌ماند و فرانت باید
> `6`/`7` را بپذیرد) کنار گذاشته شد. چون هنوز داده‌ی واقعی/پایدار روی این
> enum ها ذخیره نشده (فقط داده‌ی mock)، بکند مستقیماً بازشماره‌گذاری شد تا
> عیناً با شماره‌های فرانت یکی باشد — بدون هیچ لایه‌ی نگاشت/adapter. جدول
> بخش ۱ بالا همین شماره‌های نهایی را نشان می‌دهد؛ اعضای مشترک هر دو طرف
> (`PROFORMA` تا `CANCELLED`) اکنون کاملاً همسان‌اند.
>
> `PurchaseStatusEnum.RETURNED` (که قبلاً مقدار `4` بود) به‌کل از بکند حذف
> شد — کد مرده و هرگز ست نمی‌شد (گپ مستندشده‌ی قبلی)، و فرانت هم هرگز آن
> را نداشت.
>
> `SalesStatusEnum.PENDING` و `SalesStatusEnum.RETURNED` واقعاً لازم‌اند
> (اولی وضعیت پیش از ارسال، دومی را `RecomputeSaleStatus` واقعاً برمی‌گرداند)
> پس حذف نشدند؛ چون فرانت جایی برایشان ندارد، بعد از شش عضو مشترک
> append شدند (`6`/`7`) تا هیچ‌کدام از مقادیر شناخته‌شده‌ی فرانت جابه‌جا
> نشود. روی سیم مشکلی نیست — فرانت اگر این دو را دریافت کند فقط لیبل
> نمایش نمی‌دهد (طبق یادداشت زیر درباره‌ی `PENDING`).
>
> منطق کسب‌وکار پیاده‌شده: برای خرید، خروج از `PROFORMA` فقط به شماره‌ی
> فاکتورِ تامین‌کننده نیاز دارد (ضمیمه اختیاری). برای فروش، خروج از
> `PROFORMA` کاملاً خودکار و بر اساس پرداختِ کامل است — `paidAmount >= totalAmount`
> در `CreateSale`/`UpdateSale` باعث می‌شود بکند خودش شماره فاکتور بسازد و
> وضعیت را به `PROCESSING` ببرد؛ تلاش برای خروج دستی بدون پرداخت کامل با
> خطای اعتبارسنجی رد می‌شود. جزئیات کامل: `CLAUDE.md` بخش «Purchase/Sale
> pre-invoice (proforma)».

> **✅ SOLVED (۱۴۰۵/۰۶/۱۱ — ۲۰۲۶-۰۹-۰۱): `SalesStatusEnum.PENDING` حذف شد.** سوال قبلی این بود
> که آیا بکند بین `PENDING` و `PROCESSING` تفکیک معنادار قائل است. جواب: نه — چیزی در کد واقعی
> بکند هیچ‌وقت `PENDING` را ست نمی‌کرد (فقط سیدهای تست از آن به‌عنوان یک وضعیت جای‌گزار «هنوز
> ارسال نشده» استفاده می‌کردند)، و چون فرانت همان یک برچسب را برای هر دو نشان می‌دهد، تفکیک‌شان
> فایده‌ای نداشت. عضو `PENDING` از `SalesStatusEnum` حذف شد؛ هر جا قبلاً استفاده می‌شد حالا
> `PROCESSING` است. `RETURNED` از `7` به `6` جابه‌جا شد. کاری برای فرانت لازم نیست — فرانت هیچ‌وقت
> این عدد را تولید یا انتظار نداشت.

---

## ۲. عضو کم دارد — فقط افزودن عضو

### `ProductUnitStatusEnum` — حل شد (فرانت عقب‌نشینی کرد)

> **به‌روزرسانی ۱۴۰۵/۰۶/۰۸:** این درخواست **پس گرفته شد.** فرانت چهار عضو اضافه‌اش
> (`SHIPPED`, `DAMAGED`, `LOST`, `RETURNED_BY_CUSTOMER`) را حذف کرد و حالا دقیقاً
> همان چهار عضو بکند را دارد. کاری برای انجام نمانده.
>
> **✅ SOLVED (۱۴۰۵/۰۶/۱۱ — ۲۰۲۶-۰۹-۰۱): این پاراگراف وقتی نوشته شد نادرست بود —**
> بکند هنوز هر ۸ عضو را داشت (چهارتای اضافه هیچ‌وقت واقعاً حذف نشده بودند، فقط جایی
> استفاده نمی‌شدند). با گرپ کامل روی `Application`/`Domain`/`Infrastructure` و بررسی
> اسکریپت‌های seed تایید شد که هیچ‌کدام از `SHIPPED`/`DAMAGED`/`LOST`/
> `RETURNED_BY_CUSTOMER` در هیچ کد یا داده‌ی seed تولید نمی‌شد — پس بکند هم اکنون
> واقعاً به همان ۴ عضو برگشت.

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

> **✅ SOLVED (۲۰۲۶-۰۸-۲۸، مستندشده در `docs/returns-effects-and-org-structure-summary.fa.md`):**
> **راه اول** انتخاب و کامل پیاده‌سازی شد — بکند مدل ترکیبی «اثرها»ی فرانت را عیناً پذیرفت.
> هر دو مرجوعی خرید و فروش حالا `…Return → …Claim → …Resolution → …Effect` هستند، دقیقاً منطبق
> با `returnDoc → claims[] → resolutions[] → effects[]` فرانت. enum بسته‌ی `DecisionType` قدیمی
> (و enum های `PurchaseReturnStatusEnum`/`SaleReturnStatusEnum`/`PurchaseIssueTypeEnum`/
> `SalesReturnReasonEnum`/`SalesReturnIssueTypeEnum` قدیمی) به‌طور کامل از کد حذف شده‌اند؛ هیچ
> جای دیگری در این سند (بخش‌های زیر) دیگر معتبر نیست مگر جایی که صراحتاً SOLVED علامت خورده. برای
> جزئیات کامل مدل جدید، `docs/returns-effects-and-org-structure-summary.fa.md` و `docs/api-guide.fa.md`
> (بخش «enum های مشترک مرجوعی خرید/فروش») را ببینید.


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

> **✅ SOLVED (۲۰۲۶-۰۸-۲۸):** بکند دقیقاً همین فضای مقدار یکپارچه را به‌عنوان `ReturnProblemEnum` (۱۴ عضو، همان اعداد فرانت) پیاده کرده — شامل هر ۵ عضوی که چک‌لیست پایین این سند تا امروز «گمشده» علامت زده بود (`WRONG_ITEM_INVOICED`, `WRONG_ITEM_ORDERED`, `WRONG_QTY_INVOICED`, `WRONG_QTY_ORDERED`, `UNLISTED_ITEM`). سه enum قدیمی زیر کاملاً حذف شده‌اند.

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

> **✅ SOLVED (۲۰۲۶-۰۸-۲۸):** `ReturnEffectStatusEnum.VOID` از قبل در کد وجود دارد (هنوز هیچ‌جا تولید نمی‌شود، ولی roll-up ها آماده‌اند آن را نادیده بگیرند).

> **✅ SOLVED (۲۰۲۶-۰۸-۲۸):** `PAYMENT_METHODS` → `ReturnPaymentMethodEnum`، `CLAIM_SCOPES` → `ReturnClaimScopeEnum`، `OFF_SCOPE_KINDS` → `ReturnOffScopeKindEnum` — هر سه با همان اعداد فرانت در کد موجودند. `MONEY_DIRECTIONS` هنوز معادل مستقیم ندارد (جهت پول از ترکیب اثرها استنتاج می‌شود، نه یک enum جدا) — اگر فرانت به این enum مجزا به‌عنوان یک مقدار روی سیم نیاز دارد، اطلاع دهید.

> **✅ SOLVED (۲۰۲۶-۰۹-۰۵):** `ReturnPaymentMethodEnum` با `PaymentTypeEnum` هم‌شماره شد (`CASH=0, ON_ACCOUNT=1, CHECK=2, TRANSFER=3, MIXED=4, STORE_CREDIT=5`) — درخواستِ `docs/payment-enum-unification.fa.md`. مهاجرتِ داده‌ی چرخه‌ای در `20260904225819_renumber-return-payment-method` انجام شده.

**بقیه‌ی مقادیر مرجوعی که بکند اصلاً ندارد:**

| فهرست | مقادیر | کاربرد |
|---|---|---|
| `PAYMENT_METHODS` | `0` CASH · `1` ON_ACCOUNT · `2` CHECK · `3` TRANSFER · `4` MIXED · `5` STORE_CREDIT | روش پرداختِ یک اثر پولی. **از ۲۰۲۶-۰۹-۰۵ با `PaymentTypeEnum` سطح سند هم‌شماره است** (`ON_ACCOUNT` = `CREDIT`)؛ تنها عضو اضافه `STORE_CREDIT` است که ته فهرست آمده. فرانت `PAYMENT_METHODS` را حذف کرده و از همان فهرست `paymentType` استفاده می‌کند. |
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

فرانت در صفحه‌ی لیست مشتریان و تامین‌کنندگان فیلتر «نوع حساب» (بدهکار / طلبکار / تسویه‌شده) دارد و پارامتر `balanceType` را می‌فرستد. ولی در [`api-guide.fa.md`](./api-guide.fa.md) پارامترهای query این دو endpoint فقط `page`, `take`, `id`, `fullName`, `minBalance`, `maxBalance` ذکر شده.

> **پاسخ (از روی کد، ۱۴۰۵/۰۶/۰۸):** بله، **هر دو** پشتیبانی می‌کنند —
> `GetCustomerListQuery.BalanceType` و `GetSupplierListQuery.BalanceType`، هر دو
> `BalanceTypeEnum?`. فقط در `api-guide.fa.md` مستند نشده بود. کاری لازم نیست جز
> اضافه‌کردنش به سند.
>
> ولی **نامِ بقیه‌ی پارامترها بین این دو یکی نیست** و سند هیچ‌کدام را کامل
> نمی‌گوید: مشتری `fullName`/`minBalance`/`maxBalance` می‌گیرد و تامین‌کننده
> `companyNameOrContactName`/`fromBalance`/`toBalance`. فرانت هر دو را درست
> می‌فرستد؛ یکدست‌کردنشان (یا دست‌کم مستندکردنشان) از باگِ بعدی جلوگیری می‌کند.
>
> **✅ SOLVED (۲۰۲۶-۰۹-۰۱):** `docs/api-guide.fa.md` بخش‌های ۴ و ۵ حالا هم پارامتر `balanceType` را روی هر دو endpoint مستند می‌کنند، هم تفاوت نام پارامترهای دیگر را صریح یادآوری می‌کنند. یکدست‌سازی خودِ نام‌ها (نه فقط مستندسازی) انجام نشد — تغییر signature یک endpoint موجود است و نیاز به هماهنگی با فرانت دارد؛ اگر می‌خواهید این کار هم انجام شود بگویید.

### ۵.۳ `SupplierListDto.status` — استثنای رشته‌ای

طبق سند، این تنها فیلد enum در کل سیستم است که رشته می‌ماند (`"Creditor"`). فرانت به این استثنا دست نزده و همان‌طور رهایش کرده. اگر تصمیم دارید یکدستش کنید بگویید.

> **✅ SOLVED — تا حدی (۲۰۲۶-۰۹-۰۱):** تصمیم این بود که **خودِ استثنا** (رشته‌ای‌بودن این یک
> فیلد) باقی بماند، ولی محتوایش درست شود: به‌جای `BalanceType.ToString()` (که نام انگلیسی عضو
> enum را برمی‌گرداند، `"Creditor"`) حالا از extension method پروژه
> (`Common.Extensions.EnumExtensions.GetDescription()`) استفاده می‌کند و متن فارسی برمی‌گرداند
> (`"طلبکار"`) — همان الگویی که `Product.Unit.GetDescription()` روی کوئری‌های مرجوعی از قبل
> استفاده می‌کند. **این یک تغییر روی سیم است**: مقدار `status` از `"Creditor"` به `"طلبکار"`
> عوض شده. اگر جایی در فرانت مستقیماً به مقدار انگلیسی قبلی وابسته بود (نه فیلد عددی
> `balanceType` که کنارش هست)، باید هماهنگ شود — لطفاً تایید کنید که فرانت مشکلی با این تغییر
> ندارد.

---

## چک‌لیست کارهای بکند

**وضعیت این سند در ۲۰۲۶-۰۹-۰۱ به‌طور کامل با کد تطبیق داده شد** — بیشتر بندهای زیر از
۲۰۲۶-۰۸-۲۸ در کد حل شده بودند ولی این چک‌لیست تا امروز به‌روز نشده بود. جزئیات هر بند در
بخش مربوطه‌اش با ✅ SOLVED علامت خورده.

- [x] ~~**`ProductUnitStatusEnum`**: افزودن ۴ عضو~~ — پس گرفته شد؛ فرانت به همان ۴ عضو بکند برگشت. **✅ کد هم اصلاح شد (۲۰۲۶-۰۹-۰۱)**: تا امروز بکند هنوز واقعاً ۸ عضو داشت (۴ تای اضافه تعریف‌شده ولی بلااستفاده)؛ حالا واقعاً حذف شدند (بخش ۲)
- [x] ~~**حوزه‌ی مرجوعی**: تصمیم‌گیری بین «پذیرش مدل ترکیبی» و «نگه‌داشتن enum بسته + لایه‌ی نگاشت»~~ — **✅ SOLVED از ۲۰۲۶-۰۸-۲۸**: راه اول (مدل ترکیبی) به‌طور کامل پیاده‌سازی شد (بخش ۳.۳)
- [x] ~~**`EFFECT_STATUSES`**: افزودن معادل `VOID`~~ — **✅ SOLVED از ۲۰۲۶-۰۸-۲۸**: `ReturnEffectStatusEnum.VOID` موجود است (بخش ۳.۴)
- [x] ~~بررسی افزودن اعضای گمشده‌ی `RETURN_PROBLEMS`~~ — **✅ SOLVED از ۲۰۲۶-۰۸-۲۸**: `ReturnProblemEnum` هر ۱۴ عضو را دارد (بخش ۳.۴)
- [x] ~~بررسی نیاز به `CLAIM_SCOPES` / `OFF_SCOPE_KINDS`~~ — **✅ SOLVED از ۲۰۲۶-۰۸-۲۸**: `ReturnClaimScopeEnum`/`ReturnOffScopeKindEnum` موجودند (بخش ۳.۴)
- [x] ~~پاسخ درباره‌ی فیلتر `balanceType`~~ — هر دو کنترلر دارندش؛ فقط مستند نشده بود. **✅ مستندسازی هم انجام شد (۲۰۲۶-۰۹-۰۱)**، `docs/api-guide.fa.md` بخش‌های ۴/۵ (بخش ۵.۲)
- [x] ~~پاسخ درباره‌ی تفکیک `SalesStatusEnum.PENDING` از `PROCESSING`~~ — **✅ SOLVED (۲۰۲۶-۰۹-۰۱)**: هیچ تفکیک معناداری وجود نداشت؛ `PENDING` از enum حذف شد (بخش ۱)
- [x] ~~`SupplierListDto.status` — استثنای رشته‌ای~~ — **✅ SOLVED — تا حدی (۲۰۲۶-۰۹-۰۱)**: محتوا از `ToString()` به `GetDescription()` (متن فارسی) تغییر کرد؛ خودِ استثنا (رشته‌ای‌بودن) عمداً باقی ماند (بخش ۵.۳)

**تنها بند باز باقی‌مانده:** یکدست‌کردن نام پارامترهای query بین `GetCustomerList`/`GetSupplierList` (بخش ۵.۲) — فقط مستند شد، خودِ نام‌ها عمداً تغییر نکرد چون به هماهنگی با فرانت نیاز دارد.

**enum های جدید حوزه‌ی مرجوعی که این چک‌لیست هنوز چیزی درباره‌شان نگفته بود:** `MONEY_DIRECTIONS`
فرانت هنوز معادل مستقیم در بکند ندارد (بخش ۳.۴) — جهت پول از ترکیب اثرها استنتاج می‌شود. اگر
فرانت به این enum به‌عنوان یک مقدار مجزا روی سیم نیاز دارد، این تنها بند واقعاً باز این سند است.

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
