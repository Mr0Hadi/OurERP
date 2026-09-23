import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const DepartmentsPage = lazy(() => import("./departments/pages/DepartmentsPage"));
const DepartmentNewPage = lazy(() => import("./departments/pages/DepartmentNewPage"));
const DepartmentDetailPage = lazy(() => import("./departments/pages/DepartmentDetailPage"));
const TeamsPage = lazy(() => import("./teams/pages/TeamsPage"));
const TeamNewPage = lazy(() => import("./teams/pages/TeamNewPage"));
const TeamDetailPage = lazy(() => import("./teams/pages/TeamDetailPage"));
/**
 * ساختار سازمانی — واحدها و تیم‌ها.
 *
 * `handle.permission` را `PermissionGate` (در `AppLayout`) می‌خواند.
 *
 * ترتیب مهم است: مسیرهای `new` قبل از `:id` می‌آیند وگرنه
 * `/organization/teams/new` با `:id === "new"` تطبیق پیدا می‌کند.
 */
export const organizationRoutes = [
  {
    path: ROUTES.ORG_DEPARTMENTS,
    handle: { permission: "DepartmentView" },
    element: <DepartmentsPage />,
  },
  {
    path: ROUTES.ORG_DEPARTMENTS_NEW,
    handle: { permission: "DepartmentManage" },
    element: <DepartmentNewPage />,
  },
  {
    path: ROUTES.ORG_DEPARTMENTS_DETAIL,
    handle: { permission: "DepartmentView" },
    element: <DepartmentDetailPage />,
  },
  {
    path: ROUTES.ORG_TEAMS,
    handle: { permission: "TeamView" },
    element: <TeamsPage />,
  },
  {
    path: ROUTES.ORG_TEAMS_NEW,
    handle: { permission: "TeamManage" },
    element: <TeamNewPage />,
  },
  {
    path: ROUTES.ORG_TEAMS_DETAIL,
    handle: { permission: "TeamView" },
    element: <TeamDetailPage />,
  },
];
