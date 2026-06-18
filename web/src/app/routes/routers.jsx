// src/app/routes/routers.jsx
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
// import { protectedLoader } from "./protectedLoader";

// ایمپورت routes از فیچرها
import { authRoutes } from "../../features/auth/routes";
import { dashboardRoutes } from "../../features/dashboard/routes";
import { customersRoutes } from "../../features/customers/routes";
import { inventoryRoutes } from "../../features/inventory/products/routes";
import { invoiceRoutes } from "../../features/invoice/routes";
import { suppliersRoutes } from "../../features/suppliers/routes";
import { reportsRoutes } from "../../features/reports/routes";
import { settingsRoutes } from "../../features/settings/routes";
import { transactionsRoutes } from "../../features/transactions/routes";

import { ROUTES } from "@/shared/constants/routes";

// صفحات بدون layout خاص
import NotFoundPage from "../layouts/NotFoundPage";
import { purchasesRoutes } from "@/features/purchases/routes";
import { salesRoutes } from "@/features/sales/routes";

export const router = createBrowserRouter([
  {
    path: ROUTES.AUTH,
    element: <AuthLayout />,
    children: authRoutes,
  },
  {
    path: ROUTES.ROOT,
    element: <AppLayout />,
    // loader: protectedLoader,
    errorElement: <NotFoundPage />,
    children: [
      ...dashboardRoutes,
      ...customersRoutes,
      ...purchasesRoutes,
      ...inventoryRoutes,
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