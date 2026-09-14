import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/shared/constants/routes";
import RouteLoadingOverlay from "@/shared/components/layout/RouteLoadingOverlay";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <RouteLoadingOverlay />
      <Outlet />
    </div>
  );
}