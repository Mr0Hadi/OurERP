import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const SupplierDetailPage = lazy(() => import("./pages/SupplierDetailPage"));
const SupplierEditPage = lazy(() => import("./pages/SupplierEditPage"));
const SupplierNewPage = lazy(() => import("./pages/SupplierNewPage"));

export const suppliersRoutes = [
  {
    path: ROUTES.SUPPLIERS_LIST,
    element: <SuppliersPage />,
  },
  {
    path: ROUTES.SUPPLIERS_NEW,
    element: <SupplierNewPage />,
  },
  {
    path: ROUTES.SUPPLIERS_DETAIL,
    element: <SupplierDetailPage />,
  },
  {
    path: ROUTES.SUPPLIERS_EDIT,
    element: <SupplierEditPage />,
  },
];