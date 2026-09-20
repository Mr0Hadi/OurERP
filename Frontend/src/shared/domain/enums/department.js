/**
 * `DepartmentEnum` — شناسه‌ی واحدهای سازمانی.
 *
 * ⚠️ این enum **منبع حقیقت نیست**. واحدها در بکند ردیف‌های جدول
 * `Department` هستند (با `Id` خودکار)، نه یک enum؛ فهرستِ واقعی همیشه از
 * `api/Department/GetDepartmentList` می‌آید.
 *
 * تنها مصرفش نگاشتِ *آیکن* در سایدبار است (`NavWorkspace`): شماره‌ها
 * قراردادِ سیدِ بکند هستند و اگر شناسه‌ای در نگاشت نبود، آیکنِ پیش‌فرض
 * می‌نشیند.
 */
export const DepartmentEnum = Object.freeze({
  MANAGEMENT: 1,
  SUPPLY: 2,
  SALES: 3,
  WAREHOUSE: 4,
  ACCOUNTING: 5,
  IT: 6,
});
