import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";
import { Card, CardContent } from "@/shared/components/ui/card";

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">OurERP</h1>
          <p className="text-sm text-muted-foreground">سیستم مدیریت یکپارچه انبار</p>
        </div>
        <Card size="sm" className="ring-1 ring-foreground/10">
          <CardContent className="pt-3">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
