# ریفکتور فرانت — سند پیگیری

برنچ: `refactor/frontend-cleanup` (از `main` در `1417fbd`)

هدف‌ها: معماری تمیزتر، کد خواناتر با کامنت، کامپوننت‌های قابل استفاده‌ی مجدد،
حذف کد مرده/اشتباه، اصلاح متن پیام‌ها و دیالوگ‌ها، ثبت منطقی که باید به بکند
برود (در `Backend-Net/docs/frontend-requests.fa.md`)، و در آخر بهبود پرفرمنس.

## قواعد کار

- هر مرحله رفتار برنامه را عوض نمی‌کند مگر برای رفع باگ؛ هر باگ در پیام commit ذکر می‌شود.
- قبل از هر commit: `pnpm lint` بدون خطا و `pnpm build` موفق. `pnpm knip` کد مرده را نشان می‌دهد.
- کامنت‌ها فارسی، مثل بقیه‌ی کد. برای توابع/کامپوننت‌های export‌شده JSDoc کوتاه:
  «چه می‌کند و چرا»، نه تکرار کد.
- کامپوننت‌های `src/shared/components/ui/*` تولید shadcn هستند؛ فقط در صورت نیاز واقعی دست بخورند.
- به کد بکند دست نمی‌زنیم؛ نیازهای سمت سرور به‌صورت بخش شماره‌دار در سند درخواست‌ها نوشته می‌شود.

### قواعد استایل

- رنگِ وضعیت هرگز مستقیم از پالت Tailwind (`amber-50`، `green-700`، `oklch(...)`) نوشته نمی‌شود.
  معنا انتخاب می‌شود و ظاهر از توکن‌های `index.css` می‌آید: `neutral`، `primary`، `info`، `success`،
  `warning`، `caution`، `special`، `danger` (تعریف و راهنما در `shared/lib/tone.js`).
- وضعیت → `StatusBadge` (یا `PurchaseStatusBadge`/`SaleStatusBadge`/`PaymentTypeBadge`/`ReturnStatusBadge`
  در `shared/components/status/`)، متن رنگی → `StatusText`، باکس توضیح/هشدار → `Notice`،
  پیشرفت شمارشی → `ProgressStat`.
- نگاشت «وضعیت → tone» کنار labelها در `shared/domain/enums/*` است؛ آیکن‌ها در `status/statusIcons.js`.
- کلاس `dark:` برای رنگ لازم نیست؛ توکن‌ها در هر تم (روشن/تیره/دسترس‌پذیر/…) تعریف شده‌اند.
- راهنمای زنده: `pnpm dev` و بعد `/dev/ui` (فقط در dev؛ وارد build تولید نمی‌شود).

## مبنای اندازه‌ی باندل (قبل از ریفکتور، `main`)

| مورد | خام | gzip |
|---|---|---|
| کل JS (۲۱۶ فایل) | 2.65 MB | 804 KB |
| JS بارگذاری اولیه (index + vendorها) | 970 KB | 297 KB |
| CSS اصلی | 196 KB | — |
| precache ‏PWA | 3.9 MB (۲۴۴ فایل) | — |

بزرگ‌ترین چانک‌ها: `city-selector` ‏413KB (داده‌ی `persianProvinces.js`)،
`index` ‏261KB، `vendor-react` ‏190KB، `QrCodeGraphic` ‏141KB، `vendor-radix` ‏137KB،
`UnitsPage` ‏100KB، `chevron-down` ‏95KB (نام گمراه‌کننده؛ باید بررسی شود چه چیزی در آن است).

## مراحل

- [x] **۰. آماده‌سازی**
  - lint: از ۹ خطا / ۱۶ هشدار به ۰ خطا / ۸ هشدار (باقی‌مانده‌ها «Compilation Skipped» برای
    `useReactTable` و `watch` هستند و با انتقال جدول‌ها به `DataTable` در مرحله‌ی ۲ کم می‌شوند).
  - ثابت‌ها و تبدیل رشته↔آبجکت پلاک به `shared/lib/plate.js` رفت (قبلاً در دو کامپوننت تکرار شده بود).
  - `PrintPreviewOverlay` (بی‌استفاده از زمان طراحی جدید برچسب) و وابستگی‌های
    `@persianlabs/icons` و `@undecaf/zbar-wasm` حذف شدند.
  - `knip` با `knip.json` اضافه شد (`pnpm knip`).
