// src/features/employees/services/mockData.js
import { DepartmentEnum } from "@/shared/domain/enums/department";

/**
 * کارمندان = کاربرانی که با سیستم کار می‌کنند (موجودیت `User` در بکند).
 * عمداً هیچ ربطی به مشتری و تامین‌کننده ندارند: آن دو *طرفِ حساب*اند و
 * تراز مالی دارند، این‌ها *حسابِ کاربری* دارند و جایگاه سازمانی.
 *
 * هر کارمند دقیقاً یک واحد دارد و حداکثر یک تیم. تیم می‌تواند خالی باشد
 * (`teamId: null`) — سرپرستِ واحد معمولاً عضو هیچ تیمی نیست — ولی واحد
 * اجباری است، چون سطح دسترسی از این پس روی واحد تعریف می‌شود.
 *
 * کارمند **نقش ندارد**: `User.RoleId` و جدول `Roles` در بکند حذف شده‌اند
 * (migration `remove-role`) و سرپرستی فقط با `Department.HeadId` و
 * `Team.HeadId` بیان می‌شود. پس هیچ فیلدِ `roleId` ای اینجا هم نیست.
 *
 * `departmentName`/`teamName` هم نگه‌داری نمی‌شوند و در لایه‌ی api از روی
 * شناسه ساخته می‌شوند — همان کاری که سرور با join می‌کند.
 */
export const allEmployees = [
  {
    id: 1,
    firstName: "علی",
    lastName: "رضایی",
    username: "ali_rezaei",
    personelCode: "1001",
    departmentId: DepartmentEnum.MANAGEMENT,
    teamId: null,
    isActive: true,
    createdAt: "2025-01-12T08:30:00Z",
  },
  {
    id: 2,
    firstName: "سارا",
    lastName: "محمدی",
    username: "sara_mohammadi",
    personelCode: "1002",
    departmentId: DepartmentEnum.SALES,
    teamId: null,
    isActive: true,
    createdAt: "2025-02-03T10:15:00Z",
  },
  {
    id: 3,
    firstName: "مهدی",
    lastName: "کریمی",
    username: "mehdi_karimi",
    personelCode: "1003",
    departmentId: DepartmentEnum.WAREHOUSE,
    teamId: null,
    isActive: true,
    createdAt: "2025-02-20T12:00:00Z",
  },
  {
    id: 4,
    firstName: "نرگس",
    lastName: "شریفی",
    username: "narges_sharifi",
    personelCode: "1004",
    departmentId: DepartmentEnum.SALES,
    teamId: 1,
    isActive: false,
    createdAt: "2025-03-08T09:45:00Z",
  },
  {
    id: 5,
    firstName: "حسین",
    lastName: "نوری",
    username: "hossein_nouri",
    personelCode: "1005",
    departmentId: DepartmentEnum.SUPPLY,
    teamId: null,
    isActive: true,
    createdAt: "2025-04-01T14:20:00Z",
  },
  {
    id: 6,
    firstName: "زهرا",
    lastName: "احمدی",
    username: "zahra_ahmadi",
    personelCode: "1006",
    departmentId: DepartmentEnum.ACCOUNTING,
    teamId: 5,
    isActive: true,
    createdAt: "2025-05-19T07:10:00Z",
  },
  {
    id: 7,
    firstName: "رضا",
    lastName: "تقوی",
    username: "reza_taghavi",
    personelCode: "1007",
    departmentId: DepartmentEnum.SUPPLY,
    teamId: 3,
    isActive: false,
    createdAt: "2025-06-02T16:00:00Z",
  },
  {
    id: 8,
    firstName: "فاطمه",
    lastName: "موسوی",
    username: "fatemeh_mousavi",
    personelCode: "1008",
    departmentId: DepartmentEnum.SALES,
    teamId: 2,
    isActive: true,
    createdAt: "2025-07-11T11:35:00Z",
  },
  {
    id: 9,
    firstName: "امیر",
    lastName: "حسینی",
    username: "amir_hosseini",
    personelCode: "1009",
    departmentId: DepartmentEnum.SALES,
    teamId: 1,
    isActive: true,
    createdAt: "2025-07-22T09:05:00Z",
  },
  {
    id: 10,
    firstName: "لیلا",
    lastName: "صادقی",
    username: "leila_sadeghi",
    personelCode: "1010",
    departmentId: DepartmentEnum.SUPPLY,
    teamId: 3,
    isActive: true,
    createdAt: "2025-08-04T13:40:00Z",
  },
  {
    id: 11,
    firstName: "کاوه",
    lastName: "رستمی",
    username: "kaveh_rostami",
    personelCode: "1011",
    departmentId: DepartmentEnum.WAREHOUSE,
    teamId: 4,
    isActive: true,
    createdAt: "2025-08-18T10:25:00Z",
  },
];
