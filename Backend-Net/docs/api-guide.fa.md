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
  "paymentDetails": [ /* در صورت پرداخت غیرنقدی */ ]
}
```
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

ثبت **دریافت فیزیکی** کالا از یک خرید در انبار — می‌توان چند بار (چند مرحله) برای یک خرید صدا زد (مثلاً وقتی محموله در چند نوبت می‌رسد).

**Body:**
```json
{
  "purchaseId": 100,
  "receivedDate": "2026-08-05T10:00:00",
  "receivingNote": "محموله اول",
  "items": [
    {
      "purchaseItemId": 1000,
      "receivedQuantity": 15,
      "issues": [
        { "type": 0, "quantity": 2, "note": "کسری در محموله" }
      ]
    }
  ]
}
```
- `purchaseItemId` باید از `items[].id` در `GetPurchaseDetail` یا `GetPurchaseReceivingInfo` گرفته شود.
- `receivedQuantity`: تعداد سالمی که وارد انبار می‌شود (به موجودی محصول اضافه می‌شود).
- `issues[]`: مغایرت‌های گزارش‌شده در همین قلم (کسری، آسیب‌دیده، اشتباه، منقضی، اضافی، سایر — بخش ۱۵). هر قلم باید حداقل `receivedQuantity` یا یک مغایرت داشته باشد.
- اگر مقدار وارد شده (دریافتی + مغایرت‌های غیر «اضافی») از باقیمانده‌ی قابل‌دریافت آن قلم بیشتر باشد، خطای ۴۰۰ می‌دهد؛ **باید همیشه قبل از این فراخوانی از `GetPurchaseReceivingInfo` مقدار باقیمانده را بگیرید و در UI محدودیت بگذارید.**
- مغایرت‌های گزارش‌شده به‌صورت خودکار یک «مرجوعی خرید» (`PurchaseReturn`) می‌سازند یا به مرجوعی باز موجود همان خرید اضافه می‌شوند — نیازی به فراخوانی جدا برای ساخت مرجوعی نیست.

**data خروجی:**
```json
{ "purchaseId": 100, "purchaseStatus": 2, "returnId": 55, "returnStatus": 0 }
```
`returnId`/`returnStatus` فقط اگر در این فراخوانی مغایرتی ثبت شده باشد یا مرجوعی باز از قبل وجود داشته باشد مقدار دارند، وگرنه `null`.

---

## 10. مرجوعی خرید (PurchaseReturn)

کنترلر: `api/PurchaseReturn`. این بخش مربوط به مغایرت‌هایی است که هنگام `ReceivePurchase` گزارش شده و باید برای‌شان تصمیم (بازپرداخت، جایگزینی، اعتبار یا ابطال) گرفته شود.

نکته‌ی کلی مهم: به ازای هر خرید، **حداکثر یک مرجوعی «باز» (وضعیت `PENDING` یا `COORDINATING`)** در آن واحد وجود دارد — همه‌ی مغایرت‌های جدید همان خرید به همین مرجوعی باز اضافه می‌شوند، مگر اینکه قبلی رد/لغو/تکمیل شده باشد.

### `GET api/PurchaseReturn/GetPurchaseReturnList`

**Query:** `page`, `take`, `search` (شماره مرجوعی/فاکتور/نام تامین‌کننده), `supplierId`, `status` (enum), `reason` (نوع مغایرت غالب), `fromDate`, `toDate`.

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
  "dominantIssueType": 0,
  "totalQuantity": 2,
  "totalAmount": 40000000
}
```

### `GET api/PurchaseReturn/GetPurchaseReturnDetail?id=55`

