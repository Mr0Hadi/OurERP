# ۰۷ — state سرور: React Query

## هدف

بدانید داده‌ی سرور را چطور بخوانید (query)، چطور بنویسید (mutation)، کلیدِ کش را کجا تعریف کنید، و بعد از نوشتن چه چیزی را باطل کنید تا هیچ صفحه‌ای داده‌ی کهنه نشان ندهد.

## فایل‌های کلیدی

| فایل | نقش |
| --- | --- |
| `src/app/providers/QueryProvider.jsx` | `QueryClient` و پیش‌فرض‌ها، `ReactQueryDevtools` |
| `src/features/**/services/queryKeys.js` | کارخانه‌ی کلید (۲۳ فایل) |
| `src/features/**/services/queries.js` | هوک‌های `useQuery` |
| `src/features/**/services/mutations.js` | هوک‌های `useMutation` + invalidation + toast |
| `src/features/sales/orders/services/sharedInvalidation.js` | `invalidateSalesEcosystem` |
| `src/features/purchases/orders/services/sharedInvalidation.js` | `invalidatePurchaseEcosystem` |
| `src/shared/services/documentChanges.js` | `runDocumentChanges`، `partialSaveMessage` |
| `src/shared/services/returns/createReturnMutations.js` | factoryِ mutationهای مرجوعی (مشترک خرید/فروش) |

## چطور کار می‌کند

### پیش‌فرض‌های سراسری (`QueryProvider.jsx`)

| گزینه | مقدار | چرا (از کامنتِ کد) |
| --- | --- | --- |
| `queries.staleTime` | `0` | چند کاربر هم‌زمان روی همان داده‌اند؛ هر mount/focus از سرور می‌خواند |
| `queries.gcTime` | ۵ دقیقه | — |
| `queries.retry` | فقط خطای بی‌پاسخ یا ≥۵۰۰، یک بار | ۴xx با تکرار درست نمی‌شود |
| `queries.refetchOnWindowFocus` | `true` | کاربرانِ چندساعته |
| `mutations.retry` | فقط ۴۰۹، تا ۳ بار، فاصله ۱ ثانیه | ۴۰۹ = درخواستِ اولِ همین Idempotency-Key هنوز روی سرور است ([06](06-api-layer.md)) |

`staleTime`ِ بیشتر فقط جایی گذاشته شده که داده کم‌تغییر است: `useUserInfoQuery` ۱۰ دقیقه، `useMyPermissionsQuery` و `useFeatureFlagsQuery` ۵ دقیقه، گزینه‌های انتخابگرِ مشتری/تامین‌کننده ۳۰ ثانیه (`src/features/customers/services/queries.js`، `src/features/suppliers/services/queries.js`)، چند query در `src/features/warehouse/products/services/queries.js` (۳۰ تا ۶۰ ثانیه)، و `Infinity` در `src/shared/services/files/queries.js`.

### سه فایل برای هر سرویس

الگو: `src/features/customers/services/`.

```js
// queryKeys.js — درختِ کلید؛ هر سطح پیشوندِ سطحِ پایین‌تر است
export const customerKeys = {
  all: ["customers"],
  lists: () => [...customerKeys.all, "list"],
  list: (filters) => [...customerKeys.lists(), { ...filters }],
  options: () => [...customerKeys.lists(), "options"],
  details: () => [...customerKeys.all, "detail"],
  detail: (id) => [...customerKeys.details(), String(id)],
};
```

- `queries.js`: `useCustomersQuery(filters, pagination, sorting)` → `listQuery(...)` → `useQuery({ queryKey: customerKeys.list(params), queryFn: () => fetchCustomers(params), placeholderData: keepPreviousData })`. `keepPreviousData` جدول را حینِ عوض‌شدنِ صفحه/فیلتر خالی نمی‌کند. جزئیات: `enabled: !!id`.
- `mutations.js`: هر mutation خودش toastِ موفقیت/خطا را نشان می‌دهد و کلیدهای مربوط را باطل می‌کند:

