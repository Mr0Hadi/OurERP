/** فقط ارقام را نگه می‌دارد و به حداکثر طول داده‌شده می‌برد. */
export const onlyDigits = (value, maxLen) =>
  value.replace(/\D/g, "").slice(0, maxLen);
