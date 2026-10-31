import { lazy, Suspense } from "react";
import { ROUTES } from "@/shared/constants/routes";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));

/** زیرِ `AuthLayout`؛ بی‌مجوز. */
export const authRoutes = [
  {
    path: "login",
    element: (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "change-password",
    element: (
      <Suspense fallback={null}>
        <ChangePasswordPage />
      </Suspense>
    ),
  },
];

/** زیرِ `AppLayout`؛ حسابِ خودِ کاربر، بی‌مجوزِ خاص. */
export const accountRoutes = [
  {
    path: ROUTES.ACCOUNT,
    element: <AccountPage />,
  },
];
