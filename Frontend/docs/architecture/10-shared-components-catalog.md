# ۱۰ — کاتالوگِ کامپوننت‌های مشترک

## هدف

قبل از ساختنِ کامپوننتِ تازه، اینجا ببینید آماده‌اش هست یا نه. همه زیرِ `src/shared/components/` هستند. ستونِ «#» تعدادِ فایل‌هایی است که آن را با مسیرِ `@/shared/components/...` import می‌کنند (grep، 2026-10-16). `داخلی` یعنی فقط فایل‌های هم‌پوشه با importِ نسبی آن را استفاده می‌کنند.

## فایل‌های کلیدی

- `src/shared/components/ui/` — پایه‌های shadcn/Radix (`button`، `dialog`، `select`، `sidebar`، `table`، …) و ورودی‌های فارسی (`persian-date-picker`، `price-input`، `mobile-number-input`، `national-id-input`، `bank-input`، `plate-input`، `city-selector`). تولیدِ CLI؛ فقط در صورتِ نیاز دست بخورند ([01](01-tech-stack-and-tooling.md)).
- راهنمای زنده: `pnpm dev` → `/dev/ui` (`src/app/dev/StyleGuidePage.jsx`، `src/app/dev/ComponentShowcase.jsx`).

## چطور کار می‌کند: یک صفحه‌ی لیستِ کامل از قطعاتِ مشترک

```jsx
// src/features/customers/pages/CustomersPage.jsx
<ListPageLayout
  title="مدیریت مشتریان"
  create={{ label: "مشتری جدید", to: ROUTES.CUSTOMERS_NEW }}
  actions={<DataTransferActions resource="customers" filters={filters} invalidateKey={customerKeys.all} />}
>
  <PartyListFilters useStore={useCustomerFilterStore} searchKey="fullName" searchPlaceholder="نام مشتری..." />
  <ServerTable query={query} listState={listState} table={CustomerTable} />
</ListPageLayout>
```

```mermaid
flowchart LR
  ST["ServerTable<br/>query + listState"] -->|isError| QE[QueryErrorState]
  ST --> FO["FetchingOverlay<br/>active = isFetching && !isLoading"]
  FO --> T["table={CustomerTable}"]
  T --> DT["DataTable<br/>columns, sorting, pagination"]
  DT -->|موبایل| MR[MobileRowCards]
  DT --> DP[DataTablePagination]
  DT -->|refresh| RB[RefreshButton]
  MR -->|refresh| RB
```

`ServerTable` (`src/shared/components/table/ServerTable.jsx`) کارِ تکراری را می‌کند: خطا → `QueryErrorState`، واکشیِ دوباره → `FetchingOverlay`، و تبدیلِ `{ items, total, page, totalPages }` و `listState` (از `createFilterStore`) به propsِ جدول. جدولِ هر فیچر فقط `DataTable` را با `columns` می‌پیچد (`src/features/customers/components/CustomerTable.jsx`).

**تازه‌سازی:** هر جدول و فهرست دکمه‌ی «تازه‌سازی» دارد. `ServerTable` همان کوئری را به‌صورتِ `refresh` به جدول می‌دهد و `DataTable` دکمه را خودش می‌گذارد، بی‌ردیفِ اضافه: دسکتاپ در گوشه‌ی سرتیترِ چسبانِ جدول (یک ستونِ باریکِ اول، راست در RTL؛ با اسکرولِ جدول هم در دید)، موبایل در نوارِ موجودِ بالای کارت‌ها کنارِ شمار و مرتب‌سازی، و با `emptyState` بالای همان بلوک. جدولِ فیچر باید propsِ ناشناخته (`refresh`) را به `DataTable` برساند (`{...props}`)؛ جدولی که props را تک‌تک می‌گیرد `refresh` را هم بگیرد. فهرستِ بی‌`ServerTable` `refresh={query}` را دستی می‌دهد؛ `MasterListPane` پراپِ `refresh` دارد (کنارِ جست‌وجو)؛ فهرست/گزارشِ بی‌جدول `RefreshButton` را مستقیم در نوارِ خودش یا `actions`ِ `ListPageLayout` می‌گذارد.

