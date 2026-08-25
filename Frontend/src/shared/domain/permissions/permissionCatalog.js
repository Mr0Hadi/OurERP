// src/shared/domain/permissions/permissionCatalog.js

/**
 * فهرستِ دسترسی‌های قابل‌تخصیص — واحد پایه‌ی مدل «دسترسی بر اساس واحد
 * کاری و جایگاه در آن».
 *
 * ⚠️ این هم مثل `department.js` یک **fallback** است، نه منبع حقیقت.
 * بکند فعلاً هیچ جدول Permission ای ندارد (`UserPermissionDto` در سرور
 * تعریف شده ولی کامنت است و همیشه `null` برمی‌گردد). شناسه‌های عددیِ
 * اینجا موقتی‌اند؛ روزی که بکند جدول واقعی Permission را بسازد، همین
 * شناسه‌ها احتمالاً عوض می‌شوند — فرانت آن روز فقط این فایل را با
 * پاسخ سرور جایگزین می‌کند.
 *
 * `key` دقیقاً همان رشته‌هایی است که `shared/constants/navigationData.js`
 * برای فیلترکردن منو استفاده می‌کند (`permission: "sales_create"` و
 * مانند آن) — یعنی همان چیزی که یک واحد می‌گیرد، مستقیم قابل‌استفاده در
 * منو هم هست، بدون نگاشتِ دوباره.
 */
export const PermissionGroupEnum = Object.freeze({
  GENERAL: 1,
  CUSTOMERS: 2,
  SUPPLIERS: 3,
  EMPLOYEES: 4,
  ORGANIZATION: 5,
  WAREHOUSE: 6,
  PURCHASES: 7,
  SALES: 8,
  INVOICE: 9,
  REPORTS: 10,
  SETTINGS: 11,
});

export const PERMISSION_GROUP_LABELS = Object.freeze({
  [PermissionGroupEnum.GENERAL]: "عمومی",
  [PermissionGroupEnum.CUSTOMERS]: "مشتریان",
  [PermissionGroupEnum.SUPPLIERS]: "تامین‌کنندگان",
  [PermissionGroupEnum.EMPLOYEES]: "کارمندان",
  [PermissionGroupEnum.ORGANIZATION]: "ساختار سازمانی",
  [PermissionGroupEnum.WAREHOUSE]: "انبار",
  [PermissionGroupEnum.PURCHASES]: "خرید",
  [PermissionGroupEnum.SALES]: "فروش",
  [PermissionGroupEnum.INVOICE]: "فاکتور",
  [PermissionGroupEnum.REPORTS]: "گزارشات",
  [PermissionGroupEnum.SETTINGS]: "تنظیمات",
});

/**
 * هر آیتم: { id, key, label, groupId }.
 * شناسه‌ها پیوسته و پایدارند — اگر آیتمی حذف شد، شماره‌اش را به آیتم
 * دیگری ندهید تا دسترسیِ ذخیره‌شده‌ی واحدها معنای عوض‌شده نگیرد.
 */
