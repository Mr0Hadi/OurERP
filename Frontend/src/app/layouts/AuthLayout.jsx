import { Outlet } from "react-router-dom";
import RouteLoadingOverlay from "@/shared/components/layout/RouteLoadingOverlay";

// تصمیمِ «کاربر واردشده است یا نه» با خودِ صفحه‌ی ورود است (`useSessionCheck`)،
// نه این layout.
export default function AuthLayout() {
  return (
    <div className="min-h-svh bg-muted/30">
      <RouteLoadingOverlay />
      <Outlet />
    </div>
  );
}