**کاربرد:** صفحه‌ی جزئیات مرجوعی، جایی که تک‌تک اقلام مغایرت‌دار و تصمیم‌های ثبت‌شده برای هرکدام دیده می‌شود، و از همین‌جا دکمه‌های «ثبت تصمیم»، «لغو»، «رد»، «بازگشایی»، «حذف» فعال/غیرفعال می‌شوند.

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
  "createdAt": "2026-08-05T10:00:00",
  "updatedAt": "2026-08-05T10:00:00",
  "status": 0,
  "totalAmount": 40000000,
  "finalizedRefundAmount": 0,
  "totalQuantity": 2,
  "allocatedQuantity": 0,
  "canDelete": true,
  "canCancel": true,
  "canReject": true,
  "canReopen": false,
  "items": [
    {
      "id": 700,
      "purchaseReturnId": 55,
      "purchaseItemId": 1000,
      "productId": 10,
      "productCode": "20260814-000010",
      "productName": "یخچال دو درب",
      "unit": "عدد",
      "unitPrice": 20000000,
      "issueType": 0,
      "quantity": 2,
      "lineTotal": 40000000,
      "allocatedQuantity": 0,
      "remainingQuantity": 2,
      "note": "کسری در محموله",
      "createdAt": "2026-08-05T10:00:00",
      "decisions": []
    }
  ]
}
```
فیلدهای `canDelete`/`canCancel`/`canReject`/`canReopen` مستقیماً می‌گویند کدام دکمه‌ها باید فعال باشند — دیگر لازم نیست فرانت خودش قانون فعال/غیرفعال‌بودن دکمه را حساب کند.

برای ثبت تصمیم روی یک قلم، از `id` همان قلم در آرایه‌ی `items` (اینجا `700`) به‌عنوان `purchaseReturnItemId` استفاده می‌شود، نه `purchaseItemId`.

### `GET api/PurchaseReturn/GetPurchaseReceivingInfo?purchaseId=100`

**کاربرد:** endpoint اصلی صفحه‌ی «دریافت خرید در انبار». قبل از باز کردن فرم `ReceivePurchase`، همیشه این API را صدا بزنید تا بدانید هر قلم چقدر باقیمانده برای دریافت دارد و چه مغایرت‌های حل‌نشده‌ای از قبل ثبت شده.

**data:**
```json
{
  "purchaseId": 100,
  "invoiceNumber": "INV-1001",
  "invoiceDate": "2026-08-01T00:00:00",
  "status": 1,
  "supplierId": 1,
  "supplierName": "شرکت آلفا",
  "activePurchaseReturnId": 55,
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
      "settledQuantity": 0,
      "openIssueQuantity": 2,
      "receivableQuantity": 3,
      "openIssues": [
        { "purchaseReturnItemId": 700, "type": 0, "quantity": 2, "decidedQuantity": 0, "note": "کسری در محموله" }
      ]
    }
  ]
}
```
`receivableQuantity` یعنی چه مقدار دیگر از این قلم می‌تواند به‌عنوان دریافتی سالم یا مغایرت جدید (غیر از «اضافی») ثبت شود — این را برای محدود کردن ورودی فرم `ReceivePurchase` استفاده کنید.

### `POST api/PurchaseReturn/AddPurchaseReturnDecision`

ثبت یک تصمیم (بازپرداخت/جایگزینی/اعتبار/ابطال) برای یک قلم مرجوعی مشخص.

**Body:**
```json
{
  "purchaseReturnItemId": 700,
  "decisionType": 0,
  "quantity": 2,
  "refundAmount": 40000000,
  "note": "بازپرداخت کامل کسری"
}
```
- `purchaseReturnItemId`: همان `id` قلم در `GetPurchaseReturnDetail` یا `openIssues[].purchaseReturnItemId` در `GetPurchaseReceivingInfo`.
- `refundAmount`: اختیاری؛ فقط برای `decisionType = REFUND` معنی دارد. اگر نفرستید، سرور خودش از `تعداد × قیمت‌واحد` حساب می‌کند.
- مجموع `quantity` تصمیم‌های ثبت‌شده روی یک قلم نمی‌تواند از `quantity` خود قلم بیشتر شود.

**قید مهم برای UI — انواع تصمیم مجاز به ازای نوع مغایرت** (اگر ترکیب نامعتبر فرستاده شود، سرور ۴۰۰ می‌دهد، پس بهتر است دکمه‌های نامعتبر اصلاً در UI نشان داده نشوند):

| نوع مغایرت (`issueType`) | تصمیم‌های مجاز |
|---|---|
| کسری (`SHORTAGE`) / کالای اشتباه (`WRONG_ITEM`) | بازپرداخت، جایگزینی، اعتبار |
| اضافی (`EXCESS`) | بازپرداخت، اعتبار (جایگزینی معنی ندارد) |
| آسیب‌دیده / معیوب / منقضی / سایر | بازپرداخت، جایگزینی، اعتبار، ابطال |

**data خروجی:** `{ "returnId": 55, "returnStatus": 1 }`

### `DELETE api/PurchaseReturn/RemovePurchaseReturnDecision?id=900`

حذف یک تصمیم — **فقط وقتی که آن تصمیم هنوز `AWAITING` است** (یعنی از نوع «جایگزینی» و کالای جایگزین هنوز نرسیده). تصمیم‌های قطعی‌شده (بازپرداخت/اعتبار/ابطال، یا جایگزینی‌ای که تحویل شده) دیگر قابل حذف نیستند.

### `POST api/PurchaseReturn/CancelPurchaseReturn`

**Body:** `{ "id": 55 }` — فقط برای مرجوعی‌هایی که هنوز هیچ تصمیمی روی‌شان ثبت نشده (`canCancel: true`).

### `POST api/PurchaseReturn/RejectPurchaseReturn`

**Body:** `{ "id": 55 }` — مشابه لغو، اما با معنای «رد شد» (مثلاً تامین‌کننده مغایرت را قبول نکرد).

### `POST api/PurchaseReturn/ReopenPurchaseReturn`

**Body:** `{ "id": 55 }` — فقط برای مرجوعی‌های رد‌شده (`canReopen: true`)؛ آن را دوباره به حالت باز/در جریان برمی‌گرداند.

### `DELETE api/PurchaseReturn/DeletePurchaseReturn?id=55`

حذف کامل (نه نرم) — فقط وقتی هنوز هیچ تصمیمی ثبت نشده باشد.

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
  ]
}
```

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
  "items": [
    { "saleItemId": 3000, "shippedQuantity": 2, "productUnitBarcodes": null }
  ]
}
```
- `saleItemId`: از `items[].id` در `GetSaleDetail`.
- `shippedQuantity`: نباید از باقیمانده‌ی قابل‌ارسال آن قلم (`quantity - shippedQuantity` فعلی) یا از موجودی فعلی محصول بیشتر باشد.
- `productUnitBarcodes` (اختیاری): اگر انباردار بارکد دانه‌های خاصی را اسکن کرده، لیست آن بارکدها را بفرستید (باید دقیقاً به تعداد `shippedQuantity` باشد). اگر نفرستید، سرور خودش قدیمی‌ترین دانه‌های موجود را انتخاب می‌کند (FIFO).

**data خروجی:** `{ "saleId": 200, "saleStatus": 7 }` (مقدار enum وضعیت فروش، بخش ۱۵).

---

## 12. مرجوعی فروش (SaleReturn)

کنترلر: `api/SaleReturn`. این بخش، برخلاف مرجوعی خرید، از یک مدل **۴ سطحی** استفاده می‌کند:

```
SaleReturn (یک درخواست مرجوعی مشتری)
  └─ SaleReturnClaim (یک قلم ادعاشده توسط مشتری، با یک دلیل ادعا)
       └─ SaleReturnItem (نتیجه‌ی بازرسی فیزیکی انبار روی آن ادعا — ممکن است چند نتیجه با مشکلات متفاوت داشته باشد)
            └─ SaleReturnDecision (تصمیم نهایی روی هر نتیجه‌ی بازرسی)
