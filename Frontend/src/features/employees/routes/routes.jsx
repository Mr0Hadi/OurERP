// src/features/employees/routes/routes.jsx
import { ROUTES } from "@/shared/constants/routes";
import { EmployeesPage, EmployeeNewPage, EmployeeDetailPage } from "./index";

/**
 * فعلاً بدون گارد دسترسی ثبت شده‌اند. وقتی لایه‌ی سطح دسترسی آماده شد،
 * هر سه مسیر باید فقط برای نقش «مدیر سیستم» (`UserRoleEnum.ADMIN`) باز
 * بماند — همان‌طور که آیتم منو هم با `permission: "employees"` فیلتر
 * می‌شود.
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
