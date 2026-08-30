// src/shared/services/files/queryKeys.js

/**
 * کلیدهای کشِ فایل — سراسری، نه مالِ یک فیچر.
 *
 * یک تصویر ممکن است هم‌زمان در جدولِ محصولات و در کارتِ جزئیات دیده شود؛
 * کلیدِ مشترک یعنی امضا یک بار گرفته می‌شود، نه به ازای هر کامپوننت.
 */
export const fileKeys = {
  all: ["files"],
  urls: () => [...fileKeys.all, "url"],
  url: (objectKey) => [...fileKeys.urls(), String(objectKey ?? "")],
};