```js
// src/features/customers/services/mutations.js
mutationFn: ({ id, data }) => updateCustomer(id, data),
onSuccess: (data, variables) => {
  queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
  queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
  toast.success("اطلاعات مشتری با موفقیت ویرایش شد.");
},
onError: (error) => toast.error(getErrorMessage(error, "خطا در ویرایش اطلاعات.")),
```

`detail` همیشه `String(id)` است تا `5` و `"5"` (از `useParams`) یک کلید باشند.

### الگوی «سندِ کامل در پاسخ»

نوشتن‌های خرید، فروش، اقساط و مرجوعی سندِ کامل را برمی‌گردانند. به جای invalidateِ جزئیات، پاسخ با `setQueryData` در کش نشانده می‌شود و فقط بقیه باطل می‌شوند:

```js
// src/features/sales/orders/services/mutations.js
function applySale(queryClient, sale) {
  if (sale?.id != null) queryClient.setQueryData(saleKeys.detail(sale.id), sale);
  invalidateSalesEcosystem(queryClient, sale?.id, { freshSale: true });
  queryClient.invalidateQueries({ queryKey: customerKeys.all });
}
```

همین الگو: `src/features/purchases/orders/services/mutations.js`، `src/features/sales/installments/services/mutations.js`، `src/shared/services/returns/createReturnMutations.js`، `src/features/warehouse/shared/shipmentCache.js`.

### invalidationِ مرکزیِ «اکوسیستم»

فروش، ارسالِ انبار، مرجوعیِ فروش، کالا و دانه‌ها به هم گره خورده‌اند. `invalidateSalesEcosystem(queryClient, saleId, { freshReturnId, freshSale })` همه را یک‌جا باطل می‌کند: `saleKeys.detail` (مگر `freshSale`)، `shippingKeys.detail/lists`، `salesReturnKeys.*` (به‌جز `freshReturnId`)، `productKeys.all`، `productUnitKeys.all`. معادلِ خرید: `invalidatePurchaseEcosystem` در `src/features/purchases/orders/services/sharedInvalidation.js`.

**هر mutationِ تازه در این حوزه‌ها باید از همین تابع‌ها استفاده کند**، نه اینکه کلیدها را دستی بشمارد.

### «ثبت تغییرات»: `runDocumentChanges`

صفحه‌ی خرید/فروش چند نوع تغییر را جمع می‌کند و با یک دکمه ذخیره می‌کند. بکند برای هر بخش endpointِ جدا دارد؛ `runDocumentChanges(api, documentId, changes)` (`src/shared/services/documentChanges.js`) به این ترتیب صدا می‌زند:

1. `update` (فقط پیش‌فاکتور)
2. پرداخت‌ها: ابطال ← اصلاح ← ثبت (هر کدام با `idempotencyKeyFor(payload, operation.id)`)
3. سررسید
4. پیوست‌ها
5. وضعیت (آخر از همه)

آخرین سندِ برگشتی را برمی‌گرداند. اگر وسطِ کار خطا شود، `error.partiallySaved` روشن می‌شود و `partialSaveMessage(error, reason)` به پیام اضافه می‌کند که بخشی ذخیره شده. مصرف‌کننده‌ها: `useSaleChangesSaver` در `src/features/sales/orders/services/mutations.js` (در `onError` هم `invalidateSalesEcosystem` می‌زند تا بخشِ ذخیره‌شده دیده شود) و `usePurchaseChangesSaver` در `src/features/purchases/orders/services/mutations.js`.

## قراردادها و نکته‌ها