```

نکته‌ی مهم برای UI: **«دلیل ادعای مشتری» (`Reason`) با «مشکل مشاهده‌شده توسط انباردار» (`IssueType`) دو مفهوم کاملاً جدا هستند.** مشتری وقتی درخواست مرجوعی می‌دهد فقط `Reason` را انتخاب می‌کند؛ `IssueType` فقط بعداً توسط انباردار هنگام بازرسی فیزیکی ثبت می‌شود (و می‌تواند `null` باشد یعنی کالا سالم بوده).

برخلاف مرجوعی خرید، برای یک فروش می‌تواند **چند مرجوعی فعال به‌طور همزمان** وجود داشته باشد (هر بار `CreateSaleReturn` یک رکورد کاملاً جدید می‌سازد).

### `GET api/SaleReturn/GetSaleReturnList`

**Query:** `page`, `take`, `search`, `customerId`, `status` (enum), `reason` (enum دلیل ادعا), `fromDate`, `toDate`.

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
  "dominantReason": 0,
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
  "createdAt": "2026-08-12T00:00:00",
  "updatedAt": "2026-08-12T00:00:00",
  "status": 0,
  "totalAmount": 25000000,
  "finalizedRefundAmount": 0,
  "totalQuantity": 1,
  "inspectedQuantity": 0,
  "allocatedQuantity": 0,
  "canDelete": true,
  "canCancel": true,
  "canReject": true,
  "canReopen": false,
  "claims": [
    {
      "id": 400,
      "saleReturnId": 80,
      "saleItemId": 3000,
      "productId": 10,
      "productCode": "20260814-000010",
      "productName": "یخچال دو درب",
      "unit": "عدد",
      "unitPrice": 25000000,
      "reason": 0,
      "claimedQuantity": 1,
      "inspectedQuantity": 0,
      "uninspectedQuantity": 1,
      "lineTotal": 25000000,
      "note": null,
      "createdAt": "2026-08-12T00:00:00",
      "inspectionItems": []
    }
  ]
}
```
مانند مرجوعی خرید، `canDelete`/`canCancel`/`canReject`/`canReopen` مستقیماً وضعیت دکمه‌ها را می‌گویند.

