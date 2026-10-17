# audit — تاریخچه‌ی تغییرات و گزارشِ فعالیتِ کاربران

`src/features/audit/` — فرانتِ `api/Audit` (بخش ۲۱ `Backend-Net/docs/api-guide.fa.md`). همه‌چیز فقط‌خواندنی است و پشتِ یک دسترسی: **`AuditLogView`** (گروهِ ۱۵ «تاریخچه تغییرات» در `PermissionGroupEnum`).

**مفهوم:** هر کامندی که چیزی ذخیره کند یک **رویداد** می‌سازد (چه کسی، کِی، کدام عملیات = `AuditActionEnum`). زیرِ هر رویداد برای هر سطرِ اضافه/ویرایش/حذف‌شده یک **تغییر** هست (`entityType` نامِ کلاسِ بکند، `entityKey`، `operation`، سندِ صاحب `documentKind`/`documentId`، و `fields[]` با `oldValue`/`newValue`). جدول‌ها فقط‌افزودنی‌اند؛ برای همین کشِ جزئیات `staleTime: Infinity` است.

## دو راهِ ورود

1. **گزارشِ فعالیت** — صفحه‌ی `/audit` در منوی «تاریخچه تغییرات»: همه‌ی رویدادها با فیلترِ کاربر، عملیات، بازه، نوع/شناسه‌ی رکورد و نوع/شماره‌ی سند. هر ردیف به صفحه‌ی رویداد (`/audit/:id`) می‌رود.
2. **دکمه‌ی «تاریخچه»** در هدرِ صفحه‌های جزئیات (`AuditHistoryButton` → شیتِ `AuditHistorySheet`): خطِ زمانیِ همان سند یا رکورد.

## مسیرها

`src/features/audit/routes.jsx` با `handle = { permission: "AuditLogView" }`.

| `ROUTES` | آدرس | صفحه |
| --- | --- | --- |
| `AUDIT` | `/audit` | `src/features/audit/pages/AuditEventsPage.jsx` |
| `AUDIT_DETAIL` | `/audit/:id` | `src/features/audit/pages/AuditEventDetailPage.jsx` |

پیش‌تنظیم از نشانی با `useUrlPreset` (`src/shared/hooks/useUrlPreset.js`): `userId`، `action`، `documentKind`، `documentId`، `fromDate`، `toDate` (عدد/تاریخ) و `entityType`، `entityKey` (متن). پیوندها با `withFilters(ROUTES.AUDIT, { userId })` ساخته می‌شوند («همه‌ی کارهای این کاربر»، «فعالیت‌ها»ی کارمند).

## سرویس‌ها

`src/features/audit/services/api-v1.js` — همه GET زیرِ `/Audit/`:

| تابع | endpoint | نکته |
| --- | --- | --- |
| `fetchAuditEvents` | `GetAuditEventList` | `normalizeListResponse(data, { itemsKey: "auditEventList" })`؛ مرتب‌سازی `AUDIT_EVENT_SORT_COLUMNS` (`occurredAt` ۰، `actionTitle` ۱، `userName` ۲) |
| `fetchAuditEventDetail` | `GetAuditEventDetail?id=` | همه‌ی تغییراتِ رویداد، به هر سندی؛ ۴۰۴ برای ناموجود |
| `fetchDocumentHistory` | `GetDocumentHistory?documentKind=&documentId=` | بدونِ صفحه‌بندی؛ در هر رویداد فقط ردیف‌های همان سند |
| `fetchEntityHistory` | `GetEntityHistory?entityType=&entityKey=` | همتای بالا برای سطرِ بی‌سند |
| `fetchAuditActions` | `GetAuditActionList` | `{ value, name, title }`؛ کاتالوگِ فیلتر از سرور می‌آید و در فرانت تکرار نمی‌شود |

هوک‌ها (`src/features/audit/services/queries.js`): `useAuditEventListFilters`، `useAuditEventsQuery` (نیمه‌ی تنهای `documentKind`/`documentId` و `entityKey` بی‌`entityType` فرستاده نمی‌شود)، `useAuditEventQuery`، `useAuditHistoryQuery(target, { enabled })` (سند یا رکورد، فقط وقتی شیت باز است)، `useAuditActionsQuery`. کلیدها: `auditKeys` (`["audit"]`). mutation ندارد.

store: `src/features/audit/store/auditEventFilterStore.js` (`createFilterStore` با نامِ پارامترهای سرور + `setRange`، `setEntityType`/`setDocumentKind` که کلیدِ وابسته را پاک می‌کنند، `applyPreset`).

## کامپوننت‌ها

