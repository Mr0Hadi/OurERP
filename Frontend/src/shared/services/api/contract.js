import { toApiSort } from "./sorting";

/**
 * قراردادِ مشترکِ لایه‌ی `api-v1` — چیزهایی که به دامنه ربط ندارند ولی
 * هر فایلِ API به آن‌ها نیاز دارد (صفحه‌بندی، کلید ایدمپوتنسی، نسخه‌ی سند)،
 * تا در ده فایل تکرار نشوند.
 */

// ─── صفحه‌بندی ──────────────────────────────────────────────────────────────

/**
 * شکلِ استانداردِ پاسخِ فهرست در کل فرانت:
 *
 *   { items, total, page, totalPages }
 *
 * بک‌اند فهرست‌ها را به‌شکلِ `{ XList, Page: { Page, PageCount, Take, Total } }`
 * می‌فرستد؛ این تابع آن را به شکلِ استاندارد درمی‌آورد تا کامپوننت‌ها به
 * نام‌گذاریِ هر endpoint وابسته نباشند. پاسخی که از قبل `items` دارد
 * دست‌نخورده برمی‌گردد.
 */
export function normalizeListResponse(data, { itemsKey } = {}) {
  if (!data) return { items: [], total: 0, page: 1, totalPages: 1 };
  if (Array.isArray(data.items)) return data;

  const listItems =
    (itemsKey && data[itemsKey]) ||
    Object.entries(data).find(([, value]) => Array.isArray(value))?.[1] ||
    [];
  const pageInfo = data.Page || data.page || {};

  const total = pageInfo.Total ?? pageInfo.total ?? listItems.length;
  const take = pageInfo.Take ?? pageInfo.take;

  // سرور با نام‌گذاریِ پیش‌فرضِ ASP.NET (camelCase) `pageCount` می‌فرستد.
  // خواندنِ فقط `PageCount` یعنی هر فهرستی روی «صفحه ۱ از ۱» می‌ماند.
  const pageCount =
    pageInfo.PageCount ??
    pageInfo.pageCount ??
    pageInfo.totalPages ??
    (take > 0 ? Math.ceil(total / take) : 1);

  return {
    items: listItems,
    total,
    page: pageInfo.Page ?? pageInfo.page ?? 1,
    // فهرستِ خالی صفرِ صفحه دارد، ولی شمارنده‌ی «صفحه ۱ از ۰» بی‌معناست.
    totalPages: Math.max(1, pageCount),
  };
}

const isEmptyFilter = (value) => value === "" || value == null || value === "all";

/**
 * پارامترهای خالی ("" / null / undefined / "all") حذف می‌شوند — سرور فیلترِ خالی
 * را «مقدارِ صفر/خالی» می‌فهمد، نه «بدونِ فیلتر».
 */
export function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => !isEmptyFilter(value)),
  );
}

/**
 * پارامترهای استانداردِ هر `Get*ListQuery`ِ بکند، با *همان نام‌های بکند*:
 * `page`/`take` + فیلترها + `sortBy`/`sortDirection`.
 *
 * فیلترها در استورِ هر فیچر از اول با نامِ پارامترِ سرور نگه داشته می‌شوند
 * (`fullName`، `minBalance`، …)، پس هیچ لایه‌ی ترجمه‌ای بینِ فرم و درخواست
 * نیست. مقدارِ خالی ("" / null / "all") فرستاده نمی‌شود — وگرنه سرور آن را
 * فیلتر روی مقدارِ خالی می‌فهمد.
 *
 * @param {object} args
 * @param {object} [args.filters] فیلترها با نامِ پارامترِ سرور
 * @param {{ pageIndex: number, pageSize: number }} args.pagination
 * @param {{ id: string, desc: boolean } | null} [args.sorting]
 * @param {Record<string, number>} [args.sortColumns] ستونِ جدول → عددِ `*ListSortEnum`
 */
