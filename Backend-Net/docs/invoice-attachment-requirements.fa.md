# نیازمندی‌های بک‌اند برای «ضمیمه‌ی فاکتور»

> این سند یک درخواستِ کار برای سمت سرور است، نه توصیفِ چیزی که هست. فرانت
> کارِ خودش را انجام داده و پشتِ یک پرچم منتظر است؛ این‌جا نوشته شده که
> دقیقاً چه چیزی در بک‌اند کم است.
>
> تاریخ تهیه: ۱۴۰۵/۰۶/۰۸ (۲۰۲۶-۰۸-۳۰)
>
> **به‌روزرسانی ۱۴۰۵/۰۶/۱۰ (۲۰۲۶-۰۹-۰۱):** بخش ۲.۱–۲.۳ برای **خرید و فروش**
> پیاده شد — گزینه‌ی (الف) همین سند انتخاب شد: جدولِ مشترکِ
> `DocumentAttachments` + `DocumentKindEnum` (`PURCHASE=1, SALE=2,
> PURCHASE_RETURN=3, SALE_RETURN=4` — دو مقدار آخر رزرو شده‌اند، هنوز به هیچ
> دستوری وصل نیستند). شکلِ JSON دقیقاً همان بخش ۳ همین سند است.
> `CreatePurchaseCommand`/`UpdatePurchaseCommand`/`CreateSaleCommand`/
> `UpdateSaleCommand` فیلد `attachments` گرفتند؛ `PurchaseDto`/`SaleDto`
> فیلد `attachments` را در خواندن برمی‌گردانند (رفتار `Update`: جایگزینیِ
> کامل، طبق بخش ۲.۲). بخش ۲.۴ با گزینه‌ی ساده (۱) انجام شد: `.pdf`/
> `application/pdf` به `AllowedImageExtensions`/`AllowedImageContentTypes`
> در `appsettings.json` اضافه شد؛ اندپوینت جدا ساخته نشد. بخش ۲.۵ دست نخورد
> (سرور چیزی از باکت پاک نمی‌کند). migration: `add-proforma-and-document-attachments`.
> **مرجوعی خرید/فروش (`CreatePurchaseReturnCommand`/`CreateSaleReturnCommand`)
> هنوز وصل نیست** — خارج از محدوده‌ی این دور کار بود؛ چون جدول و enum عمومی
> ساخته شده، وصل‌کردنشان همان الگوی بالا را در یک خط تکرار می‌کند.

## ۱. مسئله در یک جمله

آپلود کار می‌کند؛ **جایی برای نگه‌داشتنِ کلید روی سند وجود ندارد.**

`POST api/File/UploadImage` فایل را در باکت می‌گذارد و `objectKey`
برمی‌گرداند — این بخش کامل است و فرانت از همان استفاده می‌کند (با پوشه‌ی
`RECEIVING`؛ پوشه فقط پیشوندِ مرتب‌سازی است و طبق کامنتِ خودِ
`ImageFolderEnum` مرزِ امنیتی نیست، پس عضو تازه‌ای لازم نشد).

ولی چهار سندِ زیر هیچ فیلدی برای ضمیمه ندارند:

| سند | دستور | ضمیمه‌ی مورد انتظار |
|---|---|---|
| خرید | `CreatePurchaseCommand` / `UpdatePurchaseCommand` | فاکتور دریافتی از تامین‌کننده |
| فروش | `CreateSaleCommand` / `UpdateSaleCommand` | فاکتور صادرشده برای مشتری |
| مرجوعی خرید | `CreatePurchaseReturnCommand` | فاکتور یا رسید مرجوعی از تامین‌کننده |
| مرجوعی فروش | `CreateSaleReturnCommand` | فاکتور یا رسید مرجوعی برای مشتری |

تنها ضمیمه‌ی سطح-سندِ کلِ سیستم `PurchaseReceivingImage` است (تصاویر رسید
خرید) که به `Purchase` وصل می‌شود و فقط از مسیر `ReceivePurchase` پر
می‌شود — یعنی نه برای فروش کار می‌کند، نه برای مرجوعی‌ها، و معنایش هم
«عکسِ نوبتِ دریافت» است نه «فاکتور».

