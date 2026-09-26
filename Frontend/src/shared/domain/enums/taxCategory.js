/** `TaxCategoryEnum` — وضعیتِ مالیاتیِ کالا و هر قلمِ فاکتور (بخش ۱۵ api-guide). */
export const TaxCategoryEnum = Object.freeze({
  TAXABLE: 1,
  EXEMPT: 2,
});

export const TAX_CATEGORY_LABELS = Object.freeze({
  [TaxCategoryEnum.TAXABLE]: "مشمول مالیات",
  [TaxCategoryEnum.EXEMPT]: "معاف از مالیات",
});