### `GET api/SaleReturn/GetSaleReturnInspectionInfo?saleId=200`

**کاربرد:** endpoint اصلی «صفحه‌ی بازرسی انبار». همه‌ی ادعاهای بازنشده/نیمه‌بازرسی‌شده‌ی مرجوعی‌های فعال یک فروش را یک‌جا نشان می‌دهد — قبل از باز کردن فرم `ConfirmReturnInspection` این را صدا بزنید.

**data:**
```json
{
  "saleId": 200,
  "invoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "claims": [
    {
      "saleReturnId": 80,
      "returnNumber": "SR-000080",
      "saleReturnClaimId": 400,
      "saleItemId": 3000,
      "productId": 10,
      "productCode": "20260814-000010",
      "productName": "یخچال دو درب",
      "unit": "عدد",
      "reason": 0,
      "claimedQuantity": 1,
      "inspectedQuantity": 0,
      "uninspectedQuantity": 1,
      "existingResults": []
    }
  ]
}
```

### `GET api/SaleReturn/GetReplacementShippingQueue`

**Query:** `saleId` (اختیاری — اگر خالی باشد، صف کل سیستم برمی‌گردد).

**کاربرد:** صفحه‌ی «صف ارسال کالای جایگزین» — همه‌ی تصمیم‌های نوع «جایگزینی» که هنوز کالایشان ارسال نشده، در کل سیستم یا برای یک فروش خاص.

**data[]:**
```json
{
  "saleReturnDecisionId": 950,
  "saleReturnId": 80,
  "returnNumber": "SR-000080",
  "saleId": 200,
  "saleInvoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "productId": 10,
  "productCode": "20260814-000010",
  "productName": "یخچال دو درب",
  "unit": "عدد",
  "quantity": 1,
  "shippedQuantity": 0,
  "remainingQuantity": 1,
  "createdAt": "2026-08-13T00:00:00"
}
```

### `POST api/SaleReturn/CreateSaleReturn`

ثبت درخواست مرجوعی مشتری (قبل از بازرسی فیزیکی).

**Body:**
```json
{
  "saleId": 200,
  "requestDate": "2026-08-12T00:00:00",
  "description": null,
  "claims": [
    { "saleItemId": 3000, "reason": 0, "claimedQuantity": 1, "note": "محصول کار نمی‌کند" }
  ]
}
```
- فروش باید در وضعیت «ارسال‌شده»، «تحویل‌جزئی» یا «تحویل‌شده» باشد.
- `claimedQuantity` مجموع همه‌ی مرجوعی‌های فعال قبلی همان قلم فروش را هم در نظر می‌گیرد (یعنی سرور جمع همه‌ی ادعاهای باز روی این قلم را چک می‌کند تا از باقیمانده‌ی همان قلم بیشتر نشود).

**data خروجی:** `{ "returnId": 80, "returnNumber": "SR-000080", "returnStatus": 0 }`

### `POST api/SaleReturn/ConfirmReturnInspection`

ثبت نتیجه‌ی بازرسی فیزیکی انبار روی یک یا چند ادعا — چندمرحله‌ای (می‌توان بخشی از یک ادعا را الان و بقیه را بعداً بازرسی کرد).

