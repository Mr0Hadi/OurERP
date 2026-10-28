/**
 * صفحه‌ی لمسی (موبایل/تبلت)؛ انتخاب‌گرها روی آن جست‌وجو را خودکار فوکوس نمی‌کنند
 * تا کیبورد بی‌دلیل بالا نیاید.
 */
export const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;
