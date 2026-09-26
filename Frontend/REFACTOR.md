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
  - [ ] ۱.۳ کامپوننت‌های پایه (جدول لیستی، فیلتر، فرم آدرس) و `shared/components`
  - برای تست خطای شبکه: پیکربندی `ourerp-offline` در `.claude/launch.json` (API روی پورت بسته).
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

- purchases: `usePurchaseStatsQuery`
- sales: `manualSaleStatusOptions`، `saleStatusHint`، `canDeleteSale` (بررسی شود حذف فروش بدون این قاعده محافظت می‌شود یا نه)
- returns: `CLAIM_SCOPE_LABELS` (خرید و فروش)، `isQuarantineEffect`، `deriveReturnStatus`، `isOffScope`
- units: `UnitBarcodeCell`، `UnitProductCell`، `UnitQuarantineSource`، `UnitValueCell`،
  `UNIT_LABEL_STATE_LABELS`، `DOCUMENT_KIND_LABELS`، `LABEL_FILTER_OPTIONS`
- shared: `SHEET_PRESET_OPTIONS`، `DEFAULT_LABEL_CODE_KIND`، `LABEL_CODE_KIND_OPTIONS`،
  `DOCUMENT_PAYMENT_DIRECTION`، `TAX_CATEGORY_LABELS`، `listParams`

### متن پیام‌ها برای مرور در فاز هر فیچر
- units: `"انجام نشد"` (mutations.js) خیلی مبهم است.
- units: شماره‌ی سریال دانه با جداکننده‌ی هزارگان نمایش داده می‌شود («سریال ۱۲٬۳۴۵»)؛ سریال عدد مقداری نیست.
- `ResolutionLineRow`، `LedgerBalanceBadge` و چند متن template هنوز «ریال» را دستی می‌چسبانند → `formatRial`.

### کد تکراری
- mutationهای مرجوعی خرید و فروش (`purchases/returns/services/mutations.js` و `sales/returns/...`) تقریباً یکسان‌اند.
- `CustomerTable` / `SupplierTable` (~۵۷ خط تفاوت از ۳۰۹) و `ProductTable` هر کدام `useReactTable`
  خودشان را دارند در حالی که `shared/components/table/DataTable.jsx` وجود دارد.
- `PurchasesNewPage` / `SaleNewPage` ساختار تقریباً یکسان دارند.
- `PurchaseDetailForm` / `SaleDetailForm` هم الگوی یکسان دارند.

### پرفرمنس
- `navigationStore` (`previousPath`/`returnPath`) فقط در `PurchasesNewPage`/`SaleNewPage` برای برگشت استفاده می‌شود؛ احتمالاً با `useReturnTo` قابل جایگزینی است (فاز purchases/sales).
- صفحه‌های ثبت خرید/فروش برای انتخاب کالا و طرف حساب ۲۰۰ ردیف را یک‌جا می‌گیرند
  (`pageSize: 200`)؛ باید به جست‌وجوی سمت سرور تبدیل شود → درخواست بکند.
- داده‌ی استان/شهر (۵۸۰۰ خط) در باندل JS است.

### کاندیدهای انتقال به بکند
- `shared/domain/returns/resolutions.js` و `effects.js` (منطق وضعیت و اثر مرجوعی)
- محاسبات جمع فاکتور در `shared/domain/invoice/lineMath` (الان «پیش‌نمایش با قاعده‌ی سرور» است؛ بررسی شود)