**Body:**
```json
{
  "saleReturnId": 80,
  "claims": [
    {
      "saleReturnClaimId": 400,
      "results": [
        { "issueType": null, "quantity": 0, "note": null },
        { "issueType": 0, "quantity": 1, "note": "صفحه‌نمایش شکسته" }
      ]
    }
  ]
}
```
- `issueType: null` یعنی همان مقدار سالم بوده و مستقیماً به موجودی فروشگاه برمی‌گردد.
- `issueType` غیر null یعنی مشکلی مشاهده شده (بخش ۱۵) و آن مقدار هرگز به موجودی قابل‌فروش برنمی‌گردد.
- مجموع `quantity` نتایج یک ادعا نباید از `uninspectedQuantity` همان ادعا (که در `GetSaleReturnInspectionInfo` یا `GetSaleReturnDetail` گرفته‌اید) بیشتر شود.

**data خروجی:** `{ "returnId": 80, "returnStatus": 1 }`

### `POST api/SaleReturn/AddSaleReturnDecision`

ثبت تصمیم نهایی (بازپرداخت/جایگزینی/اعتبار فروشگاهی/بدون جبران) روی یک نتیجه‌ی بازرسی‌شده.

**Body:**
```json
{
  "saleReturnItemId": 600,
  "decisionType": 0,
  "quantity": 1,
  "refundAmount": 25000000,
  "note": "بازپرداخت کامل"
}
```
- `saleReturnItemId`: از `claims[].inspectionItems[].id` در `GetSaleReturnDetail`.
- تنها ترکیب نامعتبر: تصمیم «جایگزینی» روی نتیجه‌ی بازرسی سالم (`issueType = null`) — چیزی برای جایگزینی وجود ندارد چون کالا سالم بوده.
- `refundAmount` اختیاری؛ فقط برای `REFUND` معنی دارد و در صورت نبود، خودکار حساب می‌شود.

**data خروجی:** `{ "returnId": 80, "returnStatus": 2 }`

### `DELETE api/SaleReturn/RemoveSaleReturnDecision?id=950`

فقط برای تصمیم‌های `AWAITING` (یعنی جایگزینی که هنوز ارسال نشده) قابل حذف است.

### `POST api/SaleReturn/ConfirmReplacementShipment`

ثبت ارسال (کامل یا جزئی) کالای جایگزین برای یک تصمیم مشخص از نوع «جایگزینی».

**Body:**
```json
{ "saleReturnDecisionId": 950, "shippedQuantity": 1, "note": null }
```
- `shippedQuantity` نباید از باقیمانده‌ی همان تصمیم یا از موجودی فعلی محصول بیشتر باشد.
- چندمرحله‌ای است (می‌توان بخشی امروز و بقیه بعداً ارسال کرد).

**data خروجی:** `{ "returnId": 80, "decisionStatus": 1 }`

### `POST api/SaleReturn/CancelSaleReturn`

**Body:** `{ "id": 80 }` — فقط اگر هنوز هیچ بازرسی‌ای روی آن انجام نشده (`canCancel: true`).

### `POST api/SaleReturn/RejectSaleReturn`

**Body:** `{ "id": 80 }` — همان شرط بالا.

### `POST api/SaleReturn/ReopenSaleReturn`

**Body:** `{ "id": 80 }` — فقط برای مرجوعی‌های رد‌شده.

### `DELETE api/SaleReturn/DeleteSaleReturn?id=80`

حذف کامل — فقط پیش از هرگونه بازرسی.

---

## 13. فاکتور PDF (Invoice)

کنترلر: `api/Invoice`. **مانند بخش Barcode، این سه API خروجی JSON ندارند** و مستقیماً فایل `application/pdf` برمی‌گردانند (باید با `responseType: 'blob'` صدا زده شوند). خطاها طبق ساختار استاندارد JSON خطا برمی‌گردند.

### `GET api/Invoice/GetSaleInvoicePdf?saleId=200`

فاکتور فروش کامل (شرکت، مشتری، اقلام، تخفیف، مالیات، جمع کل، مانده حساب) به‌صورت PDF فارسی راست‌به‌چپ.

### `GET api/Invoice/GetPurchaseInvoicePdf?purchaseId=100`

معادل فاکتور خرید، با اطلاعات تامین‌کننده.

