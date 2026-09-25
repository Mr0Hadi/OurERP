# پاسخ بکند به بقیه‌ی درخواست‌های همگام‌سازی خرید (۲۰۲۶-۰۹-۲۵)

این سند برای تیم فرانت است و دنباله‌ی `purchase-frontend-sync-requests.fa.md` است. بندهای ۲، ۳، ۴، ۷، ۹ و ۱۱ قبلاً در طرح «قفل پیش‌فاکتور»
جواب گرفته بودند (`proforma-lock-frontend-guide.fa.md`). این سند شش بند باقی‌مانده را پوشش می‌دهد: **۱، ۵، ۶، ۸، ۱۰ و ۱۲**. برای هر بند آمده که
سرور حالا چه می‌کند، و فرانت باید چه کند.

قرارداد دقیق: `api-guide.fa.md` §۱ (بخش `Idempotency-Key`)، §۹، §۱۰، §۱۲ و جدول ۲۰۲۶-۰۹-۲۵ در §۱۶.

---

## خلاصه

| # | سرور حالا | کار فرانت |
|---|---|---|
| ۱ | `claimableQuantity` / `freeExcessQuantity` / `freeQuantity` روی `GetPurchaseReceivingInfo` | **هیچ.** تابع‌های `*QuantityOf` از قبل این فیلدها را می‌خوانند |
| ۵ | `Idempotency-Key` روی همه‌ی نوشتن‌ها اثر دارد | ۴۰۹ و ۴۲۲ را مدیریت کنید، جلوی دوبارکلیک را بگیرید، کلید را به endpointهای پرداخت هم بدهید |
| ۶ | `reason` روی رد/لغو مرجوعی، و `statusReason` روی جزئیات | `reason` را بفرستید و `statusReason` را نشان دهید |
| ۸ | `search` روی `GetPurchaseList` (شماره فاکتور **یا** نام تامین‌کننده) | `invoiceNumber: params.search` را به `search: params.search` عوض کنید |
| ۱۰ | مشکلِ غیرقابل‌مشاهده در `defects[]`/`observations[]` ⇒ ۴۰۰ | **هیچ.** فرانت از قبل فقط `OBSERVED_PROBLEMS` را پیشنهاد می‌دهد |
| ۱۲ | `statuses` روی `GetPurchaseList` | **هیچ الزامی.** فیلترِ دوباره‌ی سمتِ فرانت را می‌شود برداشت |

هیچ فیلدی حذف یا تغییرنام نشده است. تنها سخت‌گیری تازه بند ۱۰ است، که فرانت از قبل رعایتش می‌کند.

---

## ۱. سقف‌های آماده روی `GetPurchaseReceivingInfo`

سه فیلد تازه با همان عددهایی که سرور هنگامِ ثبت چک می‌کند:

| فیلد | معنی |
|---|---|
| `items[].claimableQuantity` | بیشترین مقدارِ ادعای تازه‌ی `ON_ORDER` روی این قلم: دریافت‌شده − تسویه‌شده − ادعاهای بازِ مرجوعی‌های دیگر |
| `items[].freeExcessQuantity` | مازادِ قرنطینه‌ی این قلم منهای رزروِ ادعاهای بازِ `EXCESS`. سقفِ ادعای `EXCESS` **و** سقفِ `AcceptPurchaseExcess` |
| `unlistedItems[].freeQuantity` | همین، برای کالای خارج از سند (`UNLISTED`) |

`claimableQuantityOf` / `freeExcessQuantityOf` / `freeUnlistedQuantityOf` در
`src/features/purchases/returns/domain/purchaseReturnVocabulary.js` این فیلدها را اول می‌خوانند، پس بدون تغییر درست کار می‌کنند. وقتی
مطمئن شدید سرورِ جدید همه‌جا مستقر است، می‌توانید مسیرِ جایگزین (`receivedQuantity` و بقیه) را حذف کنید؛ آن عددها سقف نیستند و فقط
تا امروز جای خالی را پر می‌کردند.

یک نکته برای کارتِ «کالای مازاد در قرنطینه»: اگر `freeExcessQuantity` از `quarantinedExcessQuantity` کمتر است، یعنی بخشی از مازاد در
ادعای مرجوعیِ باز رزرو شده است. ارزش دارد این را به کاربر بگویید، مثلاً «۲ عدد در مرجوعیِ باز»، وگرنه دکمه‌ی «پذیرش» بی‌دلیل کمتر از
عددِ قرنطینه اجازه می‌دهد.

