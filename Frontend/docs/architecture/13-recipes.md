# ۱۳ — دستورالعمل‌ها: «می‌خواهم X را اضافه کنم»

## هدف

هر دستورالعمل از یک نمونه‌ی واقعیِ موجود کپی می‌شود و فایل‌ها **به ترتیبِ لمس** آمده‌اند. مسیرهای `<f>` و `<x>` را با نامِ فیچر/موجودیتِ خودتان عوض کنید. توضیحِ چرایی در فایل‌های ۰۳ تا ۱۱ است.

## ۱. صفحه‌ی لیستِ صفحه‌بندی‌شده با فیلتر

**الگو:** لیستِ مشتریان.

1. `src/features/<f>/services/api-v1.js` — تابعِ فهرست + نقشه‌ی مرتب‌سازی؛ کپی از `fetchCustomers` و `CUSTOMER_SORT_COLUMNS` در `src/features/customers/services/api-v1.js` (`normalizeListResponse(data, { itemsKey })`).
2. `src/features/<f>/services/queryKeys.js` — `all`، `lists()`، `list(filters)`، `details()`، `detail(id)`؛ کپی از `src/features/customers/services/queryKeys.js`.
3. `src/features/<f>/store/<x>FilterStore.js` — `createFilterStore({ filters: {...} })` با نامِ پارامترهای سرور؛ الگو: `src/features/employees/store/employeeFilterStore.js` (یا `createPartyFilterStore` برای طرف‌حساب).
4. `src/features/<f>/services/queries.js` — `use<X>ListFilters` با `useDebouncedFilters(store, { text, instant })` و `use<X>sQuery` با `listQuery` + `keepPreviousData`؛ کپی از `useCustomerListFilters` / `useCustomersQuery`. **هر کلیدِ فیلتر را در `text` یا `instant` بیاورید، وگرنه فرستاده نمی‌شود** (باگِ رفع‌شده‌ی B1 در [14](14-dependency-graph-and-health.md): `vehicleId` جا مانده بود).
5. `src/features/<f>/components/<X>Table.jsx` — `COLUMNS` بیرون از کامپوننت (با `meta.mobile`) + `detailsColumn(...)` + `<DataTable columns={COLUMNS} {...props} />`؛ کپی از `src/features/customers/components/CustomerTable.jsx`.
6. `src/features/<f>/components/<X>Filters.jsx` — `ResponsiveFilters` از `src/shared/components/filters/FilterPanel.jsx` با `FilterSearchInput`/`FilterSelect`/`EntitySelect`؛ الگو: `src/features/partyAccount/components/PartyListFilters.jsx`.
7. `src/features/<f>/pages/<X>sPage.jsx` — `ListPageLayout` + فیلترها + `ServerTable query={query} listState={listState} table={<X>Table}`؛ کپی از `src/features/customers/pages/CustomersPage.jsx`.
8. مسیر، منو، breadcrumb — دستورالعملِ ۸ (گام‌های ۱ و ۴ تا ۷).

## ۲. صفحه‌ی جزئیات/ویرایش

**الگو:** `src/features/customers/pages/CustomerDetailPage.jsx`.

1. `api-v1.js` — `get<X>ById` (شناسه در `params`)، `update<X>` (شناسه در بدنه)، `delete<X>`.
2. `queries.js` — `use<X>Query(id)` با `queryKey: <x>Keys.detail(id)` و `enabled: !!id`.
3. `mutations.js` — update/delete (دستورالعملِ ۴).
4. صفحه، دو لایه:
   - بیرونی: `useParams` → `use<X>Query(id)`؛ `usePageHeader`؛ `isLoading` → اسکلتون؛ `isError || !data` → `DetailErrorState` با `notFoundMessage`، `onRetry`، `onBack`؛ وگرنه `<X>DetailForm key={data.id} ...>` (`key` فرم را با عوض‌شدنِ رکورد از نو می‌سازد).
   - فرم: `use<X>Form(data)`؛ `onSubmit` → `updateMutation.mutate({ id, data: build<X>Payload(values) }, { onSuccess: () => { imageUpload.commit(); navigate(...) } })`.
5. حذف — `ConfirmDialog` (`src/shared/components/feedback/ConfirmDialog.jsx`)؛ در `onSuccess`ِ mutation ببندید یا ناوبری کنید.
6. مسیر با `:id` + کلیدِ والد در `DETAIL_TITLES`ِ `src/shared/components/layout/AppBreadcrumb.jsx`.

## ۳. فرمِ ثبتِ موجودیتِ ساده

**الگو:** `src/features/customers/pages/CustomerNewPage.jsx` + `src/features/customers/hooks/useCustomerForm.js`.