**`table` و React Compiler:** نمونه‌ی `useReactTable` در همه‌ی رندرها همان شیء است. Compiler خودِ `DataTable` را memo نمی‌کند (هشدارِ `react-hooks/incompatible-library`)، ولی فرزندی که فقط `table` را prop می‌گیرد با همان `table` دوباره رندر نمی‌شود و `table.getState()` در آن کهنه می‌ماند. هر state‌ی که فرزند لازم دارد (مثلِ `sorting` برای `MobileRowCards`) را جدا prop بدهید.

## کاتالوگ

### `table/`

| کامپوننت | کِی | # |
| --- | --- | --- |
| `ServerTable` | لیستِ صفحه‌بندی‌شده‌ی سرور در صفحه‌ی لیست؛ `transform`، `singlePage` | ۱۷ |
| `DataTable` | پوسته‌ی جدول (مرتب‌سازیِ تک‌ستونی، `sortable`، `emptyState`، `rowClassName`، `getRowKey`)؛ در موبایل `MobileRowCards` | ۱۹ |
| `detailsColumn(getPath)` (`columns.jsx`) | ستونِ استانداردِ «جزئیات»؛ در موبایل کلِ کارت لینک می‌شود | ۹ |
| `DataTablePagination` | صفحه‌بندی بیرون از `DataTable` | ۴ |
| `PaymentProgress` | نوارِ «پرداخت‌شده از کل» در ردیف | ۲ |
| `RefreshButton` | «تازه‌سازی»ِ یک کوئری: کمینه‌ی چرخش، زمانِ آخرین به‌روزرسانی در راهنما؛ `variant="pill"` برای موبایل. خودکار در `DataTable`/`MasterListPane`؛ مستقیم در دانه‌ها (گوشه‌ی سرتیتر به‌جای چک‌باکسِ انتخابِ صفحه) و مالیات | ۵ |
| `TableLoadingSkeleton` | اسکلتونِ جدول | ۲ |
| `SortSelect` | انتخابِ مرتب‌سازیِ موبایل (`options`، `sorting`، `onChange`)؛ خودکار در `MobileRowCards`، مستقیم در کارت‌های دانه‌ها | ۲ |
| `MobileRowCards`، `SortIcon`، `DetailsLink` | داخلی | — |

### `layout/`

| کامپوننت | کِی | # |
| --- | --- | --- |
| `ListPageLayout` | پوسته‌ی هر صفحه‌ی لیست: `title`، `icon`، `description`، `create`، `actions` | ۱۱ |
| `MasterListPane` | ستونِ فهرست در صفحه‌های «فهرست/جزئیات» کنارِ هم (دسترسی‌ها، خودروها)؛ `refresh` = کوئریِ فهرست | ۴ |
| `RedirectKeepingSearch` | در `routes.jsx`: نشانیِ قدیمی → تازه با همان query (صفحه‌ی جابه‌جاشده) | ۲ |
| `PageHeaderActions` | دکمه‌ی صفحه در هدرِ اپ کنارِ عنوان (پورتال به `headerStore.actionsSlot`)؛ مثلاً «تاریخچه» در صفحه‌های جزئیات ([08](08-client-state-zustand.md)) | ۲ |
| `RouteLoadingOverlay` | فقط پوسته‌ها (`AppLayout`، `AuthLayout`)؛ سایدبار و breadcrumb در `src/app/layouts/` هستند ([03](03-bootstrap-and-routing.md)) | ۲ |

### `filters/`

| کامپوننت | کِی | # |
| --- | --- | --- |
| `FilterPanel` / `ResponsiveFilters` | پوسته‌ی فیلترها؛ موبایل: `primary`/`secondary` همیشه‌پیدا + پنلِ بازشونده با شمارِ فیلترِ فعال (`store`) | ۱۷ |
| `FilterSearchInput` | جست‌وجوی متنی | ۱۵ |
| `FilterSelect` | انتخابِ تکیِ کم‌گزینه | ۱۳ |
| `EntitySelect` | انتخابِ **یک** موجودیت با جست‌وجو (گزینه‌ی زیاد)؛ عمداً تک‌انتخابی چون endpointها یک شناسه می‌گیرند | ۱۲ |
| `DateRangeToolbar` | بازه‌ی تاریخ با میان‌برها (گزارش‌ها) | ۸ |
| `FilterDateInput`، `FilterMultiChoice`، `FilterSwitch` | تاریخ، چندگزینه، سوییچ | ۴–۶ |
| `filterUtils.js` | `normalizeFilterValue`، `toFilterOptions`، `getPartyName` | ۹ |