export const PERMISSION_CATALOG = Object.freeze([
  { id: 1, key: "dashboard", label: "مشاهده داشبورد", groupId: PermissionGroupEnum.GENERAL },

  { id: 10, key: "customers_view", label: "مشاهده فهرست مشتریان", groupId: PermissionGroupEnum.CUSTOMERS },
  { id: 11, key: "customers_create", label: "ثبت مشتری جدید", groupId: PermissionGroupEnum.CUSTOMERS },

  { id: 20, key: "suppliers_view", label: "مشاهده فهرست تامین‌کنندگان", groupId: PermissionGroupEnum.SUPPLIERS },
  { id: 21, key: "suppliers_create", label: "ثبت تامین‌کننده جدید", groupId: PermissionGroupEnum.SUPPLIERS },

  { id: 30, key: "employees_view", label: "مشاهده فهرست کارمندان", groupId: PermissionGroupEnum.EMPLOYEES },
  { id: 31, key: "employees_create", label: "ثبت و ویرایش کارمند", groupId: PermissionGroupEnum.EMPLOYEES },

  { id: 40, key: "organization_view", label: "مشاهده و مدیریت واحد و تیم", groupId: PermissionGroupEnum.ORGANIZATION },

  { id: 50, key: "warehouse_view", label: "مشاهده کالاها", groupId: PermissionGroupEnum.WAREHOUSE },
  { id: 51, key: "warehouse_create", label: "تعریف کالای جدید", groupId: PermissionGroupEnum.WAREHOUSE },
  { id: 52, key: "warehouse_receiving", label: "دریافت و برچسب‌زنی کالا", groupId: PermissionGroupEnum.WAREHOUSE },
  { id: 53, key: "warehouse_shipping", label: "ارسال کالا", groupId: PermissionGroupEnum.WAREHOUSE },

  { id: 60, key: "purchases_view", label: "مشاهده خریدها", groupId: PermissionGroupEnum.PURCHASES },
  { id: 61, key: "purchases_create", label: "ثبت خرید جدید", groupId: PermissionGroupEnum.PURCHASES },
  { id: 62, key: "purchases_returns", label: "ثبت و مشاهده مرجوعی خرید", groupId: PermissionGroupEnum.PURCHASES },

  { id: 70, key: "sales_view", label: "مشاهده فروش‌ها", groupId: PermissionGroupEnum.SALES },
  { id: 71, key: "sales_create", label: "ثبت فروش جدید", groupId: PermissionGroupEnum.SALES },
  { id: 72, key: "sales_returns", label: "ثبت و مشاهده مرجوعی فروش", groupId: PermissionGroupEnum.SALES },

  { id: 80, key: "invoice_view", label: "مشاهده فاکتورها", groupId: PermissionGroupEnum.INVOICE },
  { id: 81, key: "invoice_create", label: "صدور فاکتور جدید", groupId: PermissionGroupEnum.INVOICE },

  { id: 90, key: "reports_sales", label: "گزارشات فروش", groupId: PermissionGroupEnum.REPORTS },
  { id: 91, key: "reports_purchases", label: "گزارشات خرید", groupId: PermissionGroupEnum.REPORTS },
  { id: 92, key: "reports_financial", label: "گزارشات مالی", groupId: PermissionGroupEnum.REPORTS },
  { id: 93, key: "reports_warehouse", label: "گزارشات انبار", groupId: PermissionGroupEnum.REPORTS },

  { id: 100, key: "settings_general", label: "تنظیمات عمومی", groupId: PermissionGroupEnum.SETTINGS },
  { id: 101, key: "settings_users", label: "مدیریت کاربران از تنظیمات", groupId: PermissionGroupEnum.SETTINGS },
  { id: 102, key: "settings_roles", label: "نقش‌ها و دسترسی‌ها", groupId: PermissionGroupEnum.SETTINGS },
]);

const catalogById = new Map(PERMISSION_CATALOG.map((item) => [item.id, item]));

/** گروه‌بندیِ کاتالوگ برای رندرِ ماتریسِ چک‌باکس — یک‌بار محاسبه می‌شود. */
export const PERMISSION_GROUPS = Object.values(PermissionGroupEnum).map((groupId) => ({
  groupId,
  label: PERMISSION_GROUP_LABELS[groupId],
  items: PERMISSION_CATALOG.filter((item) => item.groupId === groupId),
}));

/** همه‌ی شناسه‌های کاتالوگ — برای دکمه‌ی «انتخاب همه». */
export const ALL_PERMISSION_IDS = PERMISSION_CATALOG.map((item) => item.id);

/** آرایه‌ی شناسه‌های عددی → آرایه‌ی کلیدهای رشته‌ای که منو می‌فهمد. */
export function permissionIdsToKeys(ids = []) {
  const keys = new Set();
  for (const id of ids) {
    const item = catalogById.get(id);
    if (item) keys.add(item.key);
  }
  return [...keys];
}