- [ ] **۱. لایه‌ی مشترک**
  - [x] ۱.۱ پیام‌های خطا: `shared/lib/errorMessage.js` (`getErrorMessage`). اینترسپتور axios
    `error.serverMessage` و یک `error.message` همیشه فارسی می‌گذارد. ۷۶ مورد `error.message || "..."`
    تبدیل شد (قبلاً در قطع شبکه/خطای ۵۰۰ متن انگلیسی axios نشان داده می‌شد). ورود در قطع شبکه
    دیگر «رمز اشتباه است» نمی‌گوید. `DetailErrorState` بین «یافت نشد» و «خطای موقت» (با دکمه‌ی
    تلاش دوباره) فرق می‌گذارد. کوئری‌ها روی خطای ۴xx دیگر retry نمی‌کنند.
  - [x] ۱.۲ `shared/services`، `lib`، `hooks`، `store`:
    - `lib/numberFormat.js` (`formatNumber`، `formatRial`) جای ۳۰ کپیِ `fa`/`toFa` را گرفت.
    - `AmountInWords` + `rialAmountInWords`: مبلغ به حروف در ۶ فرم؛ قبلاً با تقسیم دستی بر ۱۰
      برای مبالغ غیرمضرب ۱۰ متن «... ممیز پنج دهم تومان» ساخته می‌شد.
    - `useIsMobile` با `matchMedia` (رندر اول روی موبایل دیگر دسکتاپ نیست، رندر فقط روی عبور از breakpoint).
    - هدر `multipart` بی‌اثر در آپلود حذف شد (اینترسپتور همیشه پاکش می‌کرد؛ با تست axios تأیید شد).
    - آزادسازی آدرس‌های blob بعد از چاپ تصاویر ضمیمه.
    - کامنت‌های قدیمی مربوط به لایه‌ی mock (دیگر وجود ندارد) اصلاح شد؛ `listParams` بی‌استفاده حذف شد.
  - [ ] ۱.۳ `shared/components`
    - [x] ۱.۳.۱ سیستم طراحی وضعیت: توکن‌های `success/warning/caution/info/special` در هر سه تم،
      `tone.js`، `StatusBadge`، `StatusText`، `Notice`، `ProgressStat`، `ReturnStatusBadge`.
      سه سبک badge (که نیمی dark mode نداشتند) یکی شد؛ codemod رنگ‌های خام ۴۰ فایل را به توکن برد؛
      نقشه‌های تکراری وضعیت→آیکن/رنگ در ۴ کارت و ۲ badge تکراری مرجوعی حذف شد؛
      badgeهای خرید/فروش/پرداخت از فیچرها به `shared/components/status` رفتند (انبار هم مصرفشان می‌کند).
      صفحه‌ی `/dev/ui` برای بررسی بصری.
    - [x] ۱.۳.۲ صفحه‌های لیست و جدول‌ها:
      - `CustomerTable`/`SupplierTable`/`ProductTable` (هر کدام ~۳۰۰ خط کپیِ `DataTable`) فقط تعریف ستون شدند.
      - `ServerTable` (کوئری + خطا + overlay + صفحه‌بندی) و `ListPageLayout` (کارت/عنوان/دکمه‌ی ایجاد)؛
        ۹ صفحه‌ی لیست از ~۷۰ خط به ~۲۵ خط رسیدند.
      - ستونِ «جزئیات» (`detailsColumn`/`DetailsLink`) لینکِ واقعی است: باز کردن در تب جدید کار می‌کند؛
        متن‌های «جزئیات بیشتر»/«مدیریت» یکی شد.
      - `routeWithId` جای template string و `.replace(":id")` در ۳۷ جا.
      - `usePageHeader` جای افکتِ تکراریِ `setHeader`/`clearHeader` در ۲۴ صفحه.
      - `useSuppliersOptionsQuery`/`useCustomersOptionsQuery` برای dropdownها.
      - تست در مرورگر: لیست‌ها، صفحه‌بندی، لینک جزئیات، و `DetailErrorState` برای ۴۰۴ (پیامِ سرور، بدونِ retry).
    - [ ] ۱.۳.۳ بقیه‌ی `shared/components`
      - [x] نقشه: `LocationPickerMap` (۴۷۱ خط) به `nominatim.js` (سرویس)، `MapSearchBar`، `MapCanvas` (تنها فایلِ
        Leaflet، lazy) شکست. Leaflet (۱۶۰KB JS + ۱۵KB CSS) دیگر همراهِ فرم‌های آدرس و CSSاش در `main.jsx` بار نمی‌شود.
        «تایید موقعیت» تا پیدا شدنِ آدرس غیرفعال است (قبلاً موقعیت بدونِ آدرس ذخیره می‌شد).
      - [x] `CustomerAddressForm`/`SupplierAddressForm` (یکسان) → `partyAccount/PartyAddressForm`؛ اسکلتونِ جزئیاتِ
        هر دو → `PartyDetailLoading`.
  - برای تست خطای شبکه: پیکربندی `ourerp-offline` در `.claude/launch.json` (API روی پورت بسته).
  - [ ] ۱.۴ حذف لایه‌های ترجمه‌ی نام (adapter) — فیلتر/پارامتر/فیلد با همان نامِ بکند:
    - [x] مشتری، تامین‌کننده، کالا: `listQuery` + `useDebouncedFilters`؛ `PartyListFilters` مشترک.
      باگ‌ها: مرتب‌سازیِ این سه جدول هیچ‌وقت به سرور نمی‌رفت؛ فیلتر «فقط ناقص» کالا ارسال نمی‌شد؛
      گزینه‌ی «ناموجود» بی‌اثر بود. با سرورِ تست بررسی شد.
    - [x] خرید، فروش، مرجوعی‌ها، صف‌های دریافت/ارسال، دانه‌ها، سازمان: فیلترها با نامِ بکند،
      `compactParams` جای سه کپیِ `filterValue`، `paramsSerializer` سراسری در axios (آرایه‌ها به شکلِ ASP.NET).
    - [x] `dueDate` → `paymentDate` (نامِ بکند) در همه‌ی فرم‌ها و نماها.
    - [x] `apiMapping`ِ دو سمتِ مرجوعی یکی شد (`shared/domain/returns/claimsApi.js`)؛ فقط تبدیلِ عددی و
      یک خطِ `orderLineId` ماند.
    - [x] `normalizeProductUnit` از کپیِ فیلد‌به‌فیلد به `{ ...dto }` + چند فیلدِ مشتق رسید.
    - [x] صفِ دریافت دیگر ردیف‌ها را سمتِ فرانت دوباره فیلتر نمی‌کند (`statuses` روی خرید پشتیبانی می‌شود و
      فیلترِ اضافه صفحه را کوتاه می‌کرد). صفِ ارسال هنوز فیلتر می‌کند تا بکند `Statuses` را روی فروش بدهد.
    - [x] سه نگاشتِ باقی‌مانده که از ناهمنامیِ خودِ بکند می‌آیند (`FisrtName`، `RefferalCode`، `OrderLineId`)
      و تاریخِ `0001-01-01` → بخشِ ۷ سندِ درخواست‌ها.
    - همه با سرورِ تست بررسی شد: پارامترهای ۹ لیست، `statuses` آرایه‌ای، `labelState` دانه‌ها، مهلتِ پرداخت،
      ادعاهای مرجوعی.
