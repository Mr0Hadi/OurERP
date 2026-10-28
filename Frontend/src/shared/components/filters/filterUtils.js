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
