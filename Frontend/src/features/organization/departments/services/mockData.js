// src/features/organization/departments/services/mockData.js
import { DepartmentEnum, DEPARTMENT_LABELS } from "@/shared/domain/enums/department";

/**
 * واحدهای سازمانی. شناسه‌ها عمداً از `DepartmentEnum` می‌آیند، نه عددِ
 * دستی — همان قراردادی که بکند باید سید کند.
 *
 * فقط فیلدهایی دارد که بکند واقعاً پشتیبانی می‌کند (`Name`, `HeadId`).
 * معاون هنوز اضافه نشده و تا وقتی بکند ننویسدش، اینجا هم نمی‌آید.
 *
 * `userCount` یک مقدار ثابتِ نمایشی است، نه مشتق از فهرست کارمندان —
 * دقیقاً به همان دلیلِ `userCount` در mock تیم‌ها.
 */
export const allDepartments = [
  {
    id: DepartmentEnum.MANAGEMENT,
    name: DEPARTMENT_LABELS[DepartmentEnum.MANAGEMENT],
    headId: 1,
    headName: "علی رضایی",
    userCount: 1,
    isActive: true,
  },
  {
    id: DepartmentEnum.SUPPLY,
    name: DEPARTMENT_LABELS[DepartmentEnum.SUPPLY],
    headId: 5,
    headName: "حسین نوری",
    userCount: 2,
    isActive: true,
  },
  {
    id: DepartmentEnum.SALES,
    name: DEPARTMENT_LABELS[DepartmentEnum.SALES],
    headId: 2,
    headName: "سارا محمدی",
    userCount: 3,
    isActive: true,
  },
  {
    id: DepartmentEnum.WAREHOUSE,
    name: DEPARTMENT_LABELS[DepartmentEnum.WAREHOUSE],
    headId: 3,
    headName: "مهدی کریمی",
    userCount: 1,
    isActive: true,
  },
  {
    id: DepartmentEnum.ACCOUNTING,
    name: DEPARTMENT_LABELS[DepartmentEnum.ACCOUNTING],
    headId: 6,
    headName: "زهرا احمدی",
    userCount: 1,
    isActive: true,
  },
  {
    id: DepartmentEnum.IT,
    name: DEPARTMENT_LABELS[DepartmentEnum.IT],
    headId: null,
    headName: null,
    userCount: 0,
    isActive: true,
  },
];