---

## ۵. `Idempotency-Key`

### سرور چه می‌کند

هر `POST`/`PUT`/`PATCH`/`DELETE` از کاربرِ واردشده که هدرِ `Idempotency-Key` دارد:

| حالت | پاسخ |
|---|---|
| کلیدِ تازه | عادی اجرا می‌شود. پاسخِ موفق (۲xx) ۲۴ ساعت نگه داشته می‌شود |
| همان کلید، همان درخواست (مسیر، query و بدنه‌ی یکسان)، بعد از موفقیت | **اجرا نمی‌شود.** همان پاسخ اول برمی‌گردد، با هدرِ `Idempotency-Replayed: true` |
| همان کلید، وقتی درخواستِ اول هنوز تمام نشده | **۴۰۹** «همین درخواست هنوز در حال انجام است» |
| همان کلید، درخواستِ متفاوت | **۴۲۲** «این کلید قبلاً برای درخواست دیگری به کار رفته» |
| درخواستِ اول خطا داد (۴xx یا ۵xx) | کلید آزاد می‌شود و تکرار دوباره اجرا می‌شود. نوشتنِ ناموفق چیزی ذخیره نکرده است |
| کلید بیشتر از ۲۵۵ نویسه | ۴۰۰ |

کلید برای هر کاربر جداست. `GET` و درخواستِ بی‌هدر دست‌نخورده اجرا می‌شوند.

### آنچه فرانت از قبل درست انجام می‌دهد

`idempotencyKeyFor(variables)` در `src/shared/services/api/contract.js` کلید را به شیءِ `variables` گره می‌زند. retryهای React Query
همان شیء را می‌گیرند و همان کلید را می‌فرستند، که درست همان چیزی است که سرور انتظار دارد. retryِ axios پس از رفرشِ توکن (۴۰۱) هم همان
هدر را دوباره می‌فرستد؛ این هم بی‌خطر است، چون ۴۰۱ پیش از رسیدن به بررسیِ کلید برمی‌گردد و کلید رزرو نمی‌شود.

### کارهایی که مانده

**الف. دوبارکلیک.** هر کلیک یک شیءِ `variables` تازه و در نتیجه یک کلیدِ تازه می‌سازد، پس سرور دو کلیکِ پشت‌سرهم را **دو عملِ جدا**
می‌بیند و هر دو را اجرا می‌کند. کلید فقط جلوی retryِ شبکه را می‌گیرد، نه جلوی کلیکِ دوم. دکمه‌ی ثبت را تا وقتی mutation در حال اجراست
(`isPending`) غیرفعال کنید. این مهم‌تر از همه است برای ثبتِ پرداخت، دورِ کالا و دریافت محموله.

**ب. ۴۰۹.** یعنی نسخه‌ی اولِ همین عمل هنوز روی سرور در حال اجراست؛ این معمولاً یک retryِ زودهنگام است. خطا نشان ندهید. کمی صبر کنید
و **با همان کلید** دوباره بفرستید، یا سند را دوباره بخوانید (`invalidateQueries`). یک راه ساده این است که در `retry` مربوط به mutationها
۴۰۹ را قابل تکرار بدانید و بقیه‌ی ۴xxها را نه:

```js
retry: (count, error) => error?.response?.status === 409 && count < 3,
retryDelay: 1000,
```

**ج. ۴۲۲.** در کارکردِ درست هرگز پیش نمی‌آید و نشانه‌ی باگ در فرانت است: یک کلید برای دو عملِ متفاوت به کار رفته، مثلاً شیءِ `variables` بعد
از ساخته‌شدن تغییر کرده، یا یک شیء برای دو فراخوانی دوباره استفاده شده. پیامِ سرور را نشان دهید و در حالت توسعه لاگ کنید.

**د. `Idempotency-Replayed`.** این هدر از CORS عبور می‌کند (`exposedHeaders`). لازم نیست کاری با آن بکنید، چون پاسخ دقیقاً همان پاسخِ
اول است. فقط اگر خواستید در لاگ یا ابزارِ توسعه ببینید که پاسخ تکراری بوده، از `response.headers["idempotency-replayed"]` بخوانید.

