// src/app/routes/routers.jsx
import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";


import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import RequireAuth from "./RequireAuth";
import NotFoundPage from "../layouts/NotFoundPage";

// ایمپورت routes از فیچرها
import { authRoutes } from "../../features/auth/routes";
import { dashboardRoutes } from "../../features/dashboard/routes";
import { customersRoutes } from "../../features/customers/routes/routes";
import { warehouseRoutes } from "../../features/warehouse/routes/routes";
import { invoiceRoutes } from "../../features/invoice/routes";
import { suppliersRoutes } from "../../features/suppliers/routes/routes";
import { reportsRoutes } from "../../features/reports/routes";
import { settingsRoutes } from "../../features/settings/routes";
import { transactionsRoutes } from "../../features/transactions/routes";
import { purchasesRoutes } from "@/features/purchases/routes/routes";
import { salesRoutes } from "@/features/sales/routes/routes";


export const router = createBrowserRouter([
  {
    path: ROUTES.AUTH,
    element: <AuthLayout />,
    children: authRoutes,
  },
  {
    path: ROUTES.ROOT,
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <NotFoundPage />,
    children: [
      ...dashboardRoutes,
      ...customersRoutes,
      ...purchasesRoutes,
      ...warehouseRoutes,
      ...invoiceRoutes,
      ...salesRoutes,
      ...suppliersRoutes,
      ...reportsRoutes,
      ...settingsRoutes,
      ...transactionsRoutes,
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);