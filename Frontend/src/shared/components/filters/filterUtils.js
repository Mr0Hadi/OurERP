/**
 * مقدار ویژه‌ی «همه» در Select به رشته‌ی خالی فیلتر ترجمه می‌شود.
 * `numeric: true` برای فیلترهایی که مقدارشان enum عددی است — چون
 * Select همیشه رشته برمی‌گرداند، باید همان‌جا به عدد برگردد وگرنه
 * مقایسه‌ی بعدی با مقدار عددیِ واقعی (`===`) هیچ‌وقت true نمی‌شود.
 */
export const normalizeFilterValue = (value, { numeric = false } = {}) => {
  if (value === "all") return "";
  return numeric ? Number(value) : value;
};

/** ساخت آرایه‌ی options از یک دیکشنری { value: label }. */
export const toFilterOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/**
 * نام نمایشی پیش‌فرض یک طرف حساب (مشتری/تامین‌کننده).
 *
 * `fullName` اول می‌آید چون `GetCustomerList` فقط همین را می‌فرستد —
 * بدون آن، کشویی «مشتری» فهرستی از «بدون نام» نشان می‌داد در حالی که
 * ستون مشتریِ همان جدول نام‌ها را درست داشت.
 */
export const getPartyName = (party) =>
  party.fullName ||
  party.name ||
  party.companyName ||
  [party.firstName, party.lastName].filter(Boolean).join(" ") ||
  "بدون نام";
