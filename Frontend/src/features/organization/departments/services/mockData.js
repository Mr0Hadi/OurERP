// src/features/organization/departments/services/mockData.js
import { DepartmentEnum, DEPARTMENT_LABELS } from "@/shared/domain/enums/department";
import { ALL_PERMISSION_IDS } from "@/shared/domain/permissions/permissionCatalog";

/**
 * واحدهای سازمانی. شناسه‌ها عمداً از `DepartmentEnum` می‌آیند، نه عددِ
 * دستی — همان قراردادی که بکند باید سید کند.
 *
 * `deputyId` هنوز در بکند نیست؛ اینجا هست تا فرم و جدول از روز اول
 * شکلِ نهایی داده را ببینند و روزی که ستون اضافه شد، فقط ارسالش به
 * سرور باز شود.
 *
 * `memberPermissionIds`/`managerPermissionIds` دسترسیِ این واحد است —
 * اولی برای همه‌ی اعضا، دومی فقط برای مدیر و معاون (به شناسه‌های
 * `shared/domain/permissions/permissionCatalog.js`). واحد فناوری عمداً
 * تمام دسترسی‌ها را دارد: «واحد فناوری باید به همه‌ی بخش‌ها دسترسی
 * داشته باشد» یک تصمیم محصول است، نه یک استثنای کدی — همین که همه‌ی
 * چک‌باکس‌های آن در فرم دسترسی تیک خورده باشند کافی است.
 */
export const allDepartments = [
  {
    id: DepartmentEnum.MANAGEMENT,
    name: DEPARTMENT_LABELS[DepartmentEnum.MANAGEMENT],
    headId: 1,
    headName: "علی رضایی",
    deputyId: null,
    deputyName: null,
    memberPermissionIds: [...ALL_PERMISSION_IDS],
    managerPermissionIds: [...ALL_PERMISSION_IDS],
    isActive: true,
  },
  {
    id: DepartmentEnum.SUPPLY,
    name: DEPARTMENT_LABELS[DepartmentEnum.SUPPLY],
    headId: 5,
    headName: "حسین نوری",
    deputyId: 3,
    deputyName: "مهدی کریمی",
    memberPermissionIds: [1, 20, 21, 60, 61, 62],
    managerPermissionIds: [90, 91],
    isActive: true,
  },
  {
    id: DepartmentEnum.SALES,
    name: DEPARTMENT_LABELS[DepartmentEnum.SALES],
    headId: 2,
    headName: "سارا محمدی",
    deputyId: 8,
    deputyName: "فاطمه موسوی",
    memberPermissionIds: [1, 10, 11, 70, 71, 72, 80, 81],
    managerPermissionIds: [90, 92],
    isActive: true,
  },
  {
    id: DepartmentEnum.WAREHOUSE,
    name: DEPARTMENT_LABELS[DepartmentEnum.WAREHOUSE],
    headId: 3,
    headName: "مهدی کریمی",
    deputyId: null,
    deputyName: null,
    memberPermissionIds: [1, 50, 51, 52, 53],
    managerPermissionIds: [93],
    isActive: true,
  },
  {
    id: DepartmentEnum.ACCOUNTING,
    name: DEPARTMENT_LABELS[DepartmentEnum.ACCOUNTING],
    headId: 6,
    headName: "زهرا احمدی",
    deputyId: null,
    deputyName: null,
    memberPermissionIds: [1, 80, 81, 92],
    managerPermissionIds: [90, 91, 92, 93],
    isActive: true,
  },
  {
    id: DepartmentEnum.IT,
    name: DEPARTMENT_LABELS[DepartmentEnum.IT],
    headId: null,
    headName: null,
    deputyId: null,
    deputyName: null,
    memberPermissionIds: [...ALL_PERMISSION_IDS],
    managerPermissionIds: [...ALL_PERMISSION_IDS],
    isActive: true,
  },
];
