/**
 * جست‌وجو، بازه‌ی تاریخ، مرتب‌سازی و صفحه‌بندیِ لیست‌ها — فقط برای mock.
 *
 * این دقیقاً همان کاری است که روز مهاجرت، *سرور* انجام می‌دهد. تا آن روز
 * هر api-mockData مجبور بود خودش بنویسدش و در عمل کلمه‌به‌کلمه در چند
 * جای انبار تکرار شده بود؛ با هر بار کپی‌شدن هم یک ریزتفاوت تازه پیدا
 * می‌کرد (یکی `date` را در مرتب‌سازیِ تاریخی داشت و دیگری نه).
 *
 * عمداً فقط بخشِ *عمومی* اینجاست. فیلترهای معناداری مثل «نوع ردیف» یا
 * «طرف حساب» در خودِ ماژول می‌مانند، چون معنایشان مالِ همان دامنه است و
 * اینجا فقط به یک آرگومانِ مبهم تبدیل می‌شدند.
 *
 * ورودی باید *قبلاً* فیلترهای دامنه‌ای‌اش را خورده باشد.
 */

const DEFAULT_DATE_FIELDS = ["createdAt", "updatedAt"];

/**
 * @param rows   ردیف‌های از پیش فیلترشده
 * @param params { page, limit, search, fromDate, toDate, sortBy, sortOrder }
 * @param config
 *   searchFields  کدام فیلدها با متن جست‌وجو تطبیق داده شوند
 *   dateField     کدام فیلد مبنای فیلترِ بازه‌ی تاریخ است
 *   dateFields    کدام کلیدهای مرتب‌سازی تاریخ‌اند (به timestamp تبدیل شوند)
 *   numericFields کدام کلیدهای مرتب‌سازی عددی‌اند
 */
export function applyListQuery(rows, params = {}, config = {}) {
  const {
    page = 1,
    limit = 10,
    search = "",
    fromDate = "",
    toDate = "",
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const {
    searchFields = [],
    dateField = "date",
    dateFields = DEFAULT_DATE_FIELDS,
    numericFields = [],
  } = config;

  let result = rows;

  if (search && searchFields.length > 0) {
    const term = search.toLowerCase();
    result = result.filter((row) =>
      searchFields.some((field) =>
        String(row[field] ?? "").toLowerCase().includes(term),
      ),
    );
  }

  if (fromDate) {
    const from = fromDate.slice(0, 10);
    result = result.filter((row) => row[dateField]?.slice(0, 10) >= from);
  }
  if (toDate) {
    const to = toDate.slice(0, 10);
    result = result.filter((row) => row[dateField]?.slice(0, 10) <= to);
  }

  const asDate = new Set([...dateFields, dateField]);
  const asNumber = new Set(numericFields);

  result = [...result].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (asDate.has(sortBy)) {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (asNumber.has(sortBy)) {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else if (typeof aVal === "string" || typeof bVal === "string") {
      const cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""), "fa");
      return sortOrder === "asc" ? cmp : -cmp;
    }

    if (aVal === bVal) return 0;
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const total = result.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;

  return { items: result.slice(start, start + limit), total, page, totalPages };
}