**چرا موقتاً نمی‌شود فرستاد:** `System.Text.Json` فیلدِ ناشناخته را بی‌صدا
دور می‌ریزد. درخواست ۲۰۰ می‌گیرد، کاربر پیام موفقیت می‌بیند، و هیچ
ضمیمه‌ای ذخیره نشده. به همین دلیل این قابلیت در فرانت **عمداً خاموش** است
(`INVOICE_ATTACHMENTS_ENABLED` در بالای
`Frontend/src/shared/components/invoice/InvoiceDocumentSection.jsx`).

## ۲. کارهای لازم

### ۲.۱ موجودیت ضمیمه

الگوی آماده در همین پروژه `Domain/Entities/PurchaseReceivingImage.cs`
است. دو گزینه:

**الف) یک جدولِ مشترک (پیشنهاد ما):**

```csharp
public class DocumentAttachment
{
    public int Id { get; set; }

    /// <summary>enum جدید: PURCHASE=1, SALE=2, PURCHASE_RETURN=3, SALE_RETURN=4</summary>
    public DocumentKindEnum DocumentKind { get; set; }

    /// <summary>شناسه‌ی همان سند. ایندکس ترکیبی روی (DocumentKind, DocumentId).</summary>
    public int DocumentId { get; set; }

    /// <summary>کلید شیء در باکت — هرگز URL، چون URL منقضی می‌شود.</summary>
    public string ObjectKey { get; set; } = string.Empty;

    public string? FileName { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

مزیت: یک جدول، یک سرویس، یک مسیر تست. عیب: FK واقعی و `Cascade` ندارد،
پس حذفِ سند باید ضمیمه‌ها را دستی پاک کند (در همان `DeleteXCommandHandler`).

**ب) چهار جدولِ جدا** دقیقاً مثل `PurchaseReceivingImage` با FK و
`OnDelete(DeleteBehavior.Cascade)`. مزیت: یکپارچگیِ ارجاعی سرِ جایش. عیب:
چهار برابر کد و migration.

هر کدام را انتخاب کنید، **شکلِ JSON باید همان بند ۳ بماند** تا فرانت دست
نخورد.

### ۲.۲ فیلد در دستورها

روی `CreatePurchaseCommand`، `UpdatePurchaseCommand`، `CreateSaleCommand`،
`UpdateSaleCommand`، `CreatePurchaseReturnCommand` و
`CreateSaleReturnCommand`:

```csharp
public List<DocumentAttachmentDto> Attachments { get; set; } = new();
```

با همان اعتبارسنجیِ `ReceivePurchaseCommandValidator` برای `Images`
(`ObjectKey` خالی نباشد) و همان `NormalizeKey` هنگام ذخیره — تا اگر فرانت
اشتباهاً URL امضاشده فرستاد، کلیدِ خام ذخیره شود.

**رفتار `Update`:** «آرایه‌ی کامل جایگزین می‌شود»، نه «به قبلی اضافه
می‌شود». فرانت همیشه لیستِ نهایی را می‌فرستد؛ ضمیمه‌ای که در لیست نیست
باید از جدول حذف شود (فایلِ باکت را خودِ فرانت پاک می‌کند — بند ۲.۵).

### ۲.۳ فیلد در خروجی‌های خواندن

روی `PurchaseDto`، `SaleDto`، `PurchaseReturnDetailDto` و
`SaleReturnDetailDto` (فقط جزئیات؛ در لیست‌ها لازم نیست):

```csharp
public List<DocumentAttachmentDto> Attachments { get; set; } = new();
```

هر عضو **دقیقاً** مثل `PurchaseReceivingImageDto`: `objectKey` (پایدار) و
`url` (امضاشده‌ی موقت) کنار هم. فرانت `url` را ذخیره نمی‌کند و اگر منقضی
شد خودش با `GetImageUrl` تازه‌اش می‌کند.

### ۲.۴ پشتیبانی از PDF

فاکتورِ اسکن‌شده اغلب PDF است، ولی `appsettings.json` فقط
`.jpg .jpeg .png .webp .gif` را می‌پذیرد و `UploadImageCommandHandler`
بقیه را با ۴۰۰ رد می‌کند. دو راه:

1. **ساده:** `.pdf` و `application/pdf` به `AllowedImageExtensions` و
   `AllowedImageContentTypes` اضافه شود.
2. **تمیزتر:** یک `POST api/File/UploadDocument` جدا با محدودیت‌های خودش
   و احتمالاً سقفِ حجمِ بزرگ‌تر از ۵ مگابایت.

تا وقتی هیچ‌کدام انجام نشده، فرانت فقط تصویر می‌پذیرد. **لطفاً بگویید
کدام را انتخاب کردید** تا `IMAGE_ACCEPT` سمت ما به‌روز شود.

### ۲.۵ پاک‌سازی و فایل یتیم

همان قاعده‌ی فعلی حفظ شود: **سرور خودکار چیزی از باکت پاک نکند.** فرانت
از قبل بعد از ذخیره‌ی موفق، کلیدهای بی‌صاحب را با
`DELETE api/File/DeleteImage` پاک می‌کند؛ اگر سرور هم این کار را بکند، دو
طرف هم‌زمان یک شیء را پاک می‌کنند.

استثنا: اگر خودِ **سند** حذف شد، سرور بهتر است ضمیمه‌ها را از باکت هم پاک
کند — چون فرانت در آن لحظه کلیدها را در دست ندارد.

### ۲.۶ migration و سند

- migration برای جدول/فیلدهای جدید.
- بخش ۱۷ `docs/api-guide.fa.md`: شکلِ `attachments` در نوشتن و خواندن، و
  رفتارِ جایگزینی در `Update`.

## ۳. قرارداد JSON که فرانت روی آن نوشته شده

**نوشتن** (داخل بدنه‌ی `CreateX`/`UpdateX`):

```json
{
  "invoiceNumber": "INV-2026-003",
  "attachments": [
    { "objectKey": "receiving/2026/08/3f1c8a....jpg", "fileName": "invoice.jpg", "note": "برگه‌ی اول" }
  ]
}
```

`fileName` و `note` اختیاری‌اند؛ `objectKey` الزامی است.

**خواندن** (در جزئیات سند):

```json
{
  "attachments": [
    {
      "id": 12,
      "objectKey": "receiving/2026/08/3f1c8a....jpg",
      "url": "https://<bucket>.storage.iran.liara.space/receiving/...?X-Amz-Signature=...",
      "fileName": "invoice.jpg",
      "note": "برگه‌ی اول",
      "createdAt": "2026-08-30T10:12:00Z"
    }
  ]
}
```

اگر نام فیلد را چیز دیگری گذاشتید (مثلاً `documents`)، فقط خبر بدهید — یک
خط در فرانت است.

## ۴. وقتی این‌ها انجام شد، در فرانت چه عوض می‌شود

۱. `INVOICE_ATTACHMENTS_ENABLED` در `InvoiceDocumentSection.jsx` می‌شود
   `true`.
۲. چهار صفحه‌ی جزئیات، `useImageUploadList` را خودشان می‌گیرند و به
   `InvoiceDocumentSection` پاس می‌دهند (prop به نام `attachments` از قبل
   وجود دارد)، `list.imagesPayload` را در بدنه‌ی دستور می‌گذارند و در
   `onSuccess` هم `list.commit()` را صدا می‌زنند.
۳. `initialItems` از `attachments`ِ خروجیِ خواندن پر می‌شود.

بقیه‌ی زنجیره — آپلود، پیش‌نمایش، نوار پیشرفت، تلاش دوباره، پاک‌سازیِ فایل
یتیم، تمدیدِ امضا — از قبل نوشته و آزمایش شده است.