| فایل | کار |
| --- | --- |
| `src/features/audit/components/AuditHistoryButton.jsx` | **API عمومیِ فیچر برای بقیه.** `<AuditHistoryButton documentKind={…} documentId={…} title="…" />` یا `entityType="Customer" entityKey={id}`؛ بدونِ `AuditLogView` چیزی رندر نمی‌کند؛ با `PageHeaderActions` در هدر می‌نشیند (`inHeader={false}` برای داخلِ صفحه) |
| `src/features/audit/components/UserActivityButton.jsx` | «فعالیت‌ها»ی یک کارمند → `/audit?userId=` (هدرِ `EmployeeDetailPage`) |
| `src/features/audit/components/AuditHistorySheet.jsx` | شیتِ کناری با اسکلتون، خطا، خالی و `AuditEventTimeline` |
| `src/features/audit/components/AuditEventTimeline.jsx` | خطِ زمانیِ رویدادها؛ اولی باز، بقیه با خلاصه‌ی «۲ ویرایش ردیف فروش · ۱ ایجاد پرداخت» |
| `src/features/audit/components/AuditChangeCard.jsx` | یک تغییر: نشانِ ایجاد/ویرایش/حذف، نوع و کلیدِ سطر، پیوند به سند/رکورد، و ستون‌ها («قبل ← بعد» در ویرایش؛ بیش از ۶ ستون جمع‌شده) |
| `src/features/audit/components/AuditEventTable.jsx`، `AuditEventFilters.jsx`، `AuditActionSelect.jsx`، `AuditActionLabel.jsx` | جدول و فیلترهای گزارش؛ انتخابِ عملیات با جست‌وجو (`EntitySelect`) |

دامنه:
- `src/features/audit/domain/auditEnums.js` — `AuditOperationEnum` + `_LABELS`/`_TONES`/`_ICONS`؛ `actionGroupOf(action)` (گروه و tone از بازه‌ی عددیِ `AuditActionEnum`: ۲۰۰ خرید، ۴۰۰ فروش، …)؛ `actionTitleOf` (`action: null` = «تغییر سیستمی»).
- `src/features/audit/domain/auditVocabulary.js` — `AUDIT_ENTITY_LABELS`/`entityLabelOf`، `AUDIT_FIELD_LABELS`/`fieldLabelOf` (نامِ ناشناخته همان نامِ انگلیسی می‌ماند)، `STANDALONE_ENTITY_TYPES` (گزینه‌های فیلترِ «نوع رکورد»)، `formatAuditValue(entityType, field, value)` (enumهای شناخته‌شده مثل `Sale.Status` و `*.PaymentType` با برچسب، تاریخِ ISO شمسی با ساعت، `*Id` با `#`، `"***"` = «پنهان»، `null` = «خالی»)، `changeTargetOf(change)` (سند اگر دارد، وگرنه صفحه‌ی رکورد؛ حذف‌شده بی‌پیوند).

## مصرف در فیچرهای دیگر

| صفحه | هدف |
| --- | --- |
| `SaleDetailPage`، `PurchaseDetailPage` | `documentKind` ۲ / ۱ (`DocumentKindEnum` از `src/shared/domain/enums/documentKind.js`) |
| `SalesReturnDetailPage`، `PurchaseReturnDetailPage` | `documentKind` ۴ / ۳ |
| `CustomerDetailPage`، `SupplierDetailPage`، `ProductDetailPage` | `Customer`، `Supplier`، `Product` |
| `EmployeeDetailPage` | `User` + `UserActivityButton` |
| `DepartmentDetailPage`، `TeamDetailPage` | `Department`، `Team` |

## importهای بیرونی

`auth` (`usePermission`)، `employees` (`UserFilterSelect`). از shared: `PageHeaderActions`، `useUrlPreset`، `DateRangeToolbar`، `EntitySelect`، `FilterPanel`، `ServerTable`، `documentKind.js`، enumهای وضعیت برای برچسبِ مقدارها.

## نکته‌ها و بدهی

- برچسبِ ستون‌ها و enumها در فرانت نگه داشته می‌شود چون سرور نامِ کدِ ستون و عددِ خام را می‌فرستد؛ ستون یا enumِ تازه‌ی بکند بی‌برچسب (انگلیسی/عدد) نمایش داده می‌شود تا وقتی به `auditVocabulary.js` اضافه شود.
- فیلترِ «کاربر» از `GetUserList` می‌آید و به `UserView` بسته است؛ بی آن فهرست خالی است و بقیه‌ی فیلترها کار می‌کنند.
- صفحه‌های فهرست/جزئیاتِ کنارِ هم (دسته‌بندی، خودرو، کارت‌خوان) هنوز دکمه‌ی تاریخچه ندارند؛ از گزارش با `?entityType=Vehicle&entityKey=…` دیده می‌شوند.