**ه. endpointهای تازه‌ای که هنوز کلید نمی‌فرستند.** امروز کلید فقط روی مرجوعی‌ها (ثبت، تصمیم، دور کالا، اجرای اثر مالی)، پذیرش مازاد،
دریافت محموله و ارسال محموله فرستاده می‌شود. این نوشتن‌ها هم تجمعی‌اند و retry ممکن است آن‌ها را دوبار ثبت کند:

| endpoint | چرا مهم است |
|---|---|
| `AddPurchasePayment` / `AddSalePayment` | retry یعنی پرداختِ دوبار ثبت‌شده، هم در سند و هم در دفتر حساب اشخاص |
| `EditPurchasePayment` / `EditSalePayment` | retry ردیفِ جایگزینِ دوم می‌سازد |
| `CreatePurchase` / `CreateSale` / `CreateInPersonSale` | retry سندِ تکراری می‌سازد؛ فروشِ حضوری کالا را هم دوبار از انبار کم می‌کند |
| `ReceivePurchase` / `ShipSale` (اگر جدا از `ReceiveShipment`/`DispatchShipment` صدا زده می‌شوند) | موجودی دوبار جابه‌جا می‌شود |

`VoidPurchasePayment`/`VoidSalePayment`، `ClosePurchaseItem` و تغییر وضعیت ذاتاً تکرارپذیرند، چون بار دوم با ۴۰۰ رد می‌شوند؛ کلید برایشان
ضرری ندارد ولی لازم هم نیست. الگو همان است که در mutationهای مرجوعی هست:

```js
mutationFn: (payload) => addPurchasePayment(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
```

و در `api-v1.js` سومین آرگومانِ `axiosInstance.post` را `idempotent(idempotencyKey)` بدهید.

---

## ۶. دلیلِ رد و لغو مرجوعی

- `POST api/PurchaseReturn/RejectPurchaseReturn`، `CancelPurchaseReturn`، و همتاهای `SaleReturn`، حالا `{ id, reason }` می‌گیرند.
  `reason` اختیاری است و حداکثر ۵۰۰ نویسه (بیشتر ⇒ ۴۰۰). فاصله‌های دو طرف حذف می‌شود و رشته‌ی خالی یعنی «بی‌دلیل».
- جزئیات مرجوعی (و پاسخِ همین نوشتن‌ها، که سند کامل است) فیلدِ **`statusReason`** دارد: دلیلِ ردِ یا لغوِ فعلی، یا `null`.
- `Reopen` این فیلد را **پاک می‌کند**، چون مرجوعیِ بازگشایی‌شده دیگر رد‌شده نیست. اگر بعداً دوباره رد شود، دلیلِ تازه‌ای می‌گیرد.

**فرانت:**
1. `rejectPurchaseReturn(returnId)` و `cancelPurchaseReturn(returnId)` در `src/features/purchases/returns/services/api-v1.js`، و همتاهای
   فروش، `reason` را هم بفرستند. کامنتِ «بکند دلیل را نمی‌گیرد» دیگر درست نیست. طبق همان کامنت فرم از قبل `reason` را نگه می‌دارد:
   ```js
   export async function rejectPurchaseReturn(returnId, reason) {
     const { data } = await axiosInstance.post("/PurchaseReturn/RejectPurchaseReturn", {
       id: returnId,
       reason: reason?.trim() || undefined,
     });
     return fromApiReturn(data);
   }
   ```
2. محدودیتِ ۵۰۰ نویسه را روی خودِ فیلد بگذارید (`maxLength`).
3. روی صفحه‌ی جزئیات، وقتی `status` برابر `REJECTED` یا `CANCELLED` است و `statusReason` پر است، آن را کنار نشانِ وضعیت نشان دهید.
   مرجوعی‌های قدیمی `statusReason = null` دارند؛ برای آن‌ها چیزی نشان ندهید.
4. `fromApiReturn` باید `statusReason` را از سند عبور دهد، اگر فیلدها را صریح نگاشت می‌کند.

---

## ۸. جست‌وجوی لیست خرید

`GET api/Purchase/GetPurchaseList` پارامترِ **`search`** دارد، که روی شماره‌ی فاکتور **یا** نام شرکتِ تامین‌کننده می‌گردد. `invoiceNumber`
هنوز هست و فقط روی شماره‌ی فاکتور می‌گردد.