1. `src/features/<f>/hooks/use<X>Form.js` — `useForm({ defaultValues })`، `build<X>Payload` (تبدیل به نامِ فیلدهای بکند)، و اگر تصویر دارد `useImageUpload({ folder: ImageFolderEnum.<X> })` (`src/shared/hooks/useImageUpload.js`، `src/shared/domain/enums/imageFolder.js`).
2. `src/features/<f>/components/forms/*` — بخش‌ها با `FormSectionCard` و `FormField`/`FormSelectField` (`src/shared/components/forms/`)، قواعد از `src/shared/lib/validationRules.js`.
3. `mutations.js` — `useCreate<X>Mutation` (دستورالعملِ ۴).
4. `src/features/<f>/pages/<X>NewPage.jsx` — `createMutation.mutate(build<X>Payload(data), { onSuccess: (created) => { imageUpload.commit(); goBack({ new<X>Id: created?.id }) } })` با `useReturnTo` (`src/shared/hooks/useReturnTo.js`)؛ لغو → `imageUpload.discard()`.
5. اگر از فرمِ دیگری باز می‌شود و باید برگردد (مثلاً «مشتری جدید» از فرمِ فروش): صفحه‌ی مبدأ با `useSubPageNavigation`/`useReturnTo` می‌رود و پیش‌نویسش را نگه می‌دارد؛ الگوی فرمِ کوچک: `useFormDraft` در `src/features/employees/pages/EmployeeNewPage.jsx`.

## ۴. mutationِ ساده با invalidation

**الگو:** `useUpdateCustomerMutation` در `src/features/customers/services/mutations.js`.

1. `api-v1.js` — تابعِ نوشتن.
2. `mutations.js`:
   ```js
   export const useUpdate<X>Mutation = () => {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: ({ id, data }) => update<X>(id, data),
       onSuccess: (data, variables) => {
         queryClient.invalidateQueries({ queryKey: <x>Keys.lists() });
         queryClient.invalidateQueries({ queryKey: <x>Keys.detail(variables.id) });
         toast.success("…");
       },
       onError: (error) => toast.error(getErrorMessage(error, "خطا در …")),
     });
   };
   ```
3. فهرستِ آنچه باید باطل شود را از اثرِ سمتِ سرور دربیاورید: موجودیِ کالا → `productKeys.all`؛ مانده‌ی طرف‌حساب → `customerKeys.all`/`supplierKeys.all` (صورت‌حساب هم زیرِ همین است)؛ کاربرِ جاری/مجوز → `authKeys.session()`/`authKeys.myPermissions()`؛ حوزه‌ی خرید/فروش/انبار/مرجوعی → `invalidatePurchaseEcosystem`/`invalidateSalesEcosystem` ([07](07-server-state-react-query.md)).

## ۵. نوشتنِ مالی/موجودی (ایدمپوتنت)

**الگو:** `createSale` در `src/features/sales/orders/services/api-v1.js` و `useCreateSaleMutation` در `src/features/sales/orders/services/mutations.js`.

1. `api-v1.js` — امضای `(body, { idempotencyKey } = {})` و `axiosInstance.post(url, body, idempotent(idempotencyKey))` (`src/shared/services/api/contract.js`).
2. `mutations.js` — `mutationFn: (payload) => fn(payload, { idempotencyKey: idempotencyKeyFor(payload) })`. شیءِ `payload` را بعد از ساختن تغییر ندهید (۴۲۲).
3. اگر پاسخ سندِ کامل است: `setQueryData(<x>Keys.detail(id), doc)` + invalidateِ «اکوسیستم» با `fresh*: true`.
4. چند گامِ وابسته («ثبت تغییرات»)؟ `runDocumentChanges` + `partialSaveMessage` (`src/shared/services/documentChanges.js`)؛ الگو: `useSaleChangesSaver`.

## ۶. enum/وضعیتِ تازه از بکند

**الگو:** `src/shared/domain/enums/purchaseStatus.js`.

1. `src/shared/domain/enums/<x>.js` (یا `domain/`ِ فیچر اگر فقط همان‌جا لازم است) — `<X>Enum` با **همان اعدادِ بکند** + `<X>_LABELS` + `<X>_TONES` (معناها از `src/shared/lib/tone.js`).
2. اگر badgeِ اختصاصی می‌خواهید: `src/shared/components/status/<X>Badge.jsx` روی `StatusBadge`؛ کپی از `SaleStatusBadge.jsx`. آیکن: `src/shared/components/status/statusIcons.js`.
3. فیلترِ لیست: گزینه‌ها با `toFilterOptions` (`src/shared/components/filters/filterUtils.js`).
4. قواعدی که به وضعیت بستگی دارند: `domain/<x>Rules.js`ِ فیچر (مثل `saleRules.js`).