- قاعده: داده‌ی ساختگی (mock) ساخته نمی‌شود؛ بررسی روی سرورِ تست.
- [ ] **۲. فیچرها** (هر کدام: کد مرده، شکستن فایل بزرگ، کامپوننت مشترک، کامنت، متن پیام‌ها، موارد بکند)
  - [ ] auth
  - [ ] customers + suppliers
  - [ ] employees + organization + permissions
  - [ ] warehouse: products، categories، units، receiving، shipping
  - [ ] purchases
  - [ ] sales
  - [ ] returns (`shared/domain/returns` + مرجوعی خرید/فروش)
  - [ ] partyAccount + invoice + transactions
  - [ ] dashboard + reports + settings
- [ ] **۳. سند بکند** — هم‌زمان با مرحله‌ی ۲؛ به‌روزرسانی داکیومنت‌های قدیمی `Backend-Net/docs`.
- [ ] **۴. پرفرمنس** — مقایسه با جدول مبنا.

## یافته‌ها برای مراحل بعد

### export های بی‌استفاده (خروجی `pnpm knip`)
هر کدام در مرحله‌ی فیچر خودش بررسی شود: یا کد مرده است، یا قرار بوده جایی استفاده شود و نشده (باگ احتمالی).

- sales: `manualSaleStatusOptions`، `saleStatusHint`، `canDeleteSale` (بررسی شود حذف فروش بدون این قاعده محافظت می‌شود یا نه)
- returns: `CLAIM_SCOPE_LABELS` (خرید و فروش)، `isQuarantineEffect`، `deriveReturnStatus`، `isOffScope`
- units: `UnitBarcodeCell`، `UnitProductCell`، `UnitQuarantineSource`، `UnitValueCell`،
  `UNIT_LABEL_STATE_LABELS`، `DOCUMENT_KIND_LABELS`، `LABEL_FILTER_OPTIONS`
