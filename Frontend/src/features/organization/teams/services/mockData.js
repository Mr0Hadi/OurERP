// src/features/organization/teams/services/mockData.js
import { DepartmentEnum } from "@/shared/domain/enums/department";

/**
 * تیم‌ها. هر تیم زیرمجموعه‌ی دقیقاً یک واحد است و — مثل واحد — یک مدیر و
 * یک معاون دارد.
 *
 * `deputyId` هنوز در بکند نیست (به `mockData` واحدها نگاه کنید).
 */
export const allTeams = [
  {
    id: 1,
    name: "تیم ۱ فروش",
    departmentId: DepartmentEnum.SALES,
    headId: 2,
    headName: "سارا محمدی",
    deputyId: null,
    deputyName: null,
    userCount: 3,
    isActive: true,
  },
  {
    id: 2,
    name: "تیم ۲ فروش",
    departmentId: DepartmentEnum.SALES,
    headId: 8,
    headName: "فاطمه موسوی",
    deputyId: 6,
    deputyName: "زهرا احمدی",
    userCount: 2,
    isActive: true,
  },
  {
    id: 3,
    name: "تیم خرید داخلی",
    departmentId: DepartmentEnum.SUPPLY,
    headId: 5,
    headName: "حسین نوری",
    deputyId: null,
    deputyName: null,
    userCount: 2,
    isActive: true,
  },
  {
    id: 4,
    name: "تیم انبار مرکزی",
    departmentId: DepartmentEnum.WAREHOUSE,
    headId: 3,
    headName: "مهدی کریمی",
    deputyId: null,
    deputyName: null,
    userCount: 4,
    isActive: true,
  },
  {
    id: 5,
    name: "تیم دفترداری",
    departmentId: DepartmentEnum.ACCOUNTING,
    headId: 6,
    headName: "زهرا احمدی",
    deputyId: null,
    deputyName: null,
    userCount: 1,
    isActive: true,
  },
  {
    id: 6,
    name: "تیم پشتیبانی فنی",
    departmentId: DepartmentEnum.IT,
    headId: null,
    headName: null,
    deputyId: null,
    deputyName: null,
    userCount: 1,
    isActive: false,
  },
];
