// src/shared/domain/enums/department.js

/**
 * `DepartmentEnum` — واحدهای سازمانی.
 *
 * ⚠️ این enum **منبع حقیقت نیست**، یک fallback و مرجع است. واحدها در بکند
 * ردیف‌های جدول `Department` هستند (با `Id` خودکار)، نه یک enum. پس
 * فهرست واقعی از `api/Department/GetDepartmentList` می‌آید و همین‌جا فقط
 * تا وقتی نگه داشته می‌شود که بکند این ردیف‌ها را سید نکرده باشد.
 *
 * شماره‌ها **قرارداد**اند: بکند باید دقیقاً همین شناسه‌ها را برای همین
 * نام‌ها سید کند (سند `docs/org-structure-contract.fa.md`). اگر شناسه‌ها
 * فرق کنند، داده‌ی سرور برنده است — نه این فایل.
 */
export const DepartmentEnum = Object.freeze({
  MANAGEMENT: 1,
  SUPPLY: 2,
  SALES: 3,
  WAREHOUSE: 4,
  ACCOUNTING: 5,
  IT: 6,
});

export const DEPARTMENT_LABELS = Object.freeze({
  [DepartmentEnum.MANAGEMENT]: "ادمین کل",
  [DepartmentEnum.SUPPLY]: "واحد تامین",
  [DepartmentEnum.SALES]: "واحد فروش",
  [DepartmentEnum.WAREHOUSE]: "واحد انبارداری",
  [DepartmentEnum.ACCOUNTING]: "واحد حسابداری",
  [DepartmentEnum.IT]: "واحد فناوری",
});

/** شکلِ ردیفِ `Department` — همان چیزی که API برمی‌گرداند. */
export const DEPARTMENT_FALLBACK = Object.values(DepartmentEnum).map((id) => ({
  id,
  name: DEPARTMENT_LABELS[id],
  isActive: true,
}));
