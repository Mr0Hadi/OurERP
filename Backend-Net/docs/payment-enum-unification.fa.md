# درخواست بکند — یکی‌کردن `ReturnPaymentMethodEnum` با `PaymentTypeEnum`

**تاریخ:** ۱۴۰۵/۰۶/۱۴ (۲۰۲۶-۰۹-۰۵)
**وضعیت فرانت:** انجام شده و منتظر بکند. تا وقتی این تغییر اعمال نشود،
مسیرِ *اثرهای پولیِ مرجوعی* اعداد اشتباه می‌فرستد (پایین را ببینید).

---

## ۱. مسئله

بکند دو شمارش برای یک مفهوم دارد و شماره‌گذاری‌شان قاطی است:

| معنی | `PaymentTypeEnum` | `ReturnPaymentMethodEnum` |
|---|---|---|
| نقدی | `CASH = 0` | `CASH = 0` |
| نسیه / روی حساب | `CREDIT = 1` | `ON_ACCOUNT = 3` |
| چک | `CHECK = 2` | `CHECK = 1` |
| انتقال بانکی | `TRANSFER = 3` | `TRANSFER = 2` |
| ترکیبی | `MIXED = 4` | `MIXED = 5` |
| اعتبار خرید بعدی | — | `STORE_CREDIT = 4` |

معنی‌ها یکی‌اند (`ON_ACCOUNT` همان «نسیه» است)؛ فقط اعداد فرق دارند. تنها
عضوِ واقعاً اضافه `STORE_CREDIT` است.

هزینه‌ی این دوگانگی در فرانت این بود که کامپوننتِ مشترکِ «تقسیم مبلغ بین
چند روش» (`MixedPaymentList`) بسته به اینکه از فرمِ خرید/فروش صدا زده شود
یا از بخشِ پولِ تصمیمِ مرجوعی، دو معنیِ متفاوت تولید می‌کرد — و هر عبور از
مرزِ API یک نگاشتِ دستی می‌خواست. یک باگِ واقعی هم از همین‌جا آمده بود:
ردیفِ «چک» در `paymentDetails`ِ خرید/فروش با عددِ `1` فرستاده می‌شد که
بکند آن را «نسیه» می‌خواند.

## ۲. تغییر درخواستی

`Domain/Enums/ReturnPaymentMethodEnum.cs` با همان ترتیبِ `PaymentTypeEnum`
بازنویسی شود و `STORE_CREDIT` ته آن بیاید:

```csharp
public enum ReturnPaymentMethodEnum
{
    CASH = 0,
    ON_ACCOUNT = 1,   // بود ۳ — معادلِ CREDIT در PaymentTypeEnum
    CHECK = 2,        // بود ۱
    TRANSFER = 3,     // بود ۲
    MIXED = 4,        // بود ۵
    STORE_CREDIT = 5, // بود ۴
}
```

اگر ترجیح می‌دهید، می‌شود `ReturnPaymentMethodEnum` را کامل حذف کرد و
`PaymentTypeEnum` را با `STORE_CREDIT = 5` گسترش داد و همه‌جا از همان
استفاده کرد. فرانت با هر دو حالت کار می‌کند؛ فقط اعداد مهم‌اند.

نکته: `ON_ACCOUNT` و `CREDIT` عمداً هر دو `1` می‌شوند. اگر نام‌ها را هم
یکی می‌کنید، `CREDIT` را نگه دارید.

## ۳. مهاجرتِ داده — **الزامی**

`Method` در این جاها ذخیره شده و مقدارِ فعلی‌اش با شماره‌گذاریِ جدید
معنیِ دیگری می‌دهد:

- `PurchaseReturnEffect.Method`
- `SaleReturnEffect.Method`
- `PurchaseReturnEffectMoneyPart.Method`
- `SaleReturnEffectMoneyPart.Method`

نگاشتِ لازم (کهنه → نو):

```
1 → 2   (CHECK)
2 → 3   (TRANSFER)
3 → 1   (ON_ACCOUNT)
4 → 5   (STORE_CREDIT)
5 → 4   (MIXED)
0 → 0   (CASH، بدون تغییر)
```

