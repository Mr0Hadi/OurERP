/** محدود کردن مقدار واردشده به بازه‌ی [0, max]. ورودی نامعتبر صفر می‌شود. */
export const clampQuantity = (value, max) => {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return 0;
  return Math.min(num, max);
};
