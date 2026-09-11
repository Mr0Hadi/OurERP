import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const EmployeeNewPage = lazy(() => import("./pages/EmployeeNewPage"));
const EmployeeDetailPage = lazy(() => import("./pages/EmployeeDetailPage"));
/**
 * فعلاً بدون گارد دسترسی ثبت شده‌اند. نقش‌ها از بکند حذف شده‌اند و سطح
 * دسترسی قرار است بر پایه‌ی واحدِ کاربر (`User.DepartmentId`) ساخته شود؛
 * وقتی آماده شد، هر سه مسیر باید فقط برای واحدِ مدیریت باز بماند —
 * همان‌طور که آیتم منو هم با `permission: "employees"` فیلتر می‌شود.
 */
export const employeesRoutes = [
  {
    path: ROUTES.EMPLOYEES,
    element: <EmployeesPage />,
  },
  {
    path: ROUTES.EMPLOYEES_NEW,
    element: <EmployeeNewPage />,
  },
  {
    path: ROUTES.EMPLOYEES_DETAIL,
    element: <EmployeeDetailPage />,
  },
];