⚠️ چون این یک جابه‌جاییِ چرخه‌ای است، نمی‌شود چند `UPDATE` پشت‌سرهم زد —
دومی نتیجه‌ی اولی را خراب می‌کند. یا از `CASE WHEN` تک‌مرحله‌ای استفاده
کنید:

```sql
UPDATE [PurchaseReturnEffects]
SET [Method] = CASE [Method]
    WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 1
    WHEN 4 THEN 5 WHEN 5 THEN 4 ELSE [Method] END;
```

و همین را برای سه جدول دیگر تکرار کنید. **قبل از اجرا تعداد ردیف‌ها را
بشمارید** — تا جایی که ما دیدیم ماژول مرجوعی هنوز داده‌ی واقعی ندارد
(`GetSaleReturnList` روی سرور خطا می‌دهد)، پس احتمالاً مهاجرت خالی است و
فقط `Down` باید درست نوشته شود.

## ۴. جاهایی که باید بازبینی شوند

فایل‌هایی که `ReturnPaymentMethodEnum` را مستقیم استفاده می‌کنند و بعد از
تغییر باید تست شوند:

- `Application/Common/Dtos/Returns/EffectCompositionDto.cs`
- `Application/Features/PurchaseReturn/Commands/AddClaimResolutionCommand.cs`
- `Application/Features/SaleReturn/Commands/AddClaimResolutionCommand.cs`
- `Application/Features/PurchaseReturn/Dtos/PurchaseReturnEffectDto.cs`
- `Application/Features/SaleReturn/Dtos/SaleReturnEffectDto.cs`
- `Application/Features/Invoice/Queries/GetSaleReturnCreditNotePdfQuery.cs`
  (برچسبِ «اعتبار فروشگاهی» به `STORE_CREDIT` وابسته است)
- `Infrastructure/Services/PurchaseReturnCalculationService.cs`
- `Infrastructure/Services/SaleReturnCalculationService.cs`
- تست‌های `Tests/WMS.Tests/**` که مقادیر عددیِ صریح دارند

هر جای دیگری که عددِ خام (نه عضوِ enum) نوشته شده باشد هم باید پیدا شود.

## ۵. وضعیت فرانت

فرانت **همین حالا** روی شماره‌گذاریِ جدید نشسته است:

- `PAYMENT_METHODS` حذف شد؛ همه‌چیز از
  `src/shared/domain/enums/paymentType.js` می‌آید.
- `MixedPaymentList` دیگر پارامترِ نوع نمی‌گیرد — یک فهرست برای هر دو
  مصرف‌کننده.
- `STORE_CREDIT` در کشویی «نوع پرداخت» سند و در فیلترِ لیست‌ها نمی‌آید
  (`DOCUMENT_PAYMENT_TYPES`)، چون فقط از مرجوعی زاده می‌شود.

**تا اعمال‌شدنِ این درخواست:** مسیرهای خرید/فروش (`paymentDetails`) درست
کار می‌کنند — آن‌ها از قبل `PaymentTypeEnum` بودند و حالا فقط بی‌واسطه‌تر
شده‌اند. ولی مسیرِ *ثبتِ تصمیمِ مرجوعی* (`AddClaimResolution`) اعدادِ جدید
می‌فرستد و بکندِ فعلی آن‌ها را اشتباه می‌خواند. چون ماژول مرجوعی هنوز روی
سرور بالا نیامده، این در عمل چیزی را خراب نمی‌کند — ولی **قبل از فعال‌شدنِ
مرجوعی باید این تغییر اعمال شده باشد**.

## ۶. یک باگِ جانبی که در همین بازبینی پیدا شد

`toApiClaim` در فرانت تعدادِ ادعا را با نام `qty` می‌فرستاد، در حالی که
`PurchaseReturnClaimDto`/`SaleReturnClaimDto` اسمش `Quantity` است — یعنی
تعدادِ هر ادعای مرجوعی بی‌صدا صفر ثبت می‌شد. سمتِ فرانت درست شد (همه‌ی
نام‌های `qty`/`*Qty` به `quantity`/`*Quantity` تغییر کردند تا با DTOهای
بکند یکی باشند). اگر ردیفی با `Quantity = 0` در دیتابیس هست، از همین‌جا
آمده.
