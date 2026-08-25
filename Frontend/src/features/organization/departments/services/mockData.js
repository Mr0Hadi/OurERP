// src/features/organization/departments/services/mockData.js
import { DepartmentEnum, DEPARTMENT_LABELS } from "@/shared/domain/enums/department";

/**
 * واحدهای سازمانی. شناسه‌ها عمداً از `DepartmentEnum` می‌آیند، نه عددِ
 * دستی — همان قراردادی که بکند باید سید کند.
 *
 * `deputyId` هنوز در بکند نیست؛ اینجا هست تا فرم و جدول از روز اول
 * شکلِ نهایی داده را ببینند و روزی که ستون اضافه شد، فقط ارسالش به
 * سرور باز شود.
 */
export const allDepartments = [
  {
    id: DepartmentEnum.MANAGEMENT,
    name: DEPARTMENT_LABELS[DepartmentEnum.MANAGEMENT],
    headId: 1,
    headName: "علی رضایی",
    deputyId: null,
    deputyName: null,
    isActive: true,
  },
  {
    id: DepartmentEnum.SUPPLY,
    name: DEPARTMENT_LABELS[DepartmentEnum.SUPPLY],
    headId: 5,
    headName: "حسین نوری",
    deputyId: 3,
    deputyName: "مهدی کریمی",
    isActive: true,
  },
  {
    id: DepartmentEnum.SALES,
    name: DEPARTMENT_LABELS[DepartmentEnum.SALES],
    headId: 2,
    headName: "سارا محمدی",
    deputyId: 8,
    deputyName: "فاطمه موسوی",
    isActive: true,
  },
  {
    id: DepartmentEnum.WAREHOUSE,
    name: DEPARTMENT_LABELS[DepartmentEnum.WAREHOUSE],
    headId: 3,
    headName: "مهدی کریمی",
    deputyId: null,
    deputyName: null,
    isActive: true,
  },
  {
    id: DepartmentEnum.ACCOUNTING,
    name: DEPARTMENT_LABELS[DepartmentEnum.ACCOUNTING],
    headId: 6,
    headName: "زهرا احمدی",
    deputyId: null,
    deputyName: null,
    isActive: true,
  },
  {
    id: DepartmentEnum.IT,
    name: DEPARTMENT_LABELS[DepartmentEnum.IT],
    headId: null,
    headName: null,
    deputyId: null,
    deputyName: null,
    isActive: true,
  },
];
