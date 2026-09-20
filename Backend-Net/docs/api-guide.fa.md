# راهنمای کامل API بک‌اند WMS برای توسعه‌دهنده فرانت‌اند

این سند تمام endpoint های موجود در بک‌اند را با ورودی، خروجی، کاربرد و در صورت نیاز، ترتیب فراخوانی آن‌ها توضیح می‌دهد. جزئیات پیاده‌سازی و منطق داخلی سرور در این سند نیامده و فقط چیزی که برای اتصال فرانت به بک لازم است آورده شده.

> این سند دستی نوشته شده و مطابق کد فعلی پروژه در تاریخ تهیه سند است. اگر endpoint یا فیلدی در کد تغییر کرد، این فایل هم باید به‌روزرسانی شود.

---

## فهرست مطالب

1. [نکات عمومی و مشترک همه API ها](#1-نکات-عمومی-و-مشترک-همه-api-ها)
2. [حساب کاربری و ورود (Account)](#2-حساب-کاربری-و-ورود-account)
3. [کاربران (User)](#3-کاربران-user)
   - [واحدها (Department)](#۳ب-واحدها-department)
   - [تیم‌ها (Team)](#۳ج-تیم‌ها-team)
4. [مشتریان (Customer)](#4-مشتریان-customer)
5. [تامین‌کنندگان (Supplier)](#5-تامین‌کنندگان-supplier)
6. [دسته‌بندی محصولات (ProductCategory)](#6-دسته‌بندی-محصولات-productcategory)
7. [محصولات و بارکد دانه‌ها (Product)](#7-محصولات-و-بارکد-دانه‌ها-product)
8. [بارکد و برچسب (Barcode)](#8-بارکد-و-برچسب-barcode)
9. [خرید (Purchase)](#9-خرید-purchase)
10. [مرجوعی خرید (PurchaseReturn)](#10-مرجوعی-خرید-purchasereturn)
11. [فروش (Sale)](#11-فروش-sale)
    - [فروش اقساطی (SaleInstallment)](#۱۱ب-فروش-اقساطی-saleinstallment)
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

### قاعده‌ی جایگاه و نقش کاربر در چارت سازمانی

این قاعده مشترک بین بخش ۳ (کاربر)، بخش ۳ب (واحد) و بخش ۳ج (تیم) است و **هر سه صفحه‌ی لیست/جزئیات باید همین را ببینند** — دیگر ممکن نیست دو صفحه دو چیز متفاوت بگویند، چون هر دو نیمه‌ی چارت (`User.departmentId`/`User.teamId` از یک طرف و `headId`/`deputyId` روی تیم و واحد از طرف دیگر) همیشه با هم نوشته می‌شوند.

- هر کاربر **همیشه دقیقاً داخل یک واحد** است.
- داخل آن واحد **حداکثر یک نقش** دارد: مسئول واحد، جانشین واحد، مسئول تیم، جانشین تیم، یا عضو ساده. حالتی مثل «هم مسئول واحد و هم عضو یک تیم» اصلاً قابل بیان نیست.
- **مسئول/جانشین واحد عضو هیچ تیمی نیست** (`teamId = null`). اگر کاربری که در یک تیم بود مسئول واحد شود، از تیمش خارج می‌شود.
- **مسئول/جانشین تیم حتماً عضو همان تیم و همان واحد است.** بنابراین انتخاب کسی به‌عنوان مسئول یک تیم، خودش کاربر را به آن تیم (و واحدش) منتقل می‌کند — نیازی به فراخوانی جداگانه‌ی «اول کاربر را منتقل کن» نیست.
- **هر جابه‌جایی، جای قبلی را آزاد می‌کند.** انتقال کاربر بین تیم‌ها یا بین واحدها، هر نقش مسئول/جانشینی که روی *هر* تیم یا واحد دیگری داشت آزاد می‌کند. این همان باگی بود که باعث می‌شد بعد از تغییر واحد کاربر از صفحه‌ی کاربر، تیم قبلی همچنان او را مسئول خودش نشان دهد.
- **انتقال بین‌واحدی یک فراخوانی است:** کافی است `departmentId` مقصد و یکی از تیم‌های همان واحد را با هم بفرستید (`UpdateUser` یا `ChangeUserTeam`). دو مرحله لازم نیست.
- کسی که از نقش کنار گذاشته می‌شود (مثلاً `headId` تیم `null` فرستاده شود) **عضو ساده‌ی همان تیم باقی می‌ماند**، از تیم بیرون نمی‌رود.
- غیرفعال/حذف کردن کاربر (`isActive = false` در `UpdateUser`، یا `DeleteUser`) هم همه‌ی نقش‌هایش را آزاد می‌کند.

خطاهای ۴۰۰ این قاعده: تیمی که به آن واحد تعلق ندارد، نقش تیمی بدون `teamId`، و نقش واحد برای کاربری که هم‌زمان داخل یک تیم گذاشته شده.

### `GET api/User/GetUserInfo`

اطلاعات کاربر **جاری** (همانی که با توکن لاگین کرده). بدون پارامتر ورودی (اطلاعات از توکن استخراج می‌شود).

**کاربرد:** بعد از لاگین یا رفرش صفحه، برای گرفتن نام/جایگاه سازمانی کاربر جاری و نمایش در هدر اپ.

**data خروجی:**
```json
{
  "id": 1,
  "username": "ali.rezaei",
  "personelCode": "1001",
  "firstName": "علی",
  "lastName": "رضایی",
  "departmentId": 2,
  "departmentName": "انبار",
  "teamId": 7,
  "teamName": "تیم شب",
  "role": 3,
  "roleTitle": "مسئول تیم",
  "isActive": true
}
```
`role` از `OrgRoleEnum` است (بخش ۱۵) و `roleTitle` متن فارسی آماده‌ی نمایش همان مقدار.

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
  "personelCode": "1002",
  "departmentId": 2,
  "teamId": 7,
  "role": 4,
  "roleTitle": "جانشین تیم",
  "isActive": true
}
```

### `GET api/User/GetUserList`

لیست کارمندان، صفحه‌بندی‌شده. پارامترها: `page`, `take`, `fullName`, `personelCode`, `departmentId`, `teamId`, `isActive`.

**data خروجی:** `{ "userList": [...], "page": { ... } }` — هر سطر:
```json
{
  "id": 5,
  "firstName": "سارا",
  "lastName": "محمدی",
  "username": "sara.m",
  "personelCode": 1002,
  "departmentId": 2,
  "departmentName": "انبار",
  "teamId": 7,
  "teamName": "تیم شب",
  "role": 4,
  "roleTitle": "جانشین تیم",
  "isActive": true
}
```
`role` مستقیماً از خودِ `headId`/`deputyId` تیم و واحد خوانده می‌شود، نه از یک ستون جدا — به همین دلیل این لیست هیچ‌وقت با صفحه‌های تیم/واحد اختلاف پیدا نمی‌کند.

### `POST api/User/CreateUser`

ایجاد کاربر جدید.

**Body:**
```json
{
  "fisrtName": "سارا",
  "lastName": "محمدی",
  "username": "sara.m",
  "password": "Passw0rd!",
  "departmentId": 2,
  "teamId": 7
}
```
(دقت کنید نام فیلد اشتباه تایپی `fisrtName` است — همین‌طور در کد فعلی وجود دارد.)

قوانین: `firstName`/`lastName` فقط فارسی، `username` فقط انگلیسی، `password` مطابق قانون رمز عبور بخش ۲، و `teamId` (اختیاری) باید متعلق به همان `departmentId` باشد.

کاربر تازه‌ساخته‌شده هیچ نقشی ندارد (`role = 0`). برای دادن نقش، بعد از ساخت از `UpdateUser`/`ChangeUserTeam` یا از صفحه‌ی تیم/واحد استفاده کنید.

### `PUT api/User/UpdateUser`

ویرایش کاربر موجود، شامل جایگاه سازمانی او.

**Body:**
```json
{
  "id": 5,
  "firstName": "سارا",
  "lastName": "محمدی",
  "username": "sara.m",
  "departmentId": 3,
  "teamId": 12,
  "role": 3,
  "isActive": true
}
```
- `departmentId` الزامی، `teamId` اختیاری (`null` یعنی عضو هیچ تیمی نیست).
- `role` **اختیاری** است (`OrgRoleEnum`، بخش ۱۵). اگر نفرستید:
  - اگر کاربر جابه‌جا نشده باشد، نقش فعلی‌اش **حفظ می‌شود** (یک ویرایش ساده‌ی نام، کسی را برکنار نمی‌کند)،
  - و اگر جابه‌جا شده باشد، نقش قبلی آزاد و کاربر عضو ساده می‌شود.
- برای ارتقا/برکناری از همین صفحه، `role` را صریحاً بفرستید (`0` یعنی عضو ساده).
- قاعده‌ی کامل در ابتدای همین بخش آمده است.

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

همراه با حذف، **همه‌ی نقش‌های مسئول/جانشین آن کاربر روی هر تیم و هر واحد آزاد می‌شود.**

### `PUT api/User/ChangeUserTeam`

معادل تخصصی‌شده‌ی همان بخشِ سازمانیِ `UpdateUser` (بدون دست زدن به نام/نام‌کاربری).

**Body:**
```json
{
  "userId": 5,
  "departmentId": 2,
  "teamId": 7,
  "isHead": false,
  "isDeputy": true
}
```
- `teamId` اختیاری است (`null` یعنی کاربر عضو هیچ تیمی نیست، ولی همچنان عضو یک واحد است).
- `isHead`/`isDeputy` **روی تیم اعمال می‌شوند اگر `teamId` فرستاده شود، و در غیر این صورت روی واحد.**
- هر دو نمی‌توانند همزمان `true` باشند (۴۰۰).
- هر دو `false` یعنی «عضو ساده» — نقش قبلی آزاد می‌شود. برخلاف `UpdateUser`، اینجا نقش هیچ‌وقت ضمنی حفظ نمی‌شود، چون این API مخصوص تغییر همین جایگاه است.
- بقیه‌ی قواعد (آزاد شدن جای قبلی، انتقال بین‌واحدی یک‌مرحله‌ای، بیرون آمدن مسئول واحد از تیم) دقیقاً همان قاعده‌ی ابتدای این بخش است.

---

## ۳ب. واحدها (Department)

کنترلر: `api/Department` — نیاز به Authorize.

| متد | مسیر | توضیح |
|---|---|---|
| GET | `api/Department/GetDepartmentList` | صفحه‌بندی‌شده؛ فیلترهای `name`، `headName`. هر سطر: `id`, `name`, `headName`, `deputyName`, `teamCount`, `userCount` |
| GET | `api/Department/GetDepartmentDetail?id=2` | `id`, `name`, `headId`, `headName`, `deputyId`, `deputyName`, و `teams[]` (هر تیم با مسئول/جانشین خودش) |
| POST | `api/Department/CreateDepartment` | `{ "name": "انبار", "headId": 5, "deputyId": null }` |
| PUT | `api/Department/UpdateDepartment` | `{ "id": 2, "name": "انبار", "headId": 5, "deputyId": 9 }` |
| DELETE | `api/Department/DeleteDepartment?id=2` | حذف نرم؛ اگر واحد تیم فعال یا کارمند فعال داشته باشد ۴۰۰ می‌گیرید |

- `headId`/`deputyId` **وضعیت نهایی** واحد هستند: هرکس نامش بیاید به این واحد منتقل می‌شود و **از تیمش بیرون می‌آید** (مسئول واحد عضو هیچ تیمی نیست)، و هر جای دیگری که داشته آزاد می‌شود. هرکس حذف شود، عضو ساده‌ی همان واحد باقی می‌ماند.
- `headId == deputyId` خطای ۴۰۰ است.
- **تغییر رفتار:** پیش‌تر `CreateDepartment` با `headId` مستقیماً رد می‌شد («اول واحد را بساز، بعد کاربر را منتقل کن، بعد نقش بده» = سه فراخوانی). حالا در همان یک فراخوانی کاربر منتقل و نقش‌دار می‌شود.

## ۳ج. تیم‌ها (Team)

کنترلر: `api/Team` — نیاز به Authorize.

| متد | مسیر | توضیح |
|---|---|---|
| GET | `api/Team/GetTeamList` | صفحه‌بندی‌شده؛ فیلترهای `name`، `departmentId`. هر سطر: `id`, `name`, `departmentName`, `headName`, `deputyName`, `userCount` |
| GET | `api/Team/GetTeamDetail?id=7` | `id`, `name`, `departmentId`, `departmentName`, `headId`, `headName`, `deputyId`, `deputyName` |
| POST | `api/Team/CreateTeam` | `{ "name": "تیم شب", "departmentId": 2, "headId": 5, "deputyId": null }` |
| PUT | `api/Team/UpdateTeam` | `{ "id": 7, "name": "تیم شب", "headId": 5, "deputyId": 9 }` (تیم بین واحدها جابه‌جا نمی‌شود) |
| DELETE | `api/Team/DeleteTeam?id=7` | حذف نرم؛ اگر تیم کارمند فعال داشته باشد ۴۰۰ می‌گیرید |

- `headId`/`deputyId` **وضعیت نهایی** تیم هستند: هرکس نامش بیاید **به این تیم و واحدش منتقل می‌شود** و هر نقش دیگری که داشت (مسئولیت تیم قبلی، مسئولیت/جانشینی واحد) آزاد می‌شود. هرکس حذف شود، عضو ساده‌ی همان تیم باقی می‌ماند.
- `headId == deputyId` خطای ۴۰۰ است.
- **تغییر رفتار:** پیش‌تر لازم بود کاربر از قبل عضو همان واحد باشد وگرنه ۴۰۰ می‌گرفتید. حالا انتخاب او خودش انتقال را انجام می‌دهد.

---

## 4. مشتریان (Customer)

کنترلر: `api/Customer` — نیاز به Authorize. CRUD استاندارد.

### `GET api/Customer/GetCustomerList`

**پارامترهای Query:** `page`, `take`, `id` (فیلتر روی شناسه‌ی دقیق), `fullName` (جستجو در نام یا نام‌خانوادگی), `minBalance`, `maxBalance`, `balanceType` (✅ از قبل پیاده‌سازی شده بود، فقط اینجا مستند نشده بود — `BalanceTypeEnum?`, بخش ۱۵).

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

**Query:** `page`, `take`, `fromBalance`, `toBalance`, `companyNameOrContactName`, `balanceType`
(✅ از قبل پیاده‌سازی شده بود، فقط اینجا مستند نشده بود — `BalanceTypeEnum?`, بخش ۱۵). توجه:
پارامترهای این endpoint اسم متفاوتی نسبت به `GetCustomerList` دارند برای همان مفاهیم
(`fromBalance`/`toBalance`/`companyNameOrContactName` در برابر `minBalance`/`maxBalance`/
`fullName`) — این عمدی نیست، فقط دو feature جدا با یک الگو نوشته شده‌اند؛ فرانت هر دو را درست
می‌فرستد.

**data.supplierList[]:**
```json
{ "id": 1, "companyName": "شرکت آلفا", "fullName": "حسین کریمی", "balanceType": 0, "status": "طلبکار" }
```
توجه: در این DTO خاص، `status` یک رشته است، نه عدد — برخلاف قاعده‌ی کلی enum-به-عدد در بقیه‌ی
سیستم. این تنها استثنا است، به آن دقت کنید. **به‌روزرسانی ۲۰۲۶-۰۹-۰۱:** قبلاً این رشته حاصل
`BalanceType.ToString()` بود و نام انگلیسی عضو enum را برمی‌گرداند (`"Creditor"`). حالا از همان
extension method پروژه (`Common.Extensions.EnumExtensions.GetDescription()`, بر پایه‌ی attribute
`[Description]`) استفاده می‌کند و متن فارسی همان چیزی را برمی‌گرداند که این extension method در
جاهای دیگر سیستم (مثل `unit` روی خطوط مرجوعی) هم تولید می‌کند — یعنی مقدار این فیلد روی سیم عوض
شده (`"Creditor"` → `"طلبکار"`)، خودِ استثنا (رشته‌ای‌بودن) برطرف نشده. اگر جایی در فرانت به مقدار
انگلیسی قبلی متکی بود (نه فیلد عددی `balanceType` کنارش)، باید هماهنگ شود.

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

**Query:** `page`, `take`, `name` (هم روی نام فارسی و هم روی `englishName` جستجو می‌کند), `code`, `brand`, `productCategoryId`, `isLowOnStock` (true/false — فیلتر محصولات با موجودی زیر آستانه), `fromPrice`, `toPrice`, `isIncomplete` (true: فقط کالاهای ساخت سریع که هنوز تکمیل نشده‌اند).

هر ردیف علاوه بر فیلدهای زیر `requiresUnitTracking`، `isIncomplete` و `quarantinedCount` (دانه‌های قرنطینه — فیزیکاً در انبار، غیرقابل فروش، **جزو `stock` نیستند**) دارد؛ `GetProductDetail` هم همین سه فیلد را دارد.

**data.productList[]:**
```json
{
  "id": 10,
  "code": "20260814-000010",
  "name": "یخچال دو درب",
  "englishName": "Side-by-Side Refrigerator",
  "brand": "Samsung",
  "categoryName": "لوازم خانگی",
  "retailPrice": 25000000,
  "wholeSalePrice": 22000000,
  "stock": 12,
  "lowStockThreshold": 3
}
```

### `GET api/Product/GetProductDetail?id=10`

**کاربرد:** نمایش جزئیات محصول **و همچنین قدم اول قبل از ویرایش** (چون تمام فیلدهای قابل‌ویرایش را برمی‌گرداند).

**data:**
```json
{
  "id": 10,
  "name": "یخچال دو درب",
  "englishName": "Side-by-Side Refrigerator",
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
  "englishName": "Side-by-Side Refrigerator",
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

- `requiresUnitTracking` (bool، پیش‌فرض `false`): برای این کالا اسکن تک‌تک دانه‌ها لازم است. کالای فله `false` می‌ماند. اجبار روی **هر خروج کالا** اعمال می‌شود: `ShipSale` (ارسال و مازاد)، `GOODS_OUT` مرجوعی فروش و `GOODS_OUT` مرجوعی خرید — بدون بارکد ۴۰۰. ورود کالا (دریافت، جایگزین) دانه‌ی تازه می‌سازد و اسکن ندارد؛ آزادسازی/اسقاط قرنطینه جابه‌جایی داخلی است و اجباری نیست.
- **ساخت سریع در انبار** (کالای خارج از سند که در کاتالوگ نیست): همین endpoint با `"isIncomplete": true`. در این حالت فقط `name`، `unit` و `productCategoryId` الزامی‌اند؛ `brand` می‌تواند خالی و قیمت‌ها صفر باشند، و `stock` **باید صفر** باشد (کالا از راه `ReceivePurchase` → `unlistedItems` وارد می‌شود). کد و بارکد مثل هر کالای دیگری ساخته می‌شوند. کالا با `isIncomplete: true` می‌ماند تا واحد خرید کاملش کند.

### `PUT api/Product/UpdateProduct`

**Body:**
```json
{
  "id": 10,
  "name": "یخچال دو درب",
  "englishName": "Side-by-Side Refrigerator",
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

- `requiresUnitTracking` هم در ویرایش فرستاده می‌شود.
- **کالای ناقص (`isIncomplete: true`):** تا وقتی ناقص است، `brand` خالی و قیمت‌های صفر پذیرفته می‌شوند. پرچم فقط وقتی خودبه‌خود پاک می‌شود که `brand` غیرخالی و هر سه قیمت بزرگ‌تر از صفر شوند — اصلاح نام به‌تنها کالا را «کامل» نمی‌کند. برای کالای کامل همان قاعده‌ی قبلی برقرار است (برند و قیمت‌ها الزامی، ۴۰۰).

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

**data.productUnitList[]:** همان ساختار `unit` که در `ScanBarcode` دیدیم (بدون بخش product)، به‌علاوه‌ی مبدأ و مقصد دانه تا فرانت برای هر ردیف درخواست جدا نزند:
- `purchaseId`، `purchaseInvoiceNumber`، `supplierId`، `supplierName`: خریدی که دانه با آن وارد شد (برای موجودی اولیه و اصلاح دستی `null`).
- `saleId`، `saleInvoiceNumber`، `customerId`، `customerName`: آخرین فروشی که دانه با آن خارج شد (برای دانه‌ی هرگز فروخته‌نشده `null`).

### `GET api/Product/GetProductUnitHistory`

**Query:** `productUnitId` **یا** `barcode` (بارکد اسکن‌شده‌ی دانه، با هر قالب خامی که اسکنر می‌دهد). یکی از این دو الزامی است.

**کاربرد:** «این دانه الان کجاست و کجا بوده؟» — صفحه‌ی ردیابی دانه. خودِ ردیف دانه فقط وضعیت فعلی را دارد (مثلاً `saleItemId` با فروش بعدی بازنویسی می‌شود)؛ تاریخچه از دفتر حرکت دانه‌ها می‌آید که فقط افزوده می‌شود و هرگز ویرایش یا حذف نمی‌شود. هر ساخت یا تغییر وضعیت یک دانه — دریافت خرید، ارسال فروش، هر نوبت کالای مرجوعی، موجودی اولیه، اصلاح دستی — یک ردیف می‌نویسد.

**data:**
```json
{
  "unit": { /* همان ساختار ردیف GetProductUnitList */ },
  "movements": [
    {
      "id": 9001,
      "occurredAt": "2026-04-04T09:00:00",
      "fromStatus": null,
      "toStatus": 1,
      "reason": 3,
      "reasonTitle": "دریافت از تامین‌کننده",
      "documentKind": 1,
      "documentId": 100,
      "documentNumber": "INV-1405-0082",
      "purchaseItemId": 88,
      "saleItemId": null,
      "customerId": null,
      "customerName": null,
      "supplierId": 7,
      "supplierName": "پارس‌سازه",
      "userId": 3,
      "userName": "علی رضایی",
      "note": null
    }
  ]
}
```
- `movements` از قدیمی به جدید مرتب است. `fromStatus` روی ردیفی که دانه را ساخته `null` است.
- `reason`: `ProductUnitMovementReasonEnum`، `documentKind`: `DocumentKindEnum` (هر دو بخش ۱۵). `documentNumber` شماره‌ی فاکتور یا شماره‌ی مرجوعیِ همان سند است.
- `purchaseItemId`/`saleItemId` عکسِ لحظه‌ی همان حرکت‌اند، نه وضعیت فعلی دانه.
- `occurredAt` تاریخ خودِ رویداد است (تاریخ دریافت/ارسال/نوبت)، نه لحظه‌ی ثبت.
- دانه‌ی ناموجود: ۴۰۴.

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

**Query:** `page`, `take`, `invoiceNumber`, `supplierId`, `status` (enum، بخش ۱۵), `fromDate`, `toDate`, `fromPaymentDate`, `toPaymentDate`.

`fromDate`/`toDate` روی **تاریخ فاکتور** فیلتر می‌کنند و `fromPaymentDate`/`toPaymentDate` روی **مهلت پرداخت** (`paymentDate`) — برای گرفتن فهرست سررسیدهای نزدیک یا سررسیدگذشته.

**data.purchaseList[]:**
```json
{
  "id": 100,
  "invoiceNumber": "INV-1001",
  "supplierId": 1,
  "supplierName": "شرکت آلفا",
  "invoiceDate": "2026-08-01T00:00:00",
  "paymentDate": "2026-08-31T00:00:00",
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
  "paymentDate": "2026-08-31T00:00:00",
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
    { "id": 1, "driverFullName": "علی محمدی", "driverPhoneNumber": "09121234567", "vehiclePlate": "12ط34567", "createdAt": "2026-08-05T10:00:00" }
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
  "paymentDate": "2026-08-31T00:00:00",
  "description": null
}
```
اگر `paymentType` غیر از نقدی (`CASH = 0`) باشد، `paymentDetails` الزامی می‌شود.

`paymentDate` (**مهلت پرداخت**) اختیاری است — تاریخی که تا آن، خریدار فرصت تسویه دارد. برای معامله‌ی نقدی `null` بفرستید. اگر مقدار داشته باشد نباید قبل از `invoiceDate` باشد، وگرنه ۴۰۰ برمی‌گردد. در `GetPurchaseList`/`GetPurchaseDetail`/`GetSaleList`/`GetSaleDetail` برگردانده و روی PDF فاکتور هم چاپ می‌شود.

`invoiceDate` (**تاریخ فاکتور**) nullable است و **فقط وقتی `status` برابر `PROFORMA` (۰) باشد** می‌تواند `null` باشد. در هر وضعیت دیگری، `null` (یا مقدار پوچ `0001-01-01`) ۴۰۰ می‌دهد. در خروجی `GetPurchaseList`/`GetPurchaseDetail`/`GetSaleList`/`GetSaleDetail` هم برای ردیف‌های پیش‌فاکتور `null` برمی‌گردد (قبلاً `0001-01-01T00:00:00` بود). روی PDF فاکتور، اگر `null` باشد تاریخ ثبت سند چاپ می‌شود.

**کاربرد:** ثبت سند خرید از تامین‌کننده (هنوز کالا وارد انبار نشده — ورود فیزیکی با `ReceivePurchase` انجام می‌شود، بخش زیر).

### `PUT api/Purchase/UpdatePurchase`

**Body:**
```json
{
  "id": 100,
  "invoiceNumber": "INV-1001",
  "invoiceDate": "2026-08-01T00:00:00",
  "paymentDate": "2026-08-31T00:00:00",
  "status": 1,
  "paymentType": 0,
  "paymentDetails": [
    { "type": 2, "amount": 150000000, "paidAt": "2026-08-31T00:00:00", "checkNumber": "12345" }
  ],
  "totalAmount": 400000000,
  "paidAmount": 150000000,
  "description": null,
  "supplierId": 1
}
```
`paymentDetails` **جایگزینی کامل** است، نه افزودنی — مثل `attachments`: فهرست نهایی را بفرستید، هرچه نفرستید حذف می‌شود. اگر `paymentType` غیر نقدی باشد الزامی است (همان قاعده‌ی `CreatePurchase`). `purpose` از ورودی خوانده نمی‌شود و همیشه `NORMAL` ثبت می‌شود — خرید اقساطی وجود ندارد. در `GetPurchaseDetail` → `paymentDetails[]` برمی‌گردد.

**نکته‌ی مهم:** این API فقط فیلدهای سطح خرید را ویرایش می‌کند و **اقلام خرید (`items`) را نمی‌گیرد و تغییر نمی‌دهد**. برای ویرایش اقلام یا وضعیت دریافت باید از `ReceivePurchase` استفاده کرد. گردش‌کار: `GetPurchaseDetail` → پر کردن فرم با فیلدهای سطح بالا → `UpdatePurchase` با کل فیلدها + `id`.

### `DELETE api/Purchase/DeletePurchase?id=100`

حذف نرم خرید.

### `POST api/Purchase/ReceivePurchase`

ثبت **دریافت فیزیکی** کالا از یک خرید در انبار **با شمارش** — می‌توان چند بار (چند مرحله) برای یک خرید صدا زد. انباردار فقط آنچه را می‌بیند گزارش می‌کند: از هر قلم چند عدد رسید و چندتایش به چه دلیل خراب است، و کالاهایی که بدون قلم رسیده‌اند. تقسیم به «موجودی»، «قرنطینه‌ی سهم سفارش» و «مازاد» را سرور انجام می‌دهد.

> **تغییر مهم نسبت به نسخه‌های قدیمی‌تر این سند:** این API دیگر آرایه‌ی `issues[]` ندارد و هیچ مرجوعی‌ای به‌صورت خودکار نمی‌سازد. گزارش مغایرت (کسری، آسیب‌دیده، کالای اشتباه و ...) کاملاً جدا و صراحتاً با `POST api/PurchaseReturn/CreatePurchaseReturn` انجام می‌شود (بخش ۱۰).

**Body:**
```json
{
  "purchaseId": 100,
  "receivedDate": "2026-08-05T10:00:00",
  "receivingNote": "محموله اول",
  "driverFullName": "علی محمدی",
  "driverPhoneNumber": "09121234567",
  "vehiclePlate": "12ط34567",
  "items": [
    {
      "purchaseItemId": 1000,
      "arrivedQuantity": 25,
      "defects": [
        { "problem": 7, "quantity": 6, "note": "ایراد تولید" },
        { "problem": 8, "quantity": 4, "note": null }
      ]
    }
  ],
  "unlistedItems": [
    { "productId": 55, "arrivedQuantity": 5, "defects": [] }
  ],
  "images": []
}
```
- `purchaseItemId` باید از `items[].id` در `GetPurchaseDetail` یا `GetPurchaseReceivingInfo` گرفته شود.
- `driverPhoneNumber` باید فرمت موبایل ایران را داشته باشد (همان قاعده‌ی `IsMobileNumber`).
- `driverFullName`/`driverPhoneNumber`/`vehiclePlate`/`receivingNote` همگی اختیاری‌اند و هرکدام مستقل از بقیه ذخیره می‌شوند (یعنی می‌توانید فقط یکی را بفرستید) — هر نوبت `ReceivePurchase` که این فیلدها را داشته باشد یک ردیف تاریخچه‌ی تازه می‌سازد (`drivers[]`/`receivingNotes[]` در `GetPurchaseDetail`، بالا)، نه بازنویسی نوبت قبلی.
- `items[].arrivedQuantity`: کل تعدادی که از این قلم رسید (سالم و خراب). **بیشتر از باقیمانده‌ی قلم هم مجاز است** — رسیدنِ ۲۵ عدد در برابر ۲۰ سفارش خطا نیست، واقعیت است و ثبت می‌شود.
- `items[].defects[]`: چندتا از همان رسیده‌ها خراب‌اند، به تفکیک `problem` (`ReturnProblemEnum`، بخش ۱۵) و با یادداشت اختیاری. مجموعشان نمی‌تواند از `arrivedQuantity` بیشتر باشد.
- `unlistedItems[]`: کالایی که در این خرید **هیچ قلمی ندارد** (`productId` باید در کاتالوگ وجود داشته باشد — اگر نیست، اول با ساخت سریع کالا بسازید، بخش ۷). کالایی که در خرید قلم دارد اینجا ۴۰۰ می‌گیرد؛ مقدار اضافه‌اش را روی همان قلم بفرستید. هر درخواست باید دست‌کم یک `items` یا `unlistedItems` داشته باشد.
- **قاعده‌ی تقسیم («اول سالم»)** برای هر قلم — `S` باقیمانده‌ی قلم، `A` رسیده، `D` خراب، `H = A − D` سالم:

  | سهم | مقدار | دانه | روی قلم خرید (`receivedQuantity`) | ارزش |
  |---|---|---|---|---|
  | سالمِ سهم سفارش | `h = min(H, S)` | `IN_STOCK` — به `stock` اضافه می‌شود | بله | با قیمت خالص قلم وارد میانگین موزون |
  | خرابِ سهم سفارش | `d = min(D, S − h)` | `QUARANTINED` با علت `ON_ORDER` | بله — خریده‌شده حساب می‌شود | با قیمت خالص قلم، **بیرون** از میانگین (رویداد `PURCHASE_RECEIVED_QUARANTINED`) |
  | مازاد | `A − h − d` | `QUARANTINED` با علت `EXCESS` (به همان قلم نسبت داده می‌شود) | خیر | بدون ارزش — پولش داده نشده |

  سهم خرابِ سفارش به ترتیب ردیف‌های `defects` پر می‌شود و باقی هر ردیف مازاد است. کالای `unlistedItems` تماماً `QUARANTINED` با علت `UNLISTED`، بدون قلم و بدون ارزش است.
  این تنها جایی است که سرور به‌جای ثبت، تصمیم می‌گیرد: دانه‌های یک کالا از هم قابل تشخیص نیستند و هیچ‌کس نمی‌داند کدام‌شان «مال سفارش» است؛ «اول سالم» تنها قاعده‌ای است که بابت دانه‌ی خراب پول نمی‌دهیم وقتی دانه‌ی سالم مجانی در دست است.
- دانه‌های قرنطینه **جزو `stock` نیستند** و قابل فروش نیستند؛ فقط با تصمیم مرجوعی (عودت) از قرنطینه خارج می‌شوند. ادعای مرجوعی روی آن‌ها با «ثبت مغایرت» (`CreatePurchaseReturn`) ثبت می‌شود.
- هر مغایرت (خرابِ سهم سفارش، مازاد به تفکیک مشکل یا `OVER_SHIPPED` برای مازاد سالم، کالای خارج از سند) یک ردیف ماندگار در `discrepancies[]` از `GetPurchaseReceivingInfo` می‌سازد — برای پیش‌پرکردن فرم «ثبت مغایرت» و سابقه. **سقف ادعا از این ردیف‌ها خوانده نمی‌شود** (پایین، `CreatePurchaseReturn`).
- `images[]` (اختیاری): عکس‌های همان نوبت دریافت (پالت، کارتن آسیب‌دیده، بارنامه) — جزئیات کامل در بخش ۱۷.

**data خروجی:**
```json
{
  "purchaseId": 100,
  "purchaseStatus": 4,
  "lines": [ { "purchaseItemId": 1000, "healthyOnOrderQuantity": 15, "defectiveOnOrderQuantity": 5, "excessQuantity": 5 } ],
  "unlistedItems": [ { "productId": 55, "quarantinedQuantity": 5 } ]
}
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
- اثرهای کالایی (`GOODS_IN`/`GOODS_OUT`) با وضعیت `PENDING` ساخته می‌شوند و تا وقتی صراحتاً با `ExecuteGoodsRound` اجرا نشوند، به موجودی دست نمی‌زنند. اثرهای مالی (`MONEY_IN`/`MONEY_OUT`) اگر با `paidAt` ثبت شوند همان لحظه `APPLIED`‌اند، وگرنه `PENDING` می‌مانند تا `ExecuteMoneyEffect` (پایین).
- به ازای هر خرید می‌تواند **چند مرجوعی همزمان باز** وجود داشته باشد (برخلاف نسخه‌ی خیلی قدیمی این سند) — هر بار `CreatePurchaseReturn` یک رکورد کاملاً جدید می‌سازد.
- `ReceivePurchase` (بخش ۹) دیگر هیچ ارتباطی با ساخت مرجوعی ندارد؛ مرجوعی همیشه صراحتاً با `CreatePurchaseReturn` ساخته می‌شود.

### `GET api/PurchaseReturn/GetPurchaseReturnList`

**Query:** `page`, `take`, `search` (شماره مرجوعی/فاکتور/نام تامین‌کننده), `purchaseId`, `supplierId`, `status` (enum `ReturnStatusEnum`, بخش ۱۵), `problem` (enum `ReturnProblemEnum` — فیلتر روی هر یک از علت‌های ادعا), `fromDate`, `toDate`.

`purchaseId` برای دیدن **همه‌ی مرجوعی‌های ثبت‌شده روی یک خرید خاص** است — قرینه‌ی `saleId` در بخش ۱۲. **این پارامتر تا ۲۰۲۶-۰۹-۰۷ وجود نداشت**، یعنی هیچ راهی نبود که مرجوعی‌های یک خرید را کنار هم دید (سمت فروش از اول داشت).

**دیدن مرجوعی‌های مرتبط:** ترکیب `?purchaseId={id}` با فیلد `previousReturnId` روی هر ردیف کافی است تا زنجیره‌ی «مرجوعی دوم پیروِ مرجوعی اول است» را سمت کلاینت بسازید — سرور آرایه‌ی جداگانه‌ای از «مرجوعی‌های خواهر» برنمی‌گرداند و قرار هم نیست برگرداند. `previousReturnId` هنگام ثبت اعتبارسنجی می‌شود و حتماً به مرجوعیِ **همان خرید** اشاره می‌کند، پس زنجیره هیچ‌وقت از سند بیرون نمی‌زند.

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
  "previousReturnId": null,
  "status": 0,
  "problems": [8, 3],
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
  "previousReturnNumber": null,
  "status": 0,
  "totalAmount": 40000000,
  "quantity": 2,
  "decidedQuantity": 0,
  "canDelete": true,
  "canCancel": true,
  "canReject": true,
  "canReopen": false,
  "receivingImages": [],
  "claims": [
    {
      "id": 700,
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
  "quantity": 2,
  "note": "بازپرداخت کامل کسری",
  "decidedAt": "2026-08-05T11:00:00",
  "effects": [
    {
      "id": 1200,
      "direction": 3,
      "quantity": 0,
      "appliedQuantity": 0,
      "restockedQuantity": null,
      "productId": null,
      "productName": null,
      "amount": 40000000,
      "method": 0,
      "reference": null,
      "note": null,
      "status": 1,
      "appliedAt": "2026-08-05T11:00:00",
      "moneyParts": [],
      "history": []
    }
  ]
}
```
یک تصمیم می‌تواند تا سه اثر همزمان داشته باشد (مثلاً هم `GOODS_IN` هم `MONEY_IN` برای «بخشی جایگزین، بخشی بازپرداخت»)؛ `effects[]` هرکدام را جدا نشان می‌دهد. `direction` مقادیر `ReturnEffectDirectionEnum` (بخش ۱۵) است. اثرهای کالایی (`direction = 0`، `1`، `4` یا `5`) فیلدهای `quantity`/`appliedQuantity`/`restockedQuantity`/`productId` را پر می‌کنند و `amount`/`method` را `null` می‌گذارند؛ اثرهای مالی (`direction = 2` یا `3`) برعکس. اثرهای `4`/`5` (آزادسازی/اسقاط قرنطینه) `unitPrice` ندارند (`null`). تصمیم بخشش (`isWriteOff: true`) هیچ اثری ندارد.

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
  "direction": 0,
  "productId": 10,
  "productCode": "20260814-000010",
  "productName": "یخچال دو درب",
  "unit": "عدد",
  "quantity": 2,
  "appliedQuantity": 0,
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
      "stillOwedQuantity": 5,
      "quarantinedOnOrderQuantity": 2,
      "quarantinedExcessQuantity": 0
    }
  ],
  "unlistedItems": [
    { "productId": 55, "productCode": "20260901-000055", "productName": "شیر فلکه ۳ اینچ", "unit": "عدد", "quarantinedQuantity": 5 }
  ],
  "discrepancies": [
    { "id": 1, "purchaseItemId": 1000, "productId": 10, "productName": "یخچال دو درب", "custodyReason": 1, "problem": 7, "quantity": 2, "note": "ایراد تولید", "receivedAt": "2026-08-05T10:00:00" }
  ]
}
```
`stillOwedQuantity` یعنی چه مقدار دیگر از این قلم «سهم سفارش» است — برای راهنمایی فرم؛ **سقف ورودی نیست**، چون بیشتر از آن هم پذیرفته و به‌عنوان مازاد قرنطینه می‌شود.
- `quarantinedOnOrderQuantity`/`quarantinedExcessQuantity`/`unlistedItems[].quarantinedQuantity`: دانه‌هایی که **همین حالا** در قرنطینه‌اند (با علت `ON_ORDER`/`EXCESS`/`UNLISTED`) — همان عددی که سقف ادعای مرجوعی از آن محاسبه می‌شود.
- `discrepancies[]`: همه‌ی مغایرت‌های ثبت‌شده در نوبت‌های دریافت، از قدیم به جدید (`custodyReason`: `UnitCustodyReasonEnum`، بخش ۱۵). برای پیش‌پرکردن فرم «ثبت مغایرت» — یک ادعا برای هر ردیف یا گروه. این ردیف‌ها سابقه‌اند و با عودت یا تصمیم بعدی تغییر نمی‌کنند؛ مقدار قابل ادعا را از اعداد قرنطینه‌ی بالا بخوانید. توجه: این endpoint دیگر چیزی درباره‌ی مغایرت‌ها یا مرجوعی فعال نمی‌گوید (آن مسئولیت کاملاً به `GetPurchaseReturnPendingEffects`/`GetPurchaseReturnList` منتقل شده)؛ `receivingImages` هم اینجا و هم زیر `GetPurchaseReturnDetail` (فقط عکس‌های همان مرجوعی) برمی‌گردد، هرکدام با `url` امضاشده (بخش ۱۷).

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
- `scope` و `orderLineId` (بخش ۱۵):

  | نوع ادعا | `orderLineId` | `unitPrice` ذخیره‌شده | سهمیه‌ی قلم خرید را مصرف می‌کند؟ |
  |---|---|---|---|
  | `scope = 0` (ON_ORDER) | **الزامی** — `purchaseItemId` | همان مقدار ارسالی کلاینت (ممکن است قیمت خالص باشد) | بله |
  | `scope = 1` + `offScopeKind = 0` (EXCESS) | **الزامی** — قلمی که کالا «بیش از» آن رسیده | **باید دقیقاً برابر قیمت‌واحد همان قلم خرید باشد** — مقدار متفاوت ۴۰۰ می‌گیرد و پیام، قیمت درست را می‌گوید | خیر |
  | `scope = 1` + `offScopeKind = 1` (UNLISTED) | **نباید فرستاده شود** (وگرنه ۴۰۰) | همان مقدار ارسالی کلاینت | خیر |

  برای `scope = 0` (ON_ORDER)، `offScopeKind` باید `null` باشد؛ هر مقدار دیگری ۴۰۰ می‌گیرد (قبلاً بی‌صدا دور ریخته می‌شد).

- هر ادعایی که `orderLineId` دارد (ON_ORDER و EXCESS) باید به قلمی از **همین خرید** اشاره کند (وگرنه ۴۰۴ «آیتم خرید مورد نظر یافت نشد.») و `productId` آن باید همان کالای آن قلم باشد (وگرنه ۴۰۰ «کالای ادعاشده با کالای قلم خرید «…» مطابقت ندارد.»).
- برای ادعاهای `OFF_ORDER`، `productId` باید کالای موجودی باشد؛ در غیر این صورت ۴۰۰ «کالای انتخاب‌شده برای ادعای خارج از سند یافت نشد.» (قبلاً این حالت در ذخیره‌سازی به خطای ۵۰۰ می‌رسید).
- برای `scope = ON_ORDER`، مجموع `quantity` همه‌ی ادعاهای فعال قبلی + این درخواست روی همان قلم خرید نمی‌تواند از مقدار قابل‌مرجوع آن قلم بیشتر شود. ادعای EXCESS با اینکه `orderLineId` دارد در این سقف شمرده نمی‌شود.
- **سقف ادعاهای `OFF_ORDER`** — کالایی که واقعاً در قرنطینه نگه داشته‌ایم:
  - EXCESS: دانه‌های `QUARANTINED` با علت `EXCESS` روی همان قلم، منهای آنچه ادعاهای EXCESS باز روی همان قلم هنوز رزرو کرده‌اند.
  - UNLISTED: دانه‌های `QUARANTINED` با علت `UNLISTED` از همان کالا در همین خرید، منهای ادعاهای UNLISTED باز همان کالا.
  - «رزرو» یعنی مقدار ادعا منهای تصمیم‌هایی که همه‌ی اثرهایشان اجرا شده. بیش از سقف: ۴۰۰ با عدد قابل ادعا. پس **مازاد و کالای خارج از سند باید اول در `ReceivePurchase` ثبت شده باشند.**
  - تنها منبع این سقف علت نگهداری روی دانه‌هاست؛ `discrepancies[]` هیچ‌وقت در آن خوانده نمی‌شود.
- ادعای EXCESS در هیچ مرحله‌ی بعدی به حساب آن قلم نوشته نمی‌شود: `settledQuantity` قلم را جابه‌جا نمی‌کند و دانه‌های کالا را به آن قلم نسبت نمی‌دهد. اثرهای کالایی و مالی آن دقیقاً مثل هر ادعای دیگری عمل می‌کنند (`AddClaimResolution` و `ExecuteGoodsRound`، پایین).
- `problem`: enum یکپارچه‌ی `ReturnProblemEnum` (بخش ۱۵) — همان مقادیری که برای علت مرجوعی فروش هم استفاده می‌شود.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetPurchaseReturnDetail` (با `id`، `purchaseId`، `status`، `canCancel`/`canReject`/`canDelete`/`canReopen` و کل درخت `claims`).

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
    "moneyIn": { "method": 0, "amount": 40000000, "reference": null, "parts": null },
    "moneyOut": null
  }
}
```
- `composition.quantity`: چه مقدار از باقیمانده‌ی ادعا (`remainingQuantity` در `GetPurchaseReturnDetail`) با این تصمیم پوشش داده می‌شود.
- حداقل یکی از `goodsIn`/`goodsOut`/`moneyIn`/`moneyOut` باید مقدار داشته باشد؛ می‌توانند همزمان پر شوند (مثلاً هم بخشی جایگزین بیاید هم باقی‌مانده بازپرداخت شود).
- `goodsIn`/`goodsOut`: فهرستی از `{ "quantity": 2, "productId": null, "unitPrice": 20000000, "unitCost": null }`
  - `productId` اختیاری است و پیش‌فرض همان محصول ادعا را می‌گیرد.
  - `unitPrice` (ریال برای هر واحد) **اختیاری** است و هیچ منطقی آن را نمی‌خواند: ارزش توافق‌شده‌ی معامله با طرف مقابل، که فقط برای سابقه و نمایش ثبت می‌شود. `0` و نفرستادن هر دو مجازند. جایی به کار می‌آید که یک تصمیم چند قلم کالا زیر یک اثر مالی دارد و از روی مبلغ کل نمی‌شود فهمید سهم هر قلم چقدر بوده. روی اثر ذخیره می‌شود و در `effects[].unitPrice` برمی‌گردد. فیلد `discount` خوانده نمی‌شود. پولی که واقعاً جابه‌جا می‌شود فقط `moneyIn`/`moneyOut` است و بهای ورود به موجودی فقط `unitCost`.
  - `unitCost` (ریال برای هر واحد) **اختیاری** است: بهای کالا برای ما، یعنی مبلغی که اثر `goodsIn` با آن وارد میانگین موزون موجودی می‌شود. اگر فرستاده نشود (`null`)، **میانگین موزون جاری همان کالا در لحظه‌ی اجرای نوبت** استفاده می‌شود؛ و اگر آن میانگین صفر باشد (کالا سابقه‌ی بها یا موجودی ندارد)، **`purchasePrice` خود کالا** — همان مبنایی که موجودی اولیه و افزایش دستی موجودی هم برای کالای بدون سابقه‌ی خرید استفاده می‌کنند. کالا هیچ‌وقت با بهای صفر وارد نمی‌شود، چون در آن صورت فروش بعدی‌اش تمام مبلغ را سود نشان می‌داد. روی `goodsOut` اثری ندارد (خروج همیشه با میانگین جاری است). روی اثر ذخیره می‌شود و در `effects[].unitCost` برمی‌گردد. فرانت معمولاً بهای داخلی را نمی‌داند و باید آن را نفرستد؛ فراخوان پشتیبان که بها را می‌داند می‌تواند بفرستد. در مرجوعی خرید قیمت و بها معمولاً یک عدد است و فراخوان هر دو را برابر می‌فرستد — سرور این حالت را جدا نمی‌کند و فقط دو فیلد را می‌خواند.
- **جهت اثر مالی ساختاری است، نه یک فیلد.** `moneyIn` یعنی پول به ما وارد می‌شود و `moneyOut` یعنی پول از ما خارج می‌شود — دقیقاً مثل `goodsIn`/`goodsOut`.
  - **تغییر شکسته نسبت به نسخه‌ی قبل:** قبلاً یک اسلات `money` با فیلد `money.kind` وجود داشت. چون مقدار صفرِ آن enum برابر `GOODS_IN` بود، هر درخواستی که `kind` را نمی‌فرستاد با خطای «جهت اثر مالی نامعتبر است.» رد می‌شد. اسلات‌ها چنین حالتی را غیرقابل‌بیان می‌کنند.
- `moneyIn.method`/`moneyOut.method`: `ReturnPaymentMethodEnum` (بخش ۱۵). اگر `MIXED` (۴) بود، `parts[]` الزامی می‌شود (هرکدام `{ method, amount, checkNumber?, transferRef? }`) و باید مجموعشان با `amount` برابر باشد.
- `moneyIn.paidAt`/`moneyOut.paidAt` (اختیاری): زمانی که پول واقعاً جابه‌جا شد.
  - **فرستاده شود:** اثر مالی همان لحظه `APPLIED` است (`appliedAt = paidAt`) و ردیف دفترش با همان تاریخ نوشته می‌شود.
  - **فرستاده نشود:** اثر یک **وعده** است — `PENDING` می‌ماند، هیچ ردیفی در دفتر نمی‌نویسد، مرجوعی را `IN_PROGRESS` نگه می‌دارد و چرخه‌ی عمر را قفل نمی‌کند. وقتی پول رسید با `ExecuteMoneyEffect` (پایین) اجرا می‌شود.

- `goodsRelease`/`goodsScrap` (**فقط مرجوعی خرید**): فهرستی از `{ "quantity": 2, "productId": null, "unitCost": 20000000 }` برای دانه‌های **قرنطینه** — آزادسازی به موجودی قابل فروش، یا اسقاط. جابه‌جایی داخلی است و طرف مقابل ندارد، پس `unitPrice` ندارد. `unitCost` یعنی ارزش این کالا برای ما: آزادسازی با آن وارد میانگین موزون می‌شود و اسقاط به همان اندازه زیان ثبت می‌کند. **صفرِ صریح و نفرستادن فرق دارند:** نفرستادن یعنی میانگین جاری (یا `purchasePrice`)، ولی `0` همان صفر می‌ماند. برای کالای خرابِ سهم سفارش (پول داده‌شده) قیمت خالص قلم را بفرستید، برای مازاد (پول داده‌نشده) `0`. روی مرجوعی فروش ۴۰۰.
- `writeOff` (bool): **بخشش صریح** — بستن `quantity` از ادعا بدون هیچ اثر. تنها راه ثبت تصمیم بدون اثر است و **با هیچ اثری همراه نمی‌شود** (۴۰۰). تصمیم بخشش همان لحظه تسویه می‌شود و در خروجی `resolutions[].isWriteOff: true` دارد.
- روی `goodsOut` مرجوعی خرید هم `unitCost` معنا پیدا می‌کند وقتی دانه‌ها از قرنطینه برداشته شوند (`ExecuteGoodsRound` → `source`، پایین): همان مقدار از ارزش نگهداری‌شده‌ی بیرون از میانگین کم می‌شود. همان قاعده‌ی صفر صریح.

#### مدل اثرها (خرید و فروش یکسان)

یک تصمیم فهرستی از اثرهاست: `GOODS_IN`، `GOODS_OUT`، `MONEY_IN`، `MONEY_OUT` — و فقط در مرجوعی خرید، دو جابه‌جایی داخلی قرنطینه `GOODS_RELEASE` و `GOODS_SCRAP`. هر ترکیبی از آن‌ها، با هر مقداری، مجاز است. سرور در لایه‌ی اثر نمی‌داند *چرا* اثری رخ می‌دهد — نه `problem` ادعا، نه `scope` آن، نه اینکه کالا در فاکتور بوده یا از موجودی گذشته، نه اینکه اسمش جایگزینی است یا بازپرداخت یا اعتبار یا کسری. هر اثر یک واقعیت ثبت‌شده است: این تعداد کالا در این جهت، یا این مبلغ وجه در این جهت.

**آنچه سرور در لایه‌ی اثر بررسی می‌کند — فهرست کامل:**
1. تصمیم دست‌کم یک اثر دارد.

همین. **هیچ قاعده‌ی تراز مالی وجود ندارد.** رابطه‌ی ارزش کالا و مبلغ وجه یک توافق است، نه یک محاسبه: کارمند بر اساس توافق با تامین‌کننده یا مشتری هر ترکیبی را ثبت می‌کند. کالای خروجی بدون هیچ وجهی، وجه بدون کالا، یا کالای ۱۰ ریالی در برابر جایگزین ۴ ریالی بدون بازپرداخت تفاوت — همه پذیرفته می‌شوند و ۴۰۰ نمی‌گیرند.

آنچه همچنان بررسی می‌شود شکل درخواست است، نه قاعده‌ی تجاری: مقدار هر اثر کالایی و مبلغ هر اثر مالی مثبت است، `productId` وجود دارد، و بخش‌های پرداخت `MIXED` با مبلغ کل جمع می‌شوند. `composition.quantity` قاعده‌ی لایه‌ی ادعاست (از باقیمانده‌ی ادعا بیشتر نمی‌شود) و ربطی به مقدار اثرها ندارد. قواعد لایه‌ی ادعا (دامنه، قلم سند، سهمیه، قیمت EXCESS برابر قیمت قلم) همگی سر جای خودشان هستند.


**سازوکار — یکسان برای هر ادعا، بدون هیچ شرطی:**

| اثر | موجودی و دانه‌ها (`ExecuteGoodsRound`) | دفتر بهای تمام‌شده | گزارش‌ها (بخش ۱۸) |
|---|---|---|---|
| `GOODS_IN` | موجودی به اندازه‌ی مقدار سالم زیاد می‌شود؛ دانه‌ها ساخته یا برگردانده می‌شوند | با `unitCost` اثر وارد میانگین موزون می‌شود؛ اگر `unitCost` فرستاده نشده، با میانگین جاری، و اگر آن صفر باشد با `purchasePrice` کالا | — |
| `GOODS_OUT` | منبع `IN_STOCK`: موجودی کم می‌شود؛ دانه‌ها مصرف می‌شوند. منبع `QUARANTINED` (فقط خرید): موجودی تغییر نمی‌کند | `IN_STOCK`: با میانگین جاری خارج می‌شود. `QUARANTINED`: `quantity × unitCost` از ارزش بیرون از میانگین کم می‌شود (`PURCHASE_RETURN_SHIPPED_FROM_QUARANTINE`) | — |
| `GOODS_RELEASE` (خرید) | دانه‌های قرنطینه `IN_STOCK` می‌شوند؛ موجودی زیاد می‌شود | با `unitCost` وارد میانگین، همان ارزش از بیرونِ میانگین کم (`QUARANTINE_RELEASED`) | — |
| `GOODS_SCRAP` (خرید) | دانه‌های قرنطینه `SCRAPPED` می‌شوند | `quantity × unitCost` از بیرونِ میانگین کم (`QUARANTINE_SCRAPPED`) | فروش: `scrapLoss` جدا، و از `netProfit` کم می‌شود |
| `MONEY_IN` | — | ردیف بدون جابه‌جایی کالا | فروش: درآمد **مثبت** در گزارش فروش. خرید: **کاهش** هزینه‌ی خرید در گزارش خرید |
| `MONEY_OUT` | — | ردیف بدون جابه‌جایی کالا | فروش: درآمد **منفی** در گزارش فروش. خرید: **افزایش** هزینه‌ی خرید در گزارش خرید |

- اثر مالی با `paidAt` لحظه‌ی ثبت تصمیم `APPLIED` است و ردیفش با تاریخ `paidAt` نوشته می‌شود؛ بدون `paidAt` تا `ExecuteMoneyEffect` `PENDING` می‌ماند و ردیفش همان‌جا نوشته می‌شود. `RemoveClaimResolution` فقط برای اثرهای `APPLIED` ردیف معکوس می‌نویسد.
- مقدار ادعا روی قلم سند (`settledQuantity`) وقتی تسویه می‌شود که **آخرین** اثر معلق تصمیم — کالایی یا مالی — اجرا شود.
- رویدادهای دفتر — خرید: `PURCHASE_RETURN_REPLACEMENT_RECEIVED` (ورود کالا)، `PURCHASE_RETURN_SHIPPED_TO_SUPPLIER` (خروج کالا)، `PURCHASE_RETURN_MONEY_IN`، `PURCHASE_RETURN_MONEY_OUT`. فروش: `SALE_RETURN_RESTOCK` (ورود کالا)، `REPLACEMENT_SHIPPED_TO_CUSTOMER` (خروج کالا)، `SALE_RETURN_MONEY_IN`، `SALE_RETURN_REFUND` (خروج وجه).
- وجه مرجوعی فروش درآمد است و فقط در گزارش فروش شمرده می‌شود. وجه مرجوعی خرید درآمد نیست — هیچ فروشی رخ نداده — و فقط در گزارش خرید، به‌صورت `returnMoneyAmount` (بازپرداخت تامین‌کننده منفی) شمرده می‌شود. پس برگرداندن کالا به تامین‌کننده در برابر پولش تقریباً خنثی است: کالای خارج‌شده ارزش موجودی را کم می‌کند و بازپرداخت هزینه‌ی خرید را.
- قلم سند فقط در هویت دانه‌ها نقش دارد: اثر کالاییِ **همان محصولِ** یک ادعای ON_ORDER دانه‌هایش را به همان قلم نسبت می‌دهد (پایین، `ExecuteGoodsRound`). روی موجودی، بها و درآمد اثری ندارد.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetPurchaseReturnDetail` (با `id`، `purchaseId`، `status`، `canCancel`/`canReject`/`canDelete`/`canReopen` و کل درخت `claims`).

### `DELETE api/PurchaseReturn/RemoveClaimResolution?id=950`

حذف یک تصمیم — **فقط تا وقتی هیچ‌کدام از اثرهای کالایی‌اش `appliedQuantity > 0` نشده باشند** (یعنی هنوز هیچ `ExecuteGoodsRound` روی آن اجرا نشده). اگر بخشی از کالا جابه‌جا شده باشد، دیگر قابل حذف نیست. ردیفی که هر اثر مالیِ **`APPLIED`** تصمیم در دفتر بهای تمام‌شده نوشته بود با یک ردیف معکوس خنثی می‌شود؛ اثر مالیِ `PENDING` هرگز ردیفی ننوشته و چیزی برای خنثی‌کردن ندارد. این همان راهی است که یک مرجوعیِ دارای اثر مالیِ اجراشده را دوباره قابل لغو/رد/حذف می‌کند (پایین‌تر).

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetPurchaseReturnDetail` (با `id`، `purchaseId`، `status`، `canCancel`/`canReject`/`canDelete`/`canReopen` و کل درخت `claims`).

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
      "productUnitBarcodes": null,
      "observations": [
        { "problem": 8, "quantity": 1, "note": "یکی از جایگزین‌ها هم آسیب‌دیده بود", "productUnitBarcodes": null }
      ]
    }
  ]
}
```
- `source` — **از کجای انبار؟** انباردار اعلام می‌کند؛ سرور هیچ‌وقت از یکی به دیگری عقب‌نشینی نمی‌کند:
  - `GOODS_OUT`: **الزامی** — `1` (`IN_STOCK`، موجودی قفسه) یا `9` (`QUARANTINED`). نفرستادنش ۴۰۰.
  - `GOODS_RELEASE`/`GOODS_SCRAP`: `9` یا نفرستید (همیشه از قرنطینه).
  - `GOODS_IN`: نفرستید (۴۰۰).
  - از قرنطینه فقط دانه‌های **همان ادعا** برداشته می‌شوند: ادعای ON_ORDER دانه‌های خرابِ سهم سفارشِ همان قلم، ادعای EXCESS مازادِ همان قلم، ادعای UNLISTED همان کالای خارج از سند در همین خرید (کالایی متفاوت از کالای ادعا: خارج از سند). کمبود ۴۰۰ است و از دسته‌ی دیگر قرض گرفته نمی‌شود.
- `GOODS_IN` با `observations`: بخش آسیب‌دیده‌ی کالای رسیده **دیگر ناپدید نمی‌شود** — دانه‌اش ساخته و در قرنطینه (با علت همان ادعا) نگه داشته می‌شود و ارزشش (`unitCost` اثر) بیرون از میانگین ثبت می‌شود (`PURCHASE_RETURN_REPLACEMENT_QUARANTINED`)؛ روی آن می‌توان ادعای تازه ثبت کرد.
- `productUnitBarcodes` (اختیاری): بارکد دقیق دانه‌هایی که جابه‌جا می‌شوند. اگر فرستاده شود باید دقیقاً `quantity` بارکدِ بدون تکرار باشد، و سرور **همان** دانه‌ها را برمی‌دارد؛ نفرستادنش یعنی سرور قدیمی‌ترین دانه‌ها را انتخاب می‌کند (همان رفتار قبلی). در مرجوعی خرید:
  - روی `GOODS_OUT`: هر بارکد باید از همین کالا، `IN_STOCK` و — وقتی اثر همان محصولِ ادعای ON_ORDER است — از دانه‌های همان قلم خرید باشد؛ وگرنه ۴۰۰.
  - روی `GOODS_IN`: **مجاز نیست** (۴۰۰) — کالای ورودی دانه‌ی تازه می‌سازد و هنوز بارکدی ندارد.
- `effectId`: از `GetPurchaseReturnPendingEffects` یا `GetPurchaseReturnDetail` (زیر `resolutions[].effects[].id`)، باید یک اثر کالایی (`GOODS_IN`/`GOODS_OUT`) با وضعیت `PENDING` باشد.
- `quantity`: نباید از باقیمانده‌ی همان اثر (`remainingQuantity`/`quantity - appliedQuantity`) بیشتر باشد.
- `observations[]`: **فقط برای `GOODS_IN`** معنی دارد — یعنی وقتی جایگزین از تامین‌کننده می‌رسد، بخشی از همان محموله هم ممکن است مشکل داشته باشد؛ مجموع `quantity` در `observations` از `quantity` همان نوبت کم می‌شود تا مقدار «سالم» به‌دست آید (فقط مقدار سالم به موجودی اضافه می‌شود).
- `partyName`/`partyNationalId`/`vehiclePlate`/`note`: اطلاعات تحویل‌گیرنده/تحویل‌دهنده، برای مستندسازی هر نوبت (اختیاری).
- روی `GOODS_IN`: موجودی به اندازه‌ی مقدار سالم زیاد می‌شود، برای همان مقدار دانه ساخته می‌شود و با `unitCost` اثر (یا در نبودنش میانگین جاری) وارد میانگین موزون می‌شود (رویداد `PURCHASE_RETURN_REPLACEMENT_RECEIVED`). `receivedQuantity` قلم خرید تغییر نمی‌کند.
- روی `GOODS_OUT`: موجودی کم می‌شود، دانه‌ها `RETURNED_TO_SUPPLIER` می‌شوند و کالا با میانگین جاری از دفتر خارج می‌شود (رویداد `PURCHASE_RETURN_SHIPPED_TO_SUPPLIER`). اگر موجودی کافی نباشد ۴۰۰.
- این دو قاعده برای هر ادعا یکسان است — ON_ORDER، EXCESS یا UNLISTED.
- هویت دانه‌ها: وقتی اثر کالایی همان محصولِ یک ادعای ON_ORDER است، دانه‌های ساخته‌شده به همان قلم خرید نسبت داده می‌شوند و برای `GOODS_OUT` **فقط دانه‌هایی که با همان قلم خرید وارد انبار شده‌اند** برمی‌گردند؛ اگر به‌اندازه‌ی کافی از آن‌ها `IN_STOCK` نمانده باشد ۴۰۰ برمی‌گردد و از دانه‌های خرید دیگری برداشته نمی‌شود. در غیر این صورت قدیمی‌ترین دانه‌های موجود همان کالا انتخاب می‌شوند.
- جمع `quantity` در `observations[]` نمی‌تواند از `quantity` همان نوبت بیشتر یا منفی باشد (۴۰۰). اگر یک `effectId` چند بار در یک درخواست بیاید، مجموعشان با باقیمانده‌ی اثر مقایسه می‌شود.
- **همه‌ی بررسی‌ها پیش از هر تغییری انجام می‌شوند:** اگر یک نوبت از درخواست رد شود، هیچ‌کدام از نوبت‌های قبلی همان درخواست هم اعمال نمی‌شوند.
- اثرهای مرجوعی رد‌شده یا لغوشده دیگر در `GetPurchaseReturnPendingEffects` برنمی‌گردند.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetPurchaseReturnDetail` (با `id`، `purchaseId`، `status`، `canCancel`/`canReject`/`canDelete`/`canReopen` و کل درخت `claims`).

#### چرخه‌ی عمر: کدام عملیات در کدام وضعیت مجاز است

| وضعیت | لغو | رد | حذف | بازگشایی |
|---|---|---|---|---|
| `OPEN` (در انتظار تصمیم) | ✓\* | ✓\* | ✓\* | ✗ |
| `IN_PROGRESS` (در حال اجرا) | ✓\* | ✓\* | ✓\* | ✗ |
| `SETTLED` (تسویه شده) | ✗ | ✗ | ✗ | ✗ |
| `REJECTED` (رد شده) | ✗ ← ابتدا بازگشایی | ✗ ← ابتدا بازگشایی | ✗ ← ابتدا بازگشایی | ✓ |
| `CANCELLED` (لغو شده) | ✗ | ✗ | ✗ | ✗ |

\* به این شرط‌ها: (۱) **هیچ کالایی جابه‌جا نشده باشد** — هیچ اثر کالایی `appliedQuantity > 0` نداشته باشد، حتی اگر هنوز `PENDING` باشد. راه برگشتی ندارد. (۲) **هیچ اثر مالیِ `APPLIED` نداشته باشد** — اثری که پرداختش واقعاً انجام شده (با `paidAt` ثبت یا با `ExecuteMoneyEffect` اجرا شده). اثر مالیِ `PENDING` فقط وعده است و قفل نمی‌کند. راه برگشت: آن تصمیم را با `RemoveClaimResolution` حذف کنید و دوباره تلاش کنید.

پیام خطای ۴۰۰ همیشه دلیل واقعی را می‌گوید — وضعیت فعلی را نام می‌برد، برای مرجوعیِ رد‌شده به بازگشایی اشاره می‌کند، و برای اثر مالی می‌گوید باید تصمیم مالی حذف شود. پرچم‌های `canCancel`/`canReject`/`canDelete`/`canReopen` در سند مرجوعی دقیقاً از همین قاعده محاسبه می‌شوند؛ دکمه‌ها را از روی همین پرچم‌ها نشان دهید، نه با محاسبه‌ی مجدد در فرانت.

### `POST api/PurchaseReturn/ExecuteMoneyEffect`

ثبت اینکه یک اثر مالیِ معلق (`PENDING`، یعنی بدون `paidAt` ثبت شده) واقعاً پرداخت شد — همتای مالیِ `ExecuteGoodsRound`.

**Body:**
```json
{ "effectId": 1201, "paidAt": "2026-09-14T10:30:00", "reference": "TR-88213" }
```
- `effectId`: شناسه‌ی اثر مالی (`effects[].id` در جزئیات مرجوعی).
- `paidAt` اختیاری است؛ پیش‌فرض همین لحظه.
- `reference` اختیاری است؛ اگر فرستاده شود جایگزین مرجع ثبت‌شده روی اثر می‌شود.

**رفتار:** اثر `APPLIED` می‌شود (`appliedAt = paidAt`)، ردیف دفتر بهای تمام‌شده با تاریخ `paidAt` نوشته می‌شود (همان رویدادهای بخش «مدل اثرها»)، و اگر این آخرین اثر معلق تصمیم بود، مقدار تصمیم روی قلم خرید تسویه می‌شود و وضعیت مرجوعی دوباره محاسبه می‌شود (معمولاً `SETTLED`). از این پس مرجوعی اثر مالیِ اجراشده دارد و تا حذف آن تصمیم قابل لغو/رد/حذف نیست.

**خطا (۴۰۰):** اثر کالایی است؛ اثر قبلاً اجرا شده؛ مرجوعی رد یا لغو شده است.

**data خروجی:** سند کامل مرجوعی — همان شکل خروجی `GetPurchaseReturnDetail`.

### `POST api/PurchaseReturn/CancelPurchaseReturn`

**Body:** `{ "id": 55 }` — طبق جدول بالا (`canCancel: true`). تصمیم‌های در انتظارِ بدون جابه‌جایی کالا مانعی نیستند.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetPurchaseReturnDetail` (با `id`، `purchaseId`، `status`، `canCancel`/`canReject`/`canDelete`/`canReopen` و کل درخت `claims`).

### `POST api/PurchaseReturn/RejectPurchaseReturn`

**Body:** `{ "id": 55 }` — همان شرط لغو، با معنای «رد شد» (مثلاً تامین‌کننده مغایرت را قبول نکرد).

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetPurchaseReturnDetail` (با `id`، `purchaseId`، `status`، `canCancel`/`canReject`/`canDelete`/`canReopen` و کل درخت `claims`).

### `POST api/PurchaseReturn/ReopenPurchaseReturn`

**Body:** `{ "id": 55 }` — فقط برای مرجوعی‌های رد‌شده (`canReopen: true`). وضعیت از روی داده **دوباره محاسبه می‌شود**: مرجوعی‌ای که پیش از رد، تصمیم ثبت‌شده داشت به `IN_PROGRESS` برمی‌گردد، نه همیشه `OPEN`.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetPurchaseReturnDetail` (با `id`، `purchaseId`، `status`، `canCancel`/`canReject`/`canDelete`/`canReopen` و کل درخت `claims`).

### `DELETE api/PurchaseReturn/DeletePurchaseReturn?id=55`

حذف نرم (`isActive = false`؛ از همه‌ی خواندن‌ها پنهان می‌شود) — طبق جدول بالا (`canDelete: true`).

**data خروجی:** `{ "id": 55, "purchaseId": 100 }` — سند دیگر قابل خواندن نیست، پس فقط شناسه‌ها برای پاک کردن کش و بازگشت به لیست برمی‌گردد.

---

## 11. فروش (Sale)

کنترلر: `api/Sale`.

### `GET api/Sale/GetSaleList`

**Query:** `page`, `take`, `invoiceNumber`, `customerName`, `status` (enum), `paymentType` (enum), `fromDate`, `toDate`, `fromPaymentDate`, `toPaymentDate`.

`fromDate`/`toDate` روی **تاریخ فاکتور** فیلتر می‌کنند و `fromPaymentDate`/`toPaymentDate` روی **مهلت پرداخت** (`paymentDate`) — برای گرفتن فهرست سررسیدهای نزدیک یا سررسیدگذشته.

**data.saleList[]:**
```json
{
  "id": 200,
  "invoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "invoiceDate": "2026-08-10T00:00:00",
  "paymentDate": "2026-09-09T00:00:00",
  "status": 0,
  "paymentType": 0,
  "totalAmount": 30000000,
  "paidAmount": 30000000,
  "installmentSummary": null
}
```

`installmentSummary` فقط برای فروش‌های اقساطی پر می‌شود و برای بقیه `null` است — شکل کاملش در بخش ۱۱ب.

### `GET api/Sale/GetSaleDetail?id=200`

**data:**
```json
{
  "id": 200,
  "invoiceNumber": "SL-2001",
  "invoiceDate": "2026-08-10T00:00:00",
  "paymentDate": "2026-09-09T00:00:00",
  "status": 0,
  "paymentType": 0,
  "totalAmount": 30000000,
  "paidAmount": 30000000,
  "paymentDetails": [
    { "id": 1, "type": 0, "purpose": 1, "amount": 2000000, "paidAt": "2026-08-10T00:00:00", "checkNumber": null, "transferRef": null }
  ],
  "installmentSummary": null,
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
    { "id": 1, "driverFullName": "رضا احمدی", "driverPhoneNumber": "09129876543", "vehiclePlate": "34ب12345", "createdAt": "2026-08-11T09:00:00" }
  ],
  "shippingNotes": [
    { "id": 1, "note": "ارسال اول", "createdAt": "2026-08-11T09:00:00" }
  ]
}
```
`drivers[]`/`shippingNotes[]`: مثل `drivers[]`/`receivingNotes[]` در `GetPurchaseDetail` (بخش ۹) اما برای سمت ارسال — تاریخچه‌ی هر نوبت `ShipSale` که این فیلدها را فرستاده باشد.

`paymentDetails[]`: `type` همان `PaymentTypeEnum` است و می‌گوید **چطور** پرداخت شد؛ `purpose` (`PaymentPurposeEnum`، بخش ۱۵) می‌گوید **این پرداخت چیست** — پرداخت عادی، پیش‌پرداخت قرارداد اقساطی، یا پرداخت قسط. `id` از `Guid` به `int` تغییر کرده (بخش ۱۶).

`installmentSummary`: خلاصه‌ی قرارداد اقساطی، فقط برای فروش اقساطی؛ شکل کاملش در بخش ۱۱ب.

### `POST api/Sale/CreateSale`

**Body:**
```json
{
  "invoiceDate": "2026-08-10T00:00:00",
  "paymentDate": "2026-09-09T00:00:00",
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
نام فیلد آرایه‌ی اقلام گمراه‌کننده `productIds` است اما در واقع لیستی از اقلام کامل (محصول + تعداد + قیمت + تخفیف) است، نه فقط شناسه‌ها. اگر `paymentType` غیر نقدی باشد `paymentDetails` الزامی است — **به‌جز `INSTALLMENT` (۵)**، که رکورد پرداختش را خود `CreateSaleInstallmentPlan`/`PaySaleInstallment` با `purpose` درست می‌سازد و اینجا باید خالی بماند. همین استثنا روی `UpdateSale` هم هست.

`invoiceNumber` **فرستاده نمی‌شود** — شماره‌ی فاکتور رسمی را سرور تولید می‌کند، دقیقاً وقتی فروش از پیش‌فاکتور خارج شود (بخش ۱۶، تغییرات ۲۰۲۶-۰۹-۲۰). تا آن لحظه رشته‌ی خالی است.

**data خروجی:** `{ "id": 200, "invoiceNumber": "INV-2026-0007", "status": 1 }` — شناسه‌ی فروش ساخته‌شده، شماره‌ی فاکتور (خالی اگر هنوز پیش‌فاکتور است) و وضعیت نهایی.

`paymentDate` (**مهلت پرداخت**) اختیاری است — تاریخی که تا آن، مشتری فرصت تسویه دارد. برای معامله‌ی نقدی `null` بفرستید. اگر مقدار داشته باشد نباید قبل از `invoiceDate` باشد، وگرنه ۴۰۰ برمی‌گردد. در `GetPurchaseList`/`GetPurchaseDetail`/`GetSaleList`/`GetSaleDetail` برگردانده و روی PDF فاکتور هم چاپ می‌شود.

`invoiceDate` (**تاریخ فاکتور**) nullable است و **فقط وقتی `status` برابر `PROFORMA` (۰) باشد** می‌تواند `null` باشد. در هر وضعیت دیگری، `null` (یا مقدار پوچ `0001-01-01`) ۴۰۰ می‌دهد. در خروجی `GetPurchaseList`/`GetPurchaseDetail`/`GetSaleList`/`GetSaleDetail` هم برای ردیف‌های پیش‌فاکتور `null` برمی‌گردد (قبلاً `0001-01-01T00:00:00` بود). روی PDF فاکتور، اگر `null` باشد تاریخ ثبت سند چاپ می‌شود.

### `PUT api/Sale/UpdateSale`

**Body:**
```json
{
  "id": 200,
  "invoiceDate": "2026-08-10T00:00:00",
  "paymentDate": "2026-09-09T00:00:00",
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

`paymentDetails` هم **جایگزینی کامل** است، نه افزودنی — مثل `attachments`: فهرست نهایی را بفرستید، هرچه نفرستید حذف می‌شود. `purpose` از ورودی خوانده نمی‌شود و همیشه `NORMAL` ثبت می‌شود؛ از این مسیر فقط پرداخت عادی ثبت می‌شود. **روی فروش اقساطی کلاً نادیده گرفته می‌شود** (مثل `paidAmount`): رکوردهای پیش‌پرداخت و اقساط مالِ فیچر اقساط‌اند و فقط از مسیر `CreateSaleInstallmentPlan`/`PaySaleInstallment`/`SettleSaleInstallmentPlan` عوض می‌شوند. هر دو مسیر در `GetSaleDetail` → `paymentDetails[]` برمی‌گردند.

### `POST api/Sale/CreateInPersonSale`

فروش حضوری: مشتری همان‌جا کامل پرداخت می‌کند و کالا را با خودش می‌برد. یک دستور **اتمیک** که سه مرحله‌ی موجود را زیر یک تراکنش دیتابیس اجرا می‌کند — `CreateSale` (که با پرداخت کامل خودش شماره و تاریخ فاکتور را صادر می‌کند)، `ShipSale` (کسر موجودی و خروج دانه‌های اسکن‌شده) و نشاندن وضعیت `DELIVERED`. خطا در هر مرحله همه چیز را برمی‌گرداند، پس فروش نیمه‌کاره باقی نمی‌ماند.

**Body:**
```json
{
  "sale": { "...": "همان بدنه‌ی CreateSale" },
  "scannedItems": [
    { "productId": 10, "productUnitBarcodes": ["1002600010000001", "1002600010000002"] }
  ],
  "shippingNote": "تحویل حضوری به مشتری"
}
```
- `sale`: عیناً بدنه‌ی `CreateSale`. مقدار `status` هرچه بفرستید نادیده گرفته و `PROFORMA` گذاشته می‌شود؛ خود دستور آن را تا `DELIVERED` جلو می‌برد.
- **فروش غیر اقساطی:** `sale.paidAmount` باید ≥ `sale.totalAmount` باشد، وگرنه ۴۰۰ («در تحویل حضوری پرداخت باید کامل باشد.»).
- **فروش اقساطی (`sale.paymentType = INSTALLMENT`، ۵): پشتیبانی می‌شود.** مشتری می‌تواند حضوری خرید کند و روش پرداخت را اقساطی بگذارد؛ آنچه فروش را از پیش‌فاکتور بیرون می‌آورد **پیش‌پرداخت** است، نه پرداخت کامل. در این حالت:
  - `installmentPlan` **الزامی است** (وگرنه ۴۰۰): عیناً بدنه‌ی `CreateSaleInstallmentPlan` (بخش ۱۱ب) بدون `saleId` — `saleId` هرچه بفرستید نادیده گرفته و با فروشِ تازه‌ساخته‌شده پر می‌شود. در همان تراکنش و **پیش از خروج کالا** ثبت می‌شود.
  - `installmentPlan.downPaymentAmount` باید **بیشتر از صفر** باشد، وگرنه ۴۰۰. پیش‌فاکتور یعنی خریدی که حتی یک ریال بابتش پرداخت نشده؛ کالا با چنین فروشی از انبار خارج نمی‌شود.
  - `sale.paidAmount` هرچه بفرستید نادیده گرفته می‌شود — از پیش‌پرداخت قرارداد پر می‌شود.
  - `sale.paymentDetails` را **خالی بفرستید**: رکورد پیش‌پرداخت را خود ثبت قرارداد با `purpose = INSTALLMENT_DOWN_PAYMENT` می‌سازد.
  - `installmentPlan` روی فروش غیر اقساطی ۴۰۰ می‌گیرد.
- `scannedItems`: بارکد دانه‌ها، گروه‌شده بر اساس محصول؛ برای هر محصول به ترتیب بین ردیف‌های همان محصول پخش می‌شود. تعداد کمتر یا بیشتر از اقلام فروش ۴۰۰ می‌گیرد. برای کالای بدون ردیابی دانه‌ای می‌توان نفرستاد — مگر `product.requiresUnitTracking` که آن‌وقت خود `ShipSale` الزام می‌کند (بخش ۷).
- `shippingNote` اختیاری؛ پیش‌فرض «تحویل حضوری به مشتری».

**data خروجی:** `{ "id": 200, "invoiceNumber": "INV-2026-0007", "status": 4 }` (`4 = DELIVERED`).

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
  "driverPhoneNumber": "09129876543",
  "vehiclePlate": "34ب12345",
  "items": [
    { "saleItemId": 3000, "shippedQuantity": 2, "productUnitBarcodes": null, "excessQuantity": 0, "excessProductUnitBarcodes": null }
  ]
}
```
- `saleItemId`: از `items[].id` در `GetSaleDetail`.
- `driverPhoneNumber` باید فرمت موبایل ایران را داشته باشد (همان قاعده‌ی `IsMobileNumber`).
- `driverFullName`/`driverPhoneNumber`/`vehiclePlate`/`shippingNote` همگی اختیاری‌اند، هرکدام مستقل ذخیره می‌شوند، و مثل `ReceivePurchase` هر نوبت یک ردیف تاریخچه‌ی تازه می‌سازد (`drivers[]`/`shippingNotes[]` در `GetSaleDetail`، بالا).
- `shippedQuantity`: نباید از باقیمانده‌ی قابل‌ارسال آن قلم (`quantity - shippedQuantity` فعلی) یا از موجودی فعلی محصول بیشتر باشد.
- `productUnitBarcodes` (اختیاری): اگر انباردار بارکد دانه‌های خاصی را اسکن کرده، لیست آن بارکدها را بفرستید (باید دقیقاً به تعداد `shippedQuantity` باشد). اگر نفرستید، سرور خودش قدیمی‌ترین دانه‌های موجود را انتخاب می‌کند (FIFO).
  - **بارکد تکراری ممنوع است:** اگر یک بارکد بیش از یک‌بار در لیست باشد (حتی با قالب خام متفاوت از اسکنر)، کل درخواست با خطای ۴۰۰ «یک بارکد بیش از یک‌بار اسکن شده است.» رد می‌شود و هیچ دانه‌ای فروخته‌شده ثبت نمی‌شود — سرور هرگز جای خالی را با دانه‌ی دیگری پر نمی‌کند.
  - هر دانه‌ی ارسالی از `IN_STOCK` به `SOLD` می‌رود و به همین قلم فروش (`saleItemId`) گره می‌خورد. «خروج از انبار» وضعیت جدایی ندارد؛ `SOLD` یعنی فیزیکاً ارسال شده.
- `excessQuantity` (اختیاری، پیش‌فرض `0`): دانه‌هایی که **بیش از سفارش** اشتباهی به مشتری رفته — معمولاً بعداً وقتی قفسه کسری نشان می‌دهد کشف می‌شود. روی قلمی که کامل ارسال شده هم پذیرفته است (`shippedQuantity` می‌تواند `0` باشد، ولی مجموع دو مقدار باید بیشتر از صفر باشد). اثر: از موجودی کم می‌شود، دانه‌ها `SOLD` با علت `EXCESS` روی همین قلم، و با میانگین جاری از دفتر خارج می‌شوند **بدون درآمد** (رویداد `SALE_SHIPPED_EXCESS`، در گزارش فروش جزو `costOfGoodsSold`). `shippedQuantity` قلم و وضعیت فروش تغییر نمی‌کند. سقف ادعای EXCESS مشتری دقیقاً همین دانه‌هاست (بخش ۱۲). `excessProductUnitBarcodes` برای همین دانه‌ها، با همان قواعد اسکن.
- **کالای با `requiresUnitTracking: true`:** `productUnitBarcodes` (و در صورت ارسال مازاد، `excessProductUnitBarcodes`) **الزامی** است؛ نفرستادنش ۴۰۰.

**data خروجی:** `{ "saleId": 200, "saleStatus": 7 }` (مقدار enum وضعیت فروش، بخش ۱۵).

---

## ۱۱ب. فروش اقساطی (SaleInstallment)

کنترلر: `api/SaleInstallment`. این فیچر فقط سمت **فروش** است؛ خرید و تامین‌کننده هیچ معادلی ندارند.

**مدل ذهنی.** یک فروش با `paymentType = 5` (`INSTALLMENT`) یک **قرارداد اقساطی** (`SaleInstallmentPlan`، یک‌به‌یک با فروش) دارد که زیرش **سطرهای قسط** (`SaleInstallment`) نشسته‌اند. سطرها رکورد واقعی و ذخیره‌شده‌اند. در کنارشان یک آبجکت **خلاصه** (`installmentSummary`) وجود دارد که ذخیره نمی‌شود و هر بار از روی همان سطرها ساخته می‌شود؛ هرجا `paymentDetails` یک فروش دیده می‌شود، این خلاصه هم کنارش می‌آید.

**تفاوت `INSTALLMENT` با `MIXED`:** در `MIXED` کل مبلغ یکجا پرداخت می‌شود ولی با چند روش. در `INSTALLMENT` مبلغ در طول زمان و ماه‌به‌ماه پرداخت می‌شود.

### قواعد محاسبه

- `totalAmount` = قیمت نقدی + درصد افزایش، و **باید با `sale.totalAmount` برابر باشد**. فرانت خودش این عدد را حساب می‌کند و می‌فرستد؛ بکند فقط سازگاری‌اش را با `cashAmount + round(cashAmount × markupPercentage / 100)` (با تلورانس ۱ واحد) و برابری‌اش با مبلغ فروش بررسی می‌کند.
- `financedAmount = totalAmount - downPaymentAmount`
- `installmentAmount = financedAmount / installmentCount` با **تقسیم صحیح**. باقیمانده‌ی رُند روی **قسط آخر** می‌نشیند، نه قسط اول — این‌طور همه‌ی اقساط جز آخری عدد گرد و یکسانی دارند.
- سررسید قسط `n` (۱-based) = `firstDueDate.AddMonths(n - 1)` — فاصله‌ی ثابت ماهانه.
- **تعداد اقساط سمت سرور به مجموعه‌ی خاصی محدود نیست**؛ هر عدد مثبت پذیرفته می‌شود. قرار است فرانت چند گزینه‌ی از پیش تعیین‌شده نشان دهد. اگر روزی خواستیم این محدودیت را سمت سرور هم اعمال کنیم، جایش `CreateSaleInstallmentPlanCommandValidator` است.

### خروج از پیش‌فاکتور برای فروش اقساطی

برای فروش **غیر اقساطی** قاعده بدون تغییر است: تا `paidAmount >= totalAmount` نشود، فروش از `PROFORMA` خارج نمی‌شود.

برای فروش **اقساطی** شرط، «پرداخت کامل» نیست — «وجود قرارداد اقساطی فعال با پیش‌پرداخت ثبت‌شده» است. چون پلن **بعد از** ساخت فروش ساخته می‌شود، یک فروش اقساطی در `CreateSale` عمداً در `PROFORMA` می‌ماند؛ نهایی‌سازی (تولید شماره‌ی فاکتور رسمی، `invoiceDate`، و رفتن به `PROCESSING`) در `CreateSaleInstallmentPlan` اتفاق می‌افتد. `UpdateSale` هم می‌تواند فروش اقساطیِ دارای پلن و پیش‌پرداخت را از `PROFORMA` خارج کند.

> `sale.paidAmount` بعد از هر پرداخت (پیش‌پرداخت، قسط، تسویه‌ی زودهنگام) به‌روز می‌شود و همیشه برابر `plan.paidAmount` است. به همین دلیل `UpdateSale` روی یک فروش اقساطیِ دارای پلن، `paidAmount` ورودی را نادیده می‌گیرد و `totalAmount` متفاوت با مبلغ پلن را با ۴۰۰ رد می‌کند — مبلغ کل فقط از مسیر `UpdateSaleInstallmentPlan` عوض می‌شود.

### `POST api/SaleInstallment/CreateSaleInstallmentPlan`

```json
{
  "saleId": 200,
  "cashAmount": 10000000,
  "markupPercentage": 20,
  "totalAmount": 12000000,
  "downPaymentAmount": 2000000,
  "installmentCount": 5,
  "firstDueDate": "2026-10-01T00:00:00",
  "latePenaltyPercentage": 2,
  "paymentType": 0,
  "checkNumber": null,
  "transferRef": null,
  "paidAt": "2026-09-01T00:00:00"
}
```

چهار فیلد آخر مربوط به **پرداخت پیش‌پرداخت** است؛ `paidAt` اختیاری است و پیش‌فرضش «الان» است. اعتبارسنجی‌ها: فروش باید وجود داشته و فعال باشد، `paymentType` فروش باید `INSTALLMENT` باشد، نباید از قبل پلن فعالی داشته باشد، `totalAmount` باید با مبلغ فروش برابر باشد، `downPaymentAmount < totalAmount`، `installmentCount > 0`، `markupPercentage >= 0`، و `firstDueDate` نباید قبل از تاریخ پیش‌پرداخت باشد.

اثر: پلن + تمام سطرهای قسط در وضعیت `PENDING` ساخته می‌شوند، یک `PaymentDetail` با `purpose = 1` (`INSTALLMENT_DOWN_PAYMENT`) ثبت می‌شود، `sale.paidAmount` به‌روز می‌شود، و در صورت نیاز فروش از پیش‌فاکتور خارج می‌شود.

**`latePenaltyPercentage` فقط ذخیره می‌شود.** هیچ محاسبه‌ای روی آن انجام نمی‌شود و هیچ‌جا خوانده نمی‌شود — بخش «موارد باز» پایین همین بخش.

**data خروجی:** همان سند کامل `GetSaleInstallmentPlanDetail` (پایین). همه‌ی commandهای این بخش همین سند را برمی‌گردانند، تا پاسخ یک write دقیقاً همان شکلی باشد که یک read می‌دهد.

### `PUT api/SaleInstallment/UpdateSaleInstallmentPlan`

```json
{
  "id": 10,
  "cashAmount": 10000000,
  "markupPercentage": 20,
  "totalAmount": 12000000,
  "installmentCount": 8,
  "firstDueDate": "2026-12-01T00:00:00",
  "latePenaltyPercentage": 2
}
```

ویرایش پس از شروع پرداخت هم مجاز است، ولی **فقط بخش پرداخت‌نشده**:

- سطرهای `PAID` هرگز تغییر نمی‌کنند و هیچ‌وقت حذف نمی‌شوند؛ `PaymentDetail`های ثبت‌شده هم دست‌نخورده می‌مانند.
- `installmentCount` نمی‌تواند از تعداد سطرهای `PAID` کمتر شود.
- `totalAmount` نمی‌تواند از `plan.paidAmount` کمتر شود؛ اگر عوض شود، `sale.totalAmount` هم با آن هماهنگ می‌شود.
- `downPaymentAmount` پس از ثبت **قابل تغییر نیست** و در بدنه‌ی این درخواست هم نمی‌آید.
- سطرهای پرداخت‌نشده حذف و با زمان‌بندی جدید بازتولید می‌شوند، با **ادامه‌ی شماره‌گذاری از آخرین سطر `PAID`**. مبلغ `totalAmount - paidAmount` فقط روی همین سطرهای جدید پخش می‌شود و باقیمانده‌ی رُند باز هم روی آخرین سطر می‌نشیند.

### `DELETE api/SaleInstallment/DeleteSaleInstallmentPlan?id=10`

ابطال قرارداد: `isActive = false`، `status = CANCELLED`، و همه‌ی سطرهای `PENDING`/`OVERDUE` به `CANCELLED` می‌روند. سطرهای `PAID` دست‌نخورده می‌مانند، `PaymentDetail`های ثبت‌شده **حذف نمی‌شوند** (رکورد مالی واقعی‌اند) و به همین دلیل `sale.paidAmount` هم تغییر نمی‌کند.

### `POST api/SaleInstallment/PaySaleInstallment`

```json
{
  "saleInstallmentId": 101,
  "paymentType": 3,
  "checkNumber": null,
  "transferRef": "TRX-9",
  "paidAt": "2026-10-01T00:00:00"
}
```

- **یک قسط = یک پرداخت کامل.** پرداخت جزئی وجود ندارد؛ مبلغ از روی `installment.amount` برداشته می‌شود، نه از ورودی کاربر.
- پرداخت **زودتر از سررسید** مجاز است — هیچ اعتبارسنجی‌ای روی `dueDate` نیست. پرداخت **خارج از ترتیب** هم رد نمی‌شود (سطر مشخصاً با `id` هدف گرفته می‌شود).
- اگر سطر `PAID` یا `CANCELLED` باشد، یا پلن `ACTIVE` نباشد، ۴۰۰ برمی‌گردد.
- اثر: یک `PaymentDetail` با `purpose = 2` (`INSTALLMENT`) ساخته و به سطر لینک می‌شود؛ سطر `PAID` می‌شود؛ اگر هیچ سطر پرداخت‌نشده‌ای نماند پلن `SETTLED` می‌شود؛ `sale.paidAmount` به‌روز می‌شود.

### `POST api/SaleInstallment/SettleSaleInstallmentPlan`

```json
{
  "saleId": 200,
  "planId": null,
  "paymentType": 3,
  "checkNumber": null,
  "transferRef": "TRX-SETTLE",
  "paidAt": "2026-11-05T00:00:00"
}
```

تسویه‌ی کامل زودهنگام: یکی از `saleId` یا `planId` کافی است. مبلغ دقیقاً `plan.remainingAmount` است، **بدون هیچ تخفیفی** روی درصد افزایش. یک `PaymentDetail` یکجا ساخته می‌شود و تمام سطرهای پرداخت‌نشده با همان `paidAt`/`paymentType`/`paymentDetailId` به `PAID` می‌روند؛ پلن `SETTLED` و `sale.paidAmount = plan.totalAmount` می‌شود.

### `GET api/SaleInstallment/GetSaleInstallmentPlanDetail?saleId=200`

`planId` یا `saleId` — یکی کافی است. اگر روی یک فروش هم پلن ابطال‌شده باشد و هم پلن جدید، پلن جاری برگردانده می‌شود.

```json
{
  "id": 10,
  "saleId": 200,
  "invoiceNumber": "INV-2026-0007",
  "customerId": 1,
  "customerName": "علی رضایی",
  "cashAmount": 10000000,
  "markupPercentage": 20,
  "totalAmount": 12000000,
  "downPaymentAmount": 2000000,
  "financedAmount": 10000000,
  "installmentCount": 5,
  "installmentAmount": 2000000,
  "firstDueDate": "2026-10-01T00:00:00",
  "latePenaltyPercentage": 2,
  "status": 0,
  "statusTitle": "جاری",
  "paidInstallmentCount": 1,
  "remainingInstallmentCount": 4,
  "paidInstallmentsAmount": 2000000,
  "paidAmount": 4000000,
  "remainingAmount": 8000000,
  "lastPaymentDate": "2026-10-01T00:00:00",
  "nextDueDate": "2026-11-01T00:00:00",
  "createdAt": "2026-09-01T00:00:00",
  "installments": [
    {
      "id": 101, "number": 1, "dueDate": "2026-10-01T00:00:00", "amount": 2000000,
      "status": 1, "statusTitle": "پرداخت‌شده", "paidAt": "2026-10-01T00:00:00",
      "paymentType": 3, "paymentDetailId": 2
    }
  ],
  "paymentDetails": [
    { "id": 1, "type": 0, "purpose": 1, "amount": 2000000, "paidAt": "2026-09-01T00:00:00", "checkNumber": null, "transferRef": null },
    { "id": 2, "type": 3, "purpose": 2, "amount": 2000000, "paidAt": "2026-10-01T00:00:00", "checkNumber": null, "transferRef": "TRX-9" }
  ]
}
```

`lastPaymentDate`: آخرین `paidAt` بین سطرهای `PAID`؛ اگر هیچ قسطی پرداخت نشده باشد، تاریخ پیش‌پرداخت. `nextDueDate`: کمترین `dueDate` بین سطرهای پرداخت‌نشده؛ پس از تسویه `null`.

### `GET api/SaleInstallment/GetSaleInstallmentPlanList`

**Query:** `page`, `take`, `customerId`, `saleId`, `status`, `fromNextDueDate`, `toNextDueDate`, `fromCreatedAt`, `toCreatedAt`.

**data.saleInstallmentPlanList[]:**
```json
{
  "planId": 10,
  "saleId": 200,
  "invoiceNumber": "INV-2026-0007",
  "customerId": 1,
  "customerName": "علی رضایی",
  "totalAmount": 12000000,
  "paidAmount": 4000000,
  "remainingAmount": 8000000,
  "installmentCount": 5,
  "paidInstallmentCount": 1,
  "nextDueDate": "2026-11-01T00:00:00",
  "lastPaymentDate": "2026-10-01T00:00:00",
  "status": 0,
  "statusTitle": "جاری"
}
```

### `GET api/SaleInstallment/GetSaleInstallmentList`

لیست **تک‌تک اقساط در سطح کل سیستم**. صفحه‌های «سررسیدگذشته» و «پرداخت‌های پیش‌رو» روی همین اندپوینت ساخته می‌شوند — اندپوینت جداگانه‌ای برای آن دو وجود ندارد:

- **سررسیدگذشته:** `status=0` (`PENDING`) و `toDueDate=امروز`
- **پرداخت‌های پیش‌رو:** `status=0` و `fromDueDate=امروز` (و در صورت نیاز `toDueDate=امروز+۳۰ روز`)

**Query:** `page`, `take`, `customerId`, `saleId`, `planId`, `status`, `fromDueDate`, `toDueDate`, `fromPaidAt`, `toPaidAt`. مرتب‌سازی پیش‌فرض بر اساس `dueDate`.

**data.saleInstallmentList[]:**
```json
{
  "installmentId": 101,
  "number": 1,
  "dueDate": "2026-10-01T00:00:00",
  "amount": 2000000,
  "status": 0,
  "statusTitle": "پرداخت‌نشده",
  "paidAt": null,
  "paymentType": null,
  "planId": 10,
  "saleId": 200,
  "invoiceNumber": "INV-2026-0007",
  "customerId": 1,
  "customerName": "علی رضایی"
}
```

### `installmentSummary` روی فروش

روی `GetSaleDetail` و هر ردیف `GetSaleList`، برای فروش‌های غیر اقساطی `null` است:

```json
{
  "planId": 10,
  "totalAmount": 12000000,
  "downPaymentAmount": 2000000,
  "installmentCount": 5,
  "paidInstallmentCount": 1,
  "lastPaymentDate": "2026-10-01T00:00:00",
  "nextDueDate": "2026-11-01T00:00:00",
  "paidAmount": 4000000,
  "remainingAmount": 8000000,
  "status": 0,
  "statusTitle": "جاری"
}
```

بدون لیست سطرها — اینجا فقط خلاصه است؛ سطرها در `GetSaleInstallmentPlanDetail` می‌آیند.

### موارد باز (عمداً پیاده‌سازی‌نشده)

۱. **علامت‌گذاری دیرکرد.** `OVERDUE` عضو `SaleInstallmentStatusEnum` هست ولی **هیچ کدی آن را نمی‌نویسد**: هیچ background service، هیچ job و هیچ اندپوینت بازمحاسبه‌ای وجود ندارد. تشخیص دیرکرد از روی `dueDate` کارِ فرانت است. این عضو برای وقتی نگه داشته شده که بعداً تصمیم بگیریم علامت‌گذاری دستی یا خودکار اضافه کنیم — فراموش نشده است.

۲. **جریمه‌ی دیرکرد.** `latePenaltyPercentage` روی پلن ذخیره می‌شود (اوپراتور دستی وارد می‌کند) ولی هیچ محاسبه‌ای روی آن انجام نمی‌شود و هیچ‌جا خوانده نمی‌شود. پرسش‌های بازی که باید پاسخ بگیرند: درصد نسبت به چه پایه‌ای (مبلغ قسط معوق یا کل باقیمانده)؟ به ازای هر روز تأخیر یا هر ماه؟ خودکار محاسبه شود یا اوپراتور موقع دریافت، مبلغ نهایی را ثبت کند؟ جریمه به `totalAmount` اضافه شود یا جدا نگه داشته شود؟ (توصیه: **جدا** — وگرنه رابطه‌ی `paidAmount == totalAmount ⇔ SETTLED` می‌شکند و منطق تسویه به‌هم می‌ریزد.) نقطه‌ی ورودش `PaySaleInstallmentCommand` است و احتمالاً یک `Purpose = LATE_PENALTY` روی `PaymentPurposeEnum` به‌علاوه‌ی یک فیلد `PenaltyAmount` روی `SaleInstallment` می‌خواهد.

۳. **تخفیف تسویه‌ی زودهنگام.** الان `SettleSaleInstallmentPlan` دقیقاً `remainingAmount` را می‌گیرد. اگر بعداً تصمیم شد بخشی از درصد افزایش برگردد، تنها جایی که تغییر می‌کند محاسبه‌ی مبلغ در همان handler است، به‌علاوه‌ی احتمالاً یک فیلد `EarlySettlementDiscountAmount` روی پلن برای ثبت مقدار برگشتی.

۴. **اثر مرجوعی فروش (`SaleReturn`) روی اقساط باقی‌مانده.** خارج از scope است و هیچ اتصالی بین این دو دامنه ساخته نشده. اگر مشتری کالایی را مرجوع کند، سطرهای قسط به‌طور خودکار تعدیل نمی‌شوند؛ فعلاً کار اوپراتور است (`UpdateSaleInstallmentPlan`).


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
- `moneyOut` روی مرجوعی فروش یعنی «ما به مشتری پول/اعتبار برمی‌گردانیم» (بازپرداخت یا اعتبار فروشگاهی) — رایج‌ترین حالت اینجا، برخلاف مرجوعی خرید که رایج‌ترین حالتش `moneyIn` است.
- علت ادعا (`problem` روی `SaleReturnClaim`) از همان enum یکپارچه‌ی `ReturnProblemEnum` مرجوعی خرید استفاده می‌کند (بخش ۱۵) — دیگر enum جدای «دلیل مشتری» در برابر «مشکل مشاهده‌شده‌ی انباردار» وجود ندارد؛ مشاهدات فیزیکی هر نوبت (`ExecuteGoodsRound`'s `observations[]`) هم از همین enum استفاده می‌کنند.
- برخلاف مرجوعی خرید، برای یک فروش می‌تواند **چند مرجوعی فعال به‌طور همزمان** وجود داشته باشد (هر بار `CreateSaleReturn` یک رکورد کاملاً جدید می‌سازد) — این رفتار عوض نشده.

### `GET api/SaleReturn/GetSaleReturnList`

**Query:** `page`, `take`, `search`, `saleId`, `customerId`, `status` (enum `ReturnStatusEnum`, بخش ۱۵), `problem` (enum `ReturnProblemEnum`), `fromDate`, `toDate`.

`saleId` برای دیدن **همه‌ی مرجوعی‌های ثبت‌شده روی یک فروش خاص** است — مثلاً در صفحه‌ی جزئیات فروش، یک تب/بخش «مرجوعی‌ها» که با `GET api/SaleReturn/GetSaleReturnList?saleId={id}` پر می‌شود.

**دیدن مرجوعی‌های مرتبط:** دقیقاً مثل سمت خرید (بخش ۱۰) — `?saleId={id}` به‌علاوه‌ی `previousReturnId` روی هر ردیف. `previousReturnId` اعتبارسنجی می‌شود و حتماً به مرجوعیِ همان فروش اشاره می‌کند.

**data.returnList[]:**
```json
{
  "id": 80,
  "returnNumber": "SR-000080",
  "returnDate": "2026-08-12T00:00:00",
  "saleId": 200,
  "saleInvoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "previousReturnId": null,
  "status": 0,
  "problems": [7],
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
  "returnDate": "2026-08-12T00:00:00",
  "saleId": 200,
  "saleInvoiceNumber": "SL-2001",
  "customerId": 1,
  "customerName": "علی رضایی",
  "description": null,
  "previousReturnId": null,
  "previousReturnNumber": null,
  "status": 0,
  "totalAmount": 25000000,
  "quantity": 1,
  "decidedQuantity": 0,
  "canDelete": true,
  "canCancel": true,
  "canReject": true,
  "canReopen": false,
  "claims": [
    {
      "id": 400,
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
  "direction": 0,
  "productId": 10,
  "productCode": "20260814-000010",
  "productName": "یخچال دو درب",
  "unit": "عدد",
  "quantity": 1,
  "appliedQuantity": 0,
  "remainingQuantity": 1
}
```

### `POST api/SaleReturn/CreateSaleReturn`

ثبت درخواست مرجوعی مشتری (قبل از هرگونه بازرسی فیزیکی).

**Body:**
```json
{
  "saleId": 200,
  "returnDate": "2026-08-12T00:00:00",
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
- `scope`/`offScopeKind`/`orderLineId` دقیقاً مثل جدول `CreatePurchaseReturn` (بخش ۱۰)، با `saleItemId` به‌جای `purchaseItemId`: ON_ORDER و EXCESS باید `orderLineId` داشته باشند (قلمی از همین فروش، با همان `productId` — وگرنه ۴۰۴/۴۰۰ «کالای ادعاشده با کالای قلم فروش «…» مطابقت ندارد.»)، UNLISTED نباید داشته باشد (۴۰۰). `unitPrice` برای EXCESS **باید دقیقاً برابر قیمت‌واحد همان قلم فروش باشد** (وگرنه ۴۰۰)؛ برای ON_ORDER و UNLISTED همان مقدار کلاینت است. `offScopeKind` برای ON_ORDER باید `null` باشد (وگرنه ۴۰۰). `productId` ادعای خارج از سند باید موجود باشد (۴۰۰).
- ادعای EXCESS سهمیه یا `settledQuantity` قلم فروش را مصرف نمی‌کند. **سقف آن:** دانه‌های `SOLD` با علت `EXCESS` روی همان قلم (ثبت‌شده با `ShipSale` → `excessQuantity`)، منهای آنچه ادعاهای EXCESS باز روی همان قلم هنوز رزرو کرده‌اند. اگر انبار مازاد را ثبت نکرده باشد، سقف صفر است و ادعا ۴۰۰ می‌گیرد — این همان راستی‌آزمایی ادعای مشتری است.
- مقدار ادعاشده مجموع همه‌ی مرجوعی‌های فعال قبلی همان قلم فروش را هم در نظر می‌گیرد (سرور جمع همه‌ی ادعاهای باز روی این قلم را چک می‌کند تا از باقیمانده‌ی همان قلم بیشتر نشود).

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetSaleReturnDetail` (با `id`، `saleId`، `status`، پرچم‌های `can*` و کل درخت `claims`).

### `POST api/SaleReturn/AddClaimResolution`

ثبت یک تصمیم روی بخشی (یا کل) مقدار باقیمانده‌ی یک ادعا، به‌صورت ترکیبی از اثرهای کالا/وجه — بدنه و قوانین دقیقاً مثل `AddClaimResolution` مرجوعی خرید (بخش ۱۰)، فقط `claimId` اینجا به `SaleReturnClaim` اشاره می‌کند.

**Body:**
```json
{
  "claimId": 400,
  "composition": {
    "quantity": 1,
    "note": "برگشت کالا و بازپرداخت کامل",
    "goodsIn": [ { "quantity": 1, "productId": null, "unitPrice": 25000000 } ],
    "goodsOut": null,
    "moneyIn": null,
    "moneyOut": { "method": 0, "amount": 25000000, "reference": null, "parts": null }
  }
}
```
این مثال یعنی «مشتری کالا را برمی‌گرداند و پولش را پس می‌گیرد»: `goodsIn` کالا را برمی‌گرداند و `moneyOut` بازپرداخت را ثبت می‌کند. سرور رابطه‌ی این دو را بررسی نمی‌کند (بخش ۱۰، «مدل اثرها») — مبلغ همانی است که ثبت می‌کنید. کالا بعداً با `ExecuteGoodsRound` بازرسی و به موجودی اضافه می‌شود. برای بازپرداخت نقدی بدون برگشت کالا، فقط `moneyOut` بفرستید.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetSaleReturnDetail` (با `id`، `saleId`، `status`، پرچم‌های `can*` و کل درخت `claims`).

### `DELETE api/SaleReturn/RemoveClaimResolution?id=950`

حذف یک تصمیم — فقط تا وقتی هیچ‌کدام از اثرهای کالایی‌اش `appliedQuantity > 0` نشده باشند (همان قانون مرجوعی خرید). ردیف درآمدی که هر اثر مالیِ **`APPLIED`** تصمیم در دفتر بهای تمام‌شده نوشته بود با یک ردیف معکوس خنثی می‌شود؛ اثر مالیِ `PENDING` ردیفی ندارد.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetSaleReturnDetail` (با `id`، `saleId`، `status`، پرچم‌های `can*` و کل درخت `claims`).

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
- روی `GOODS_IN` (کالا از مشتری برمی‌گردد): `observations[]` مشخص می‌کند چه بخشی از همان نوبت مشکل داشته؛ موجودی به اندازه‌ی مقدار «سالم» (`quantity` نوبت منهای مجموع `observations`) زیاد می‌شود و همان مقدار با `unitCost` اثر (یا در نبودنش میانگین جاری) وارد میانگین موزون می‌شود (رویداد `SALE_RETURN_RESTOCK`) — نه با `unitPrice`، که قیمت فروش است و موجودی را به اندازه‌ی حاشیه‌ی سود بیش از واقع نشان می‌داد. اگر `observations` خالی باشد، کل نوبت سالم است.
  - هویت دانه‌ها: وقتی اثر همان محصولِ یک ادعای ON_ORDER است، کل `quantity` نوبت (سالم + معیوب) باید از دانه‌هایی باشد که روی همان قلم فروش `SOLD` شده‌اند: سالم‌ها `IN_STOCK` و معیوب‌ها `SCRAPPED` می‌شوند. اگر کافی نباشد ۴۰۰ «تعداد دانه‌های فروخته‌شده این قلم فروش برای ثبت این مرجوعی کافی نیست.» برمی‌گردد. وقتی اثر همان محصولِ یک ادعای **EXCESS** است، همین کار با دانه‌های `SOLD` با علت `EXCESS` همان قلم انجام می‌شود (همان دانه‌هایی که با `excessQuantity` ارسال شدند برمی‌گردند، دانه‌ی تازه ساخته نمی‌شود) و دانه‌های سفارشی قلم دست‌نخورده می‌مانند. در غیر این صورت برای مقدار سالم دانه‌ی جدید ساخته می‌شود.
  - **اسکن دانه‌های برگشتی:** وقتی اثر همان محصولِ ادعای ON_ORDER است، `rounds[].productUnitBarcodes` می‌تواند دقیقاً `quantity` بارکد از دانه‌های `SOLD` همان قلم فروش باشد. در این حالت هر `observations[]` با `quantity` مثبت **باید** `productUnitBarcodes` خودش را هم داشته باشد — دقیقاً به تعداد خودش و از میان بارکدهای همان نوبت — تا سرور بداند کدام دانه‌ی اسکن‌شده معیوب است: همان‌ها `SCRAPPED` و بقیه `IN_STOCK` می‌شوند. بدون بارکدِ نوبت، بارکد روی مشاهده مجاز نیست. برای کالای ورودی‌ای که به قلم فروش مربوط نیست (دانه‌ی تازه ساخته می‌شود) بارکد مجاز نیست (۴۰۰).
- روی `GOODS_OUT` (ما کالا برای مشتری می‌فرستیم): `observations[]` نادیده گرفته می‌شود؛ کل `quantity` از موجودی کم می‌شود، دانه‌ها `SOLD` می‌شوند و کالا با میانگین جاری از دفتر خارج می‌شود (رویداد `REPLACEMENT_SHIPPED_TO_CUSTOMER`). `productUnitBarcodes` اختیاری است و اگر فرستاده شود همان دانه‌های `IN_STOCK` برداشته می‌شوند.
- این قواعد برای هر ادعا یکسان است — ON_ORDER، EXCESS یا UNLISTED.
- مثل مرجوعی خرید: همه‌ی نوبت‌ها پیش از هر تغییری بررسی می‌شوند، `observations` نمی‌تواند از `quantity` نوبت بیشتر یا منفی باشد، و اثرهای مرجوعی رد‌شده/لغوشده در `GetSaleReturnPendingEffects` برنمی‌گردند.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetSaleReturnDetail` (با `id`، `saleId`، `status`، پرچم‌های `can*` و کل درخت `claims`).

### `POST api/SaleReturn/ExecuteMoneyEffect`

همان `ExecuteMoneyEffect` مرجوعی خرید (بخش ۱۰): بدنه `{ effectId, paidAt?, reference? }`، اثر مالیِ `PENDING` را `APPLIED` می‌کند، ردیف `SALE_RETURN_MONEY_IN`/`SALE_RETURN_REFUND` را با تاریخ `paidAt` می‌نویسد و اگر آخرین اثر معلق تصمیم بود، مقدار را روی قلم فروش تسویه می‌کند.

**data خروجی:** سند کامل مرجوعی — همان شکل خروجی `GetSaleReturnDetail`.

### `POST api/SaleReturn/CancelSaleReturn`

**Body:** `{ "id": 80 }` — همان جدول چرخه‌ی عمر مرجوعی خرید (بخش ۱۰، پیش از `CancelPurchaseReturn`)؛ دو طرف یک قاعده‌ی مشترک دارند (`canCancel: true`).

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetSaleReturnDetail` (با `id`، `saleId`، `status`، پرچم‌های `can*` و کل درخت `claims`).

### `POST api/SaleReturn/RejectSaleReturn`

**Body:** `{ "id": 80 }` — همان شرط لغو.

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetSaleReturnDetail` (با `id`، `saleId`، `status`، پرچم‌های `can*` و کل درخت `claims`).

### `POST api/SaleReturn/ReopenSaleReturn`

**Body:** `{ "id": 80 }` — فقط برای مرجوعی‌های رد‌شده (`canReopen: true`)؛ وضعیت دوباره محاسبه می‌شود (`OPEN` یا `IN_PROGRESS`).

**data خروجی:** سند کامل مرجوعی — دقیقاً همان شکل خروجی `GetSaleReturnDetail` (با `id`، `saleId`، `status`، پرچم‌های `can*` و کل درخت `claims`).

### `DELETE api/SaleReturn/DeleteSaleReturn?id=80`

حذف نرم — طبق همان جدول (`canDelete: true`).

**data خروجی:** `{ "id": 80, "saleId": 200 }`

---

## ۱۲ب. رسید و ارسال یکپارچه (Shipment)

کنترلر: `api/Shipment`. وقتی **یک ماشین** هم اقلام سفارش می‌آورد و هم کالای مرجوعی (یا هم اقلام فروش می‌برد و هم جایگزین مرجوعی)، به‌جای چند درخواست جدا یک درخواست بزنید: همه‌ی بخش‌ها در **یک تراکنش** ثبت می‌شوند — یا همه، یا هیچ‌کدام. پس اگر بخش دوم خطا بدهد، بخش اول هم ثبت نشده و تلاش مجدد کل فرم موجودی را دو بار زیاد نمی‌کند.

### `POST api/Shipment/ReceiveShipment`

**Body:**
```json
{
  "purchase": { /* دقیقاً بدنه‌ی POST api/Purchase/ReceivePurchase (بخش ۹) */ },
  "purchaseReturnRounds": [ { /* دقیقاً بدنه‌ی POST api/PurchaseReturn/ExecuteGoodsRound (بخش ۱۰) */ } ],
  "saleReturnRounds": [ { /* دقیقاً بدنه‌ی POST api/SaleReturn/ExecuteGoodsRound (بخش ۱۲) */ } ]
}
```
- هر بخش اختیاری است ولی دست‌کم یکی لازم است. هر بخش همان درخواست مستقل است با همان اعتبارسنجی و همان قواعد؛ خطای هر بخش همان خطای مستقل آن است و کل رسید را برمی‌گرداند.
- **فقط ورود کالا:** همه‌ی `effectId`های مراحل مرجوعی باید اثر `GOODS_IN` باشند؛ وگرنه ۴۰۰ پیش از اجرای هر بخش.
- **data خروجی:** `{ "purchase": <خروجی ReceivePurchase یا null>, "purchaseReturns": [<سند مرجوعی خرید>...], "saleReturns": [<سند مرجوعی فروش>...] }`.

### `POST api/Shipment/DispatchShipment`

قرینه‌ی بالا برای خروج: `{ "sale": <بدنه‌ی ShipSale (بخش ۱۱)>, "saleReturnRounds": [...], "purchaseReturnRounds": [...] }` — همه‌ی `effectId`ها باید `GOODS_OUT` باشند. **data خروجی:** `{ "sale", "saleReturns", "purchaseReturns" }`.

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
6. برای هر ادعا، `POST api/SaleReturn/AddClaimResolution` → تصمیم بگیرید: کالا از مشتری برگردد (`goodsIn`)، جایگزین برایش برود (`goodsOut`)، پول/اعتبار برگردانده شود (`moneyOut`)، یا ترکیبی از این‌ها.
7. اگر تصمیم شامل اثر کالایی بود، آن اثر `PENDING` می‌ماند تا فیزیکاً اتفاق بیفتد: `GET api/SaleReturn/GetSaleReturnPendingEffects?saleId={id}` → دیدن اثرهای در انتظار (چه کالای برگشتی که باید بازرسی شود، چه جایگزینی که باید ارسال شود)، سپس `POST api/SaleReturn/ExecuteGoodsRound` → ثبت نوبت فیزیکی، با مشخص‌کردن `observations[]` روی برگشتی‌ها اگر بخشی از محموله معیوب بود (فقط مقدار سالم به موجودی برمی‌گردد).
8. اگر تصمیم شامل اثر `MONEY_OUT` بود، می‌توانید `GET api/Invoice/GetSaleReturnCreditNotePdf?saleReturnId={id}` را برای چاپ برگه‌ی اعتباری صدا بزنید (نیازی به منتظر ماندن برای اجرای اثرهای کالایی نیست). اگر بازپرداخت همان لحظه انجام شده، `moneyOut.paidAt` را بفرستید؛ وگرنه اثر `PENDING` می‌ماند تا با `POST api/SaleReturn/ExecuteMoneyEffect` اجرا شود.

### گردش‌کار اسکن بارکد در انبار

1. اسکنر/کیبورد یک رشته تولید می‌کند (بارکد محصول یا بارکد یک دانه‌ی خاص).
2. `GET api/Product/ScanBarcode?code={رشته اسکن‌شده}` → گرفتن اطلاعات کامل محصول (و در صورت اسکن یک دانه‌ی خاص، اطلاعات همان دانه هم برمی‌گردد).
3. بسته به صفحه (دریافت خرید، ارسال فروش، بازرسی مرجوعی و ...)، اطلاعات محصول/دانه در فرم مربوطه استفاده می‌شود.

---

## 15. پیوست: مقادیر عددی Enum ها

**یادآوری:** در JSON، این مقادیر همیشه به‌صورت عدد صحیح ارسال/دریافت می‌شوند (نه رشته)، مگر جایی که صریحاً استثنا ذکر شده (مثل `SupplierListDto.status` که رشته است).

### `OrgRoleEnum` (نقش کاربر در چارت سازمانی)
| مقدار | معنی |
|---|---|
| 0 | عضو (MEMBER) |
| 1 | مسئول واحد (DEPARTMENT_HEAD) |
| 2 | جانشین واحد (DEPARTMENT_DEPUTY) |
| 3 | مسئول تیم (TEAM_HEAD) |
| 4 | جانشین تیم (TEAM_DEPUTY) |

هر کاربر در هر لحظه دقیقاً یکی از این‌هاست — قاعده‌ی کامل در ابتدای بخش ۳.

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
| 5 | اقساطی (INSTALLMENT) |

`INSTALLMENT` آخر لیست اضافه شده و شماره‌ی هیچ عضو موجودی عوض نشده است. تفاوتش با `MIXED`: در `MIXED` کل مبلغ یکجا ولی با چند روش پرداخت می‌شود؛ در `INSTALLMENT` مبلغ در طول زمان و ماه‌به‌ماه (بخش ۱۱ب).

### `PaymentPurposeEnum` (هدف پرداخت — روی `paymentDetails[]`)
| مقدار | معنی |
|---|---|
| 0 | پرداخت عادی (NORMAL) |
| 1 | پیش‌پرداخت قرارداد اقساطی (INSTALLMENT_DOWN_PAYMENT) |
| 2 | پرداخت قسط (INSTALLMENT) |

`type` می‌گوید **چطور** پرداخت شد، `purpose` می‌گوید **این پرداخت چیست**. این دو محور مستقل‌اند: یک قسط می‌تواند با چک پرداخت شود (`type = 2`, `purpose = 2`).

### `SaleInstallmentPlanStatusEnum` (وضعیت قرارداد اقساطی)
| مقدار | معنی |
|---|---|
| 0 | جاری (ACTIVE) |
| 1 | تسویه شده (SETTLED) |
| 2 | ابطال شده (CANCELLED) |

### `SaleInstallmentStatusEnum` (وضعیت یک سطر قسط)
| مقدار | معنی |
|---|---|
| 0 | پرداخت‌نشده (PENDING) |
| 1 | پرداخت‌شده (PAID) |
| 2 | سررسید گذشته (OVERDUE) |
| 3 | ابطال شده (CANCELLED) |

⚠️ **`OVERDUE` را هیچ کدی نمی‌نویسد.** هیچ background service، هیچ job و هیچ اندپوینت بازمحاسبه‌ای برای علامت‌گذاری دیرکرد وجود ندارد؛ تشخیصش از روی `dueDate` کارِ فرانت است (بخش ۱۱ب، «موارد باز»). این عضو عمداً تعریف شده تا اگر بعداً علامت‌گذاری دستی/خودکار اضافه شد، شماره‌ها عوض نشوند.

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
| 9 | قرنطینه (QUARANTINED) — فیزیکاً در انبار ولی غیرقابل فروش و خارج از `stock`، منتظر تصمیم مرجوعی (۵ تا ۸ عمداً خالی مانده‌اند) |

### `UnitCustodyReasonEnum` (علت نگهداری دانه نسبت به سندش)
| مقدار | معنی |
|---|---|
| 1 | سهم سفارش (ON_ORDER) — روی قلم سند؛ در خرید با قیمت قلم خریده‌شده |
| 2 | مازاد (EXCESS) — بیش از قلم: در خرید دانه‌ی قرنطینه‌ی پرداخت‌نشده، در فروش دانه‌ی `SOLD` که اضافه به مشتری رفته |
| 3 | خارج از سند (UNLISTED) — کالایی که خرید اصلاً قلمی برایش ندارد |

### `BarcodeReferenceKindEnum` (نتیجه‌ی تفسیر یک بارکد اسکن‌شده)
| مقدار | معنی |
|---|---|
| 1 | بارکد محصول (PRODUCT) |
| 2 | بارکد یک دانه‌ی خاص (UNIT) |
| 3 | نامعتبر/ناشناخته (UNKNOWN) — در عمل باعث خطای ۴۰۴ می‌شود |

### `ProductUnitMovementReasonEnum` (علت یک حرکت دانه، `GetProductUnitHistory`)
| مقدار | معنی |
|---|---|
| 1 | موجودی اولیه (OPENING_BALANCE) — ساخت کالا با موجودی |
| 2 | اصلاح دستی موجودی (MANUAL_ADJUSTMENT) |
| 3 | دریافت از تامین‌کننده (PURCHASE_RECEIVED) |
| 4 | ارسال به مشتری (SALE_SHIPPED) |
| 5 | دریافت کالا در مرجوعی خرید (PURCHASE_RETURN_RECEIVED) |
| 6 | عودت به تامین‌کننده (PURCHASE_RETURN_SHIPPED) |
| 7 | دریافت کالا در مرجوعی فروش (SALE_RETURN_RECEIVED) |
| 8 | ارسال کالا در مرجوعی فروش (SALE_RETURN_SHIPPED) |
| 9 | آزادسازی از قرنطینه (QUARANTINE_RELEASED) |
| 10 | اسقاط از قرنطینه (QUARANTINE_SCRAPPED) |
| 11 | ارسال مازاد به مشتری (SALE_SHIPPED_EXCESS) |

### `DocumentKindEnum` (نوع سند — پیوست‌ها و حرکت دانه‌ها)
| مقدار | معنی |
|---|---|
| 1 | خرید (PURCHASE) |
| 2 | فروش (SALE) |
| 3 | مرجوعی خرید (PURCHASE_RETURN) |
| 4 | مرجوعی فروش (SALE_RETURN) |

### `PurchaseStatusEnum` (وضعیت سند خرید)

**✅ به‌روزرسانی ۲۰۲۶-۰۹-۰۱:** این جدول قدیمی بود — شماره‌ها از قبل از بازشماره‌گذاریِ
۲۰۲۶-۰۹-۰۲ (`CLAUDE.md` بخش «Purchase/Sale pre-invoice») مانده بود و هیچ‌وقت به‌روز نشده بود.
شماره‌های درست همین‌هاست:

| مقدار | معنی |
|---|---|
| 0 | پیش‌فاکتور (PROFORMA) — فاکتور رسمیِ تامین‌کننده هنوز نرسیده؛ `InvoiceNumber`/`InvoiceDate` الزامی نیستند و `invoiceDate` **فقط در همین وضعیت** می‌تواند `null` باشد. خروج از این وضعیت (از `UpdatePurchase`) به یک `InvoiceNumber` غیرخالی نیاز دارد |
| 1 | در انتظار (PENDING) |
| 2 | ارسال‌شده توسط تامین‌کننده (SHIPPED) |
| 3 | دریافت‌جزئی (PARTIALLY_RECEIVED) |
| 4 | دریافت‌شده کامل (RECEIVED) |
| 5 | لغو‌شده (CANCELLED) |

(عضو قدیمیِ `RETURNED` هم در همان بازشماره‌گذاری کاملاً حذف شد — کد مرده بود، هیچ‌وقت ست نمی‌شد، و فرانت هم هرگز آن را نداشت.)

### `SalesStatusEnum` (وضعیت سند فروش)

**✅ به‌روزرسانی ۲۰۲۶-۰۹-۰۱:** همین‌طور برای این جدول — علاوه بر شماره‌های قدیمی، عضو `PENDING`
هم در همین تاریخ از enum حذف شد (`CLAUDE.md`، همان بخش؛ `docs/frontend-enum-contract.fa.md`
بخش ۱). شماره‌های درست:

| مقدار | معنی |
|---|---|
| 0 | پیش‌فاکتور (PROFORMA) — مشتری هنوز کامل پرداخت نکرده؛ فاکتور رسمی و شماره‌اش وجود ندارد. خروج از این وضعیت **دستی نیست**: به محض این‌که `paidAmount` در `CreateSale`/`UpdateSale` به `totalAmount` برسد، بکند خودش شماره فاکتور می‌سازد و وضعیت را به `PROCESSING` می‌برد؛ تلاش برای تغییر دستیِ وضعیت بدون پرداخت کامل رد می‌شود |
| 1 | در حال پردازش (PROCESSING) |
| 2 | تحویل‌جزئی (PARTIALLY_DELIVERED) |
| 3 | ارسال‌شده کامل (SHIPPED) |
| 4 | تحویل‌شده (DELIVERED) |
| 5 | لغو‌شده (CANCELLED) |
| 6 | مرجوع‌شده (RETURNED) — فقط بکند؛ فرانت هنوز معادلی برایش ندارد |

(عضو `PENDING` که قبلاً اینجا `0` بود کلاً حذف شد — فرانت هیچ‌وقت تولیدش نمی‌کرد و همان برچسبِ
`PROCESSING` را برایش نشان می‌داد، پس تفکیک‌شان روی سیم معنایی نداشت. هر جا در فروش قبلاً
`PENDING` ست می‌شد حالا `PROCESSING` است.)

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
| 0 | اضافی (EXCESS) — بیش از مقدارِ یک قلمِ سند. **`orderLineId` الزامی** است و `unitPrice` باید دقیقاً برابر قیمت‌واحد همان قلم باشد (وگرنه ۴۰۰). |
| 1 | فهرست‌نشده (UNLISTED) — کالایی که اصلاً در سند نیست. **`orderLineId` نباید فرستاده شود**؛ `unitPrice` همان مقدار کلاینت است. |

هیچ‌کدام سهمیه یا `settledQuantity` قلم را مصرف نمی‌کنند؛ `purchaseItemId`/`saleItemId` در خروجی برای EXCESS مقدار دارد و برای UNLISTED `null` است.

#### `ReturnStatusEnum` (وضعیت مرجوعی)
| مقدار | معنی |
|---|---|
| 0 | در انتظار تصمیم (OPEN) |
| 1 | در حال اجرا (IN_PROGRESS) |
| 2 | تسویه شده (SETTLED) |
| 3 | رد شده (REJECTED) — فقط قابل بازگشایی |
| 4 | لغو شده (CANCELLED) — پایانی |

جدول عملیات مجاز در هر وضعیت: بخش ۱۰، «چرخه‌ی عمر».

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

#### `ReturnEffectDirectionEnum` (نوع یک اثر پایه‌ای درون یک تصمیم)
| مقدار | معنی روی مرجوعی خرید | معنی روی مرجوعی فروش |
|---|---|---|
| 0 | کالا وارد می‌شود (GOODS_IN) — تامین‌کننده جایگزین می‌فرستد | کالا وارد می‌شود (GOODS_IN) — مشتری کالا را برمی‌گرداند |
| 1 | کالا خارج می‌شود (GOODS_OUT) — ما کالای معیوب را برمی‌گردانیم | کالا خارج می‌شود (GOODS_OUT) — ما جایگزین برای مشتری می‌فرستیم |
| 2 | وجه خارج می‌شود از ما (MONEY_OUT) | وجه خارج می‌شود از ما (MONEY_OUT) — بازپرداخت/اعتبار به مشتری |
| 3 | وجه وارد می‌شود به ما (MONEY_IN) — بازپرداخت از تامین‌کننده | وجه وارد می‌شود به ما (MONEY_IN) |
| 4 | آزادسازی از قرنطینه به موجودی (GOODS_RELEASE) — داخلی | — (مجاز نیست) |
| 5 | اسقاط از قرنطینه (GOODS_SCRAP) — داخلی، زیان گزارش‌شده | — (مجاز نیست) |

#### `ReturnEffectStatusEnum` (وضعیت اجرای یک اثر)
| مقدار | معنی |
|---|---|
| 0 | در انتظار (PENDING) — فقط اثرهای کالایی، تا اجرا با `ExecuteGoodsRound` |
| 1 | اعمال‌شده (APPLIED) — اثرهای مالی همیشه بلافاصله این‌جا هستند |
| 2 | باطل (VOID) — فعلاً هیچ‌جا تولید نمی‌شود |

#### `ReturnPaymentMethodEnum` (روش پرداخت یک اثر مالی)
شماره‌گذاری عمداً با `PaymentTypeEnum` (سطح سند) یکی است — `ON_ACCOUNT` همان `CREDIT` است.
تنها عضو اضافه `STORE_CREDIT` است که ته فهرست آمده.

| مقدار | معنی |
|---|---|
| 0 | نقدی (CASH) |
| 1 | نسیه/در حساب (ON_ACCOUNT — معادل `CREDIT`) |
| 2 | چک (CHECK) |
| 3 | انتقال بانکی (TRANSFER) |
| 4 | ترکیبی (MIXED) — نیازمند `parts[]` |
| 5 | اعتبار فروشگاهی (STORE_CREDIT) |

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

### تغییرات قرارداد — ۲۰۲۶-۰۹-۱۷ (حذف قاعده‌ی تراز مالی) — آسان‌گیرانه، بدون شکست

قاعده‌ی تراز مالیِ تصمیم (`ReturnMoneyBalance`) **حذف شد**. قرار بود این بخش ولیدیشن سخت‌گیرانه‌ای نداشته باشد تا کارمند بتواند بر اساس توافق با تامین‌کننده یا مشتری هر ترکیبی را ثبت کند؛ قاعده دقیقاً خلاف آن عمل می‌کرد.

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `AddClaimResolution` (خرید و فروش) | تراز غیرصفر، وجه در جهت متناظر با دست‌کم همان مبلغ لازم داشت؛ ۴۰۰ با `data.requiredDirection`/`requiredAmount` | **هیچ بررسی‌ای نیست**؛ هر ترکیبی پذیرفته می‌شود | رابطه‌ی ارزش کالا و مبلغ وجه یک توافق است، نه محاسبه |
| `composition.goodsIn[]`/`goodsOut[]` — `unitPrice` | الزامی (نفرستادنش ۴۰۰) | **اختیاری**، و هیچ منطقی نمی‌خواندش؛ فقط برای سابقه و نمایش ذخیره می‌شود | تنها مصرف‌کننده‌اش قاعده‌ی تراز بود |

**بدون تغییر:** فیلد `unitPrice` و ستون‌های `PurchaseReturnEffects.UnitPrice`/`SaleReturnEffects.UnitPrice` سر جای خودشان هستند و در `effects[].unitPrice` برمی‌گردند، پس **هیچ migration‌ای لازم نیست و هیچ داده‌ای از دست نمی‌رود**. فرستادن `unitPrice` مثل قبل کار می‌کند؛ هر پیلودی که امروز درست است فردا هم درست است. قواعد لایه‌ی ادعا (دامنه، قلم سند، سهمیه، `unitPrice` ادعای EXCESS برابر قیمت قلم)، چرخه‌ی عمر، و `unitCost` هیچ‌کدام تغییر نکردند.

**فرانت:** مسیر خطای `data.requiredDirection`/`requiredAmount` دیگر هرگز فعال نمی‌شود و اگر فرمی تراز را زنده محاسبه می‌کند و دکمه‌ی ثبت را قفل می‌کند، آن قفل باید برداشته شود. محاسبه‌ی تراز به‌عنوان یک عدد راهنما برای پیش‌فرض کردن مبلغ وجه اشکالی ندارد و حتی مفید است.

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۲۰ (فروش حضوری و شماره‌ی فاکتور)

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `CreateSale` / `UpdateSale` — `invoiceNumber` | فیلد ورودی بود و کلاینت آن را می‌فرستاد | **حذف شد**؛ سرور هنگام خروج از پیش‌فاکتور خودش تولیدش می‌کند | شماره‌ی رسمی نباید دست کلاینت باشد؛ `CreateSaleInstallmentPlan` هم از همان مسیر می‌رود |
| `CreateSale` — `data` | خالی بود | `{ id, invoiceNumber, status }` | فراخوان بدون یک کوئری دیگر شناسه و شماره‌ی فاکتور را لازم دارد |
| `POST api/Sale/CreateInPersonSale` | — | **جدید** (بخش ۱۱) | ثبت اتمیک فروش حضوری، نقدی یا اقساطی |
| `CreateSale` / `UpdateSale` — `paymentDetails` | برای هر `paymentType` غیر `CASH` الزامی بود | `INSTALLMENT` مستثنا شد؛ خالی فرستاده می‌شود | رکورد پیش‌پرداخت را ثبت قرارداد می‌سازد، نه کلاینت — با این قانون اصلاً نمی‌شد فروش اقساطی ساخت |
| `UpdateSale` — `paymentDetails` | اعتبارسنجی می‌شد ولی **هیچ‌وقت ذخیره نمی‌شد** (در `CreateSale` ذخیره می‌شد) | ذخیره می‌شود، با جایگزینی کامل؛ روی فروش اقساطی نادیده گرفته می‌شود | ویرایش فروش، پرداخت‌های تازه را بی‌صدا دور می‌ریخت |
| `UpdatePurchase` — `paymentDetails` | **فیلد اصلاً وجود نداشت** | اضافه شد؛ جایگزینی کامل، و برای `paymentType` غیر نقدی الزامی | پرداخت‌های یک خرید بعد از ثبت اولیه اصلاً قابل اصلاح نبود |

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۲۰ (فروش اقساطی)

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `paymentDetails[].id` (روی `GetSaleDetail`، `GetPurchaseDetail` و ورودی Create/Update) | `Guid` | `int` | همه‌ی شناسه‌های این پروژه `int` هستند؛ `Guid` بودن این یکی باعث یک FK سایه‌ای (`PurchaseId1`) روی جدول هم شده بود |
| `paymentDetails[]` | `{ id, type, amount, checkNumber, transferRef }` | + `purpose` (`PaymentPurposeEnum`) و `paidAt` (تاریخ واقعی پرداخت) | باید بشود «پرداخت عادی» را از «پیش‌پرداخت قرارداد اقساطی» و «پرداخت قسط» تشخیص داد |
| `GetSaleDetail` → `paymentDetails[]` | موجودیت خام `PaymentDetail` | همان DTO بالا | ناوبری‌های موجودیت روی wire نشت نکنند |
| `PaymentTypeEnum` | تا `4` (`MIXED`) | + `5` = `INSTALLMENT` | افزودنی، هیچ عضوی شماره‌گذاری مجدد نشده |
| خروج فروش از `PROFORMA` | همیشه شرط `paidAmount >= totalAmount` | برای `paymentType = 5` شرط، «پلن اقساط فعال + پیش‌پرداخت ثبت‌شده» است | مشتری قسطی هرگز کل مبلغ را یکجا نمی‌پردازد |
| `UpdateSale` روی فروش اقساطیِ دارای پلن | `paidAmount`/`totalAmount` ورودی مستقیم می‌نشست | `paidAmount` از پلن می‌آید؛ `totalAmount` متفاوت با پلن ۴۰۰ می‌گیرد | پلن و فروش نباید از هم جدا بیفتند |

**افزودنی، بدون شکست:** `installmentSummary` (nullable) روی `GetSaleDetail` و هر ردیف `GetSaleList`، و کنترلر تازه‌ی `api/SaleInstallment` (بخش ۱۱ب).

### تغییرات قرارداد — ۲۰۲۶-۰۹-۱۴ (رسید و ارسال یکپارچه) — افزودنی، بدون شکست

| کجا | تغییر |
|---|---|
| `POST api/Shipment/ReceiveShipment` | جدید: دریافت خرید + مراحل ورود کالای مرجوعی خرید/فروش در یک تراکنش (بخش ۱۲ب) |
| `POST api/Shipment/DispatchShipment` | جدید: ارسال فروش + مراحل خروج کالای مرجوعی فروش/خرید در یک تراکنش |

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۱۴ (مازاد فروش و ردیابی دانه‌ای)

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `ShipSale` → `items[]` | فقط `shippedQuantity` (> ۰) | + `excessQuantity`/`excessProductUnitBarcodes`؛ `shippedQuantity` می‌تواند `0` باشد | ۵ دانه‌ای که نزد مشتری است در سیستم `IN_STOCK` می‌ماند |
| `CreateSaleReturn`، ادعای EXCESS | بدون سقف | سقف = مازادِ ثبت‌شده روی قلم منهای ادعاهای باز | ادعای مازاد بدون راستی‌آزمایی انبار پذیرفته می‌شد |
| `ExecuteGoodsRound` فروش، `GOODS_IN` ادعای EXCESS | دانه‌ی تازه ساخته می‌شد | همان دانه‌های `SOLD · EXCESS` برمی‌گردند | یک دانه دو بار در سیستم نباشد |
| کالای `requiresUnitTracking` | اسکن اختیاری | اسکن الزامی در `ShipSale` و `GOODS_OUT` هر دو مرجوعی | ردیابی دانه‌ای برای کالایی که ارزشش را دارد |
| گزارش فروش `costOfGoodsSold` | — | + بهای مازاد ارسالی (`SALE_SHIPPED_EXCESS`، بدون درآمد) | کالا رفته و پولی نیامده |

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۱۴ (خروج از قرنطینه و بخشش)

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `ExecuteGoodsRound` خرید، `GOODS_OUT` | منبع ضمنی: موجودی قفسه | `rounds[].source` **الزامی** (`1` موجودی یا `9` قرنطینه)؛ نفرستادنش ۴۰۰ | کالای قفسه و کالای قرنطینه ارزش متفاوت دارند؛ سرور نباید حدس بزند |
| `AddClaimResolution` خرید | — | `goodsRelease[]`/`goodsScrap[]` با `unitCost` | کالای قرنطینه جز عودت راهی برای خروج نداشت |
| `AddClaimResolution` (خرید و فروش) | «دست‌کم یک اثر» | «دست‌کم یک اثر **یا** `writeOff`»؛ `writeOff` همراه اثر ۴۰۰؛ `resolutions[].isWriteOff` | بستن بخشی از ادعا بدون جبران ممکن نبود |
| `ExecuteGoodsRound` خرید، `GOODS_IN` با مشاهده | بخش آسیب‌دیده هیچ دانه و ردیف دفتری نداشت | دانه در قرنطینه با علت ادعا، ارزش بیرون از میانگین | کالای فیزیکاً موجود در سیستم نبود |
| `ExecuteGoodsRound` فروش | — | `source` فقط `1` روی `GOODS_OUT`؛ هر چیز دیگر ۴۰۰ | مرجوعی فروش قرنطینه ندارد |
| `ReturnEffectDirectionEnum` | ۰ تا ۳ | + `GOODS_RELEASE = 4`، `GOODS_SCRAP = 5` | — |
| گزارش فروش | — | `scrapLoss` در هر دوره، از `netProfit` کم می‌شود | اسقاط زیانِ مستقل گزارش می‌شود |

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۱۴ (قرنطینه در دریافت)

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `ReceivePurchase` → `items[]` | `receivedQuantity` (فقط سالم) | `arrivedQuantity` + `defects[]` | انباردار می‌شمارد؛ تقسیم را سرور انجام می‌دهد |
| `ReceivePurchase` | بیش از باقیمانده ۴۰۰ | پذیرفته؛ اضافه به‌عنوان مازاد قرنطینه می‌شود | رسیدن مازاد واقعیت است |
| `ReceivePurchase` | — | `unlistedItems[]` جدید؛ خروجی `lines[]`/`unlistedItems[]` | کالای خارج از سند بدون ورود به سیستم قابل عودت نبود |
| `CreatePurchaseReturn`، ادعای EXCESS/UNLISTED | بدون سقف | سقف = دانه‌های قرنطینه‌ی همان علت منهای ادعاهای باز؛ مازاد/خارج از سند باید اول دریافت شده باشد | می‌شد برای ۵ مازاد ۵۰۰ ادعا ثبت کرد |
| `GetPurchaseReceivingInfo` | — | `quarantinedOnOrderQuantity`/`quarantinedExcessQuantity`، `unlistedItems[]`، `discrepancies[]` | پیش‌پرکردن «ثبت مغایرت» |
| `CreateProduct`/`UpdateProduct` | — | `requiresUnitTracking`؛ `CreateProduct` با `isIncomplete` (ساخت سریع) | اسکن فقط برای کالای ردیابی‌شونده؛ کالای خارج از سند در انبار ساخته می‌شود |
| `UpdateProduct`، کالای ناقص | برند و قیمت‌ها همیشه الزامی | برای کالای ناقص اختیاری؛ پرچم فقط با تکمیل واقعی پاک می‌شود | اصلاح نام نباید کالا را «کامل» کند |
| `GetProductList`/`GetProductDetail` | — | `requiresUnitTracking`، `isIncomplete`، `quarantinedCount`؛ فیلتر `isIncomplete` | — |
| گزارش خرید `totalReceivedValue` | فقط کالای واردشده به موجودی | + ارزش کالای خرابِ سهم سفارش که به قرنطینه رفت | پولش داده شده، پس خریده شده |

### تغییرات قرارداد — ۲۰۲۶-۰۹-۱۳ (ردیابی دانه) — همه افزودنی، بدون شکست

| کجا | تغییر |
|---|---|
| `GET api/Product/GetProductUnitHistory` | جدید: وضعیت فعلی دانه + همه‌ی حرکت‌هایش (بخش ۷) |
| `GetProductUnitList` → `productUnitList[]` | `purchaseId`، `purchaseInvoiceNumber`، `supplierId`، `supplierName`، `saleId`، `saleInvoiceNumber`، `customerId`، `customerName` |
| `ExecuteGoodsRound` (خرید و فروش) → `rounds[]` | `productUnitBarcodes` اختیاری؛ روی مرجوعی فروش `observations[].productUnitBarcodes` هم (بخش‌های ۱۰ و ۱۲) |

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۱۳ (وجه معوق)

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `composition.moneyIn`/`moneyOut` (خرید و فروش) | اثر مالی همیشه لحظه‌ی ثبت `APPLIED` بود | بدون `paidAt` **`PENDING`** است؛ با `paidAt` `APPLIED`. فرمی که پول را همان لحظه پرداخت می‌کند باید `paidAt` بفرستد، وگرنه مرجوعی `SETTLED` نمی‌شود | «پول را بعداً می‌دهم» قابل ثبت نبود و وعده به‌عنوان پرداخت ثبت می‌شد |
| `ExecuteMoneyEffect` (خرید و فروش) | — | جدید | اجرای اثر مالیِ معلق |
| دفتر بهای تمام‌شده | ردیف وجه لحظه‌ی ثبت تصمیم | ردیف وجه در لحظه‌ی پرداخت (`paidAt`) | گزارش‌ها نباید پولی را که نیامده نشان دهند |
| `canCancel`/`canReject`/`canDelete` | هر اثر مالی قفل می‌کرد | فقط اثر مالیِ `APPLIED` قفل می‌کند | وعده‌ی پرداخت چیزی را جابه‌جا نکرده است |
| `Get…ReturnPendingEffects` | همه‌ی اثرهای `PENDING` | فقط اثرهای کالایی | صف انبار است؛ وجه معلق کار مالی است |

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۱۳ (مدل اثرهای مرجوعی)

راهنمای مهاجرت فرانت: `docs/return-frontend-migration.fa.md`. مدل کامل: بخش ۱۰، «مدل اثرها».

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| ~~`composition.goodsIn[]`/`goodsOut[]` (خرید و فروش)~~ **(منسوخ ۲۰۲۶-۰۹-۱۷)** | `unitPrice` خوانده نمی‌شد | `unitPrice` الزامی بود؛ حالا دوباره اختیاری است | — |
| ~~`AddClaimResolution` (خرید و فروش)~~ **(منسوخ ۲۰۲۶-۰۹-۱۷ — قاعده‌ی تراز حذف شد)** | بررسی نمی‌شد | تراز الزامی شد، و دوباره حذف شد | سخت‌گیری‌ای بود که قرار نبود وجود داشته باشد |
| `AddClaimResolution` — مقدار کالا | مجموع `goodsIn` + `goodsOut` ≤ `composition.quantity` | بدون سقف در لایه‌ی اثر | هر ترکیبی از اثرها با هر مقداری مجاز است |
| `composition.goodsIn[]`/`goodsOut[]` (خرید و فروش) | — | `unitCost` اختیاری؛ نبودنش = میانگین موزون جاری هنگام اجرای نوبت، یا `purchasePrice` کالا اگر آن میانگین صفر باشد | قیمت معامله و بهای کالا (برای موجودی) دو عدد متفاوت‌اند |
| `effects[]` (خرید و فروش) | — | `unitPrice` و `unitCost` | قیمت اعلام‌شده‌ی معامله، و بهای اعلام‌شده (یا `null`) |
| `ExecuteGoodsRound` خرید، `GOODS_IN` | با بهای تاریخیِ قلم خرید وارد میانگین موزون می‌شد | با `unitCost` اثر، یا میانگین جاری | یک قاعده برای همه‌ی ورودهای کالا |
| `ExecuteGoodsRound` فروش، `GOODS_IN` | با بهای ارسالِ همان قلم فروش وارد میانگین موزون می‌شد | با `unitCost` اثر، یا میانگین جاری | همان |
| `AddClaimResolution` خرید، اثر مالی | در هیچ گزارشی نبود | در گزارش خرید، `returnMoneyAmount` (بازپرداخت تامین‌کننده منفی، پرداخت به او مثبت)؛ در گزارش فروش نیست؛ حذف تصمیم معکوسش را می‌نویسد | بازپرداخت تامین‌کننده درآمد نیست، کاهش هزینه‌ی خرید است |
| `AddClaimResolution` فروش، `moneyIn` | در دفتر ردیفی نداشت | درآمد مثبت (`SALE_RETURN_MONEY_IN`)، در گزارش فروش شمرده می‌شود | همان |
| `Create…Return`، ادعای EXCESS | `unitPrice` متفاوت بی‌صدا با قیمت قلم جایگزین می‌شد | ۴۰۰ | فرم یک عدد نشان می‌داد و سرور عدد دیگری ذخیره می‌کرد |
| `Create…Return`، ادعای ON_ORDER با `offScopeKind` | بی‌صدا دور ریخته می‌شد | ۴۰۰ | داده‌ی متناقض |

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۱۲ (چرخه‌ی عمر مرجوعی و ادعاهای خارج از سند)

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| همه‌ی نوشتن‌های مرجوعی (خرید و فروش): `Create…Return`، `AddClaimResolution`، `RemoveClaimResolution`، `ExecuteGoodsRound`، `Cancel…`، `Reject…`، `Reopen…` | `data` خالی (`null`) یا شیء ناقص (`returnId`/`resolutionId`/`returnStatus`) | سند کامل مرجوعی، هم‌شکل `Get…ReturnDetail` | فرانت پاسخ هر نوشتن را مستقیم در کش جزئیات می‌گذارد و `id` را از آن می‌خواند؛ `data = null` بعد از رد/لغو موفق باعث خطا در فرانت و ماندن صفحه روی وضعیت قدیمی می‌شد، و کلیک دوباره با پیام گمراه‌کننده‌ی «دست‌نخورده» رد می‌شد |
| `Delete…Return` | `data = null` | `{ id, purchaseId }` / `{ id, saleId }` | همان دلیل |
| ادعای `EXCESS` | `orderLineId` نادیده گرفته می‌شد؛ `unitPrice` از کلاینت | `orderLineId` **الزامی**؛ `unitPrice` از قلم سند | EXCESS «بیش از یک قلم» است و با قیمت همان قلم قیمت‌گذاری می‌شود. **فرم فعلی فرانت `orderLineId: null` می‌فرستد و بعد از این تغییر ۴۰۰ می‌گیرد** |
| ادعای `UNLISTED` | `orderLineId` بی‌صدا حذف می‌شد | `orderLineId` فرستاده شود ← ۴۰۰ | داده‌ی متناقض دیگر پذیرفته نمی‌شود |
| `productId` ادعای خارج از سند | بدون بررسی؛ شناسه‌ی نامعتبر ← ۵۰۰ | ۴۰۰ | |
| لغو/رد/حذف | فقط اثر `APPLIED` مانع بود | اثر کالایی با `appliedQuantity > 0` (حتی `PENDING`) هم مانع است | قبلاً مرجوعی‌ای که بخشی از کالایش جابه‌جا شده بود قابل لغو بود |
| بازگشایی | همیشه `OPEN` | وضعیت دوباره محاسبه می‌شود (`OPEN` یا `IN_PROGRESS`) | |
| `GetPurchaseReturnPendingEffects` / `GetSaleReturnPendingEffects` | اثرهای مرجوعی رد‌شده/لغوشده هم برمی‌گشت | فقط مرجوعی‌های باز | انبار نباید برای مرجوعی بسته کالا جابه‌جا کند |
| `ExecuteGoodsRound` | `observations` بیشتر از `quantity` پذیرفته می‌شد (موجودی منفی اضافه می‌شد) | ۴۰۰ | |

**فرانت:** `isReturnUntouched`/`canCancelReturn`/`canRejectReturn`/`canDeleteReturn` در `shared/domain/returns/resolutions.js` هنوز قاعده‌ی قدیمی («هیچ اثر `APPLIED`») را محاسبه می‌کنند. به‌جای آن، پرچم‌های `canCancel`/`canReject`/`canDelete`/`canReopen` سند را بخوانید.

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۰۸ (یکسان‌سازی نام مقادیر)

سه‌گانه‌ی «کل / رسیدگی‌شده / مانده» در بک‌اند یکسان شد: همه‌جا `quantity` / `<مرحله>Quantity` / `remainingQuantity`. `remainingQuantity` از قبل یکسان بود و **تغییر نکرده**.

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `GetPurchaseReturnDetail` / `GetSaleReturnDetail` (سطح بالا) | `totalQuantity` | `quantity` | فیلد سمت سرور `ClaimedQuantity` بود و در این سند اشتباهاً `totalQuantity` مستند شده بود؛ حالا هر دو `quantity` هستند. **دقت کنید:** `totalQuantity` در پاسخ‌های *لیست* (`GetPurchaseReturnList`/`GetSaleReturnList`) سر جایش است و تغییر نکرده |
| `effects[]` در جزئیات مرجوعی | `doneQuantity` | `appliedQuantity` | با `appliedAt` و وضعیت `APPLIED` که همین شمارنده آن را فعال می‌کند هم‌نام شد؛ ضمناً از `decidedQuantity` (که «تصمیمِ ثبت‌شده» است، نه «کالای جابه‌جاشده») جدا می‌ماند |
| `GetPurchaseReturnPendingEffects` / `GetSaleReturnPendingEffects` | `doneQuantity` | `appliedQuantity` | همان |

`decidedQuantity` روی مرجوعی و روی `claims[]` **تغییر نکرده** — این‌ها تصمیم‌های ثبت‌شده را می‌شمارند، در حالی که `appliedQuantity` کالای واقعاً جابه‌جاشده را می‌شمارد. این دو عمداً دو نام متفاوت دارند.

### ⚠️ تغییرات شکسته‌ی قرارداد — ۲۰۲۶-۰۹-۰۷

این‌ها در یک تغییر واحد اعمال شدند و فرانت باید هر ردیف را جداگانه مهاجرت دهد.

| کجا | قبل | بعد | چرا |
|---|---|---|---|
| `AddClaimResolution` (خرید و فروش) | `composition.money` با فیلد `money.kind` | `composition.moneyIn` / `composition.moneyOut` (بدون فیلد جهت) | مقدار صفرِ enum برابر `GOODS_IN` بود، پس هر درخواستی که `kind` نمی‌فرستاد رد می‌شد. حالا جهت ساختاری است، دقیقاً مثل `goodsIn`/`goodsOut` |
| اثرها (همه‌ی خروجی‌ها) | `kind` | `direction` | نام `kind` هم‌زمان برای «جهت» و برای مفاهیم دیگر (`offScopeKind`) به کار می‌رفت |
| `ReturnEffectKindEnum` | — | `ReturnEffectDirectionEnum` | مقادیر عددی **تغییر نکرده‌اند** |
| لیست مرجوعی (خرید و فروش) | `dominantProblem` (یک عدد) | `problems` (آرایه، به ترتیب بیشترین مقدار ادعا) | `dominantProblem` فقط مشکل بزرگ‌ترین ادعا را می‌داد و برای مرجوعیِ بدون ادعا عدد `0` را به‌عنوان یک مشکل واقعی برمی‌گرداند. `problems[0]` دقیقاً همان مقدار قبلی است |
| مرجوعی فروش (همه‌جا) | `requestDate` | `returnDate` | هم‌نام شدن با سمت خرید |
| جزئیات مرجوعی | `createdAt`، `updatedAt` | حذف شد | ستون audit دیتابیس؛ `returnDate` تاریخ دامنه‌ای است |
| لیست مرجوعی | `createdAt` | حذف شد (و `previousReturnId` اضافه شد) | همان دلیل |
| ادعا (`claims[]`) | `purchaseReturnId`/`saleReturnId`، `createdAt` | حذف شد | ادعا داخل خود مرجوعی تو در تو است؛ کلید والد تکراری بود |
| تصمیم (`resolutions[]`) | `purchaseReturnClaimId`/`saleReturnClaimId`، `createdAt` | حذف شد؛ `decidedAt` اضافه شد | همان دلیل — و «زمان ثبت تصمیم» یک مفهوم دامنه‌ای است، نه ستون audit |
| اثر (`effects[]`) | `purchaseReturnResolutionId`/`saleReturnResolutionId`، `createdAt` | حذف شد؛ `productName` اضافه شد | `appliedAt` تاریخ دامنه‌ای اثر است. بدون `productName`، اثرِ جایگزینی با محصولی متفاوت از ادعا فقط یک شناسه‌ی خام بود |
| عکس‌های رسید (`receivingImages[]`) | `createdAt` | `uploadedAt` | نام دامنه‌ای به‌جای نام ستون |
| جزئیات مرجوعی | — | `previousReturnNumber` اضافه شد | `previousReturnId` حالا اعتبارسنجی می‌شود (باید مرجوعیِ همان سند باشد) و شماره‌اش هم برمی‌گردد |
| `ChangeUserTeam` | فقط `isHead` | `isDeputy` هم اضافه شد | بخش ۳ |
| `UpdateUser` | فقط جایگاه را می‌نوشت | فیلد اختیاری `role` اضافه شد و جای قبلی آزاد می‌شود | بخش ۳ — این همان باگ «تیم قبلی هنوز کاربر را مسئول نشان می‌دهد» بود |
| `GetUserInfo`/`GetUserUpdate`/`GetUserList` | — | `role` + `roleTitle` اضافه شد | بخش ۳ و ۱۵ |
| `CreateDepartment` با `headId` | همیشه ۴۰۰ | کاربر را منتقل و نقش‌دار می‌کند | بخش ۳ب |
| `CreateTeam`/`UpdateTeam`/`UpdateDepartment` با `headId`/`deputyId` | اگر کاربر عضو آن واحد نبود ۴۰۰ | کاربر خودکار منتقل می‌شود | بخش ۳ب و ۳ج |


- **`roleId` دیگر وجود ندارد:** نقش‌های `Admin`/`User` و سطح دسترسی مبتنی بر آن‌ها حذف شده‌اند. آنچه امروز «نقش» نامیده می‌شود جایگاه سازمانی است (`OrgRoleEnum`، بخش ۳ و ۱۵) و هیچ اثری روی سطح دسترسی ندارد؛ سطح دسترسی هنوز پیاده‌سازی نشده و قرار است بر اساس `departmentId` باشد.
- **ارسال کد OTP غیرفعال است:** فرآیند بازیابی رمز عبور (`ForgetPassword`) در حال حاضر کد تایید نمی‌خواهد؛ endpoint ارسال OTP در کد کامنت شده و در هیچ کنترلری expose نشده.
- **`UpdatePurchase` اقلام را ویرایش نمی‌کند** ولی **`UpdateSale` اقلام را ویرایش می‌کند** (بخش‌های ۹ و ۱۱) — این عدم‌تقارن عمدی است، به آن دقت کنید تا در فرم‌های ویرایش دو صفحه‌ی متفاوت طراحی کنید.
- **مدل مرجوعی خرید/فروش یکسان و صریح است:** هیچ‌کدام دیگر چیزی را حدس نمی‌زنند — هر جابه‌جایی فیزیکی کالا (چه جایگزین از تامین‌کننده، چه جایگزین به مشتری، چه برگشت کالای معیوب) با یک فراخوانی صریح `POST api/{PurchaseReturn|SaleReturn}/ExecuteGoodsRound` ثبت می‌شود (بخش‌های ۱۰ و ۱۲).
- **Enum ها همیشه عدد هستند** به‌جز `SupplierListDto.status` که رشته است — این تنها استثنا در کل سیستم است. **به‌روزرسانی ۲۰۲۶-۰۹-۰۱:** خودِ استثنا هنوز پابرجاست، فقط محتوایش عوض شده — قبلاً `BalanceType.ToString()` (نام انگلیسی enum) بود، حالا `BalanceType.GetDescription()` (متن فارسی، همان extension method که بقیه‌ی سیستم برای برچسب‌های نمایشی enum استفاده می‌کند).
- **`EnsureProductCodes` و `EnsureInventoryCostLedger` ابزارهای نگهداری/مهاجرت هستند**، نه بخشی از گردش‌کار عادی محصول — در UI روزمره لینکی برایشان نگذارید.
- **سود خالص (`netProfit` در بخش ۱۸) بر اساس میانگین موزون هزینه محاسبه می‌شود، نه `Product.PurchasePrice`.** یعنی اگر یک محصول در دو خرید مختلف با قیمت‌های متفاوت خریداری شده باشد، هزینه‌ی هر فروش بر اساس میانگین موزونِ قیمت‌های خرید **تا همان لحظه‌ی فروش** حساب می‌شود؛ فیلد `purchasePrice` روی خود محصول فقط برای موجودی اولیه (بدون سابقه‌ی خرید ثبت‌شده) استفاده می‌شود.
- **`GetBarcodeSvg`، `GetProductLabelsPdf` و هر سه API زیر `Invoice`** خروجی JSON استاندارد ندارند و باید به‌صورت فایل (blob) گرفته شوند.

---

## 17. بارگذاری تصاویر (File)

تصاویر در یک فضای ذخیره‌سازی ابری (Liara Object Storage) نگهداری می‌شوند، نه روی سرور برنامه.

- چیزی که در دیتابیس ذخیره می‌شود **کلید شیء (ObjectKey)** است، مثلاً `shelf.jpg` — نه یک URL.
- **آدرس تصویر به خودِ همین API اشاره می‌کند** (`api/File/GetImage`)، نه به باکت. دلیلش این است که
  لبهٔ لیارا به هر درخواستی با `User-Agent` مرورگری پاسخ `404 page not found` می‌دهد، پس آدرس باکت
  در `<img src>` هیچ‌وقت باز نمی‌شود. شرحِ کامل در `image-serving-guide.fa.md`.
- این آدرس **منقضی نمی‌شود**، ولی همچنان بهتر است ذخیره نشود: میزبانِ داخلِ آن با محیط عوض می‌شود.
  مقدارِ پایداری که باید نگه دارید `imageKey` است.

### گردش‌کار دو مرحله‌ای

آپلود جدا از ثبت موجودیت انجام می‌شود، تا بتوانید قبل از ذخیره‌ی فرم پیش‌نمایش تصویر را نشان دهید:

۱. فایل را به `POST api/File/UploadImage` بفرستید → `objectKey` بگیرید.
۲. همان `objectKey` را در فیلد **`imageKey`** دستور `CreateX`/`UpdateX` (که همچنان JSON ساده است) بفرستید.

### `POST api/File/UploadImage`

بدنه از نوع `multipart/form-data`:

| فیلد | نوع | توضیح |
|---|---|---|
| `file` | فایل | تصویر |
| `folder` | عدد | `ImageFolderEnum` — ۱ محصولات، ۲ مشتریان، ۳ تامین‌کنندگان، ۴ رسید کالا |

خروجی در `data`:

```json
{
  "objectKey": "shelf.jpg",
  "url": "http://localhost:5083/api/File/GetImage?objectKey=shelf.jpg",
  "fileName": "shelf.jpg",
  "contentType": "image/jpeg",
  "size": 84213
}
```

محدودیت‌ها (قابل تنظیم در `appsettings.json`، مقادیر پیش‌فرض): حداکثر **۵ مگابایت**، پسوندهای `.jpg .jpeg .png .webp .gif .pdf`. نقض هرکدام خطای ۴۰۰ با پیام فارسی می‌دهد و **هیچ چیزی آپلود نمی‌شود**.

**کلید همان نام فایل شماست.** اگر آن نام از قبل در باکت باشد، شماره می‌گیرد (`logo.png` → `logo-1.png` → `logo-2.png`) تا فایل قبلی بازنویسی نشود. نام فایل تا یک قطعهٔ مسیر کوتاه می‌شود؛ یعنی `../../x.png` و `C:\path\x.png` هر دو `x.png` ذخیره می‌شوند. پس **همیشه `objectKey` برگشتی را ملاک قرار دهید، نه نامی که فرستادید** — ممکن است متفاوت باشد.

### `GET api/File/GetImage?objectKey=...`

**خودِ فایل** را برمی‌گرداند (نه JSON). این همان چیزی است که در `imageUrl` می‌آید و مستقیم در `<img src>` می‌نشیند. نیاز به توکن ندارد — چون `<img>` نمی‌تواند هدر `Authorization` بفرستد. کلید ناموجود ← ۴۰۴ با پاکت JSON فارسی.

### `GET api/File/GetImageUrl?objectKey=...`

آدرس تصویر را دوباره می‌سازد و همراهش `objectKey` را هم برمی‌گرداند. با کلید یا با یک آدرس تصویرِ قبلی هر دو کار می‌کند.

### `DELETE api/File/DeleteImage?objectKey=...`

شیء را از باکت پاک می‌کند. **توجه:** هنگام تعویض تصویرِ یک محصول/مشتری/تامین‌کننده، سرور تصویر قبلی را خودکار پاک **نمی‌کند** (ممکن است همان کلید جای دیگری هم استفاده شده باشد). اگر می‌خواهید فایل قدیمی حذف شود، خودتان این endpoint را صدا بزنید.

### در خروجی خواندن‌ها (Customer / Supplier / Product)

هم در جزئیات و هم در لیست، دو فیلد برمی‌گردد:

| فیلد | کاربرد |
|---|---|
| `imageKey` | مقدار پایدار. هنگام ویرایش، **همین** را در فیلد `imageKey` برگردانید تا تصویر حفظ شود. |
| `imageUrl` | آدرس آمادهٔ نمایش، فقط برای `<img src>`. ذخیره نکنید (میزبانش با محیط عوض می‌شود). |

اگر موجودیت تصویر ندارد، هر دو `null` هستند. برای پاک‌کردن تصویر، در دستور ویرایش `imageKey` را `null` بفرستید.

> **نامِ فیلد در دستورهای نوشتن `imageKey` است — نه `imageUrl` و نه `imageObjectKey`.** خواندن و
> نوشتن حالا قرینه‌اند: `imageKey` می‌گیرید، `imageKey` پس می‌فرستید. اگر اشتباهاً `imageUrl` را
> بفرستید باز هم کار می‌کند (سرور آن را به کلید خام تبدیل می‌کند)، ولی رفتار درست `imageKey` است.

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
- `revenue`: مجموع مبلغ خالص فروش‌های ارسال‌شده در این بازه (پس از کسر تخفیف قلمی) + وجوه مرجوعی‌های فروش: `moneyOut` به‌صورت منفی و `moneyIn` به‌صورت مثبت.
- `costOfGoodsSold`: بهای تمام‌شده‌ی کالای فروخته‌شده در همین بازه، محاسبه‌شده با میانگین موزون هزینه در لحظه‌ی ارسال (نه قیمت خرید فعلی محصول).
- `scrapLoss`: ارزش کالای قرنطینه‌ای که در همین بازه اسقاط شد (`goodsScrap` مرجوعی خرید، با `unitCost` اثر؛ بخش ۱۰). یک خط مستقل است و در `revenue`/`costOfGoodsSold` نیست.
- `netProfit`: `revenue - costOfGoodsSold - scrapLoss` (شامل بهای کالایی که با `goodsOut` مرجوعی فروش ارسال شد و وجوه مرجوعی‌های فروش؛ بخش ۱۰، «مدل اثرها»).

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
      "totalReceivedValue": 650000000,
      "returnMoneyAmount": -40000000
    }
  ]
}
```
`totalReceivedValue`: ارزش واقعیِ کالای خریده‌شده‌ای که در همین بازه به انبار رسید (قیمت خرید هر قلم پس از تخفیف، ضرب در تعداد دریافتیِ سهم سفارش) — **شامل کالای خرابِ سهم سفارش که مستقیم به قرنطینه رفت** (پولش داده شده)، ولی نه مازاد یا کالای خارج از سند (بخش ۹، `ReceivePurchase`) — ممکن است با `totalInvoiceAmount` یکی نباشد چون یکی بر اساس تاریخ فاکتور و دیگری بر اساس تاریخ دریافت فیزیکی است.

`returnMoneyAmount`: وجوه مرجوعی‌های خرید در همین بازه (بر اساس زمان ثبت تصمیم)، به‌عنوان هزینه‌ی خرید: `moneyIn` (تامین‌کننده به ما پرداخت) **منفی** و `moneyOut` (ما به تامین‌کننده پرداختیم) **مثبت**. جدا از `totalReceivedValue` نگه داشته شده چون آن ارزش کالای دریافتی است. این وجوه در گزارش فروش شمرده نمی‌شوند.
