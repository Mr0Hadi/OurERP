import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const UserAccessPage = lazy(() => import("./pages/UserAccessPage"));
const DepartmentTemplatesPage = lazy(() => import("./pages/DepartmentTemplatesPage"));

/**
 * هر دو صفحه فهرست/جزئیات‌اند: `:id` فقط انتخابِ سمتِ راست را تعیین می‌کند
 * و همان کامپوننت رندر می‌شود، تا فهرست با جابه‌جایی بینِ کارمندان از نو
 * بارگذاری نشود.
 */
export const permissionsRoutes = [
  {
    path: ROUTES.ACCESS,
    element: <Navigate to={ROUTES.ACCESS_USERS} replace />,
  },
  {
    path: ROUTES.ACCESS_USERS,
    handle: { permission: "PermissionView" },
    element: <UserAccessPage />,
  },
  {
    path: ROUTES.ACCESS_USERS_DETAIL,
    handle: { permission: "PermissionView" },
    element: <UserAccessPage />,
  },
  {
    path: ROUTES.ACCESS_TEMPLATES,
    handle: { permission: "PermissionView" },
    element: <DepartmentTemplatesPage />,
  },
  {
    path: ROUTES.ACCESS_TEMPLATES_DETAIL,
    handle: { permission: "PermissionView" },
    element: <DepartmentTemplatesPage />,
  },
];
