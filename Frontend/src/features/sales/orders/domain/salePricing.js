/**
 * دو قیمتِ فروشِ هر کالا: خرده (`retailPrice`) و همکار/عمده (`wholeSalePrice`).
 * حالت فقط در فرم است (`priceMode`) و به سرور نمی‌رود؛ قیمتِ هر قلم جدا فرستاده می‌شود.
 */
export const SALE_PRICE_MODES = {
  retail: { label: "خرده", fullLabel: "قیمت خرده", priceOf: (product) => product.retailPrice ?? 0 },
  wholesale: {
    label: "همکار",
    fullLabel: "قیمت همکار / عمده",
    priceOf: (product) => product.wholeSalePrice ?? product.retailPrice ?? 0,
  },
};

/** قیمتِ پیش‌فرضِ قلمِ تازه در حالتِ قیمتِ فعلی. */
export const salePriceOf = (priceMode) => (SALE_PRICE_MODES[priceMode] ?? SALE_PRICE_MODES.retail).priceOf;