- shared: `SHEET_PRESET_OPTIONS`، `DEFAULT_LABEL_CODE_KIND`، `LABEL_CODE_KIND_OPTIONS`،
  `DOCUMENT_PAYMENT_DIRECTION`، `TAX_CATEGORY_LABELS`، `listParams`

### متن پیام‌ها برای مرور در فاز هر فیچر
- جدول‌های مرجوعی (خرید/فروش) هنوز دکمه‌ی `navigate` دارند نه `detailsColumn` (باز کردن در تب جدید کار نمی‌کند).
- units: `"انجام نشد"` (mutations.js) خیلی مبهم است.
- units: شماره‌ی سریال دانه با جداکننده‌ی هزارگان نمایش داده می‌شود («سریال ۱۲٬۳۴۵»)؛ سریال عدد مقداری نیست.
- `ResolutionLineRow`، `LedgerBalanceBadge` و چند متن template هنوز «ریال» را دستی می‌چسبانند → `formatRial`.

### کد تکراری
- mutationهای مرجوعی خرید و فروش (`purchases/returns/services/mutations.js` و `sales/returns/...`) تقریباً یکسان‌اند.
- `CustomerTable` / `SupplierTable` (~۵۷ خط تفاوت از ۳۰۹) و `ProductTable` هر کدام `useReactTable`
  خودشان را دارند در حالی که `shared/components/table/DataTable.jsx` وجود دارد.
- `PurchasesNewPage` / `SaleNewPage` ساختار تقریباً یکسان دارند.
- `PurchaseDetailForm` / `SaleDetailForm` هم الگوی یکسان دارند.

### معماری
- کارمندان/تیم‌ها/واحدها پاسخِ لیست را نرمال نمی‌کنند (`data.page.page`، `userList`)؛ باید از
  `normalizeListResponse` رد شوند تا روی `ServerTable` بیایند.
- `PurchasesNewPage`/`SaleNewPage`/`*ReturnNewPage` هنوز `setHeader` دستی با `onBack` پیچیده دارند (فاز purchases/sales).
- جدول‌های دیگر (`PurchaseTable`، `SaleTable`، ...) هنوز `useMemo(() => [...], [])` دارند؛ ستون‌ها می‌توانند ثابتِ ماژول باشند.

### پرفرمنس
- `navigationStore` (`previousPath`/`returnPath`) فقط در `PurchasesNewPage`/`SaleNewPage` برای برگشت استفاده می‌شود؛ احتمالاً با `useReturnTo` قابل جایگزینی است (فاز purchases/sales).
- حدود ۱۳ جا (صفحه‌های ثبت، جزئیات انبار، مرجوعی، dropdownهای فیلتر) ۲۰۰ ردیفِ کالا/طرف حساب را یک‌جا می‌گیرند
  (`pageSize: 200`)؛ باید به جست‌وجوی سمت سرور تبدیل شود → درخواست بکند.
- داده‌ی استان/شهر (۵۸۰۰ خط) در باندل JS است.

### کاندیدهای انتقال به بکند
- `shared/domain/returns/resolutions.js` و `effects.js` (منطق وضعیت و اثر مرجوعی)
- محاسبات جمع فاکتور در `shared/domain/invoice/lineMath` (الان «پیش‌نمایش با قاعده‌ی سرور» است؛ بررسی شود)
