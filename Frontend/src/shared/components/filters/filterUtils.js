/** مقدار ویژه‌ی «همه» در Select به رشته‌ی خالی فیلتر ترجمه می‌شود. */
export const normalizeFilterValue = (value) => (value === "all" ? "" : value);

/** ساخت آرایه‌ی options از یک دیکشنری { value: label }. */
export const toFilterOptions = (labels) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** نام نمایشی پیش‌فرض یک طرف حساب (مشتری/تامین‌کننده). */
export const getPartyName = (party) =>
  party.name ||
  party.companyName ||
  [party.firstName, party.lastName].filter(Boolean).join(" ") ||
  "بدون نام";