### `feedback/`

| کامپوننت | کِی | # |
| --- | --- | --- |
| `ConfirmDialog` | تأییدِ کارِ برگشت‌ناپذیر؛ تا پایانِ درخواست باز می‌ماند — فراخوان در `onSuccess` می‌بندد | ۱۶ |
| `QueryErrorState` | خطای لیست با «تلاش دوباره» (جای جدول) | ۱۵ |
| `DetailErrorState` | صفحه‌ی جزئیات: «پیدا نشد» (۴۰۴) را از «واکشی شکست خورد» جدا می‌کند | ۱۴ |
| `Notice` | باکسِ توضیح/هشدار با tone | ۱۴ |
| `UnsavedChangesDialog` | «تغییرات ذخیره نشده» با `blocker`ِ `useUnsavedChangesGuard` (یا کنترل‌شده با `open`) | ۶ |
| `FetchingOverlay` | پوششِ واکشیِ دوباره (نه بارِ اول) | ۹ |
| `ProgressStat` | پیشرفتِ شمارشی | ۴ |

### `status/`

| کامپوننت | کِی | # |
| --- | --- | --- |
| `StatusBadge` | هر وضعیت با `tone` ([09](09-ui-system-theming-rtl.md)) | ۲۵ |
| `SaleStatusBadge`، `PurchaseStatusBadge`، `PaymentTypeBadge` | وضعیتِ فروش/خرید/نوعِ پرداخت با tone و آیکن از enum | ۵ |
| `StatusText` | متنِ رنگی | ۲ |
| `statusIcons.js` | `SALE_STATUS_ICONS`، `PURCHASE_STATUS_ICONS` | داخلی |

`ReturnStatusBadge` در `returns/` است.

### `forms/`

| کامپوننت | کِی | # |
| --- | --- | --- |
| `FormField`، `FormSelectField` | فیلدِ react-hook-form با label و خطا | ۶، ۳ |
| `FormSectionCard` | کارتِ بخشِ فرم با هدرِ آیکون‌دار (مشتری، تامین‌کننده، …) | ۱۱ |
| `SectionCard` | کارتِ بخشِ صفحه‌ی سند (هدرِ ساده + `action`) | ۸ |
| `DocumentFormLayout` (`main`/`payments`/`aside`، و `below` تمام‌عرض) + `FormSection`، `OrderSummaryCard` | چیدمانِ دوستونیِ فرمِ خرید/فروش؛ کلِ صفحه یک `<form>`؛ prop‌ِ `payments` در موبایل بین «سند فاکتور» و کارتِ جمع و ثبت می‌نشیند | ۴ |
| `StatusChoice` | انتخابِ وضعیت به‌صورتِ دکمه | ۷ |
| `ProductThumb`، `QuantityStepper`، `AmountInWords` | تصویرِ کالا، +/− تعداد، مبلغ به حروف | ۵–۶ |
| `OrderInfoCard`، `OrderItemsReadOnly`، `OrderLogisticsSection`، `TransporterSection`، `PartySection` | بخش‌های سندِ خرید/فروش (`OrderInfoCard`: `showInvoiceDate`/`showDueDate` برای فروش، که تاریخِ فاکتور را سرور می‌گذارد و سررسید جزوِ پیش‌فاکتور است) | ۲–۴ |
| `ProductSearchPanel`، `PartyPickerCard`، `SelectedItemsCards`، `SelectedItemsTable`، `MixedPaymentList` | انتخابِ کالا/طرف‌حساب در فرمِ سند | ۱–۳ |
| `ScannedUnitCodes` | داخلی | — |

### `payments/`

