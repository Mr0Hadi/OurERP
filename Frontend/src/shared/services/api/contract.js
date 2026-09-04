// src/shared/services/api/contract.js

/**
 * قراردادِ مشترکِ لایه‌ی `api-v1` — چیزهایی که به دامنه ربط ندارند ولی
 * هر فایلِ API به آن‌ها نیاز دارد.
 *
 * هدف این است که تفاوتِ mock و سرور فقط در «از کجا داده می‌آید» باشد،
 * نه در «داده چه شکلی است». هر چیزی که شکل را یکسان نگه می‌دارد
 * (صفحه‌بندی، کلید ایدمپوتنسی) اینجاست تا در ده فایل تکرار نشود.
 */

// ─── صفحه‌بندی ──────────────────────────────────────────────────────────────

/**
 * شکلِ استانداردِ پاسخِ فهرست در کل فرانت:
 *
 *   { items, total, page, totalPages }
 *
 * همان چیزی که `applyListQuery` در mock تولید می‌کند. سرور هم باید
 * دقیقاً همین را برگرداند تا سوییچِ mock→v1 هیچ کامپوننتی را دست
 * نزند.
 *
 * شاخه‌ی دوم برای پوششِ خانگیِ بک‌اند است — `{ XList, Page: { Page,
 * PageCount, Take, Total } }`. این شاخه یک تورِ ایمنی است، نه بخشی از
 * قرارداد: اگر بک‌اند همان سبکِ قدیمی را بفرستد، صفحه سفید نمی‌شود.
 */
export function normalizeListResponse(data, { itemsKey } = {}) {
  if (!data) return { items: [], total: 0, page: 1, totalPages: 1 };
  if (Array.isArray(data.items)) return data;

  const legacyItems =
    (itemsKey && data[itemsKey]) ||
    Object.entries(data).find(([, value]) => Array.isArray(value))?.[1] ||
    [];
  const legacyPage = data.Page || data.page || {};

  return {
    items: legacyItems,
    total: legacyPage.Total ?? legacyPage.total ?? legacyItems.length,
    page: legacyPage.Page ?? legacyPage.page ?? 1,
    totalPages: legacyPage.PageCount ?? legacyPage.totalPages ?? 1,
  };
}

/** پارامترهای مشترکِ هر فهرست — نام‌ها camelCase و یکسان با mock. */
export function listParams(params = {}) {
  return {
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    fromDate: params.fromDate || undefined,
    toDate: params.toDate || undefined,
    sortBy: params.sortBy || undefined,
    sortOrder: params.sortOrder || undefined,
  };
}

// ─── ایدمپوتنسی ─────────────────────────────────────────────────────────────

/**
 * چرا لازم است: عملیاتِ نوشتنِ مرجوعی *تجمعی* است — «۳ عدد دریافت شد»
 * روی `doneQuantity` اضافه می‌شود و «این تصمیم را ثبت کن» یک اثر مالی
 * می‌سازد. اگر یک درخواست به‌خاطر قطعی شبکه دوباره فرستاده شود (یا
 * کاربر دوبار کلیک کند)، بدون کلید ایدمپوتنسی همان عملیات دوبار
 * اعمال می‌شود و موجودی یا مبلغ فاکتور غلط می‌شود.
 *
 * کلید در لایه‌ی mutation ساخته می‌شود (نه اینجا و نه در کامپوننت) تا
 * برای هر «قصدِ کاربر» یکتا باشد و در retryهای همان قصد ثابت بماند.
 */
export function newIdempotencyKey() {
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