**فرانت:** در هر دو جا، `invoiceNumber: params.search || undefined` را به `search: params.search || undefined` عوض کنید:
- `fetchPurchases` در `src/features/purchases/orders/services/api-v1.js`؛
- `fetchReceivablePurchases` در `src/features/warehouse/receiving/services/api-v1.js`.

placeholderِ کادرِ جست‌وجو هم می‌تواند بگوید «شماره فاکتور یا تامین‌کننده». کامنتِ بالای `api-v1.js` خرید، که می‌گوید «`search` آزاد
پشتیبانی نمی‌شود»، را هم به‌روز کنید.

---

## ۱۰. فقط مشکلِ قابل‌مشاهده روی کالای رسیده

`ReceivePurchase` → `items[].defects[].problem` (و `unlistedItems[].defects[]`)، و `ExecuteGoodsRound` → `rounds[].observations[].problem`
روی **هر دو** سمتِ مرجوعی، فقط این‌ها را می‌پذیرند:

`WRONG_ITEM_SHIPPED (0)`، `DEFECTIVE (7)`، `DAMAGED_IN_TRANSIT (8)`، `QUALITY_ISSUE (9)`، `EXPIRED (10)`، `OTHER (13)`

یعنی دقیقاً `OBSERVED_PROBLEMS` در `src/shared/domain/returns/problems.js`. هر مقدار دیگر ۴۰۰ می‌گیرد، با این پیام: «این مشکل با دیدن کالا
قابل ثبت نیست. کسری را با واردکردن مقدار رسیده‌ی کمتر ثبت کنید؛ مشکل‌های فاکتور یا سفارش در ادعای مرجوعی ثبت می‌شوند.»

**فرانت:** کاری لازم نیست، چون فرم‌ها از قبل همین فهرست را پیشنهاد می‌دهند. فقط اگر جایی مقدارِ پیش‌فرضِ `problem` را `0` می‌گذارید، بدانید
که `0` یعنی `WRONG_ITEM_SHIPPED`، که مجاز است ولی احتمالاً منظورتان نیست؛ پیش‌فرضِ معقول `DEFECTIVE` است. ادعای مرجوعی (`claims[].problem`)
تغییری نکرده و همه‌ی مشکل‌ها را می‌پذیرد.

---

## ۱۲. فیلترِ چندوضعیتی

`statuses` روی `GetPurchaseList` حالا واقعاً فیلتر می‌کند، به همان شکلی که `fetchReceivablePurchases` می‌فرستد
(`statuses=2&statuses=3` با `paramsSerializer: { indexes: null }`). تعدادِ صفحه‌ها و ردیف‌های هر صفحه حالا دقیق است. `statuses` با `status`
و بقیه‌ی فیلترها «و» می‌شود.

**فرانت:** الزامی نیست، ولی فیلترِ دوباره‌ی سمتِ فرانت (`list.items.filter(... allowed.has(...))`) دیگر لازم نیست و می‌شود برداشت. نگه‌داشتنش
هم ضرری ندارد.

---

## چک‌لیست

- [ ] دکمه‌ی ثبتِ همه‌ی نوشتن‌های تجمعی هنگام `isPending` غیرفعال است (§۵ الف)
- [ ] ۴۰۹ با همان کلید دوباره فرستاده می‌شود یا سند دوباره خوانده می‌شود؛ ۴۲۲ لاگ می‌شود (§۵ ب، ج)
- [ ] `Add/Edit{Purchase,Sale}Payment`، `CreatePurchase`/`CreateSale`/`CreateInPersonSale` کلید می‌فرستند (§۵ ه)
- [ ] رد/لغوِ مرجوعی `reason` می‌فرستد؛ `maxLength=500` (§۶)
- [ ] جزئیاتِ مرجوعیِ رد/لغوشده `statusReason` را نشان می‌دهد (§۶)
- [ ] `search` به‌جای `invoiceNumber` در دو تابعِ لیست خرید (§۸)
- [ ] (اختیاری) فیلترِ دوباره‌ی صفِ دریافت و مسیرِ جایگزینِ `*QuantityOf` برداشته شود (§۱، §۱۲)