### `GET api/Invoice/GetSaleReturnCreditNotePdf?saleReturnId=80`

برگه‌ی اعتباری مرجوعی — **فقط تصمیم‌های مالی (بازپرداخت یا اعتبار فروشگاهی)** را نشان می‌دهد؛ اگر مرجوعی هیچ تصمیم مالی‌شده‌ای نداشته باشد (مثلاً فقط تصمیم «جایگزینی» یا «بدون جبران» دارد)، این API خطای ۴۰۰ می‌دهد. یعنی دکمه‌ی «چاپ برگه اعتباری» را فقط وقتی نشان دهید که حداقل یک تصمیم `REFUND`/`STORE_CREDIT` روی مرجوعی ثبت شده باشد.

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
3. `POST api/Purchase/ReceivePurchase` → ثبت مقدار سالم دریافتی + مغایرت‌های احتمالی هر قلم (ممکن است چند بار برای محموله‌های مختلف تکرار شود).
4. اگر مغایرتی ثبت شده بود، یک مرجوعی خرید ساخته/به‌روزرسانی شده. آن را با `GET api/PurchaseReturn/GetPurchaseReturnDetail?id={returnId}` باز کنید.
5. برای هر قلم مغایرت‌دار، `POST api/PurchaseReturn/AddPurchaseReturnDecision` → تصمیم بگیرید (بازپرداخت/جایگزینی/اعتبار/ابطال).
6. اگر تصمیم «جایگزینی» بود، سرور خودش هنگام دریافت‌های بعدی همان خرید (مرحله ۳) تشخیص می‌دهد که مقدار اضافی همان کالای جایگزین است و تصمیم را خودکار می‌بندد — نیاز به فراخوانی جدا نیست (برخلاف فروش که در ادامه می‌بینیم).
7. وقتی همه‌ی مقادیر مغایرت تصمیم‌گیری و نهایی شدند، مرجوعی به‌صورت خودکار `RESOLVED` می‌شود.

### گردش‌کار کامل فروش تا مرجوعی مشتری

1. `POST api/Sale/CreateSale` → سند فروش ثبت می‌شود.
2. `GET api/Sale/GetSaleDetail?id={id}` → گرفتن `items[].id` هر قلم.
3. `POST api/Sale/ShipSale` → ارسال فیزیکی کالا (ممکن است چندمرحله‌ای).
4. اگر مشتری بعداً مشکلی گزارش داد: `POST api/SaleReturn/CreateSaleReturn` → ثبت درخواست مرجوعی (قبل از هر بازرسی فیزیکی).
5. وقتی کالا برگشت به انبار: `GET api/SaleReturn/GetSaleReturnInspectionInfo?saleId={id}` → دیدن ادعاهای در انتظار بازرسی، سپس `POST api/SaleReturn/ConfirmReturnInspection` → ثبت نتیجه‌ی فیزیکی (سالم یا نوع مشکل).
6. `GET api/SaleReturn/GetSaleReturnDetail?id={returnId}` → گرفتن `saleReturnItemId` هر نتیجه‌ی بازرسی.
7. `POST api/SaleReturn/AddSaleReturnDecision` → تصمیم نهایی (بازپرداخت/جایگزینی/اعتبار/بدون جبران) روی هر نتیجه.
8. اگر تصمیم «جایگزینی» بود، **برخلاف خرید**، اینجا باید صراحتاً `POST api/SaleReturn/ConfirmReplacementShipment` صدا زده شود تا کالای جایگزین از انبار خارج و برای مشتری ارسال شود (سرور اینجا چیزی را حدس نمی‌زند، چون خودِ انباردار باید صراحتاً بگوید فرستاد یا نه).
9. اگر تصمیم بازپرداخت یا اعتبار فروشگاهی بود، می‌توانید `GET api/Invoice/GetSaleReturnCreditNotePdf?saleReturnId={id}` را برای چاپ برگه‌ی اعتباری صدا بزنید.

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

### `PurchaseIssueTypeEnum` (نوع مغایرت در دریافت خرید)
| مقدار | معنی |
|---|---|
| 0 | کسری (SHORTAGE) |
| 1 | معیوب (DEFECTIVE) |
| 2 | آسیب‌دیده (DAMAGED) |
| 3 | کالای اشتباه (WRONG_ITEM) |
| 4 | منقضی (EXPIRED) |
| 5 | اضافی (EXCESS) |
| 6 | سایر (OTHER) |

