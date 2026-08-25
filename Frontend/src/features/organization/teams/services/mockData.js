// src/features/organization/teams/services/mockData.js
import { DepartmentEnum } from "@/shared/domain/enums/department";

/**
 * تیم‌ها. هر تیم زیرمجموعه‌ی دقیقاً یک واحد است و یک مدیر دارد
 * (`HeadId` — تنها فیلد رهبری که بکند واقعاً پشتیبانی می‌کند).
 *
 * `userCount` یک مقدار ثابتِ نمایشی است، نه مشتق از فهرست کارمندان:
 * بکند این عدد را خودش با join حساب می‌کند (`TeamListDto.UserCount`)،
 * و فرانت هنوز راهی برای گرفتن فهرستِ واقعیِ کارمندانِ هر تیم ندارد
 * (`GetUserList` وجود ندارد).
 */
export const allTeams = [
  {
    id: 1,
    name: "تیم ۱ فروش",
    departmentId: DepartmentEnum.SALES,
    headId: 2,
    headName: "سارا محمدی",
    userCount: 3,
    isActive: true,
  },
  {
    id: 2,
    name: "تیم ۲ فروش",
    departmentId: DepartmentEnum.SALES,
    headId: 8,
    headName: "فاطمه موسوی",
    userCount: 2,
    isActive: true,
  },
  {
    id: 3,
    name: "تیم خرید داخلی",
    departmentId: DepartmentEnum.SUPPLY,
    headId: 5,
    headName: "حسین نوری",
    userCount: 2,
    isActive: true,
  },
  {
    id: 4,
    name: "تیم انبار مرکزی",
    departmentId: DepartmentEnum.WAREHOUSE,
    headId: 3,
    headName: "مهدی کریمی",
    userCount: 4,
    isActive: true,
  },
  {
    id: 5,
    name: "تیم دفترداری",
    departmentId: DepartmentEnum.ACCOUNTING,
    headId: 6,
    headName: "زهرا احمدی",
    userCount: 1,
    isActive: true,
  },
  {
    id: 6,
    name: "تیم پشتیبانی فنی",
    departmentId: DepartmentEnum.IT,
    headId: null,
    headName: null,
    userCount: 1,
    isActive: false,
  },
];