export function listQuery({ filters = {}, pagination, sorting, sortColumns = {} }) {
  const params = {
    page: pagination.pageIndex + 1,
    take: pagination.pageSize,
    ...filters,
    ...toApiSort(sorting, sortColumns),
  };
  return compactParams(params);
}

// ─── ایدمپوتنسی ─────────────────────────────────────────────────────────────

/**
 * چرا لازم است: عملیاتِ نوشتنِ مرجوعی *تجمعی* است — «۳ عدد دریافت شد»
 * روی `appliedQuantity` اضافه می‌شود و «این تصمیم را ثبت کن» یک اثر مالی
 * می‌سازد. اگر یک درخواست به‌خاطر قطعی شبکه دوباره فرستاده شود (یا
 * کاربر دوبار کلیک کند)، بدون کلید ایدمپوتنسی همان عملیات دوبار
 * اعمال می‌شود و موجودی یا مبلغ فاکتور غلط می‌شود.
 *
 * کلید در لایه‌ی mutation ساخته می‌شود (نه اینجا و نه در کامپوننت) تا
 * برای هر «قصدِ کاربر» یکتا باشد و در retryهای همان قصد ثابت بماند.
 */
function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * کلیدِ پایدار برای یک «قصدِ کاربر».
 *
 * ساختنِ کلید داخل `mutationFn` کافی نیست: React Query در هر retry
 * دوباره همان تابع را صدا می‌زند و کلیدِ تازه یعنی سرور آن را یک
 * عملیاتِ جدید می‌بیند — دقیقاً همان چیزی که می‌خواستیم جلویش را
 * بگیریم.
 *
 * پس کلید به *شیءِ variables* گره می‌خورد: هر بار که کاربر دکمه را
 * می‌زند یک شیء تازه ساخته می‌شود (کلید تازه)، ولی retryهای همان
 * فراخوانی همان شیء را می‌گیرند (کلید ثابت). WeakMap استفاده شده تا
 * نگه‌داشتنِ کلید مانع جمع‌آوریِ حافظه نشود.
 */
const keysByVariables = new WeakMap();

export function idempotencyKeyFor(variables) {
  if (variables == null || typeof variables !== "object") {
    return newIdempotencyKey();
  }
  if (!keysByVariables.has(variables)) {
    keysByVariables.set(variables, newIdempotencyKey());
  }
  return keysByVariables.get(variables);
}

/** پیکربندیِ درخواست برای یک عملیاتِ نوشتنِ ایدمپوتنت. */
export function idempotent(key) {
  return key ? { headers: { "Idempotency-Key": key } } : {};
}

// ─── نسخه‌ی سند ─────────────────────────────────────────────────────────────

/**
 * کلیدِ نسخه‌ی یک سند — چیزی که فرم‌های جزئیات با آن تشخیص می‌دهند
 * «داده‌ی روی سرور عوض شده، فرم را از نو پر کن».
 *
 * فرم‌ها تا امروز `updatedAt` را می‌خواندند، ولی `GetPurchaseDetail`
 * اصلاً چنین فیلدی برنمی‌گرداند؛ نتیجه‌اش کلیدِ ثابتِ `"5:undefined"`
 * بود، یعنی بعد از هر بازگشت به همان سند، فرم روی مقادیرِ ویرایش‌شده‌ی
 * قبلی می‌ماند و پاسخِ تازه‌ی سرور نادیده گرفته می‌شد. وقتی سرور
 * `updatedAt` می‌دهد همان استفاده می‌شود؛ وگرنه یک اثرِ انگشتِ محتوایی
 * ساخته می‌شود که با هر تغییرِ معنادارِ سند عوض می‌شود.
 */
export function documentVersion(doc) {
  if (!doc) return null;
  if (doc.updatedAt) return doc.updatedAt;

  return [
    doc.status,
    doc.invoiceNumber,
    doc.invoiceDate,
    doc.totalAmount,
    doc.paidAmount,
    doc.paymentType,
    (doc.items || []).length,
    (doc.attachments || []).length,
  ].join("|");
}
