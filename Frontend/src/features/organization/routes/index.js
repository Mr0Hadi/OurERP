import { lazy } from "react";

export const DepartmentsPage = lazy(() => import("../departments/pages/DepartmentsPage"));
export const DepartmentNewPage = lazy(() => import("../departments/pages/DepartmentNewPage"));
export const DepartmentDetailPage = lazy(() => import("../departments/pages/DepartmentDetailPage"));
export const TeamsPage = lazy(() => import("../teams/pages/TeamsPage"));
export const TeamNewPage = lazy(() => import("../teams/pages/TeamNewPage"));
export const TeamDetailPage = lazy(() => import("../teams/pages/TeamDetailPage"));
