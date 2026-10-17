import { lazy } from "react";

import { ROUTES } from "@/shared/constants/routes";

const AuditEventsPage = lazy(() => import("./pages/AuditEventsPage"));
const AuditEventDetailPage = lazy(() => import("./pages/AuditEventDetailPage"));

/** همه‌ی `api/Audit` پشتِ یک دسترسی است (بخش ۲۱ سند). */
const handle = { permission: "AuditLogView" };

export const auditRoutes = [
  { path: ROUTES.AUDIT, handle, element: <AuditEventsPage /> },
  { path: ROUTES.AUDIT_DETAIL, handle, element: <AuditEventDetailPage /> },
];
