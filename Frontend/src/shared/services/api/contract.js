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

/** بزرگ‌ترین `take`ای که سرور می‌پذیرد. */
export const MAX_PAGE_SIZE = 200;

/**
 * همه‌ی صفحه‌های یک فهرست را پشتِ‌سرهم می‌خواند (سرور هر درخواست را به
 * `MAX_PAGE_SIZE` ردیف محدود می‌کند) — برای انتخابگرها که کلِ فهرست را لازم دارند.
 * پاسخِ صفحه‌ی اول با لیستِ ادغام‌شده برمی‌گردد تا شکلش عوض نشود.
 *
 * @param fetchPage  `(page: number) => Promise<response>` (صفحه از ۱)
 * @param itemsKey   کلیدِ لیست در پاسخ (مثلاً `userList`؛ `items` برای پاسخ‌های نرمال‌شده)
 */
export async function fetchAllPages(fetchPage, { itemsKey, maxPages = 1000 }) {
  let first;
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const raw = await fetchPage(page);
    first ??= raw;
    const normalized = normalizeListResponse(raw, { itemsKey });
    items.push(...normalized.items);
    if (page >= normalized.totalPages || normalized.items.length === 0) break;
  }
  return { ...first, [itemsKey]: items };
}

// ─── ایدمپوتنسی ─────────────────────────────────────────────────────────────

/**
 * چرا لازم است: عملیاتِ نوشتنِ پرداخت، ثبتِ سند و مرجوعی *تجمعی* است — «۳ عدد دریافت شد»
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
 * کلید به *محتوای* درخواست گره می‌خورد، نه به شیءِ variables: اگر درخواست
 * بی‌پاسخ بماند (تایم‌اوت، قطعِ شبکه، ۵۰۰) و کاربر دوباره همان را بفرستد —
 * با retryِ React Query یا با کلیکِ دوباره روی «ثبت» — همان کلید می‌رود و
 * سرور اگر بارِ اول ثبت کرده بود همان پاسخ را برمی‌گرداند. پیش‌تر کلید به
 * شیءِ variables بسته بود و هر کلیک شیءِ تازه می‌ساخت؛ تایم‌اوت بعد از ثبتِ
 * سرور و کلیکِ دوباره یعنی فاکتور یا پرداختِ دوم (برای کارتخوان یعنی پولی
 * که یک بار کشیده شده و دو بار ثبت شده).
 *
 * کلید وقتی آزاد می‌شود که سرور پاسخِ قطعی داد (`releaseIdempotencyKey` در
 * اینترسپتورِ axios): بعد از موفقیت، دو سندِ عیناً یکسانِ پشتِ‌سرِهم هم
 * دو سند می‌شوند.
 *
 * @param variables  بدنه‌ی درخواست (یا هر چیزی که قصد را یکتا می‌کند)
 * @param scope      وقتی دو قصدِ جدا ممکن است محتوای یکسان داشته باشند
 *                   (دو پرداختِ نقدیِ هم‌مبلغ در یک «ثبت تغییرات»)، شناسه‌ی
 *                   هر کدام — مثلاً شناسه‌ی ردیفِ پیش‌نویس
 */
const keysByContent = new Map();

export function idempotencyKeyFor(variables, scope = "") {
  if (variables == null || typeof variables !== "object") {
    return newIdempotencyKey();
  }
  const content = `${scope}|${JSON.stringify(variables)}`;
  if (!keysByContent.has(content)) {
    keysByContent.set(content, newIdempotencyKey());
  }
  return keysByContent.get(content);
}

/** سرور پاسخِ قطعی داد؛ همین محتوا از این به بعد قصدِ تازه است. */
export function releaseIdempotencyKey(key) {
  if (!key) return;
  for (const [content, value] of keysByContent) {
    if (value === key) keysByContent.delete(content);
  }
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

/**
 * پیوست‌های یک سند (`DocumentAttachmentDto` در بدنه‌ی نوشتن):
 * `{objectKey, fileName?, note?}` — همان شکلی که `useInvoiceAttachments` در
 * `filesPayload` می‌دهد؛ فقط ردیفِ بدونِ فایل و فیلدهای خالی کنار می‌روند.
 */
export function toApiAttachments(attachments = []) {
  return attachments
    .filter((item) => item?.objectKey)
    .map((item) => ({
      objectKey: item.objectKey,
      fileName: item.fileName || undefined,
      note: item.note || undefined,
    }));
}