| کامپوننت | کِی | # |
| --- | --- | --- |
| `PaymentsCard` | همه‌ی پرداخت‌های یک سند؛ جز کارتخوان، همه در پیش‌نویسِ `usePaymentDraft` تا «ثبت تغییرات». تخصیص‌های علی‌الحساب (`allocations`) فقط نمایش و جزوِ پرداخت‌شده | ۴ |
| `PaymentForm`، `PaymentRow`، `PaymentMethodEditor`، `useFormPosPayment`، `pos/PosPaymentPanel`، `pos/PosReadyForm`، `pos/PosResultViews` | داخلیِ `PaymentsCard` | — |
| `ChequeFields` | سررسید، بانک و صاحب حسابِ یک چک (`compact` برای ردیفِ ترکیبی)؛ شماره‌ی چک جدا | ۳ |
| `BankAccountSelect` | صندوق/حسابِ یک دریافت/پرداختِ نقدی یا انتقالی (`GetBankAccountOptions`)؛ «بدون حساب» = `null`؛ بی حسابِ تعریف‌شده چیزی رندر نمی‌کند | ۲ |

### `returns/` (مرجوعیِ خرید و فروش، [11](11-domain-layer.md))

قطعاتِ صفحه‌ی مرجوعی که هر دو فیچر استفاده می‌کنند (اغلب ۲ مصرف‌کننده = خرید + فروش): `ReturnSourcePicker`، `ReturnInfoSection`، `ReturnItemsSection`، `ReturnResolutionSection`، `ReturnDocumentSection`، `ReturnStatusBar`، `ReturnSubmitBar`، `ReturnTable`، `ReturnFilters`، `ReturnStatusBadge`، `RelatedReturnsCard`، `OrderInvoiceCard`، `ReceivingReportCard`/`ReceivingReportLines`، `GoodsRoundItemsSection`، `GoodsRoundPartySection`، `GoodsRoundSummaryCard`، `ObservationEditor`، `DeleteReturnAction`، `PreviousReturnBadge`/`FollowUpReturnAction` (`ReturnChain.jsx`)، `ReturnPageSkeleton`، `ReturnSourceError`. داخلی: `ClaimRow`، `ClaimResolutionCard`، `EffectBadge`، `GoodsItemsPicker`، `ResolutionComposer`، `ResolutionLineRow`، `ResolutionMoneySection`، `ReturnStatusReasonDialog`.

### `print/` (چاپ با مرورگر)

هر برگه‌ای که در مرورگر ساخته و چاپ می‌شود از یک پوسته و یک مدلِ کاغذ استفاده می‌کند. سندی که سرور می‌سازد (فاکتور/پیش‌فاکتور فروش، برگه‌ی طلبکاری، برگه‌ی مرجوعی خرید) دو راه دارد: PDFِ رسمی با قالبِ ثابت (`src/shared/services/invoice/documentOutput.js`) و چاپ در همین پوسته از *داده‌ی همان سند* (`invoice/print/`، پایین).

| فایل | کار | مصرف‌کننده |
| --- | --- | --- |
| `studio/PrintStudio.jsx` | پوسته‌ی تمام‌صفحه: پنلِ تنظیمات + پیش‌نمایشِ بزرگ‌نمایی‌پذیر + نوارِ چاپ؛ دسکتاپ دو ستون، موبایل سوییچِ «پیش‌نمایش/تنظیمات» (پیش‌نمایش همیشه رندر و اندازه‌گیری می‌شود). پورتالِ زیرِ body، نه Dialog | برچسب، لیست قیمت‌ها، تصویرِ سندها |
| `studio/PaperSettings.jsx` | بخشِ «کاغذ»: اندازه (A3/A4/A5/Letter/رولِ ۸۰ و ۵۸/دلخواه)، جهت، حاشیه؛ `paperKeys` کاغذهای مجاز را محدود می‌کند | لیست قیمت‌ها، تصویرِ سندها |
| `studio/PrintSettingsSection.jsx`، `studio/SegmentedControl.jsx`، `studio/options.js` | بخشِ پنل با عنوان/آیکون، انتخابِ چندگزینه‌ایِ کوتاه، `optionsFromLabels` | همه‌ی پنل‌ها |
| `paper.js` | `pageGeometryOf(settings)` (اندازه، جهت، حاشیه، عرض/ارتفاعِ مفید؛ رول ارتفاعِ پیوسته دارد)، `flowPageCount`، `flowPrintOptions` (رول: ارتفاعِ صفحه = طولِ محتوا)، `fixedPagePrintOptions`، `formatPaperSize` | — |
| `FlowSheet.jsx` | برگه‌ی جاری روی کاغذ؛ مرورگر صفحه‌ها را می‌شکند و خطِ‌چینِ «صفحه‌ی n» فقط روی صفحه‌نمایش است؛ `onMeasure(heightMm)` برای شمارِ صفحه و طولِ رول | لیست قیمت‌ها |
| `LabelSheet.jsx`، `sheetPresets.js` | صفحه‌های صریحِ برچسب (شبکه‌ی ثابت در هر صفحه) | برچسبِ دانه |
| `typography.js` | `TEXT_SCALES` و `baseFontPt`: اندازه‌ی پایه‌ی متنِ برگه (pt)؛ بقیه‌ی متن‌ها `em` | لیست قیمت‌ها |
| `usePrint.js` | `window.print()` با `@page` و `body.printing`؛ حالتِ چاپ تا unmountِ پورتال می‌ماند، نه تا `afterprint` (کرومِ اندروید `afterprint` را فوراً می‌دهد) | همه |
| `print.css` | در چاپ فقط پورتال می‌ماند؛ کروم (`print-portal__chrome`)، قاب و مقیاسِ پیش‌نمایش و حاشیه‌ی `FlowSheet` کنار می‌روند | — |
| `BarcodeGraphic`، `QrCodeGraphic` | نمادِ بارکد/QR | برچسب |

