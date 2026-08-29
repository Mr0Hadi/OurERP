// src/features/organization/departments/services/mockData.js
import { DepartmentEnum, DEPARTMENT_LABELS } from "@/shared/domain/enums/department";

/**
 * واحدهای سازمانی. شناسه‌ها عمداً از `DepartmentEnum` می‌آیند، نه عددِ
 * دستی — همان قراردادی که بکند باید سید کند.
 *
 * فیلدها همان‌هایی هستند که بکند دارد: `Name`, `HeadId`, `DeputyId`.
 * معاون در migration `remove-role` به هر دو جدول اضافه شده و هندلرهای
 * `Create`/`Update` آن را بی‌قید بازنویسی می‌کنند — پس فرم هم باید
 * همیشه بفرستدش.
 *
 * `headName`, `deputyName`, `teamCount` و `userCount` هیچ‌کدام اینجا
 * نیستند: همه از روی فهرست کارمندان و تیم‌ها ساخته می‌شوند (در
 * `api-mockData`)، وگرنه بعد از هر جابه‌جاییِ عضو یا تیم، مقدارِ
 * ذخیره‌شده دروغ می‌گفت.
 */
export const allDepartments = [
  {
    id: DepartmentEnum.MANAGEMENT,
    name: DEPARTMENT_LABELS[DepartmentEnum.MANAGEMENT],
    headId: 1,
    deputyId: 5,
    isActive: true,
  },
  {
    id: DepartmentEnum.SUPPLY,
    name: DEPARTMENT_LABELS[DepartmentEnum.SUPPLY],
    headId: 5,
    deputyId: 10,
    isActive: true,
  },
  {
    id: DepartmentEnum.SALES,
    name: DEPARTMENT_LABELS[DepartmentEnum.SALES],
    headId: 2,
    deputyId: 8,
    isActive: true,
  },
  {
    id: DepartmentEnum.WAREHOUSE,
    name: DEPARTMENT_LABELS[DepartmentEnum.WAREHOUSE],
    headId: 3,
    deputyId: 11,
    isActive: true,
  },
  {
    id: DepartmentEnum.ACCOUNTING,
    name: DEPARTMENT_LABELS[DepartmentEnum.ACCOUNTING],
    headId: 6,
    deputyId: null,
    isActive: true,
  },
  {
    id: DepartmentEnum.IT,
    name: DEPARTMENT_LABELS[DepartmentEnum.IT],
    headId: null,
    deputyId: null,
    isActive: true,
  },
];
