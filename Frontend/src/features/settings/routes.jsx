import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const SystemSettingsPage = lazy(() => import("./pages/SystemSettingsPage"));

export const settingsRoutes = [
  {
    path: ROUTES.SETTINGS,
    // بخش ۲۲ سند: خواندن با هرکدام از دو دسترسی.
    handle: { permission: ["SettingView", "SettingManage"] },
    element: <SystemSettingsPage />,
  },
];