تنظیماتِ هر نوع برگه با `usePrintSettings(kind, defaults)` (`src/shared/store/printSettingsStore.js`) روی همان دستگاه می‌ماند؛ فقط تغییرها ذخیره می‌شوند. برچسبِ دانه store و هندسه‌ی خودش را دارد (`labelTemplate.js`). برگه‌ی تازه: [13 §۱۴](13-recipes.md).

### بقیه

| پوشه | کامپوننت‌ها | کِی |
| --- | --- | --- |
| `charts/` | `ChartCard` (۱۲)، `GroupedBarChart`، `TrendChart`، `DonutChart`، `Sparkline`، `chartUtils.js` (۹)؛ داخلی: `ChartLegend`، `ChartTooltip`، `useChartSize` | نمودارهای SVGِ دست‌ساز (کتابخانه‌ی نمودار نیست)؛ داشبورد و حسابداری |
| `dataTransfer/` | `DataTransferActions` (۹)؛ داخلی: `ImportDialog`، `ImportResultView` | دکمه‌ی ورود/خروجیِ CSV/Excel در سرتیترِ لیست؛ مجاز بودن از سرور (`GetResources`) |
| `files/` | `RemoteImage` (۵)، `ImageUploadField` (۳)، `FileUploadList`، `ImageLightbox` | تصویر از سرور، آپلودِ تصویر/پیوست |
| `invoice/` | `InvoiceDocumentSection` (۵)، `useInvoiceAttachments`/`useDocumentAttachments` (۴)، `IssuedInvoiceNotice`، `InvoiceAttachmentsSaveButton`؛ داخلی: `DocumentPrintStudio`، `print/InvoicePrintStudio` (+ `InvoiceDocumentSheet`، `InvoicePrintSettingsPanel`، `invoicePrintSettings.js`) | خروجیِ فاکتور و پیوستِ سند؛ `InvoiceDocumentSection.localPrints` برای برگه‌های ساختِ صفحه (لیست قیمت‌ها) کنارِ سندها. چاپِ انتخابی که تصویر دارد در `DocumentPrintStudio` (کاغذ، چیدمان) باز می‌شود؛ PDFِ تنها مستقیم (`printPdfDocuments`). سندِ ساختِ سرور دکمه‌ی «چاپ با کاغذ و چیدمانِ دلخواه» هم دارد: `InvoicePrintStudio` داده‌ی سند را با `useInvoiceDocumentQuery` (`src/shared/services/invoice/queries.js`) می‌گیرد و هم‌شکلِ قالبِ رسمی در `PrintStudio` می‌چیند (بخش‌ها، ستون‌ها، شکلِ جدول، کاغذ، متن؛ تنظیم برای هر نوعِ سند جدا). منتظرِ بندِ ۲۷ِ frontend-requests؛ تا آن وقت ۴۰۴ |
| `barcode/` | `CameraScanButton` (۳)، `UnitBarcodeScanList` (۲)؛ داخلی: `CameraScanner`، `BarcodeScanField` | اسکنِ بارکد با دوربین |
| `map/` | `LocationPickerMap` (۱)؛ داخلی: `MapCanvas`، `MapSearchBar`، `nominatim.js` | انتخابِ مکان روی نقشه (Leaflet + Nominatim) |
| `products/` | `ProductPicker`، `DocumentItemsSection`، `useReturnedNewProduct` | انتخابِ کالا و برگشت از «کالای جدید» |
| `skeletons/` | `WarehouseFormSkeleton` (۴)، `OrderFormSkeleton` (۲) | اسکلتونِ فرم‌ها |
| `theme/` | `ThemeProvider`، `ThemeToggle`، `useTheme` | [09](09-ui-system-theming-rtl.md) |

