// src/app/layouts/AuthLayout.jsx
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";


export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-lg p-6">
        <h1 className="text-xl font-bold mb-4">Auth</h1>
        <Outlet />
      </div>
    </div>
  );
}