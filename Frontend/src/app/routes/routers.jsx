import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import { protectedLoader } from "./protectedLoader";
import NotFoundPage from "../layouts/NotFoundPage";

import { authRoutes } from "@/features/auth/routes";
import { dashboardRoutes } from "@/features/dashboard/routes";
import { customersRoutes } from "@/features/customers/routes";
import { warehouseRoutes } from "@/features/warehouse/routes";
import { invoiceRoutes } from "@/features/invoice/routes";
import { suppliersRoutes } from "@/features/suppliers/routes";
import { reportsRoutes } from "@/features/reports/routes";
import { settingsRoutes } from "@/features/settings/routes";
import { transactionsRoutes } from "@/features/transactions/routes";
import { purchasesRoutes } from "@/features/purchases/routes";
import { salesRoutes } from "@/features/sales/routes";
import { employeesRoutes } from "@/features/employees/routes";
import { organizationRoutes } from "@/features/organization/routes";

export const router = createBrowserRouter([
  {
    path: ROUTES.AUTH,
    element: <AuthLayout />,
    children: authRoutes,
  },
  {
    path: ROUTES.ROOT,
    element: <AppLayout />,
    loader: protectedLoader,
    errorElement: <NotFoundPage />,
    children: [
      ...dashboardRoutes,
      ...customersRoutes,
      ...employeesRoutes,
      ...organizationRoutes,
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