## ۷. فیلترِ تازه روی لیستِ موجود

**الگو:** `balanceType` در لیستِ مشتری.

1. `filters`ِ store (`src/features/<f>/store/<x>FilterStore.js`) — کلید با نامِ پارامترِ سرور و مقدارِ پیش‌فرض (`""` یا `"all"` تا فرستاده نشود).
2. `use<X>ListFilters` در `queries.js` — کلید را به `text` (ورودیِ متنی) یا `instant` اضافه کنید.
3. کامپوننتِ فیلتر — کنترل با `value={store.<key>}` و `onChange={store.set<Key>}` (اکشنِ خودکارِ `createFilterStore`).
4. اگر کلیدِ تازه باید در شمارشِ «فیلترِ فعال» بیاید، کافی است در `filters` باشد (`useActiveFilterCount` از `filterDefaults` می‌خواند).

## ۸. صفحه یا فیچرِ کاملاً تازه

**الگو:** `src/features/customers/` (چیدمانِ کامل) و مسیرِ خودروها ([03](03-bootstrap-and-routing.md#افزودنِ-صفحه-یا-مسیرِ-جدید)).

1. `src/shared/constants/routes.js` — `ROUTES.<X>`، `<X>_NEW`، `<X>_DETAIL` (`new` قبل از `:id` در آرایه‌ی مسیر بیاید؛ کامنتِ `src/features/organization/routes.jsx`).
2. `src/features/<f>/services/` — `api-v1.js`، `queryKeys.js`، `queries.js`، `mutations.js` (دستورالعمل‌های ۱ تا ۴).
3. `src/features/<f>/store/`، `components/`، `hooks/`، `domain/` در صورتِ نیاز.
4. `src/features/<f>/pages/*` — default export.
5. `src/features/<f>/routes.jsx` — `lazy(() => import("./pages/..."))` و `handle: { permission: "<PermissionEnum member>" }` برای **هر** مسیر.
6. `src/app/routes/routers.jsx` — import و `...<f>Routes` در `children`ِ `AppLayout`.
7. `src/shared/constants/navigationData.js` — زیرآیتم با همان `permission`.
8. `src/shared/components/layout/AppBreadcrumb.jsx` — `ROUTE_TITLES` و `DETAIL_TITLES`.
9. نامِ مجوز را در `../Backend-Net/Domain/Enums/PermissionEnum.cs` چک کنید ([05](05-permissions.md)).
10. سند: فایلِ تازه در `docs/architecture/12-features/` و ردیف در `12-features/README.md`.

## ۹. دکمه یا بخشِ وابسته به مجوز

**الگو:** `src/features/sales/orders/pages/SaleIssuedView.jsx`.

1. `const { allows } = usePermission();` از `@/features/auth/hooks/usePermission`.
2. `{allows("SaleUpdate") && <Button …/>}` — `allows` در خطای دریافتِ مجوزها دکمه را نشان می‌دهد و سرور ۴۰۳ می‌دهد.

## ۱۰. ویجتِ تازه‌ی داشبورد

**الگو:** `welcome` و `topSellers`.

1. `src/features/dashboard/domain/widgetRegistry.js` — عضوِ تازه در `WIDGETS`: `id`، `title`، `description`، `group` (`WIDGET_GROUPS`)، `span`، `isAvailable: (ctx) => …` (از `buildDashboardContext`)، و در صورتِ نیاز `periodic`/`locked`. جایش در ترتیبِ `defaultLayout` را هم تعیین کنید.
2. `src/features/dashboard/components/widgets/<X>Widget.jsx` — امضای `{ context, params, action }`.
3. `src/features/dashboard/components/widgets/index.jsx` — `WIDGET_COMPONENTS[id]`.
4. داده: هوک در `src/features/dashboard/services/queries.js` (یا از فیچرِ دیگر، مثل `TopSellersWidget.jsx` که از `accounting/activity` می‌خواند).
5. چیدمانِ ذخیره‌شده‌ی کاربران خودکار به‌روز می‌شود (`resolveLayout` ویجتِ تازه را کنارِ همسایه‌اش می‌گذارد).

## ۱۱. ورود/خروجی (CSV/Excel) برای یک لیست

**الگو:** `CustomersPage.jsx`.

1. در `actions`ِ `ListPageLayout`: `<DataTransferActions resource="<x>" filters={filters} invalidateKey={<x>Keys.all} />` (`src/shared/components/dataTransfer/DataTransferActions.jsx`).
2. نامِ `resource` باید در پاسخِ `GET /DataTransfer/GetResources` باشد (`src/shared/services/dataTransfer/api-v1.js`)؛ اگر نیست، درخواست در `Backend-Net/docs/frontend-requests.fa.md`.

## ۱۲. دکمه‌ی «تاریخچه» برای صفحه‌ی جزئیات

**الگو:** `src/features/customers/pages/CustomerDetailPage.jsx` و `src/features/sales/orders/pages/SaleDetailPage.jsx`.

1. در لایه‌ی بیرونیِ صفحه (بعد از بارگذاری و خطا) کنارِ فرم: `<AuditHistoryButton … />` از `src/features/audit/components/AuditHistoryButton.jsx`.
2. هدف: سند با `documentKind={DocumentKindEnum.X}` (`src/shared/domain/enums/documentKind.js`) و `documentId`؛ رکوردِ بی‌سند با `entityType` (نامِ کلاسِ بکند، مثل `"Customer"`) و `entityKey`. `title` متنِ زیرِ عنوانِ شیت است.
3. مجوز (`AuditLogView`) و جای دکمه در هدر (`PageHeaderActions`) را خودِ کامپوننت می‌گیرد؛ کارِ دیگری لازم نیست. برای دکمه‌ی دیگری در هدر همان `PageHeaderActions` (`src/shared/components/layout/PageHeaderActions.jsx`) را بپیچید.
4. نوعِ سطرِ تازه یا ستونی که برچسبِ فارسی ندارد → `src/features/audit/domain/auditVocabulary.js`.

## ۱۳. نیازی که فقط بکند می‌تواند برآورد

فرانت کدِ `Backend-Net/` را تغییر نمی‌دهد. بخشِ شماره‌دارِ تازه در `Backend-Net/docs/frontend-requests.fa.md` بنویسید و در کد با `TODO` به همان شماره ارجاع دهید (قالبِ موجود: `TODO(بکند): ... (بندِ ۱۳.۵ frontend-requests.fa.md)` در `src/features/warehouse/products/services/queries.js`).

## ۱۴. برگه‌ی چاپیِ تازه (گزارش، رسید، …)

**الگو:** `src/features/sales/orders/components/proforma/PriceListPrint.jsx` (+ `PriceListDocument.jsx`).

1. **متنِ برگه** را جدا بنویسید (`XDocument.jsx`): فقط نمایش، رنگِ سیاه/سفید (`text-black`، `border-black/…`)، اندازه‌ی پایه با `baseFontPt(settings.textScale)` (`src/shared/components/print/typography.js`) و بقیه با `em`. برای کاغذِ باریک (`geometry.contentWidthMm` کم) چیدمانِ فشرده بدهید.
2. **پیش‌فرض‌ها** شیءِ ثابتِ ماژول: `{ ...DEFAULT_PAPER_SETTINGS, ...گزینه‌های برگه }` (`src/shared/components/print/paper.js`)؛ تنظیمات با `usePrintSettings("<kind>", DEFAULTS)` (`src/shared/store/printSettingsStore.js`). `kind` پایدار است؛ عوضش کنید، ذخیره‌ی کاربران دور ریخته می‌شود.
3. **هندسه:** `pageGeometryOf(settings)`؛ پنلِ کاغذ با `<PaperSettings paperKeys={[…]} />`، بقیه‌ی گزینه‌ها در `PrintSettingsSection` با `SegmentedControl`/`Switch`/`Checkbox`.
4. **پوسته:** `<PrintStudio settings={…} preview={<FlowSheet geometry pageCount onMeasure>…</FlowSheet>} previewWidthMm={geometry.widthMm} onPrint={() => print(flowPrintOptions(geometry, heightMm))} />` با `usePrint` (`src/shared/components/print/usePrint.js`). صفحه‌هایی که خودتان می‌سازید (شبکه‌ی ثابت، مثلِ برچسب و تصویر) کلاسِ `print-page` و `fixedPagePrintOptions(geometry)` می‌خواهند.
5. نمایش در صفحه‌ی مصرف‌کننده: `{open && <XPrint … onClose />}` — پوسته خودش پورتال است. اگر چاپ کنارِ سندهای یک سفارش است، از `localPrints`ِ `InvoiceDocumentSection` باز شود.
6. سندی که **سرور** می‌سازد (PDFِ فاکتور) را در مرورگر بازسازی نکنید؛ با `printPdfDocuments`/`printPdfBlob` (`src/shared/services/invoice/documentOutput.js`) چاپ می‌شود.

## قبل از commit

```bash
pnpm lint
```

```bash
pnpm build
```

```bash
pnpm knip
```

```bash
node scripts/check-docs-paths.mjs
```

اگر ساختار عوض شد (فیچر، پوشه، الگو)، فایلِ مربوط در `docs/architecture/` را هم به‌روز کنید.
