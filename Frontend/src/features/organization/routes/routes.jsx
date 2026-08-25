// src/features/organization/routes/routes.jsx
import { ROUTES } from "@/shared/constants/routes";
import {
  DepartmentsPage,
  DepartmentNewPage,
  DepartmentDetailPage,
  TeamsPage,
  TeamNewPage,
  TeamDetailPage,
} from "./index";

/**
 * ساختار سازمانی — واحدها و تیم‌ها.
 *
 * مثل کارمندان، فعلاً بدون گارد دسترسی ثبت شده‌اند و بعد از آماده‌شدن
 * لایه‌ی سطح دسترسی باید فقط برای نقش «مدیر سیستم» باز بمانند.
 *
 * ترتیب مهم است: مسیرهای `new` قبل از `:id` می‌آیند وگرنه
 * `/organization/teams/new` با `:id === "new"` تطبیق پیدا می‌کند.
 */
export const organizationRoutes = [
  {
    path: ROUTES.ORG_DEPARTMENTS,
    element: <DepartmentsPage />,
  },
  {
    path: ROUTES.ORG_DEPARTMENTS_NEW,
    element: <DepartmentNewPage />,
  },
  {
    path: ROUTES.ORG_DEPARTMENTS_DETAIL,
    element: <DepartmentDetailPage />,
  },
  {
    path: ROUTES.ORG_TEAMS,
    element: <TeamsPage />,
  },
  {
    path: ROUTES.ORG_TEAMS_NEW,
    element: <TeamNewPage />,
  },
  {
    path: ROUTES.ORG_TEAMS_DETAIL,
    element: <TeamDetailPage />,
  },
];
