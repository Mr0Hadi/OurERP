import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const EmployeeNewPage = lazy(() => import("./pages/EmployeeNewPage"));
const EmployeeDetailPage = lazy(() => import("./pages/EmployeeDetailPage"));

export const employeesRoutes = [
  {
    path: ROUTES.EMPLOYEES,
    handle: { permission: "UserView" },
    element: <EmployeesPage />,
  },
  {
    path: ROUTES.EMPLOYEES_NEW,
    handle: { permission: "UserCreate" },
    element: <EmployeeNewPage />,
  },
  {
    path: ROUTES.EMPLOYEES_DETAIL,
    handle: { permission: "UserUpdate" },
    element: <EmployeeDetailPage />,
  },
];