- کامپوننت `useQuery`/`useMutation` را مستقیم صدا نمی‌زند؛ هوکِ `queries.js`/`mutations.js` را صدا می‌زند. تنها استثنا: `src/features/warehouse/vehicles/components/AddProductsToVehicleDialog.jsx` (یک `useQuery` درونِ کامپوننت، با کلیدِ `[...productKeys.lists(), "vehicle-picker", term]`).
- کلیدها همیشه از کارخانه‌ی `queryKeys.js` می‌آیند. کلیدِ دست‌ساز فقط در `src/features/warehouse/shared/useQueueRows.js` و `src/features/sales/installments/services/mutations.js` (`[...dashboardKeys.all, "queue", "saleInstallment"]`) دیده شد.
- ریشه‌ی کلیدها یکتاست ولی همیشه هم‌نامِ فیچر نیست: `src/features/dashboard/services/queryKeys.js` دو کارخانه دارد: `reportKeys.all = ["reports"]` (گزارش‌های فروش/خرید/scope) و `dashboardKeys.all = ["dashboard"]` (شمارشِ صف‌ها)، `employees` → `["users"]`، `accounting/activity` → `["report-activity"]`، `warehouse/categories` → `["productCategories"]`. قبل از invalidate، ریشه‌ی واقعی را در `queryKeys.js` ببینید.
- `partyAccount` فایلِ `queryKeys.js` ندارد و از `customerKeys`/`supplierKeys` استفاده می‌کند.
- بعد از تغییرِ موجودیِ کالا یا مانده‌ی طرف‌حساب، `productKeys.all` یا `customerKeys.all`/`supplierKeys.all` را باطل کنید.
- تغییرِ جایگاه یا مجوزِ کاربرِ جاری → `authKeys.session()` / `authKeys.myPermissions()` ([04](04-auth-and-session.md)).
- خروج `queryClient.clear()` می‌کند.

## برای تغییرِ X، به Y بروید

| می‌خواهم… | کجا |
| --- | --- |
| داده‌ی تازه بخوانم | تابع در `api-v1.js` → کلید در `queryKeys.js` → هوک در `queries.js`؛ الگو: `src/features/customers/services/` |
| بنویسم و کش درست بماند | هوک در `mutations.js` با `invalidateQueries` روی `lists()` و `detail(id)`؛ الگو: `useUpdateCustomerMutation` |
| نوشتن در خرید/فروش/انبار/مرجوعی | از `invalidateSalesEcosystem` / `invalidatePurchaseEcosystem` استفاده کنید؛ اگر پاسخ سندِ کامل است `setQueryData` + `fresh*` |
| ذخیره‌ی چندمرحله‌ای سند | `runDocumentChanges` + `partialSaveMessage`؛ الگو: `useSaleChangesSaver` |
| رفتارِ retry/stale سراسری | `src/app/providers/QueryProvider.jsx` |

## سؤال‌های باز / بدهی

- نام‌گذاریِ ریشه‌ی کلیدها ناهم‌خوان است (`"reports"` برای `reportKeys`ِ داشبورد، `"users"` برای کارمندان) و هم نقل‌قولِ تکی و جفتی مخلوط است؛ فقط سبک است ولی جست‌وجو را سخت می‌کند.
- `invalidateSalesEcosystem` و `invalidatePurchaseEcosystem` در `sales/orders` و `purchases/orders` هستند ولی از `warehouse` هم صدا زده می‌شوند (جهتِ غیرمنتظره‌ی import؛ فایل ۰۲).
- `sales/installments/services/mutations.js` کلیدِ داشبورد را دستی می‌سازد؛ بهتر است یک `dashboardKeys.queue(...)` در `src/features/dashboard/services/queryKeys.js` باشد.
- `ReactQueryDevtools` بدونِ شرطِ `import.meta.env.DEV` رندر می‌شود؛ در buildِ تولید وارد باندل نمی‌شود (در `dist/assets/*.js`ِ buildِ 2026-10-15 هیچ رشته‌ی `ReactQueryDevtools`/`tsqd` نیست)، پس اثری ندارد.
