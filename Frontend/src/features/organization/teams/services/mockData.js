// src/features/organization/teams/services/mockData.js
import { DepartmentEnum } from "@/shared/domain/enums/department";

/**
 * تیم‌ها. هر تیم زیرمجموعه‌ی دقیقاً یک واحد است و یک مدیر و یک معاون
 * دارد (`HeadId`, `DeputyId` — هر دو در بکند وجود دارند).
 *
 * `userCount` اینجا نگه‌داری نمی‌شود: حالا که کارمندها `teamId` دارند،
 * تعداد اعضا از روی خودِ فهرست کارمندان شمرده می‌شود (در `api-mockData`)
 * — همان کاری که بکند با join انجام می‌دهد. نگه‌داشتنِ یک عددِ ثابت یعنی
 * بعد از افزودن عضو، شمارنده دروغ بگوید.
 *
 * `headName` و `deputyName` هم مشتق‌اند و از فهرست کارمندان می‌آیند.
 */
export const allTeams = [
  {
    id: 1,
    name: "تیم ۱ فروش",
    departmentId: DepartmentEnum.SALES,
    headId: 9,
    deputyId: 4,
    isActive: true,
  },
  {
    id: 2,
    name: "تیم ۲ فروش",
    departmentId: DepartmentEnum.SALES,
    headId: 8,
    deputyId: null,
    isActive: true,
  },
  {
    id: 3,
    name: "تیم خرید داخلی",
    departmentId: DepartmentEnum.SUPPLY,
    headId: 10,
    deputyId: 7,
    isActive: true,
  },
  {
    id: 4,
    name: "تیم انبار مرکزی",
    departmentId: DepartmentEnum.WAREHOUSE,
    headId: 11,
    deputyId: null,
    isActive: true,
  },
  {
    id: 5,
    name: "تیم دفترداری",
    departmentId: DepartmentEnum.ACCOUNTING,
    headId: null,
    deputyId: null,
    isActive: true,
  },
  {
    id: 6,
    name: "تیم پشتیبانی فنی",
    departmentId: DepartmentEnum.IT,
    headId: null,
    deputyId: null,
    isActive: false,
  },
];
