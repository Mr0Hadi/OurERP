import { lazy, Suspense } from "react";

const LoginPage = lazy(() => import("./pages/LoginPage"));

export const authRoutes = [
  {
    path: "login",
    element: (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    ),
  },
];