## قراردادها و نکته‌ها

- **صفحه‌ی لیست:** `ListPageLayout` + فیلتر در `FilterPanel`/`ResponsiveFilters` + `ServerTable` با جدولی که `DataTable` را می‌پیچد. خطا و overlay را دستی نسازید.
- **صفحه‌ی جزئیات:** در خطا/۴۰۴ `DetailErrorState` با `onRetry={refetch}`.
- **حذف/لغو:** `ConfirmDialog`؛ در `onSuccess`ِ mutation ببندید، نه در `onConfirm`.
- **وضعیت:** `StatusBadge` با tone از enum؛ رنگِ پالت ننویسید.
- چند کامپوننت در `shared/components` از `@/features/...` import می‌کنند (`PartyPickerCard`، `ProductSearchPanel`، `ProductPicker`، `useReturnedNewProduct`) — فایل ۰۲ و ۱۴.
- کامپوننتی که فقط یک فیچر مصرف می‌کند در همان فیچر بماند ([02](02-folder-structure.md)).

## برای تغییرِ X، به Y بروید

| می‌خواهم… | کجا |
| --- | --- |
| صفحه‌ی لیستِ تازه | الگو: `src/features/customers/pages/CustomersPage.jsx` + `src/features/customers/components/CustomerTable.jsx` |
| رفتارِ همه‌ی جدول‌ها (موبایل، صفحه‌بندی) | `src/shared/components/table/DataTable.jsx`، `MobileRowCards.jsx`، `DataTablePagination.jsx` |
| رفتارِ خطا/بارگذاریِ لیست‌ها | `src/shared/components/table/ServerTable.jsx` |
| فیلترِ تازه با ظاهرِ مشترک | `src/shared/components/filters/` (الگو: `PartyListFilters` در `src/features/partyAccount/components/PartyListFilters.jsx`) |
| ورود/خروجی برای یک لیست | `<DataTransferActions resource="…" filters={filters} invalidateKey={…Keys.all} />` در `actions`ِ `ListPageLayout` |
| دکمه در هدرِ صفحه‌ی جزئیات | `<PageHeaderActions>` (`src/shared/components/layout/PageHeaderActions.jsx`) |
| تاریخچه‌ی تغییراتِ یک سند/رکورد | `AuditHistoryButton` از `src/features/audit/components/AuditHistoryButton.jsx` ([12-features/audit](12-features/audit.md)) |
| برگه‌ی چاپیِ تازه (گزارش، رسید، …) | `PrintStudio` + `PaperSettings` + `FlowSheet` و `usePrintSettings` ([13 §۱۴](13-recipes.md))؛ الگو: `src/features/sales/orders/components/proforma/PriceListPrint.jsx` |
| کاغذِ تازه یا رفتارِ حاشیه | `src/shared/components/print/paper.js` |
| کامپوننتِ پایه‌ی shadcn | CLIِ shadcn → `src/shared/components/ui/` |

## سؤال‌های باز / بدهی

- `charts/chartUtils.js` یک `formatNumber` جدا از `src/shared/lib/numberFormat.js` export می‌کند؛ دو تابع با یک نام و رفتارِ کمی متفاوت (`maximumFractionDigits: 0` در نسخه‌ی نمودار؛ `Number(value) || 0` در نسخه‌ی lib).
- `DataTable` (۱۹) بیشتر از `ServerTable` (۱۷) مستقیم import می‌شود، چون جدول‌های فیچر آن را می‌پیچند؛ این عمدی است، نه تکرار.
