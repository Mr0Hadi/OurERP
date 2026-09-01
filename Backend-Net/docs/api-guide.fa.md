# راهنمای کامل API بک‌اند WMS برای توسعه‌دهنده فرانت‌اند

این سند تمام endpoint های موجود در بک‌اند را با ورودی، خروجی، کاربرد و در صورت نیاز، ترتیب فراخوانی آن‌ها توضیح می‌دهد. جزئیات پیاده‌سازی و منطق داخلی سرور در این سند نیامده و فقط چیزی که برای اتصال فرانت به بک لازم است آورده شده.

> این سند دستی نوشته شده و مطابق کد فعلی پروژه در تاریخ تهیه سند است. اگر endpoint یا فیلدی در کد تغییر کرد، این فایل هم باید به‌روزرسانی شود.

---

## فهرست مطالب

1. [نکات عمومی و مشترک همه API ها](#1-نکات-عمومی-و-مشترک-همه-api-ها)
2. [حساب کاربری و ورود (Account)](#2-حساب-کاربری-و-ورود-account)
3. [کاربران (User)](#3-کاربران-user)
4. [مشتریان (Customer)](#4-مشتریان-customer)
5. [تامین‌کنندگان (Supplier)](#5-تامین‌کنندگان-supplier)
6. [دسته‌بندی محصولات (ProductCategory)](#6-دسته‌بندی-محصولات-productcategory)
7. [محصولات و بارکد دانه‌ها (Product)](#7-محصولات-و-بارکد-دانه‌ها-product)
8. [بارکد و برچسب (Barcode)](#8-بارکد-و-برچسب-barcode)
9. [خرید (Purchase)](#9-خرید-purchase)
10. [مرجوعی خرید (PurchaseReturn)](#10-مرجوعی-خرید-purchasereturn)
11. [فروش (Sale)](#11-فروش-sale)
12. [مرجوعی فروش (SaleReturn)](#12-مرجوعی-فروش-salereturn)
13. [فاکتور PDF (Invoice)](#13-فاکتور-pdf-invoice)
14. [سناریوهای کامل گردش‌کار](#14-سناریوهای-کامل-گردش‌کار)
15. [پیوست: مقادیر عددی Enum ها](#15-پیوست-مقادیر-عددی-enum-ها)
16. [نکات و محدودیت‌های شناخته‌شده](#16-نکات-و-محدودیت‌های-شناخته‌شده)
17. [بارگذاری تصاویر (File)](#17-بارگذاری-تصاویر-file)
18. [گزارش‌ها و سود خالص (Report)](#18-گزارش‌ها-و-سود-خالص-report)

---

## 1. نکات عمومی و مشترک همه API ها

### آدرس پایه و مسیرها

هر کنترلر روی مسیر `api/{نام‌کنترلر}` قرار دارد، مثلاً `api/Product/GetProductList`. متدهای HTTP به شکل زیر استفاده شده‌اند:

- `GET` برای لیست‌ها و جزئیات (پارامترها به‌صورت Query String ارسال می‌شوند، نه Body)
- `POST` برای ایجاد و عملیات‌های خاص (Body به‌صورت JSON)
- `PUT` برای ویرایش (Body به‌صورت JSON)
- `DELETE` برای حذف نرم (پارامترها Query String هستند، نه Body)

مستندات تعاملی Swagger/Scalar این پروژه در مسیر `/scalar` در دسترس است (در محیط توسعه).

### احراز هویت (Authentication)

تمام کنترلرها به‌جز `AccountController` دارای `[Authorize]` هستند، یعنی باید هدر زیر در تمام درخواست‌ها ارسال شود:

```
Authorization: Bearer {accessToken}
```

`accessToken` از API لاگین (`POST api/Account/Login`) به‌دست می‌آید. توکن‌ها JWT هستند و منقضی می‌شوند؛ برای گرفتن توکن جدید باید از `POST api/Account/RefreshToken` استفاده شود (بخش ۲).

### قالب پاسخ موفق (Response Envelope)

تمام API هایی که خروجی JSON برمی‌گردانند (همه به‌جز PDF/SVG ها) این ساختار ثابت را دارند:

```json
{
  "data": { /* شیء یا آرایه‌ی خاص هر API، ممکن است null باشد */ },
  "message": "متن پیام فارسی برای نمایش به کاربر",
  "responseMessageType": "Success" // یا "Warning" یا "Danger"
}
```

- `data`: محتوای اصلی پاسخ (به ازای هر API در ادامه توضیح داده شده).
- `message`: پیام فارسی که می‌توان مستقیماً به کاربر (مثلاً در Toast) نشان داد.
- `responseMessageType`: یکی از `Success` / `Warning` / `Danger` (رشته‌ی متنی، نه عدد).

### قالب پاسخ خطا (Error)

وقتی درخواست خطا بدهد (اعتبارسنجی، یافت‌نشدن، خطای داخلی و ...)، کد وضعیت HTTP متناسب برگردانده می‌شود (۴۰۰، ۴۰۴، ۴۰۱، ۴۰۳، ۵۰۰ و ...) و بدنه پاسخ همان ساختار `ResponseDto` است اما `responseMessageType = "Danger"` و `data` معمولاً `null` (مگر در چند مورد خاص که داده‌ی اضافه برای خطا برگردانده می‌شود، مثل زمان باقی‌مانده‌ی OTP):

```json
{
  "data": null,
  "message": "خرید مورد نظر یافت نشد.",
  "responseMessageType": "Danger"
}
```

خطای اعتبارسنجی ورودی مدل (مثلاً وقتی JSON ارسالی با شکل کلاس مطابقت ندارد) هم همین ساختار را با کد ۴۰۰ و پیام ثابت `"فرمت داده ورودی صحیح نمی باشد."` برمی‌گرداند.

قوانین کلی مهم برای مدیریت خطا در فرانت:
- کد وضعیت را برای تشخیص نوع خطا (۴۰۴ یعنی یافت نشد، ۴۰۰ یعنی اعتبارسنجی) و `message` را برای نمایش متن به کاربر استفاده کنید.
- به `responseMessageType` تکیه نکنید برای تشخیص خطا؛ کد HTTP معیار اصلی است.

### صفحه‌بندی (Pagination)

تمام API های لیست، پارامترهای ورودی `Page` (پیش‌فرض ۱) و `Take` (اندازه صفحه، پیش‌فرض معمولاً ۱۰ یا ۲۰) را می‌گیرند و در `data` این ساختار مشترک را دارند:

```json
{
  "data": {
    "xxxList": [ /* آیتم‌های همان صفحه */ ],
    "page": {
      "page": 1,
      "pageCount": 5,
      "take": 10,
      "total": 47
    }
  }
}
```

نام کلید آرایه لیست به ازای هر API فرق دارد (مثلاً `productList`، `customerList` و ...) که در بخش مربوطه ذکر شده. توجه: نام کلیدها هنگام سریالایز شدن JSON با حروف کوچک شروع می‌شوند (camelCase)، حتی اگر در کد C# با حرف بزرگ نوشته شده باشند.

### Enum ها به‌صورت عدد سریالایز می‌شوند

**نکته‌ی مهم:** این پروژه از سریالایزر پیش‌فرض ASP.NET Core (`System.Text.Json`) بدون تنظیم خاص برای enum استفاده می‌کند. یعنی:

- در پاسخ‌های JSON، مقدار enum به شکل **عدد صحیح** برمی‌گردد (نه رشته‌ی نام enum).
- در درخواست‌هایی که enum می‌فرستید (مثلاً `Status` یا `PaymentType`)، باید **همان عدد صحیح متناظر** را ارسال کنید؛ ارسال رشته (`"CASH"`) باعث خطای اعتبارسنجی مدل می‌شود.

جدول کامل تمام enum ها و مقادیر عددی‌شان در [بخش ۱۵](#15-پیوست-مقادیر-عددی-enum-ها) آمده. حتماً قبل از پیاده‌سازی فرم‌ها به آن مراجعه کنید.

### فرمت تاریخ

فیلدهای تاریخ (`DateTime`) به‌صورت رشته‌ی ISO 8601 استاندارد .NET سریالایز می‌شوند (مثل `"2026-08-14T10:30:00"`). هنگام ارسال تاریخ در Body کافی است رشته‌ی ISO معتبر بفرستید.

### اعداد پول (Money)

فیلدهای مالی (`UnitPrice`، `TotalAmount`، `PaidAmount`، `RefundAmount` و ...) از نوع `UInt64` (عدد صحیح بدون علامت، ریال به‌صورت عدد کامل بدون اعشار) هستند. اعشار یا رشته نفرستید.

---

## 2. حساب کاربری و ورود (Account)

کنترلر: `api/Account` — **بدون نیاز به Authorize** (نقطه‌ی شروع احراز هویت است).

### `POST api/Account/Login`

ورود کاربر و گرفتن توکن.

**Body:**
```json
{ "username": "ali.rezaei", "password": "Passw0rd!" }
```

**کاربرد:** اولین قدمِ استفاده از هر بخش دیگر اپ. باید همیشه قبل از هر API دیگری (به‌جز Account) صدا زده شود.

**data خروجی:**
```json
{ "accessToken": "eyJ...", "refreshToken": "a1b2c3..." }
```

نکات:
- `accessToken` را در هدر `Authorization: Bearer` برای همه‌ی درخواست‌های بعدی بگذارید.
- `refreshToken` را برای تمدید توکن نگه دارید (بخش بعد).
- این API اطلاعات کامل کاربر (نام، نقش و ...) را برنمی‌گرداند؛ برای آن باید بعد از لاگین، `GET api/User/GetUserInfo` را صدا بزنید.
- خطاهای رایج: نام‌کاربری یا رمز اشتباه → ۴۰۴ "کاربر با این اطلاعات یافت نشد"، کاربر غیرفعال → ۴۰۰.

### `POST api/Account/RefreshToken`

تمدید accessToken منقضی‌شده بدون نیاز به لاگین دوباره.

**Body:**
```json
{ "accessToken": "همان توکن منقضی‌شده قبلی", "refreshToken": "همان رفرش‌توکن قبلی" }
```

**کاربرد:** وقتی یک درخواست با ۴۰۱ برگشت (توکن منقضی)، فرانت باید این API را صدا بزند و اگر موفق بود، توکن‌های جدید را ذخیره و درخواست اصلی را دوباره با توکن جدید تکرار کند (الگوی رایج Interceptor در axios/fetch).

**data خروجی:** همان ساختار `Login` (`accessToken` + `refreshToken` جدید).

نکته: این API فقط زمانی موفق است که accessToken قبلی واقعاً **منقضی شده** باشد (سرور صراحتاً چک می‌کند `IsExpired == true`، وگرنه خطا می‌دهد)، و refreshToken هم نباید منقضی شده باشد.

### `POST api/Account/Logout`

خروج کاربر جاری (بر اساس توکنی که در هدر Authorization فرستاده شده). بدنه ندارد (Body خالی `{}`).

**کاربرد:** دکمه‌ی خروج از حساب. بعد از این فراخوانی، توکن‌های ذخیره‌شده در فرانت باید حذف شوند و کاربر به صفحه‌ی لاگین هدایت شود.

### `POST api/Account/LogoutUserById`

خروج اجباری یک کاربر دیگر توسط ادمین.

**Body:** `{ "userId": 5 }`

**کاربرد:** مثلاً صفحه‌ی مدیریت کاربران که ادمین می‌خواهد یک کاربر مشخص را از تمام سشن‌هایش خارج کند.

### `POST api/Account/ForgetPassword`

بازیابی/تغییر رمز عبور بدون لاگین (بر اساس نام کاربری).

**Body:**
```json
{ "username": "ali.rezaei", "password": "Passw0rd!New", "rePassword": "Passw0rd!New" }
```

قوانین رمز عبور: حداقل ۸ کاراکتر، شامل حداقل یک حرف انگلیسی، یک عدد و یک کاراکتر خاص.

**کاربرد:** فرم "رمز عبور را فراموش کرده‌اید". توجه: **در حال حاضر مرحله‌ی تایید با کد OTP در کد غیرفعال (کامنت) است** — یعنی این API فقط با نام‌کاربری، رمز را عوض می‌کند و کد تایید نمی‌خواهد. اگر این رفتار در آینده عوض شد، این سند باید به‌روزرسانی شود. (API ارسال OTP هم در کد کامنت شده و در کنترلر expose نشده — فعلاً استفاده نکنید.)

---

## 3. کاربران (User)

کنترلر: `api/User` — نیاز به Authorize.

### `GET api/User/GetUserInfo`

اطلاعات کاربر **جاری** (همانی که با توکن لاگین کرده). بدون پارامتر ورودی (اطلاعات از توکن استخراج می‌شود).

**کاربرد:** بعد از لاگین یا رفرش صفحه، برای گرفتن نام/نقش/دسترسی‌های کاربر جاری و نمایش در هدر اپ یا برای کنترل دسترسی UI.

**data خروجی:**
```json
{
  "id": 1,
  "username": "ali.rezaei",
  "firstName": "علی",
  "lastName": "رضایی",
  "roleId": 1,
  "roleName": "Admin",
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00",
  "permissions": null
}
```
(فیلد `permissions` فعلاً همیشه خالی/null است — سیستم دسترسی‌های ریز هنوز پیاده‌سازی نشده.)

### `GET api/User/GetUserUpdate?id=5`

اطلاعات یک کاربر مشخص، مخصوص **پیش از ویرایش** (نه برای نمایش عمومی).

**کاربرد:** طبق الگوی استاندارد این پروژه برای ویرایش: قبل از باز کردن فرم ویرایش کاربر، این API صدا زده می‌شود تا مقادیر فعلی در فرم پر شوند.

**data خروجی:**
```json
{
  "id": 5,
  "username": "sara.m",
  "firstName": "سارا",
  "lastName": "محمدی",
  "roleId": 2,
  "roleName": "User",
  "isActive": true,
  "permissions": null
}
```

### `POST api/User/CreateUser`

ایجاد کاربر جدید.

**Body:**
```json
{
  "fisrtName": "سارا",
  "lastName": "محمدی",
  "username": "sara.m",
  "password": "Passw0rd!",
  "personelCode": "1234",
  "roleId": 2
}
```
(دقت کنید نام فیلد اشتباه تایپی `fisrtName` است — همین‌طور در کد فعلی وجود دارد.)

قوانین: `firstName`/`lastName` فقط فارسی، `username` فقط انگلیسی، `password` مطابق قانون رمز عبور بخش ۲.

**نکته‌ی مهم برای فرانت:** `roleId` باید شناسه‌ی یک نقش موجود باشد (وگرنه ۴۰۴)، اما **در حال حاضر هیچ API ای برای گرفتن لیست نقش‌ها (Role) وجود ندارد**. تا اضافه شدن آن، مقادیر معتبر `roleId` باید به‌صورت دستی با تیم بک‌اند هماهنگ شود (طبق enum زیرساختی فعلی: `1 = Admin`, `2 = User`، اما این فقط enum پیشنهادی است و نقش‌ها در دیتابیس جدول جدا دارند).

### `PUT api/User/UpdateUser`

ویرایش کاربر موجود.

**Body:**
```json
{
  "id": 5,
  "firstName": "سارا",
  "lastName": "محمدی",
  "username": "sara.m",
  "roleId": 2,
  "isActive": true
}
```

**گردش‌کار پیشنهادی:** `GetUserUpdate` → پر کردن فرم → `UpdateUser` با تمام فیلدها (حتی فیلدهایی که تغییر نکرده‌اند، چون کل رکورد بازنویسی می‌شود). توجه: رمز عبور در این API قابل تغییر نیست (برای آن `ChangePassword` هست).

### `PUT api/User/ChangePassword`

تغییر رمز عبور کاربر **جاری** (بر اساس توکن).

**Body:**
```json
{ "oldPassword": "Old1234!", "password": "New1234!", "rePassword": "New1234!" }
```

**کاربرد:** فرم "تغییر رمز عبور" در پروفایل کاربر (نه توسط ادمین برای کاربر دیگر).

### `DELETE api/User/DeleteUser?id=5`

حذف نرم کاربر (غیرفعال کردن، `isActive = false`). پارامتر در Query String.

---

## 4. مشتریان (Customer)

کنترلر: `api/Customer` — نیاز به Authorize. CRUD استاندارد.

### `GET api/Customer/GetCustomerList`

**پارامترهای Query:** `page`, `take`, `id` (فیلتر روی شناسه‌ی دقیق), `fullName` (جستجو در نام یا نام‌خانوادگی), `minBalance`, `maxBalance`.

**کاربرد:** لیست مشتریان با فیلتر و صفحه‌بندی، برای صفحه‌ی لیست مشتریان و برای انتخاب مشتری هنگام ثبت فروش.

**data.customerList[]:**
```json
{ "id": 1, "fullName": "علی رضایی", "balanceType": 0, "balance": 500000 }
```
`balanceType` یک enum است (بخش ۱۵).

### `GET api/Customer/GetCustomerDetail?id=1`

جزئیات کامل یک مشتری.

**کاربرد:** هم برای نمایش صفحه‌ی جزئیات، هم به‌عنوان قدم قبل از ویرایش (چون همه‌ی فیلدهای قابل‌ویرایش را برمی‌گرداند).

**data:**
```json
{
  "id": 1,
  "firstName": "علی",
  "lastName": "رضایی",
  "phoneNumber": "09123456789",
  "address": "تهران، ...",
  "postalCode": "1234567890",
  "refferalCode": null,
  "creditLimit": 0,
  "description": null,
  "balance": 500000,
  "balanceType": 0,
  "imageUrl": null,
  "longitude": null,
  "latitude": null
}
```
(دقت کنید نام فیلد `refferalCode` است، همان تایپوی موجود در کد.)

### `POST api/Customer/CreateCustomer`

**Body:**
```json
{
  "firstName": "علی",
  "lastName": "رضایی",
  "phoneNumber": "09123456789",
  "address": "تهران، ...",
  "postalCode": "1234567890",
  "refferalCode": null,
  "creditLimit": 0,
  "description": null,
  "balance": 0,
  "balanceType": 0,
  "imageUrl": null,
  "longitude": null,
  "latitude": null
}
```
قوانین: نام/نام‌خانوادگی فقط فارسی، شماره تماس با فرمت موبایل ایران (`09xxxxxxxxx`)، آدرس و کدپستی الزامی.

### `PUT api/Customer/UpdateCustomer`

**Body:** دقیقاً همان فیلدهای `CreateCustomer` به‌همراه `id`. طبق قانون کلی این پروژه، باید **همه‌ی فیلدها** (حتی بدون تغییر) دوباره فرستاده شوند، چون سرور کل رکورد را با مقادیر ارسالی بازنویسی می‌کند. به همین دلیل ترتیب صحیح استفاده این است:

1. `GetCustomerDetail` برای گرفتن مقادیر فعلی
2. پر کردن فرم ویرایش با آن مقادیر
3. کاربر مقدار دلخواه را تغییر می‌دهد
4. ارسال کل شیء (فیلدهای تغییرنکرده + فیلد(های) تغییریافته) به `UpdateCustomer`

### `DELETE api/Customer/DeleteCustomer?id=1`

حذف نرم مشتری.

---

## 5. تامین‌کنندگان (Supplier)

کنترلر: `api/Supplier` — کاملاً مشابه Customer، با فیلدهای شرکتی.

### `GET api/Supplier/GetSupplierList`

**Query:** `page`, `take`, `fromBalance`, `toBalance`, `companyNameOrContactName`.

**data.supplierList[]:**
```json
{ "id": 1, "companyName": "شرکت آلفا", "fullName": "حسین کریمی", "balanceType": 0, "status": "Creditor" }
```
توجه: در این DTO خاص، `status` یک رشته (نام enum به‌صورت متن `ToString()`) است، نه عدد — برخلاف قاعده‌ی کلی enum-به-عدد در بقیه‌ی سیستم. این یک استثنا است، به آن دقت کنید.

### `GET api/Supplier/GetSupplierDetail?id=1`

**data:**
```json
{
  "id": 1,
  "firstName": "حسین",
  "lastName": "کریمی",
  "companyName": "شرکت آلفا",
  "phone": "09123456789",
  "address": "...",
  "postalCode": "...",
  "imageUrl": null,
  "description": null,
  "balance": 0,
  "balanceType": 0,
  "longitude": null,
  "latitude": null
}
```

### `POST api/Supplier/CreateSupplier`

**Body:**
```json
{
  "firstName": "حسین",
  "lastName": "کریمی",
  "companyName": "شرکت آلفا",
  "phone": "09123456789",
  "address": "...",
  "postalCode": "...",
  "imageUrl": null,
  "description": null,
  "balance": 0,
  "balanceType": 0,
  "longitude": null,
  "latitude": null
}
```
(دقت: در Command فیلدهای مکان با حروف کوچک `longitude`/`latitude` تعریف شده‌اند نه Pascal — هرچند JSON در نهایت camelCase است پس تفاوتی در ارسال حس نمی‌شود.)

### `PUT api/Supplier/UpdateSupplier`

مثل Customer: اول `GetSupplierDetail`، بعد ارسال کامل فیلدها + `id` به این API.

### `DELETE api/Supplier/DeleteSupplier?id=1`

---

## 6. دسته‌بندی محصولات (ProductCategory)

کنترلر: `api/ProductCategory`. ساده‌ترین CRUD موجود.

### `GET api/ProductCategory/GetProductCategoryList`

**Query:** `page`, `take`, `name` (جستجو).

**data.productCategoryList[]:**
```json
{ "id": 1, "name": "لوازم برقی", "productCount": 42 }
```
`productCount` تعداد محصولات متعلق به این دسته است — مفید برای هشدار قبل از حذف دسته.

### `GET api/ProductCategory/GetProductCategoryDetail?id=1`

**data:** `{ "id": 1, "name": "لوازم برقی" }`

### `POST api/ProductCategory/CreateProductCategory`

**Body:** `{ "name": "لوازم برقی" }`

### `PUT api/ProductCategory/UpdateProductCategory`

**Body:** `{ "id": 1, "name": "لوازم برقی و الکترونیکی" }`

### `DELETE api/ProductCategory/DeleteProductCategory?id=1`

---

## 7. محصولات و بارکد دانه‌ها (Product)

کنترلر: `api/Product`. این پیچیده‌ترین بخش CRUD است چون هر واحد فیزیکی از یک محصول («دانه» / `ProductUnit`) بارکد و سریال جداگانه دارد.

### مفهوم کلی که فرانت باید بداند

- هر `Product` یک `Code` و `BarCode` منحصربه‌فرد دارد که **به‌صورت خودکار توسط سرور ساخته می‌شود** و **قابل ارسال یا ویرایش از فرانت نیست**.
- هر واحد فیزیکی از یک محصول (هر عدد کالای فیزیکی روی قفسه) یک `ProductUnit` جدا با سریال و بارکد خودش دارد (مثلاً برای چاپ روی برچسب و اسکن تک‌به‌تک). این‌ها در `GetProductUnitList` دیده می‌شوند.
- `Product.Stock` باید همیشه برابر با تعداد دانه‌های با وضعیت `IN_STOCK` باشد؛ این هماهنگی به‌صورت خودکار توسط سرور مدیریت می‌شود (فرانت کاری برایش نمی‌کند، فقط `Stock` را در فرم محصول عدد کلی موجودی در نظر بگیرد).

### `GET api/Product/GetProductList`

**Query:** `page`, `take`, `name`, `code`, `brand`, `productCategoryId`, `isLowOnStock` (true/false — فیلتر محصولات با موجودی زیر آستانه), `fromPrice`, `toPrice`.

**data.productList[]:**
```json
{
  "id": 10,
  "code": "20260814-000010",
  "name": "یخچال دو درب",
  "brand": "Samsung",
  "categoryName": "لوازم خانگی",
  "retailPrice": 25000000,
  "wholeSalePrice": 22000000,
  "stock": 12
}
```

### `GET api/Product/GetProductDetail?id=10`

**کاربرد:** نمایش جزئیات محصول **و همچنین قدم اول قبل از ویرایش** (چون تمام فیلدهای قابل‌ویرایش را برمی‌گرداند).

**data:**
```json
{
  "id": 10,
  "name": "یخچال دو درب",
  "code": "20260814-000010",
  "barCode": "20260814000010",
  "brand": "Samsung",
  "unit": 1,
  "purchasePrice": 20000000,
  "retailPrice": 25000000,
  "wholeSalePrice": 22000000,
  "tax": 9,
  "stock": 12,
  "lowStockThreshold": 3,
  "imageUrl": null,
  "productCategoryId": 3
}
```
`unit` یک enum است (واحد شمارش: عدد، بسته، کیلوگرم و ...، بخش ۱۵).

### `POST api/Product/CreateProduct`

**Body:**
```json
{
  "name": "یخچال دو درب",
  "brand": "Samsung",
  "unit": 1,
  "purchasePrice": 20000000,
  "retailPrice": 25000000,
  "wholeSalePrice": 22000000,
  "tax": 9,
  "stock": 0,
  "lowStockThreshold": 3,
  "imageUrl": null,
  "productCategoryId": 3
}
```
**دقت کنید:** `code`/`barCode` در Body جایی ندارند — نفرستید، در پاسخ به‌صورت خودکار تولید می‌شوند.

**data خروجی:**
```json
{ "id": 10, "code": "20260814-000010", "barCode": "20260814000010" }
```
اگر `stock` بزرگ‌تر از صفر فرستاده شود، همان تعداد دانه (`ProductUnit`) به‌صورت خودکار برای محصول ساخته می‌شود.

### `PUT api/Product/UpdateProduct`

**Body:**
```json
{
  "id": 10,
  "name": "یخچال دو درب",
  "brand": "Samsung",
  "unit": 1,
  "purchasePrice": 20000000,
  "retailPrice": 25000000,
  "wholeSalePrice": 22000000,
  "tax": 9,
  "stock": 15,
  "lowStockThreshold": 3,
  "imageUrl": null,
  "productCategoryId": 3
}
```
باز هم `code`/`barCode` قابل تغییر نیستند (بعد از ساخت محصول ثابت می‌مانند، چون روی برچسب چاپ می‌شوند). طبق همان الگوی ویرایش پروژه: `GetProductDetail` → پر کردن فرم → `UpdateProduct` با کل فیلدها.

نکته: اگر مقدار `stock` ارسالی با مقدار فعلی فرق داشته باشد، سرور به‌صورت خودکار دانه‌های محصول (`ProductUnit`) را افزایش/کاهش می‌دهد تا هماهنگ بماند. کاربر فقط عدد نهایی موجودی را وارد می‌کند، نه دانه‌ها را دستی مدیریت می‌کند.

### `DELETE api/Product/DeleteProduct?id=10`

### `GET api/Product/ScanBarcode?code=20260814000010`

**کاربرد:** endpoint اصلی برای اسکنر بارکد. کد اسکن‌شده (بارکد محصول یا بارکد یک دانه‌ی خاص، با یا بدون خط‌تیره‌های نمایشی) را می‌گیرد و اطلاعات کامل محصول را برمی‌گرداند؛ اگر بارکد مربوط به یک دانه‌ی خاص بود، اطلاعات آن دانه هم برمی‌گردد.

**data:**
```json
{
  "kind": 1,
  "normalizedPayload": "20260814000010",
  "categoryName": "لوازم خانگی",
  "product": { /* همان ساختار ProductDto در GetProductDetail */ },
  "unit": {
    "id": 500,
    "productId": 10,
    "serialNumber": 3,
    "barcode": "20260814000010-000003",
    "barcodePayload": "202608140000100000003",
    "status": 1,
    "purchaseItemId": 88,
    "saleItemId": null,
    "createdAt": "2026-08-10T09:00:00",
    "soldAt": null
  }
}
```
اگر بارکد اسکن‌شده مربوط به محصول (نه یک دانه‌ی خاص) باشد، `unit` مقدار `null` خواهد بود. `kind`: `1 = PRODUCT`, `2 = UNIT`, `3 = UNKNOWN` (اگر `UNKNOWN` بود، سرور خطای ۴۰۴ می‌دهد، پس در عمل `kind` در پاسخ موفق همیشه ۱ یا ۲ است).

### `GET api/Product/GetProductUnitList`

**Query:** `page`, `take`, `productId`, `status` (enum وضعیت دانه، بخش ۱۵), `fromSerial`, `toSerial`.

**کاربرد:** صفحه‌ی مدیریت انبار برای دیدن تک‌تک دانه‌های یک محصول (مثلاً قبل از چاپ برچسب یا برای پیگیری یک سریال خاص).

**data.productUnitList[]:** همان ساختار `unit` که در `ScanBarcode` دیدیم (بدون بخش product).

### `POST api/Product/EnsureProductCodes`

**کاربرد:** این یک API نگهداری/مهاجرت داده است، **نه برای استفاده‌ی روزمره در فرانت**. Body ندارد. فقط یک بار توسط تیم بک‌اند بعد از migration های خاص صدا زده می‌شود تا کدهای محصول قدیمی و شمارش دانه‌ها هماهنگ شوند. اگر نیازی به آن نبود، در فرانت لینکی برایش نگذارید.

### `POST api/Product/EnsureInventoryCostLedger`

**کاربرد:** مانند `EnsureProductCodes`، این هم یک API نگهداری/مهاجرت است و **نباید در فرانت لینکی برایش گذاشت**. Body ندارد. فقط یک بار، بعد از اعمال migration مربوط به «دفتر هزینه موجودی» (بخش ۱۸)، توسط تیم بک‌اند صدا زده می‌شود تا برای محصولاتی که از قبل موجودی داشتند (بدون سابقه‌ی خرید ثبت‌شده در دفتر)، یک رکورد «موجودی اولیه» با قیمت فعلی `purchasePrice` همان محصول ساخته شود. بدون این مرحله، گزارش سود خالص (بخش ۱۸) برای آن محصولات مقدار درستی نخواهد داشت.

**data خروجی:** `{ "productsBackfilled": 12 }`

---

## 8. بارکد و برچسب (Barcode)

کنترلر: `api/Barcode`. **این دو API برخلاف بقیه‌ی سیستم، خروجی JSON برنمی‌گردانند** — مستقیماً فایل (تصویر SVG یا PDF) پاسخ می‌دهند. یعنی باید آن‌ها را با `responseType: 'blob'` (یا معادل) صدا بزنید، نه با پارسر JSON معمول. خطاها (مثلاً بارکد نامعتبر) همچنان طبق همان ساختار JSON استاندارد خطا در بخش ۱ برمی‌گردند.

### `GET api/Barcode/GetBarcodeSvg`

**Query:** `code` (الزامی — یک `Product.BarCode` یا `ProductUnit.Barcode` که از قبل با `ScanBarcode`/`GetProductDetail`/`GetProductUnitList` گرفته شده)، `moduleWidthMm` (اختیاری)، `barHeightMm` (اختیاری)، `showHumanReadable` (اختیاری، پیش‌فرض true).

**خروجی:** فایل `image/svg+xml` (تصویر بارکد Code128 به‌صورت وکتور).

**کاربرد:** نمایش سریع یک بارکد روی صفحه (مثلاً پیش‌نمایش قبل از چاپ)، بدون نیاز به تولید PDF کامل.

### `GET api/Barcode/GetProductLabelsPdf`

**Query:**
- `productId` (الزامی)
- `status` (اختیاری، پیش‌فرض `IN_STOCK` — فقط دانه‌های این وضعیت چاپ می‌شوند)
- `fromSerial`, `toSerial` (اختیاری — محدود کردن به یک محدوده‌ی سریال، مثلاً فقط دانه‌های یک بار دریافت خاص)
- `mode` (چیدمان صفحه، پیش‌فرض `SHEET`)
- `columns` (پیش‌فرض ۳)، `rows` (پیش‌فرض ۱۰)
- `labelWidthMm` (پیش‌فرض ۴۸)، `labelHeightMm` (پیش‌فرض ۲۵)
- `showProductName` (پیش‌فرض true)
- `showPrice` (پیش‌فرض false)

**خروجی:** فایل `application/pdf` — یک صفحه‌ی کامل برچسب، یک برچسب به ازای هر دانه‌ی فیزیکی موجود (نه یک برچسب برای کل تعداد).

**کاربرد:** دکمه‌ی "چاپ برچسب" در صفحه‌ی محصول یا بعد از دریافت یک بار خرید (با محدود کردن `fromSerial`/`toSerial` به سریال‌های همان بار دریافت).

---

## 9. خرید (Purchase)

کنترلر: `api/Purchase`.

### `GET api/Purchase/GetPurchaseList`

**Query:** `page`, `take`, `invoiceNumber`, `supplierId`, `status` (enum، بخش ۱۵), `fromDate`, `toDate`.

**data.purchaseList[]:**
```json
{
  "id": 100,
  "invoiceNumber": "INV-1001",
  "supplierId": 1,
  "supplierName": "شرکت آلفا",
  "invoiceDate": "2026-08-01T00:00:00",
  "status": 1,
  "paymentType": 0,
  "totalAmount": 50000000,
  "paidAmount": 30000000
}
```

### `GET api/Purchase/GetPurchaseDetail?id=100`

**data:**
```json
{
  "id": 100,
  "invoiceNumber": "INV-1001",
  "invoiceDate": "2026-08-01T00:00:00",
  "status": 1,
  "paymentType": 0,
  "totalAmount": 50000000,
  "paidAmount": 30000000,
  "description": null,
  "supplierId": 1,
  "supplierName": "شرکت آلفا",
  "items": [
    {
      "id": 1000,
      "productId": 10,
      "quantity": 20,
      "unitPrice": 20000000,
      "discount": 0,
      "receivedQuantity": 5,
      "settledQuantity": 0,
      "purchaseId": 100
    }
  ],
  "paymentDetails": [ /* در صورت پرداخت غیرنقدی */ ],
  "drivers": [
    { "id": 1, "driverFullName": "علی محمدی", "driverNationalCode": "0012345678", "vehiclePlate": "12ط34567", "createdAt": "2026-08-05T10:00:00" }
  ],
  "receivingNotes": [
    { "id": 1, "note": "محموله اول", "createdAt": "2026-08-05T10:00:00" }
  ]
}
```
`drivers[]`/`receivingNotes[]`: تاریخچه‌ی راننده/وسیله‌نقلیه و یادداشت هر نوبت دریافت (از `ReceivePurchase`، زیر همین بخش) — هر بار که `ReceivePurchase` با این فیلدها صدا زده شود، یک ردیف تازه اضافه می‌شود، نه بازنویسی قبلی؛ هر دو اختیاری‌اند و اگر فرستاده نشوند ردیفی هم ساخته نمی‌شود.

`items[].receivedQuantity` و `items[].settledQuantity` تجمعی هستند (در طول چند بار دریافت افزایش پیدا می‌کنند) — برای دانستن دقیق «چه مقدار از این قلم باقی مانده تا دریافت شود»، به‌جای محاسبه‌ی دستی از این عدد، از `GetPurchaseReceivingInfo` (بخش ۱۰) استفاده کنید که این محاسبه را برای شما انجام داده.

### `POST api/Purchase/CreatePurchase`

**Body:**
```json
{
  "productItemList": [
    { "productId": 10, "quantity": 20, "unitPrice": 20000000, "discount": 0 }
  ],
  "supplierId": 1,
  "totalPrice": 400000000,
  "paidPrice": 100000000,
  "paymentType": 0,
  "status": 0,
  "paymentDetails": [],
  "invoiceNumber": "INV-1001",
  "invoiceDate": "2026-08-01T00:00:00",
  "description": null
}
```
اگر `paymentType` غیر از نقدی (`CASH = 0`) باشد، `paymentDetails` الزامی می‌شود.

**کاربرد:** ثبت سند خرید از تامین‌کننده (هنوز کالا وارد انبار نشده — ورود فیزیکی با `ReceivePurchase` انجام می‌شود، بخش زیر).

### `PUT api/Purchase/UpdatePurchase`

**Body:**
```json
{
  "id": 100,
  "invoiceNumber": "INV-1001",
  "invoiceDate": "2026-08-01T00:00:00",
  "status": 1,
  "paymentType": 0,
  "totalAmount": 400000000,
  "paidAmount": 150000000,
  "description": null,
  "supplierId": 1
}
```
**نکته‌ی مهم:** این API فقط فیلدهای سطح خرید را ویرایش می‌کند و **اقلام خرید (`items`) را نمی‌گیرد و تغییر نمی‌دهد**. برای ویرایش اقلام یا وضعیت دریافت باید از `ReceivePurchase` استفاده کرد. گردش‌کار: `GetPurchaseDetail` → پر کردن فرم با فیلدهای سطح بالا → `UpdatePurchase` با کل فیلدها + `id`.

### `DELETE api/Purchase/DeletePurchase?id=100`

حذف نرم خرید.

### `POST api/Purchase/ReceivePurchase`

ثبت **دریافت فیزیکی** کالای سالم از یک خرید در انبار — می‌توان چند بار (چند مرحله) برای یک خرید صدا زد (مثلاً وقتی محموله در چند نوبت می‌رسد). هر مقداری که اینجا ثبت شود به موجودی محصول اضافه می‌شود.

> **تغییر مهم نسبت به نسخه‌های قدیمی‌تر این سند:** این API دیگر آرایه‌ی `issues[]` ندارد و هیچ مرجوعی‌ای به‌صورت خودکار نمی‌سازد. گزارش مغایرت (کسری، آسیب‌دیده، کالای اشتباه و ...) کاملاً جدا و صراحتاً با `POST api/PurchaseReturn/CreatePurchaseReturn` انجام می‌شود (بخش ۱۰).

**Body:**
```json
{
  "purchaseId": 100,
  "receivedDate": "2026-08-05T10:00:00",
  "receivingNote": "محموله اول",
  "driverFullName": "علی محمدی",
  "driverNationalCode": "0012345678",
  "vehiclePlate": "12ط34567",
  "items": [
    { "purchaseItemId": 1000, "receivedQuantity": 15 }
  ],
  "images": []
}
```
- `purchaseItemId` باید از `items[].id` در `GetPurchaseDetail` یا `GetPurchaseReceivingInfo` گرفته شود.
- `driverFullName`/`driverNationalCode`/`vehiclePlate`/`receivingNote` همگی اختیاری‌اند و هرکدام مستقل از بقیه ذخیره می‌شوند (یعنی می‌توانید فقط یکی را بفرستید) — هر نوبت `ReceivePurchase` که این فیلدها را داشته باشد یک ردیف تاریخچه‌ی تازه می‌سازد (`drivers[]`/`receivingNotes[]` در `GetPurchaseDetail`، بالا)، نه بازنویسی نوبت قبلی.
- `receivedQuantity`: تعداد سالمی که وارد انبار می‌شود. اگر از باقیمانده‌ی قابل‌دریافت آن قلم (`orderedQuantity - receivedQuantity`، از `GetPurchaseReceivingInfo`) بیشتر باشد، خطای ۴۰۰ می‌دهد؛ **همیشه قبل از این فراخوانی از `GetPurchaseReceivingInfo` مقدار باقیمانده را بگیرید و در UI محدودیت بگذارید.**
- `images[]` (اختیاری): عکس‌های همان نوبت دریافت (پالت، کارتن آسیب‌دیده، بارنامه) — جزئیات کامل در بخش ۱۷.

**data خروجی:**
```json
{ "purchaseId": 100, "purchaseStatus": 2 }
```

---

## 10. مرجوعی خرید (PurchaseReturn)

کنترلر: `api/PurchaseReturn`. این بخش با نسخه‌های قدیمی‌تر این سند **کاملاً فرق دارد** — مدل داده از پایه با ساختار جدید **Claim → Resolution → Effect** بازسازی شده (۲۰۲۶/۰۸/۲۷-۲۸). قدیم: `ReceivePurchase` خودش مغایرت را حین دریافت می‌گرفت و «تصمیم» بسته‌ای از یک نوع ثابت بود. جدید:

```
PurchaseReturn (یک درخواست مرجوعی، صراحتاً و جدا از دریافت ساخته می‌شود)
  └─ PurchaseReturnClaim (یک ادعای مغایرت روی یک قلم خرید یا خارج از سند)
       └─ PurchaseReturnResolution (یک تصمیم روی بخشی از مقدار ادعا)
            └─ PurchaseReturnEffect (۱ تا ۳ اثر پایه‌ای که آن تصمیم را می‌سازند: GOODS_IN / GOODS_OUT / MONEY_IN / MONEY_OUT)
```

نکات کلیدی این مدل:
- **دیگر «نوع تصمیم» بسته (بازپرداخت/جایگزینی/اعتبار/ابطال) وجود ندارد.** هر تصمیم (`Resolution`) از **ترکیبی از حداکثر سه اثر مستقل** ساخته می‌شود: کالا به داخل (`GOODS_IN` — روی مرجوعی خرید یعنی «تامین‌کننده جایگزین می‌فرستد»)، کالا به بیرون (`GOODS_OUT` — یعنی «ما کالای معیوب را برمی‌گردانیم»)، و/یا وجه (`MONEY_IN`/`MONEY_OUT`، جهت نسبت به شرکت ما). مثلاً «بازپرداخت کامل» یعنی فقط یک اثر `MONEY_IN` (تامین‌کننده به ما پول برمی‌گرداند)؛ «جایگزینی» یعنی یک اثر `GOODS_IN`.
- اثرهای کالایی (`GOODS_IN`/`GOODS_OUT`) با وضعیت `PENDING` ساخته می‌شوند و تا وقتی صراحتاً با `ExecuteGoodsRound` اجرا نشوند، به موجودی دست نمی‌زنند. اثرهای مالی (`MONEY_IN`/`MONEY_OUT`) بلافاصله هنگام ثبت تصمیم `APPLIED` می‌شوند (چیزی برای اجرای بعدی ندارند).
- به ازای هر خرید می‌تواند **چند مرجوعی همزمان باز** وجود داشته باشد (برخلاف نسخه‌ی خیلی قدیمی این سند) — هر بار `CreatePurchaseReturn` یک رکورد کاملاً جدید می‌سازد.
- `ReceivePurchase` (بخش ۹) دیگر هیچ ارتباطی با ساخت مرجوعی ندارد؛ مرجوعی همیشه صراحتاً با `CreatePurchaseReturn` ساخته می‌شود.

### `GET api/PurchaseReturn/GetPurchaseReturnList`

**Query:** `page`, `take`, `search` (شماره مرجوعی/فاکتور/نام تامین‌کننده), `supplierId`, `status` (enum `ReturnStatusEnum`, بخش ۱۵), `problem` (enum `ReturnProblemEnum` — فیلتر روی غالب‌ترین علت ادعا), `fromDate`, `toDate`.

**data.returnList[]:**
```json
{
  "id": 55,
  "returnNumber": "PR-000055",
  "returnDate": "2026-08-05T10:00:00",
  "purchaseId": 100,
  "purchaseInvoiceNumber": "INV-1001",
  "supplierId": 1,
  "supplierName": "شرکت آلفا",
  "createdAt": "2026-08-05T10:00:00",
  "status": 0,
  "dominantProblem": 8,
  "totalQuantity": 2,
  "totalAmount": 40000000
}
```

### `GET api/PurchaseReturn/GetPurchaseReturnDetail?id=55`

**کاربرد:** صفحه‌ی جزئیات مرجوعی، جایی که تک‌تک ادعاها و تصمیم‌ها/اثرهای هرکدام دیده می‌شود، و از همین‌جا دکمه‌های «ثبت تصمیم»، «لغو»، «رد»، «بازگشایی»، «حذف» فعال/غیرفعال می‌شوند.

**data:**
```json
{
  "id": 55,
  "returnNumber": "PR-000055",
  "returnDate": "2026-08-05T10:00:00",
  "purchaseId": 100,
  "purchaseInvoiceNumber": "INV-1001",
  "supplierId": 1,
  "supplierName": "شرکت آلفا",
  "description": "محموله اول",
  "previousReturnId": null,
  "createdAt": "2026-08-05T10:00:00",
  "updatedAt": "2026-08-05T10:00:00",
  "status": 0,
  "totalAmount": 40000000,
  "totalQuantity": 2,
  "decidedQuantity": 0,
  "canDelete": true,
  "canCancel": true,
  "canReject": true,
  "canReopen": false,
  "receivingImages": [],
  "claims": [
    {
      "id": 700,
      "purchaseReturnId": 55,
      "scope": 0,
      "offScopeKind": null,
      "purchaseItemId": 1000,
      "productId": 10,
      "productCode": "20260814-000010",
      "productName": "یخچال دو درب",
      "unit": "عدد",
      "unitPrice": 20000000,
      "quantity": 2,
      "problem": 3,
      "note": "کسری در محموله",
      "createdAt": "2026-08-05T10:00:00",
      "decidedQuantity": 0,
      "remainingQuantity": 2,
      "resolutions": []
    }
  ]
}
```
- فیلدهای `canDelete`/`canCancel`/`canReject`/`canReopen` مستقیماً می‌گویند کدام دکمه‌ها باید فعال باشند.
- `scope`: `0 = ON_ORDER` (ادعا روی یک قلم خرید مشخص، `purchaseItemId` مقدار دارد) یا `1 = OFF_ORDER` (خارج از سند خرید — مثلاً کالای اضافی یا فهرست‌نشده؛ `purchaseItemId` این‌جا `null` است و `offScopeKind` مشخص می‌کند کدام حالت است، بخش ۱۵).
- برای ثبت تصمیم روی یک ادعا، از `id` همان ادعا در آرایه‌ی `claims` (اینجا `700`) به‌عنوان `claimId` در `AddClaimResolution` استفاده می‌شود.
- هر آیتم `resolutions[]` (وقتی تصمیمی ثبت شده باشد) این شکل را دارد:
```json
{
  "id": 950,
  "purchaseReturnClaimId": 700,
  "quantity": 2,
  "note": "بازپرداخت کامل کسری",
  "createdAt": "2026-08-05T11:00:00",
  "effects": [
    {
      "id": 1200,
      "purchaseReturnResolutionId": 950,
      "kind": 3,
      "quantity": 0,
      "doneQuantity": 0,
      "restockedQuantity": null,
      "productId": null,
      "amount": 40000000,
      "method": 0,
      "reference": null,
      "note": null,
      "status": 1,
      "createdAt": "2026-08-05T11:00:00",
      "appliedAt": "2026-08-05T11:00:00",
      "moneyParts": [],
      "history": []
    }
  ]
}
```
یک تصمیم می‌تواند تا سه اثر همزمان داشته باشد (مثلاً هم `GOODS_IN` هم `MONEY_IN` برای «بخشی جایگزین، بخشی بازپرداخت»)؛ `effects[]` هرکدام را جدا نشان می‌دهد. `kind` مقادیر `ReturnEffectKindEnum` (بخش ۱۵) است. اثرهای کالایی (`kind = 0` یا `1`) فیلدهای `quantity`/`doneQuantity`/`restockedQuantity`/`productId` را پر می‌کنند و `amount`/`method` را `null` می‌گذارند؛ اثرهای مالی (`kind = 2` یا `3`) برعکس.

### `GET api/PurchaseReturn/GetPurchaseReturnPendingEffects`

**Query:** `purchaseId` (اختیاری — اگر خالی باشد، همه‌ی اثرهای در انتظار کل سیستم برمی‌گردد).

**کاربرد:** جایگزین قدیمی‌ترِ «صف اثرهای در انتظار» (هم برای جایگزینی رسیده از تامین‌کننده، هم کالای معیوبی که باید برایش پس فرستاده شود) — همه‌ی اثرهای کالایی با وضعیت `PENDING` را در کل مرجوعی‌های فعال (یک خرید یا کل سیستم) یک‌جا نشان می‌دهد. قبل از باز کردن فرم `ExecuteGoodsRound` این را صدا بزنید.

**data.pendingEffects[]:**
```json
{
  "effectId": 1200,
  "purchaseReturnId": 55,
  "returnNumber": "PR-000055",
  "claimId": 700,
  "kind": 0,
  "productId": 10,
  "productCode": "20260814-000010",
  "productName": "یخچال دو درب",
  "unit": "عدد",
  "quantity": 2,
  "doneQuantity": 0,
  "remainingQuantity": 2
}
```

### `GET api/PurchaseReturn/GetPurchaseReceivingInfo?purchaseId=100`

**کاربرد:** endpoint اصلی صفحه‌ی «دریافت خرید در انبار». قبل از باز کردن فرم `ReceivePurchase`، همیشه این API را صدا بزنید تا بدانید هر قلم چقدر باقیمانده برای دریافت دارد.

**data:**
```json
{
  "purchaseId": 100,
  "invoiceNumber": "INV-1001",
  "invoiceDate": "2026-08-01T00:00:00",
  "status": 1,
  "supplierId": 1,
  "supplierName": "شرکت آلفا",
  "receivingImages": [],
  "items": [
    {
      "purchaseItemId": 1000,
      "productId": 10,
      "productCode": "20260814-000010",
      "productName": "یخچال دو درب",
      "unit": "عدد",
      "unitPrice": 20000000,
      "orderedQuantity": 20,
      "receivedQuantity": 15,
      "stillOwedQuantity": 5
    }
  ]
}
```
`stillOwedQuantity` یعنی چه مقدار دیگر از این قلم می‌تواند دریافت شود — این را برای محدود کردن ورودی فرم `ReceivePurchase` استفاده کنید. توجه: این endpoint دیگر چیزی درباره‌ی مغایرت‌ها یا مرجوعی فعال نمی‌گوید (آن مسئولیت کاملاً به `GetPurchaseReturnPendingEffects`/`GetPurchaseReturnList` منتقل شده)؛ `receivingImages` هم اینجا و هم زیر `GetPurchaseReturnDetail` (فقط عکس‌های همان مرجوعی) برمی‌گردد، هرکدام با `url` امضاشده (بخش ۱۷).

### `POST api/PurchaseReturn/CreatePurchaseReturn`

ثبت صریح یک درخواست مرجوعی خرید (مغایرت را گزارش می‌کند)، کاملاً مستقل از فراخوانی `ReceivePurchase`.

**Body:**
```json
{
  "purchaseId": 100,
  "returnDate": "2026-08-05T10:00:00",
  "description": "محموله اول",
  "previousReturnId": null,
  "claims": [
    {
      "scope": 0,
      "offScopeKind": null,
      "orderLineId": 1000,
      "productId": 10,
      "unitPrice": 20000000,
      "quantity": 2,
      "problem": 3,
      "note": "کسری در محموله"
    }
  ]
}
```
- `scope`: `0 = ON_ORDER` (باید `orderLineId` را برابر `purchaseItemId` بگذارید) یا `1 = OFF_ORDER` (باید `offScopeKind` را بگذارید و `orderLineId` را نفرستید/`null` بگذارید — بخش ۱۵).
- برای `scope = ON_ORDER`، مجموع `quantity` همه‌ی ادعاهای فعال قبلی + این درخواست روی همان قلم خرید نمی‌تواند از مقدار قابل‌مرجوع آن قلم بیشتر شود (سرور این را با در نظر گرفتن همه‌ی مرجوعی‌های فعال آن خرید چک می‌کند).
- `problem`: enum یکپارچه‌ی `ReturnProblemEnum` (بخش ۱۵) — همان مقادیری که برای علت مرجوعی فروش هم استفاده می‌شود.

**data خروجی:** `{ "returnId": 55, "returnNumber": "PR-000055", "returnStatus": 0 }`

### `POST api/PurchaseReturn/AddClaimResolution`

ثبت یک تصمیم روی بخشی (یا کل) مقدار باقیمانده‌ی یک ادعا، به‌صورت ترکیبی از اثرهای کالا/وجه.

**Body:**
```json
{
  "claimId": 700,
  "composition": {
    "quantity": 2,
    "note": "بازپرداخت کامل کسری",
    "goodsIn": null,
    "goodsOut": null,
    "money": { "kind": 3, "method": 0, "amount": 40000000, "reference": null, "parts": null }
  }
}
```
- `composition.quantity`: چه مقدار از باقیمانده‌ی ادعا (`remainingQuantity` در `GetPurchaseReturnDetail`) با این تصمیم پوشش داده می‌شود.
- حداقل یکی از `goodsIn`/`goodsOut`/`money` باید مقدار داشته باشد؛ هر سه هم می‌توانند همزمان پر شوند (مثلاً هم بخشی جایگزین بیاید هم باقی‌مانده بازپرداخت شود).
- `goodsIn`/`goodsOut`: `{ "quantity": 2, "productId": null }` — `productId` اختیاری است و پیش‌فرض همان محصول ادعا را می‌گیرد (فقط برای جایگزینی با محصول متفاوت لازم است). مجموع مقدار کالا در `goodsIn`+`goodsOut` نمی‌تواند از `composition.quantity` بیشتر شود.
- `money.kind`: باید `2` (`MONEY_OUT` — پول از شرکت ما خارج می‌شود) یا `3` (`MONEY_IN` — تامین‌کننده به ما پول برمی‌گرداند، معادل «بازپرداخت»؛ رایج‌ترین حالت در مرجوعی خرید) باشد.
- `money.method`: `ReturnPaymentMethodEnum` (بخش ۱۵). اگر `MIXED` (۵) بود، `parts[]` الزامی می‌شود (هرکدام `{ method, amount, checkNumber?, transferRef? }`) و باید مجموعشان با `amount` برابر باشد.
- **قید مهم:** تنها ترکیب نامعتبر، اثر `GOODS_OUT` روی ادعای مغایرت «اضافی» (`EXCESS`, بخش ۱۵) نیست — برخلاف مدل قدیمی، دیگر جدولی از «مغایرت → تصمیم مجاز» به‌صورت سخت‌کدشده در سرور نیست؛ اگر ترکیب فیزیکی/منطقی نامعتبر باشد (مثلاً مجموع کالا بیشتر از مقدار تصمیم)، سرور ۴۰۰ می‌دهد.

**data خروجی:** `{ "resolutionId": 950, "returnStatus": 1 }`

### `DELETE api/PurchaseReturn/RemoveClaimResolution?id=950`

حذف یک تصمیم — **فقط تا وقتی هیچ‌کدام از اثرهای کالایی‌اش `doneQuantity > 0` نشده باشند** (یعنی هنوز هیچ `ExecuteGoodsRound` روی آن اجرا نشده). اگر بخشی از کالا جابه‌جا شده باشد، دیگر قابل حذف نیست.

### `POST api/PurchaseReturn/ExecuteGoodsRound`

ثبت یک نوبت فیزیکی جابه‌جایی کالا (تحویل جایگزین از تامین‌کننده، یا فرستادن کالای معیوب به او) برای یک یا چند اثر کالایی از یک مرجوعی — چندمرحله‌ای است (می‌توان بخشی از یک اثر را الان و بقیه را بعداً اجرا کرد).

**Body:**
```json
{
  "purchaseReturnId": 55,
  "date": "2026-08-10T09:00:00",
  "partyName": "راننده تامین‌کننده",
  "partyNationalId": null,
  "vehiclePlate": null,
  "note": null,
  "rounds": [
    {
      "effectId": 1200,
      "quantity": 2,
      "observations": [
        { "problem": 8, "quantity": 1, "note": "یکی از جایگزین‌ها هم آسیب‌دیده بود" }
      ]
    }
  ]
}
```
- `effectId`: از `GetPurchaseReturnPendingEffects` یا `GetPurchaseReturnDetail` (زیر `resolutions[].effects[].id`)، باید یک اثر کالایی (`GOODS_IN`/`GOODS_OUT`) با وضعیت `PENDING` باشد.
- `quantity`: نباید از باقیمانده‌ی همان اثر (`remainingQuantity`/`quantity - doneQuantity`) بیشتر باشد.
- `observations[]`: **فقط برای `GOODS_IN`** معنی دارد — یعنی وقتی جایگزین از تامین‌کننده می‌رسد، بخشی از همان محموله هم ممکن است مشکل داشته باشد؛ مجموع `quantity` در `observations` از `quantity` همان نوبت کم می‌شود تا مقدار «سالم» به‌دست آید (فقط مقدار سالم به موجودی اضافه می‌شود).
- `partyName`/`partyNationalId`/`vehiclePlate`/`note`: اطلاعات تحویل‌گیرنده/تحویل‌دهنده، برای مستندسازی هر نوبت (اختیاری).

**data خروجی:** `{ "returnStatus": 1 }`

### `POST api/PurchaseReturn/CancelPurchaseReturn`

**Body:** `{ "id": 55 }` — فقط برای مرجوعی‌هایی که هنوز هیچ تصمیمی روی‌شان ثبت نشده (`canCancel: true`).

### `POST api/PurchaseReturn/RejectPurchaseReturn`

**Body:** `{ "id": 55 }` — مشابه لغو، اما با معنای «رد شد» (مثلاً تامین‌کننده مغایرت را قبول نکرد).

### `POST api/PurchaseReturn/ReopenPurchaseReturn`

**Body:** `{ "id": 55 }` — فقط برای مرجوعی‌های رد‌شده (`canReopen: true`)؛ آن را دوباره به وضعیت `OPEN` برمی‌گرداند.

### `DELETE api/PurchaseReturn/DeletePurchaseReturn?id=55`

حذف کامل (نه نرم) — فقط وقتی هنوز کاملاً دست‌نخورده باشد (`canDelete: true`؛ همان شرط `canCancel`/`canReject`).

---

## 11. فروش (Sale)

کنترلر: `api/Sale`.

### `GET api/Sale/GetSaleList`

**Query:** `page`, `take`, `invoiceNumber`, `customerName`, `status` (enum), `paymentType` (enum), `fromDate`, `toDate`.

**data.saleList[]:**
```json
{
  "id": 200,
  "invoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "invoiceDate": "2026-08-10T00:00:00",
  "status": 0,
  "paymentType": 0,
  "totalAmount": 30000000,
  "paidAmount": 30000000
}
```

### `GET api/Sale/GetSaleDetail?id=200`

**data:**
```json
{
  "id": 200,
  "invoiceNumber": "SL-2001",
  "invoiceDate": "2026-08-10T00:00:00",
  "status": 0,
  "paymentType": 0,
  "totalAmount": 30000000,
  "paidAmount": 30000000,
  "paymentDetails": [],
  "description": null,
  "customerId": 1,
  "customerName": "علی رضایی",
  "createdAt": "2026-08-10T00:00:00",
  "updatedAt": "2026-08-10T00:00:00",
  "items": [
    {
      "id": 3000,
      "productId": 10,
      "quantity": 2,
      "unitPrice": 25000000,
      "discount": 0,
      "shippedQuantity": 0,
      "settledQuantity": 0,
      "saleId": 200
    }
  ],
  "drivers": [
    { "id": 1, "driverFullName": "رضا احمدی", "driverNationalCode": "0098765432", "vehiclePlate": "34ب12345", "createdAt": "2026-08-11T09:00:00" }
  ],
  "shippingNotes": [
    { "id": 1, "note": "ارسال اول", "createdAt": "2026-08-11T09:00:00" }
  ]
}
```
`drivers[]`/`shippingNotes[]`: مثل `drivers[]`/`receivingNotes[]` در `GetPurchaseDetail` (بخش ۹) اما برای سمت ارسال — تاریخچه‌ی هر نوبت `ShipSale` که این فیلدها را فرستاده باشد.

### `POST api/Sale/CreateSale`

**Body:**
```json
{
  "invoiceNumber": "SL-2001",
  "invoiceDate": "2026-08-10T00:00:00",
  "status": 0,
  "paymentType": 0,
  "paymentDetails": [],
  "totalAmount": 50000000,
  "paidAmount": 50000000,
  "description": null,
  "customerId": 1,
  "productIds": [
    { "productId": 10, "quantity": 2, "unitPrice": 25000000, "discount": 0 }
  ]
}
```
نام فیلد آرایه‌ی اقلام گمراه‌کننده `productIds` است اما در واقع لیستی از اقلام کامل (محصول + تعداد + قیمت + تخفیف) است، نه فقط شناسه‌ها. اگر `paymentType` غیر نقدی باشد، `paymentDetails` الزامی است.

### `PUT api/Sale/UpdateSale`

**Body:**
```json
{
  "id": 200,
  "invoiceNumber": "SL-2001",
  "invoiceDate": "2026-08-10T00:00:00",
  "status": 0,
  "paymentType": 0,
  "paymentDetails": [],
  "totalAmount": 50000000,
  "paidAmount": 50000000,
  "description": null,
  "customerId": 1,
  "items": [
    { "id": 3000, "productId": 10, "quantity": 3, "unitPrice": 25000000, "discount": 0 },
    { "id": 0, "productId": 15, "quantity": 1, "unitPrice": 10000000, "discount": 0 }
  ]
}
```
برخلاف `UpdatePurchase`، این API **اقلام (`items`) را هم می‌گیرد و به‌طور کامل هماهنگ می‌کند**:
- قلمی با `id` موجود (مثل `3000`) ویرایش می‌شود.
- قلم با `id: 0` به‌عنوان ردیف **جدید** اضافه می‌شود.
- هر قلم قبلی که در آرایه‌ی جدید نباشد **حذف** می‌شود.

بنابراین ترتیب صحیح ویرایش فروش: `GetSaleDetail` → کاربر آرایه‌ی `items` را در UI دستکاری می‌کند (ویرایش/حذف/افزودن ردیف) → کل آرایه‌ی نهایی (با `id`های درست برای ردیف‌های موجود و `id: 0` برای ردیف‌های تازه) به `UpdateSale` فرستاده می‌شود.

### `DELETE api/Sale/DeleteSale?id=200`

### `POST api/Sale/ShipSale`

ثبت **ارسال فیزیکی** کالا به مشتری — مانند `ReceivePurchase` اما برعکس (موجودی کم می‌شود). می‌توان چند بار برای یک فروش صدا زد (ارسال چندمرحله‌ای).

**Body:**
```json
{
  "saleId": 200,
  "shippedDate": "2026-08-11T09:00:00",
  "shippingNote": "ارسال اول",
  "driverFullName": "رضا احمدی",
  "driverNationalCode": "0098765432",
  "vehiclePlate": "34ب12345",
  "items": [
    { "saleItemId": 3000, "shippedQuantity": 2, "productUnitBarcodes": null }
  ]
}
```
- `saleItemId`: از `items[].id` در `GetSaleDetail`.
- `driverFullName`/`driverNationalCode`/`vehiclePlate`/`shippingNote` همگی اختیاری‌اند، هرکدام مستقل ذخیره می‌شوند، و مثل `ReceivePurchase` هر نوبت یک ردیف تاریخچه‌ی تازه می‌سازد (`drivers[]`/`shippingNotes[]` در `GetSaleDetail`، بالا).
- `shippedQuantity`: نباید از باقیمانده‌ی قابل‌ارسال آن قلم (`quantity - shippedQuantity` فعلی) یا از موجودی فعلی محصول بیشتر باشد.
- `productUnitBarcodes` (اختیاری): اگر انباردار بارکد دانه‌های خاصی را اسکن کرده، لیست آن بارکدها را بفرستید (باید دقیقاً به تعداد `shippedQuantity` باشد). اگر نفرستید، سرور خودش قدیمی‌ترین دانه‌های موجود را انتخاب می‌کند (FIFO).

**data خروجی:** `{ "saleId": 200, "saleStatus": 7 }` (مقدار enum وضعیت فروش، بخش ۱۵).

---

## 12. مرجوعی فروش (SaleReturn)

کنترلر: `api/SaleReturn`. مانند مرجوعی خرید (بخش ۱۰)، این بخش هم با نسخه‌های قدیمی‌تر این سند **کاملاً فرق دارد** و از همان مدل جدید **Claim → Resolution → Effect** استفاده می‌کند:

```
SaleReturn (یک درخواست مرجوعی مشتری)
  └─ SaleReturnClaim (یک ادعای مشتری روی یک قلم فروش یا خارج از سند، با یک علت — ReturnProblemEnum)
       └─ SaleReturnResolution (یک تصمیم روی بخشی از مقدار ادعا)
            └─ SaleReturnEffect (۱ تا ۳ اثر پایه‌ای: GOODS_IN / GOODS_OUT / MONEY_IN / MONEY_OUT)
```

مفهوم‌شناسی این مدل دقیقاً مثل مرجوعی خرید است (بخش ۱۰ را حتماً قبل از این بخش بخوانید)، با این تفاوت‌ها:
- روی مرجوعی فروش، `GOODS_IN` یعنی «مشتری کالا را به ما برمی‌گرداند» و `GOODS_OUT` یعنی «ما کالای جایگزین برای مشتری می‌فرستیم» (جهت برعکسِ مرجوعی خرید).
- `money.kind = MONEY_OUT` روی مرجوعی فروش یعنی «ما به مشتری پول/اعتبار برمی‌گردانیم» (بازپرداخت یا اعتبار فروشگاهی) — رایج‌ترین حالت اینجا، برخلاف مرجوعی خرید که رایج‌ترین حالتش `MONEY_IN` بود.
- علت ادعا (`problem` روی `SaleReturnClaim`) از همان enum یکپارچه‌ی `ReturnProblemEnum` مرجوعی خرید استفاده می‌کند (بخش ۱۵) — دیگر enum جدای «دلیل مشتری» در برابر «مشکل مشاهده‌شده‌ی انباردار» وجود ندارد؛ مشاهدات فیزیکی هر نوبت (`ExecuteGoodsRound`'s `observations[]`) هم از همین enum استفاده می‌کنند.
- برخلاف مرجوعی خرید، برای یک فروش می‌تواند **چند مرجوعی فعال به‌طور همزمان** وجود داشته باشد (هر بار `CreateSaleReturn` یک رکورد کاملاً جدید می‌سازد) — این رفتار عوض نشده.

### `GET api/SaleReturn/GetSaleReturnList`

**Query:** `page`, `take`, `search`, `saleId`, `customerId`, `status` (enum `ReturnStatusEnum`, بخش ۱۵), `problem` (enum `ReturnProblemEnum`), `fromDate`, `toDate`.

`saleId` برای دیدن **همه‌ی مرجوعی‌های ثبت‌شده روی یک فروش خاص** است — مثلاً در صفحه‌ی جزئیات فروش، یک تب/بخش «مرجوعی‌ها» که با `GET api/SaleReturn/GetSaleReturnList?saleId={id}` پر می‌شود.

**data.returnList[]:**
```json
{
  "id": 80,
  "returnNumber": "SR-000080",
  "requestDate": "2026-08-12T00:00:00",
  "saleId": 200,
  "saleInvoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "createdAt": "2026-08-12T00:00:00",
  "status": 0,
  "dominantProblem": 7,
  "totalQuantity": 1,
  "totalAmount": 25000000
}
```

### `GET api/SaleReturn/GetSaleReturnDetail?id=80`

**data:**
```json
{
  "id": 80,
  "returnNumber": "SR-000080",
  "requestDate": "2026-08-12T00:00:00",
  "saleId": 200,
  "saleInvoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "description": null,
  "previousReturnId": null,
  "createdAt": "2026-08-12T00:00:00",
  "updatedAt": "2026-08-12T00:00:00",
  "status": 0,
  "totalAmount": 25000000,
  "totalQuantity": 1,
  "decidedQuantity": 0,
  "canDelete": true,
  "canCancel": true,
  "canReject": true,
  "canReopen": false,
  "claims": [
    {
      "id": 400,
      "saleReturnId": 80,
      "scope": 0,
      "offScopeKind": null,
      "saleItemId": 3000,
      "productId": 10,
      "productCode": "20260814-000010",
      "productName": "یخچال دو درب",
      "unit": "عدد",
      "unitPrice": 25000000,
      "quantity": 1,
      "problem": 7,
      "note": "محصول کار نمی‌کند",
      "createdAt": "2026-08-12T00:00:00",
      "decidedQuantity": 0,
      "remainingQuantity": 1,
      "resolutions": []
    }
  ]
}
```
- `canDelete`/`canCancel`/`canReject`/`canReopen` مستقیماً وضعیت دکمه‌ها را می‌گویند — همان قانون مرجوعی خرید: فقط تا وقتی مرجوعی «دست‌نخورده» است (هیچ اثری اجرا/اعمال نشده) این‌ها `true` هستند (`canReopen` برعکس، فقط برای وضعیت `REJECTED`).
- `scope`/`offScopeKind` دقیقاً مثل مرجوعی خرید (بخش ۱۰): `0 = ON_ORDER` (`saleItemId` مقدار دارد) یا `1 = OFF_ORDER`.
- شکل `resolutions[].effects[]` دقیقاً مثل مرجوعی خرید است (بخش ۱۰) — همان فیلدها، فقط `kind` برعکس تفسیر می‌شود (بالا توضیح داده شد).

### `GET api/SaleReturn/GetSaleReturnPendingEffects`

**Query:** `saleId` (اختیاری — اگر خالی باشد، همه‌ی اثرهای در انتظار کل سیستم برمی‌گردد).

**کاربرد:** جایگزین قدیمی‌ترِ «صفحه‌ی بازرسی انبار» + «صف ارسال جایگزین» با هم — همه‌ی اثرهای کالایی `PENDING` (چه کالایی که هنوز از مشتری برنگشته و باید بازرسی شود، چه جایگزینی که هنوز برای مشتری ارسال نشده) را یک‌جا نشان می‌دهد. قبل از باز کردن فرم `ExecuteGoodsRound` این را صدا بزنید.

**data.pendingEffects[]:**
```json
{
  "effectId": 1200,
  "saleReturnId": 80,
  "returnNumber": "SR-000080",
  "claimId": 400,
  "kind": 0,
  "productId": 10,
  "productCode": "20260814-000010",
  "productName": "یخچال دو درب",
  "unit": "عدد",
  "quantity": 1,
  "doneQuantity": 0,
  "remainingQuantity": 1
}
```

### `POST api/SaleReturn/CreateSaleReturn`

ثبت درخواست مرجوعی مشتری (قبل از هرگونه بازرسی فیزیکی).

**Body:**
```json
{
  "saleId": 200,
  "requestDate": "2026-08-12T00:00:00",
  "description": null,
  "previousReturnId": null,
  "claims": [
    {
      "scope": 0,
      "offScopeKind": null,
      "orderLineId": 3000,
      "productId": 10,
      "unitPrice": 25000000,
      "quantity": 1,
      "problem": 7,
      "note": "محصول کار نمی‌کند"
    }
  ]
}
```
- فروش باید در وضعیت «ارسال‌شده کامل»، «تحویل‌جزئی» یا «تحویل‌شده» باشد.
- `scope`/`offScopeKind`/`orderLineId` دقیقاً مثل `CreatePurchaseReturn` (بخش ۱۰): برای `scope = ON_ORDER`، `orderLineId` همان `saleItemId` است.
- مقدار ادعاشده مجموع همه‌ی مرجوعی‌های فعال قبلی همان قلم فروش را هم در نظر می‌گیرد (سرور جمع همه‌ی ادعاهای باز روی این قلم را چک می‌کند تا از باقیمانده‌ی همان قلم بیشتر نشود).

**data خروجی:** `{ "returnId": 80, "returnNumber": "SR-000080", "returnStatus": 0 }`

### `POST api/SaleReturn/AddClaimResolution`

ثبت یک تصمیم روی بخشی (یا کل) مقدار باقیمانده‌ی یک ادعا، به‌صورت ترکیبی از اثرهای کالا/وجه — بدنه و قوانین دقیقاً مثل `AddClaimResolution` مرجوعی خرید (بخش ۱۰)، فقط `claimId` اینجا به `SaleReturnClaim` اشاره می‌کند.

**Body:**
```json
{
  "claimId": 400,
  "composition": {
    "quantity": 1,
    "note": "بازپرداخت کامل",
    "goodsIn": { "quantity": 1, "productId": null },
    "goodsOut": null,
    "money": null
  }
}
```
این مثال یعنی «مشتری کالا را برمی‌گرداند» (`goodsIn`، بعداً با `ExecuteGoodsRound` بازرسی و به موجودی اضافه می‌شود). برای بازپرداخت نقدی بلافاصله، به‌جای `goodsIn`، یک `money: { "kind": 2, "method": 0, "amount": 25000000 }` بفرستید (`kind = 2` یعنی `MONEY_OUT` — پول از ما به مشتری). **قید مهم:** تنها ترکیب نامعتبر، اثر `GOODS_OUT` (جایگزین) روی ادعایی است که پس از بازرسی «سالم» تشخیص داده شده — چیزی برای جایگزینی وجود ندارد.

**data خروجی:** `{ "resolutionId": 950, "returnStatus": 1 }`

### `DELETE api/SaleReturn/RemoveClaimResolution?id=950`

حذف یک تصمیم — فقط تا وقتی هیچ‌کدام از اثرهای کالایی‌اش `doneQuantity > 0` نشده باشند (همان قانون مرجوعی خرید).

### `POST api/SaleReturn/ExecuteGoodsRound`

ثبت یک نوبت فیزیکی جابه‌جایی کالا (مشتری کالا را پس می‌آورد، یا ما جایگزین را برایش می‌فرستیم) — بدنه و قوانین دقیقاً مثل مرجوعی خرید (بخش ۱۰)، فقط فیلد شناسه‌ی مرجوعی اینجا `saleReturnId` است.

**Body:**
```json
{
  "saleReturnId": 80,
  "date": "2026-08-13T09:00:00",
  "partyName": null,
  "partyNationalId": null,
  "vehiclePlate": null,
  "note": null,
  "rounds": [
    {
      "effectId": 1200,
      "quantity": 1,
      "observations": [
        { "problem": 7, "quantity": 1, "note": "صفحه‌نمایش شکسته" }
      ]
    }
  ]
}
```
- روی `GOODS_IN` (کالا از مشتری برمی‌گردد): `observations[]` مشخص می‌کند چه بخشی از همان نوبت واقعاً مشکل داشته؛ فقط مقدار «سالم» (`quantity` نوبت منهای مجموع `observations`) به موجودی قابل‌فروش برمی‌گردد. اگر `observations` خالی باشد، یعنی کل نوبت سالم بوده.
- روی `GOODS_OUT` (ما جایگزین می‌فرستیم): `observations[]` معنی ندارد (نادیده گرفته می‌شود) — کل `quantity` از موجودی کم و برای مشتری ارسال می‌شود.

**data خروجی:** `{ "returnStatus": 1 }`

### `POST api/SaleReturn/CancelSaleReturn`

**Body:** `{ "id": 80 }` — فقط اگر مرجوعی هنوز کاملاً دست‌نخورده باشد (`canCancel: true`).

### `POST api/SaleReturn/RejectSaleReturn`

**Body:** `{ "id": 80 }` — همان شرط بالا.

### `POST api/SaleReturn/ReopenSaleReturn`

**Body:** `{ "id": 80 }` — فقط برای مرجوعی‌های رد‌شده (`canReopen: true`).

### `DELETE api/SaleReturn/DeleteSaleReturn?id=80`

حذف کامل — فقط پیش از هرگونه اثر اجراشده (`canDelete: true`).

---

## 13. فاکتور PDF (Invoice)

کنترلر: `api/Invoice`. **مانند بخش Barcode، این سه API خروجی JSON ندارند** و مستقیماً فایل `application/pdf` برمی‌گردانند (باید با `responseType: 'blob'` صدا زده شوند). خطاها طبق ساختار استاندارد JSON خطا برمی‌گردند.

### `GET api/Invoice/GetSaleInvoicePdf?saleId=200`

فاکتور فروش کامل (شرکت، مشتری، اقلام، تخفیف، مالیات، جمع کل، مانده حساب) به‌صورت PDF فارسی راست‌به‌چپ.

### `GET api/Invoice/GetPurchaseInvoicePdf?purchaseId=100`

معادل فاکتور خرید، با اطلاعات تامین‌کننده.

### `GET api/Invoice/GetSaleReturnCreditNotePdf?saleReturnId=80`

برگه‌ی اعتباری مرجوعی — **فقط اثرهای مالی از نوع `MONEY_OUT`** (پول یا اعتبار فروشگاهی که به مشتری برگردانده شده، بخش ۱۲) را نشان می‌دهد؛ یک ردیف چاپی به ازای هر اثر، نه هر محصول. اگر مرجوعی هیچ اثر `MONEY_OUT` ثبت‌شده‌ای نداشته باشد (مثلاً فقط `GOODS_IN`/`GOODS_OUT` دارد)، این API خطای ۴۰۰ می‌دهد. یعنی دکمه‌ی «چاپ برگه اعتباری» را فقط وقتی نشان دهید که حداقل یک تصمیم شامل اثر `MONEY_OUT` روی مرجوعی ثبت شده باشد.

---

## 14. سناریوهای کامل گردش‌کار

این بخش چند مسیر رایج استفاده از API ها را قدم‌به‌قدم توضیح می‌دهد — دقیقاً همان الگویی که باید در فرانت رعایت شود.

### الگوی عمومی ویرایش (مثال: ویرایش محصول)

این الگو برای همه‌ی موجودیت‌های CRUD ساده (Customer، Supplier، ProductCategory، Product، User) یکسان است:

1. **احراز هویت:** کاربر با `POST api/Account/Login` وارد می‌شود؛ توکن در هدر همه‌ی درخواست‌های بعدی گذاشته می‌شود.
2. **لیست:** صفحه‌ی لیست محصولات با `GET api/Product/GetProductList` پر می‌شود (شامل `id` هر ردیف برای عملیات بعدی).
3. **جزئیات/فرم ویرایش:** با کلیک روی «ویرایش» یک ردیف، `GET api/Product/GetProductDetail?id={id}` صدا زده می‌شود تا **تمام فیلدهای قابل‌ویرایش** آن محصول گرفته و در فرم پر شود (نه فقط فیلدهایی که در لیست بود).
4. **ویرایش:** کاربر مقدار دلخواه را در فرم تغییر می‌دهد.
5. **ارسال:** `PUT api/Product/UpdateProduct` با **همه‌ی فیلدهای فرم** (چه تغییر کرده‌اند چه نه) + `id` صدا زده می‌شود. سرور کل رکورد را با مقادیر ارسالی بازنویسی می‌کند، پس اگر فیلدی فرستاده نشود، مقدار قبلی‌اش از دست می‌رود (به‌جز فیلدهای غیرقابل‌ویرایش مثل `code`/`barCode` که اصلاً در Command وجود ندارند).

این الگو دقیقاً برای Customer، Supplier، ProductCategory و User هم صادق است. تنها استثنا **Sale** است که در `UpdateSale` اقلام (`items`) را هم با منطق «ویرایش/افزودن/حذف بر اساس `id`» می‌گیرد (بخش ۱۱).

### گردش‌کار کامل خرید تا رفع مغایرت

1. `POST api/Purchase/CreatePurchase` → سند خرید ثبت می‌شود (کالا هنوز در انبار نیست).
2. وقتی محموله می‌رسد: `GET api/PurchaseReturn/GetPurchaseReceivingInfo?purchaseId={id}` → دیدن باقیمانده‌ی قابل‌دریافت هر قلم.
3. `POST api/Purchase/ReceivePurchase` → ثبت مقدار سالم دریافتی هر قلم (ممکن است چند بار برای محموله‌های مختلف تکرار شود). این مرحله دیگر مغایرت نمی‌گیرد.
4. اگر بخشی از محموله مشکل داشت (کسری، آسیب‌دیده، کالای اشتباه و ...)، جدا و صراحتاً `POST api/PurchaseReturn/CreatePurchaseReturn` → ثبت درخواست مرجوعی با یک یا چند ادعا (`claims[]`).
5. `GET api/PurchaseReturn/GetPurchaseReturnDetail?id={returnId}` → گرفتن `id` هر ادعا (`claims[].id`).
6. برای هر ادعا، `POST api/PurchaseReturn/AddClaimResolution` → تصمیم بگیرید، به‌صورت ترکیبی از اثر کالا (جایگزینی) و/یا اثر وجه (بازپرداخت).
7. اگر تصمیم شامل اثر کالایی (`GOODS_IN`/`GOODS_OUT`) بود، آن اثر با وضعیت `PENDING` می‌ماند تا وقتی فیزیکاً اتفاق بیفتد: `GET api/PurchaseReturn/GetPurchaseReturnPendingEffects?purchaseId={id}` → دیدن اثرهای در انتظار، سپس `POST api/PurchaseReturn/ExecuteGoodsRound` → ثبت نوبت فیزیکی (ممکن است چندمرحله‌ای باشد). اثرهای مالی نیازی به این مرحله ندارند (همان لحظه‌ی ثبت تصمیم `APPLIED` می‌شوند).
8. وقتی همه‌ی ادعاها تصمیم‌گیری و همه‌ی اثرهای کالایی‌شان اجرا شدند، مرجوعی به‌صورت خودکار `SETTLED` می‌شود.

### گردش‌کار کامل فروش تا مرجوعی مشتری

1. `POST api/Sale/CreateSale` → سند فروش ثبت می‌شود.
2. `GET api/Sale/GetSaleDetail?id={id}` → گرفتن `items[].id` هر قلم.
3. `POST api/Sale/ShipSale` → ارسال فیزیکی کالا (ممکن است چندمرحله‌ای).
4. اگر مشتری بعداً مشکلی گزارش داد: `POST api/SaleReturn/CreateSaleReturn` → ثبت درخواست مرجوعی با یک یا چند ادعا (قبل از هر بازرسی فیزیکی).
5. `GET api/SaleReturn/GetSaleReturnDetail?id={returnId}` → گرفتن `id` هر ادعا (`claims[].id`).
6. برای هر ادعا، `POST api/SaleReturn/AddClaimResolution` → تصمیم بگیرید: کالا از مشتری برگردد (`goodsIn`)، جایگزین برایش برود (`goodsOut`)، پول/اعتبار برگردانده شود (`money`)، یا ترکیبی از این‌ها.
7. اگر تصمیم شامل اثر کالایی بود، آن اثر `PENDING` می‌ماند تا فیزیکاً اتفاق بیفتد: `GET api/SaleReturn/GetSaleReturnPendingEffects?saleId={id}` → دیدن اثرهای در انتظار (چه کالای برگشتی که باید بازرسی شود، چه جایگزینی که باید ارسال شود)، سپس `POST api/SaleReturn/ExecuteGoodsRound` → ثبت نوبت فیزیکی، با مشخص‌کردن `observations[]` روی برگشتی‌ها اگر بخشی از محموله معیوب بود (فقط مقدار سالم به موجودی برمی‌گردد).
8. اگر تصمیم شامل اثر `MONEY_OUT` بود، می‌توانید `GET api/Invoice/GetSaleReturnCreditNotePdf?saleReturnId={id}` را برای چاپ برگه‌ی اعتباری صدا بزنید (نیازی به منتظر ماندن برای اجرای اثرهای کالایی نیست، چون اثر مالی همان لحظه‌ی ثبت `APPLIED` شده).

### گردش‌کار اسکن بارکد در انبار

1. اسکنر/کیبورد یک رشته تولید می‌کند (بارکد محصول یا بارکد یک دانه‌ی خاص).
2. `GET api/Product/ScanBarcode?code={رشته اسکن‌شده}` → گرفتن اطلاعات کامل محصول (و در صورت اسکن یک دانه‌ی خاص، اطلاعات همان دانه هم برمی‌گردد).
3. بسته به صفحه (دریافت خرید، ارسال فروش، بازرسی مرجوعی و ...)، اطلاعات محصول/دانه در فرم مربوطه استفاده می‌شود.

---

## 15. پیوست: مقادیر عددی Enum ها

**یادآوری:** در JSON، این مقادیر همیشه به‌صورت عدد صحیح ارسال/دریافت می‌شوند (نه رشته)، مگر جایی که صریحاً استثنا ذکر شده (مثل `SupplierListDto.status` که رشته است).

### `BalanceTypeEnum` (نوع مانده حساب مشتری/تامین‌کننده)
| مقدار | معنی |
|---|---|
| 0 | طلبکار (Creditor) |
| 1 | بدهکار (Debtor) |
| 2 | تسویه‌شده (Balanced) |

### `PaymentTypeEnum` (نوع پرداخت)
| مقدار | معنی |
|---|---|
| 0 | نقدی (CASH) |
| 1 | نسیه (CREDIT) |
| 2 | چک (CHECK) |
| 3 | انتقال بانکی (TRANSFER) |
| 4 | ترکیبی (MIXED) |

### `ProductUnitEnum` (واحد شمارش محصول)
| مقدار | معنی |
|---|---|
| 0 | دست (Hand) |
| 1 | عدد (Number) |
| 2 | کارتن (Box) |
| 3 | لیتر (Liter) |
| 4 | کیلوگرم (Kg) |
| 5 | کیت (Kit) |
| 6 | بسته (Package) |
| 7 | جفت (Pair) |

### `ProductUnitStatusEnum` (وضعیت یک دانه‌ی فیزیکی محصول)
| مقدار | معنی |
|---|---|
| 1 | در انبار (IN_STOCK) |
| 2 | فروخته‌شده (SOLD) |
| 3 | برگشت‌به‌تامین‌کننده (RETURNED_TO_SUPPLIER) |
| 4 | اسکرپ‌شده/غیرقابل‌فروش (SCRAPPED) |

### `BarcodeReferenceKindEnum` (نتیجه‌ی تفسیر یک بارکد اسکن‌شده)
| مقدار | معنی |
|---|---|
| 1 | بارکد محصول (PRODUCT) |
| 2 | بارکد یک دانه‌ی خاص (UNIT) |
| 3 | نامعتبر/ناشناخته (UNKNOWN) — در عمل باعث خطای ۴۰۴ می‌شود |

### `PurchaseStatusEnum` (وضعیت سند خرید)
| مقدار | معنی |
|---|---|
| 0 | در انتظار (PENDING) |
| 1 | ارسال‌شده توسط تامین‌کننده (SHIPPED) |
| 2 | دریافت‌جزئی (PARTIALLY_RECEIVED) |
| 3 | دریافت‌شده کامل (RECEIVED) |
| 4 | مرجوع‌شده (RETURNED) — در عمل هنوز به این وضعیت نمی‌رسد |
| 5 | لغو‌شده (CANCELLED) |
| 6 | پیش‌فاکتور (PROFORMA) — فاکتور رسمیِ تامین‌کننده هنوز نرسیده؛ `InvoiceNumber`/`InvoiceDate` الزامی نیستند. خروج از این وضعیت (از `UpdatePurchase`) به یک `InvoiceNumber` غیرخالی نیاز دارد |

### `SalesStatusEnum` (وضعیت سند فروش)
| مقدار | معنی |
|---|---|
| 0 | در انتظار (PENDING) |
| 1 | در حال پردازش (PROCESSING) |
| 2 | تحویل‌جزئی (PARTIALLY_DELIVERED) |
| 3 | تحویل‌شده (DELIVERED) |
| 4 | مرجوع‌شده (RETURNED) |
| 5 | لغو‌شده (CANCELLED) |
| 6 | ارسال‌شده کامل (SHIPPED) |
| 7 | پیش‌فاکتور (PROFORMA) — مشتری هنوز کامل پرداخت نکرده؛ فاکتور رسمی و شماره‌اش وجود ندارد. خروج از این وضعیت **دستی نیست**: به محض این‌که `paidAmount` در `CreateSale`/`UpdateSale` به `totalAmount` برسد، بکند خودش شماره فاکتور می‌سازد و وضعیت را به `PROCESSING` می‌برد؛ تلاش برای تغییر دستیِ وضعیت بدون پرداخت کامل رد می‌شود |

### فیلد `attachments` روی خرید و فروش (پیوست فاکتور)

`CreatePurchaseCommand`/`UpdatePurchaseCommand`/`CreateSaleCommand`/`UpdateSaleCommand` یک فیلد `attachments` می‌گیرند و `PurchaseDto`/`SaleDto` (فقط جزئیات) همان را در خواندن برمی‌گردانند — همان قرارداد JSON که `docs/invoice-attachment-requirements.fa.md` بخش ۳ نوشته بود:

نوشتن:
```json
{ "attachments": [ { "objectKey": "receiving/2026/08/3f1c....jpg", "fileName": "invoice.jpg", "note": "برگه‌ی اول" } ] }
```
`objectKey` الزامی است؛ `fileName`/`note` اختیاری‌اند. **`Update` آرایه را کامل جایگزین می‌کند**، نه اضافه — لیست نهایی همیشه باید کامل فرستاده شود.

خواندن:
```json
{ "attachments": [ { "id": 12, "objectKey": "receiving/2026/08/3f1c....jpg", "url": "https://...", "fileName": "invoice.jpg", "note": "برگه‌ی اول", "createdAt": "2026-09-01T10:12:00Z" } ] }
```

فایل می‌تواند تصویر یا PDF باشد (`POST api/File/UploadImage` حالا `.pdf`/`application/pdf` را هم می‌پذیرد).

### enum های مشترک مرجوعی خرید/فروش (`PurchaseReturn`/`SaleReturn`, بخش‌های ۱۰ و ۱۲)

مدل مرجوعی خرید و فروش هر دو از یک ساختار «Claim → Resolution → Effect» و یک مجموعه‌ی enum یکپارچه استفاده می‌کنند (جایگزین کامل مدل قدیمی‌تر با `PurchaseIssueTypeEnum`/`SalesReturnReasonEnum`/`SalesReturnIssueTypeEnum` و انواع تصمیم بسته‌ی جداگانه که در نسخه‌های قبلی این سند بود).

#### `ReturnClaimScopeEnum` (دامنه‌ی ادعا)
| مقدار | معنی |
|---|---|
| 0 | روی یک قلم سند (ON_ORDER) — `purchaseItemId`/`saleItemId` مقدار دارد |
| 1 | خارج از سند (OFF_ORDER) — بدون قلم مشخص؛ `offScopeKind` تعیین می‌کند کدام حالت |

#### `ReturnOffScopeKindEnum` (فقط وقتی `scope = OFF_ORDER`)
| مقدار | معنی |
|---|---|
| 0 | اضافی (EXCESS) — با قیمت‌واحد قلم سفارش قیمت‌گذاری می‌شود |
| 1 | فهرست‌نشده (UNLISTED) — هیچ ارجاعی به قلم سند ندارد |

#### `ReturnProblemEnum` (علت ادعا/مشاهده — هم برای مرجوعی خرید و هم فروش، هم برای علت ادعای اولیه و هم مشاهده‌ی فیزیکی هر نوبت اجرا)
| مقدار | معنی |
|---|---|
| 0 | کالای اشتباه ارسالی (WRONG_ITEM_SHIPPED) |
| 1 | کالای اشتباه در فاکتور (WRONG_ITEM_INVOICED) |
| 2 | کالای اشتباه در سفارش (WRONG_ITEM_ORDERED) |
| 3 | کسری ارسال (SHORT_SHIPPED) |
| 4 | اضافه ارسال (OVER_SHIPPED) |
| 5 | مغایرت تعداد در فاکتور (WRONG_QTY_INVOICED) |
| 6 | مغایرت تعداد در سفارش (WRONG_QTY_ORDERED) |
| 7 | معیوب (DEFECTIVE) |
| 8 | آسیب‌دیده در حمل (DAMAGED_IN_TRANSIT) |
| 9 | مشکل کیفیت (QUALITY_ISSUE) |
| 10 | منقضی (EXPIRED) |
| 11 | انصراف مشتری (CHANGED_MIND) |
| 12 | کالای فهرست‌نشده (UNLISTED_ITEM) |
| 13 | سایر (OTHER) |

#### `ReturnStatusEnum` (وضعیت کلی یک مرجوعی — خرید یا فروش)
| مقدار | معنی |
|---|---|
| 0 | باز (OPEN) — هنوز هیچ اثری اعمال نشده |
| 1 | در جریان (IN_PROGRESS) — حداقل یک اثر اعمال شده اما همه تمام نشده |
| 2 | نهایی‌شده (SETTLED) |
| 3 | رد‌شده (REJECTED) |
| 4 | لغو‌شده (CANCELLED) |

#### `ReturnEffectKindEnum` (نوع یک اثر پایه‌ای درون یک تصمیم)
| مقدار | معنی روی مرجوعی خرید | معنی روی مرجوعی فروش |
|---|---|---|
| 0 | کالا وارد می‌شود (GOODS_IN) — تامین‌کننده جایگزین می‌فرستد | کالا وارد می‌شود (GOODS_IN) — مشتری کالا را برمی‌گرداند |
| 1 | کالا خارج می‌شود (GOODS_OUT) — ما کالای معیوب را برمی‌گردانیم | کالا خارج می‌شود (GOODS_OUT) — ما جایگزین برای مشتری می‌فرستیم |
| 2 | وجه خارج می‌شود از ما (MONEY_OUT) | وجه خارج می‌شود از ما (MONEY_OUT) — بازپرداخت/اعتبار به مشتری |
| 3 | وجه وارد می‌شود به ما (MONEY_IN) — بازپرداخت از تامین‌کننده | وجه وارد می‌شود به ما (MONEY_IN) |

#### `ReturnEffectStatusEnum` (وضعیت اجرای یک اثر)
| مقدار | معنی |
|---|---|
| 0 | در انتظار (PENDING) — فقط اثرهای کالایی، تا اجرا با `ExecuteGoodsRound` |
| 1 | اعمال‌شده (APPLIED) — اثرهای مالی همیشه بلافاصله این‌جا هستند |
| 2 | باطل (VOID) — فعلاً هیچ‌جا تولید نمی‌شود |

#### `ReturnPaymentMethodEnum` (روش پرداخت یک اثر مالی)
| مقدار | معنی |
|---|---|
| 0 | نقدی (CASH) |
| 1 | چک (CHECK) |
| 2 | انتقال بانکی (TRANSFER) |
| 3 | نسیه/در حساب (ON_ACCOUNT) |
| 4 | اعتبار فروشگاهی (STORE_CREDIT) |
| 5 | ترکیبی (MIXED) — نیازمند `parts[]` |

### `ReportPeriodTypeEnum` (بازه‌ی زمانی گزارش، بخش ۱۸)
| مقدار | معنی |
|---|---|
| 0 | روزانه (Daily) |
| 1 | هفتگی (Weekly) — شنبه شروع هفته |
| 2 | ماهانه (Monthly) — بر اساس تقویم شمسی |
| 3 | فصلی (Quarterly) — بر اساس تقویم شمسی |
| 4 | شش‌ماهه (SemiAnnual) — بر اساس تقویم شمسی |
| 5 | سالانه (Annual) — بر اساس تقویم شمسی |

### `UserRolesEnum`
| مقدار | معنی |
|---|---|
| 1 | Admin |
| 2 | User |

(این enum صرفاً یک مرجع کمکی در کد است؛ نقش‌های واقعی در جدول `Role` دیتابیس نگه داشته می‌شوند — به بخش ۱۶ نگاه کنید.)

---

## 16. نکات و محدودیت‌های شناخته‌شده

این نکات برای جلوگیری از سردرگمی هنگام توسعه فرانت مهم هستند:

- **لیست نقش‌ها (Role) وجود ندارد:** فرم‌های `CreateUser`/`UpdateUser` به `roleId` نیاز دارند اما هیچ endpoint ای برای گرفتن لیست نقش‌های موجود در دیتابیس ارائه نشده. تا اضافه شدن چنین API، مقادیر معتبر `roleId` را باید مستقیماً از تیم بک‌اند بگیرید یا موقتاً هاردکد کنید.
- **ارسال کد OTP غیرفعال است:** فرآیند بازیابی رمز عبور (`ForgetPassword`) در حال حاضر کد تایید نمی‌خواهد؛ endpoint ارسال OTP در کد کامنت شده و در هیچ کنترلری expose نشده.
- **`UpdatePurchase` اقلام را ویرایش نمی‌کند** ولی **`UpdateSale` اقلام را ویرایش می‌کند** (بخش‌های ۹ و ۱۱) — این عدم‌تقارن عمدی است، به آن دقت کنید تا در فرم‌های ویرایش دو صفحه‌ی متفاوت طراحی کنید.
- **مدل مرجوعی خرید/فروش یکسان و صریح است:** هیچ‌کدام دیگر چیزی را حدس نمی‌زنند — هر جابه‌جایی فیزیکی کالا (چه جایگزین از تامین‌کننده، چه جایگزین به مشتری، چه برگشت کالای معیوب) با یک فراخوانی صریح `POST api/{PurchaseReturn|SaleReturn}/ExecuteGoodsRound` ثبت می‌شود (بخش‌های ۱۰ و ۱۲).
- **Enum ها همیشه عدد هستند** به‌جز `SupplierListDto.status` که رشته است — این تنها استثنا در کل سیستم است.
- **`EnsureProductCodes` و `EnsureInventoryCostLedger` ابزارهای نگهداری/مهاجرت هستند**، نه بخشی از گردش‌کار عادی محصول — در UI روزمره لینکی برایشان نگذارید.
- **سود خالص (`netProfit` در بخش ۱۸) بر اساس میانگین موزون هزینه محاسبه می‌شود، نه `Product.PurchasePrice`.** یعنی اگر یک محصول در دو خرید مختلف با قیمت‌های متفاوت خریداری شده باشد، هزینه‌ی هر فروش بر اساس میانگین موزونِ قیمت‌های خرید **تا همان لحظه‌ی فروش** حساب می‌شود؛ فیلد `purchasePrice` روی خود محصول فقط برای موجودی اولیه (بدون سابقه‌ی خرید ثبت‌شده) استفاده می‌شود.
- **`GetBarcodeSvg`، `GetProductLabelsPdf` و هر سه API زیر `Invoice`** خروجی JSON استاندارد ندارند و باید به‌صورت فایل (blob) گرفته شوند.

---

## 17. بارگذاری تصاویر (File)

تصاویر در یک فضای ذخیره‌سازی ابری (Liara Object Storage) نگهداری می‌شوند، نه روی سرور برنامه. باکت **خصوصی** است، بنابراین:

- چیزی که در دیتابیس ذخیره می‌شود **کلید شیء (ObjectKey)** است، مثلاً `products/2026/08/3f1c….jpg` — نه یک URL.
- هر URL که سرور به شما می‌دهد **امضاشده و موقتی** است (پیش‌فرض ۶۰ دقیقه). این URL را **هرگز ذخیره نکنید**؛ منقضی می‌شود.

### گردش‌کار دو مرحله‌ای

آپلود جدا از ثبت موجودیت انجام می‌شود، تا بتوانید قبل از ذخیره‌ی فرم پیش‌نمایش تصویر را نشان دهید:

۱. فایل را به `POST api/File/UploadImage` بفرستید → `objectKey` بگیرید.
۲. همان `objectKey` را در فیلد `imageUrl` دستور `CreateX`/`UpdateX` (که همچنان JSON ساده است) بفرستید.

### `POST api/File/UploadImage`

بدنه از نوع `multipart/form-data`:

| فیلد | نوع | توضیح |
|---|---|---|
| `file` | فایل | تصویر |
| `folder` | عدد | `ImageFolderEnum` — ۱ محصولات، ۲ مشتریان، ۳ تامین‌کنندگان، ۴ رسید کالا |

خروجی در `data`:

```json
{
  "objectKey": "products/2026/08/3f1c8a....jpg",
  "url": "https://<bucket>.storage.iran.liara.space/products/2026/08/3f1c8a....jpg?X-Amz-Signature=...",
  "fileName": "shelf.jpg",
  "contentType": "image/jpeg",
  "size": 84213
}
```

محدودیت‌ها (قابل تنظیم در `appsettings.json`، مقادیر پیش‌فرض): حداکثر **۵ مگابایت**، پسوندهای `.jpg .jpeg .png .webp .gif`. نقض هرکدام خطای ۴۰۰ با پیام فارسی می‌دهد و **هیچ چیزی آپلود نمی‌شود**. نام فایل شما فقط پسوندش استفاده می‌شود؛ کلید را سرور می‌سازد.

### `GET api/File/GetImageUrl?objectKey=...`

یک URL امضاشده‌ی تازه می‌سازد. برای صفحاتی که مدت زیادی باز می‌مانند یا پاسخ لیستی که کش شده، به‌جای گرفتن دوباره‌ی کل موجودیت از این استفاده کنید.

### `DELETE api/File/DeleteImage?objectKey=...`

شیء را از باکت پاک می‌کند. **توجه:** هنگام تعویض تصویرِ یک محصول/مشتری/تامین‌کننده، سرور تصویر قبلی را خودکار پاک **نمی‌کند** (ممکن است همان کلید جای دیگری هم استفاده شده باشد). اگر می‌خواهید فایل قدیمی حذف شود، خودتان این endpoint را صدا بزنید.

### در خروجی خواندن‌ها (Customer / Supplier / Product)

هم در جزئیات و هم در لیست، دو فیلد برمی‌گردد:

| فیلد | کاربرد |
|---|---|
| `imageKey` | مقدار پایدار. هنگام ویرایش، **این** را در `imageUrl` برگردانید تا تصویر حفظ شود. |
| `imageUrl` | URL امضاشده‌ی موقت، فقط برای `<img src>`. ذخیره نکنید. |

اگر موجودیت تصویر ندارد، هر دو `null` هستند. برای پاک‌کردن تصویر، در دستور ویرایش `imageUrl` را `null` بفرستید.

> اگر اشتباهاً `imageUrl` امضاشده را به‌جای `imageKey` برگردانید مشکلی پیش نمی‌آید — سرور آن را به کلید خام تبدیل می‌کند. ولی رفتار درست، برگرداندن `imageKey` است.

### تصاویر رسید کالا از تامین‌کننده

در `POST api/Purchase/ReceivePurchase` آرایه‌ی اختیاری `images` وجود دارد. این تصاویر **مربوط به کل نوبت رسید** هستند (عکس پالت هنگام رسیدن، کارتن آسیب‌دیده، بارنامه)، نه یک قلم خاص:

```json
{
  "purchaseId": 12,
  "items": [ /* ... */ ],
  "images": [
    { "objectKey": "receiving/2026/08/ab12....jpg", "fileName": "pallet.jpg", "note": "کارتن آسیب‌دیده" }
  ]
}
```

قبلش فایل‌ها را با `folder=4` آپلود کنید. این تصاویر:

- حتی اگر آن نوبت هیچ مغایرتی نداشته باشد (و در نتیجه هیچ مرجوعی ساخته نشود) ذخیره می‌شوند.
- اگر مرجوعی ساخته/تکمیل شده باشد، به آن هم لینک می‌شوند و در `GetPurchaseReturnDetail` زیر `receivingImages` دیده می‌شوند.
- اگر بعداً آن مرجوعی حذف شود، **تصاویر باقی می‌مانند** (لینک مرجوعی‌شان `null` می‌شود) — چون رسید کالا واقعاً اتفاق افتاده است.
- همه‌ی تصاویر یک خرید (همه‌ی نوبت‌ها) در `GetPurchaseReceivingInfo` زیر `receivingImages` برمی‌گردند، هرکدام با `url` امضاشده.

---

## 18. گزارش‌ها و سود خالص (Report)

کنترلر: `api/Report`. برخلاف بقیه‌ی API های لیست، این دو endpoint صفحه‌بندی (`page`/`take`) ندارند — به‌جای آن، خروجی را در بازه‌های زمانی («سطر»های گزارش) گروه‌بندی می‌کنند و کل بازه را یک‌جا برمی‌گردانند.

### مفهوم کلی

- به‌جای شش endpoint جدا برای روزانه/هفتگی/ماهانه/فصلی/شش‌ماهه/سالانه، **یک** endpoint برای فروش و **یک** endpoint برای خرید وجود دارد که نوع بازه را با پارامتر `periodType` می‌گیرند.
- بازه‌بندی ماهانه/فصلی/شش‌ماهه/سالانه **بر اساس تقویم شمسی** انجام می‌شود (مثلاً «ماه» یعنی فروردین تا اسفند، نه میلادی) — چون این تقویمی است که در بقیه‌ی سیستم (مثلاً کد محصول) هم استفاده شده. هفتگی از **شنبه** شروع می‌شود. `PeriodStart`/`PeriodEnd` در پاسخ همچنان `DateTime` میلادی استاندارد هستند (فقط مرز بازه‌ها بر اساس تقویم شمسی محاسبه شده‌اند)؛ اگر لازم بود تاریخ شمسی نمایش داده شود، خودتان آن‌ها را در فرانت تبدیل کنید.
- اگر `fromDate`/`toDate` نفرستید، پیش‌فرض **۱۲ ماه اخیر** در نظر گرفته می‌شود.
- `salesCount`/`totalInvoiceAmount` (در گزارش فروش) و `purchasesCount`/`totalInvoiceAmount` (در گزارش خرید) بر اساس **تاریخ فاکتور** (`invoiceDate`) گروه‌بندی می‌شوند. اما `revenue`/`costOfGoodsSold`/`netProfit` (فروش) و `totalReceivedValue` (خرید) بر اساس زمانی که کالا واقعاً **ارسال/دریافت فیزیکی** شده گروه‌بندی می‌شوند (همان لحظه‌ای که `ShipSale`/`ReceivePurchase` صدا زده شده) — چون هزینه‌ی واقعی کالا فقط در همان لحظه مشخص می‌شود. یعنی اگر فاکتور یک ماه و ارسالش ماه بعد باشد، این دو گروه از اعداد در دو سطر مختلف گزارش ظاهر می‌شوند؛ این یک تفاوت عمدی است، نه باگ.
- سود خالص فقط سمت فروش معنی دارد؛ گزارش خرید فیلد سود ندارد.

### `GET api/Report/GetSaleReport`

**Query:**
- `periodType` (اختیاری، پیش‌فرض ۲ = ماهانه — enum `ReportPeriodTypeEnum`، بخش ۱۵)
- `fromDate`, `toDate` (اختیاری، پیش‌فرض ۱۲ ماه اخیر)

**کاربرد:** نمودار/جدول فروش و سود خالص در داشبورد یا صفحه‌ی گزارش‌گیری.

**data:**
```json
{
  "periods": [
    {
      "periodStart": "2026-06-22T00:00:00",
      "periodEnd": "2026-07-22T00:00:00",
      "salesCount": 14,
      "totalInvoiceAmount": 620000000,
      "revenue": 540000000,
      "costOfGoodsSold": 410000000,
      "netProfit": 130000000
    }
  ]
}
```
- `revenue`: مجموع مبلغ خالص فروش‌های ارسال‌شده در این بازه (پس از کسر تخفیف قلمی) + مبلغ بازپرداخت‌های ثبت‌شده روی مرجوعی‌ها به‌صورت منفی.
- `costOfGoodsSold`: بهای تمام‌شده‌ی کالای فروخته‌شده در همین بازه، محاسبه‌شده با میانگین موزون هزینه در لحظه‌ی ارسال (نه قیمت خرید فعلی محصول).
- `netProfit`: `revenue - costOfGoodsSold` (شامل اثر کالای جایگزین رایگان و بازپرداخت‌های مرجوعی هم می‌شود).

### `GET api/Report/GetPurchaseReport`

**Query:** همان `periodType`, `fromDate`, `toDate` بالا.

**کاربرد:** نمودار/جدول خرید در داشبورد یا صفحه‌ی گزارش‌گیری.

**data:**
```json
{
  "periods": [
    {
      "periodStart": "2026-06-22T00:00:00",
      "periodEnd": "2026-07-22T00:00:00",
      "purchasesCount": 6,
      "totalInvoiceAmount": 700000000,
      "totalReceivedValue": 650000000
    }
  ]
}
```
`totalReceivedValue`: ارزش واقعیِ کالای وارد‌شده به انبار در همین بازه (قیمت خرید هر قلم پس از تخفیف، ضرب در تعداد دریافتی) — ممکن است با `totalInvoiceAmount` یکی نباشد چون یکی بر اساس تاریخ فاکتور و دیگری بر اساس تاریخ دریافت فیزیکی است.