### `PurchaseReturnStatusEnum` (وضعیت مرجوعی خرید)
| مقدار | معنی |
|---|---|
| 0 | در انتظار تصمیم (PENDING) |
| 1 | در حال هماهنگی (COORDINATING) |
| 2 | نهایی‌شده (RESOLVED) |
| 3 | رد‌شده (REJECTED) |
| 4 | لغو‌شده (CANCELLED) |

### `PurchaseReturnDecisionTypeEnum` (نوع تصمیم مرجوعی خرید)
| مقدار | معنی |
|---|---|
| 0 | بازپرداخت (REFUND) |
| 1 | جایگزینی (REPLACEMENT) |
| 2 | اعتبار (CREDIT) |
| 3 | ابطال/بدون جبران (WRITE_OFF) |

### `PurchaseReturnDecisionStatusEnum` (وضعیت یک تصمیم مرجوعی خرید)
| مقدار | معنی |
|---|---|
| 0 | در انتظار (AWAITING) — فقط برای جایگزینی که هنوز نرسیده |
| 1 | نهایی (RESOLVED) |

### `SalesReturnReasonEnum` (دلیل ادعای مشتری هنگام درخواست مرجوعی)
| مقدار | معنی |
|---|---|
| 0 | معیوب (DEFECTIVE) |
| 1 | کالای اشتباه (WRONG_ITEM) |
| 2 | آسیب در حمل (DAMAGED_IN_TRANSIT) |
| 3 | انصراف مشتری (CHANGED_MIND) |
| 4 | مشکل کیفیت (QUALITY_ISSUE) |
| 5 | سفارش اضافی (EXCESS_ORDER) |
| 6 | سایر (OTHER) |

### `SalesReturnIssueTypeEnum` (مشکل مشاهده‌شده توسط انباردار هنگام بازرسی — nullable)
| مقدار | معنی |
|---|---|
| `null` | سالم بود (به موجودی برمی‌گردد) |
| 0 | معیوب (DEFECTIVE) |
| 1 | کالای اشتباه (WRONG_ITEM) |
| 2 | آسیب در حمل (DAMAGED_IN_TRANSIT) |
| 3 | مشکل کیفیت (QUALITY_ISSUE) |
| 4 | سایر (OTHER) |

### `SaleReturnStatusEnum` (وضعیت مرجوعی فروش)
| مقدار | معنی |
|---|---|
| 0 | در انتظار بازرسی (PENDING_INSPECTION) |
| 1 | در حال هماهنگی (COORDINATING) |
| 2 | نهایی‌شده (RESOLVED) |
| 3 | رد‌شده (REJECTED) |
| 4 | لغو‌شده (CANCELLED) |

### `SaleReturnDecisionTypeEnum` (نوع تصمیم مرجوعی فروش)
| مقدار | معنی |
|---|---|
| 0 | بازپرداخت (REFUND) |
| 1 | جایگزینی (REPLACEMENT) |
| 2 | اعتبار فروشگاهی (STORE_CREDIT) |
| 3 | بدون جبران (NO_COMPENSATION) |

### `SaleReturnDecisionStatusEnum` (وضعیت یک تصمیم مرجوعی فروش)
| مقدار | معنی |
|---|---|
| 0 | در انتظار ارسال (AWAITING) — فقط برای جایگزینی |
| 1 | نهایی (RESOLVED) |

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
- **جایگزینی در مرجوعی خرید خودکار، در مرجوعی فروش دستی است:** وقتی کالای جایگزین از تامین‌کننده می‌رسد، سرور خودش تشخیص می‌دهد (نیازی به فراخوانی جدا نیست)؛ اما وقتی باید کالای جایگزین برای مشتری ارسال شود، باید صراحتاً `ConfirmReplacementShipment` صدا زده شود.
- **Enum ها همیشه عدد هستند** به‌جز `SupplierListDto.status` که رشته است — این تنها استثنا در کل سیستم است.
- **`EnsureProductCodes` یک ابزار نگهداری/مهاجرت است**، نه بخشی از گردش‌کار عادی محصول — در UI روزمره لینکی برایش نگذارید.
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
