import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const SuppliersPage = lazy(() => import("./pages/SuppliersPage"));
const SupplierDetailPage = lazy(() => import("./pages/SupplierDetailPage"));
const SupplierEditPage = lazy(() => import("./pages/SupplierEditPage"));
const SupplierNewPage = lazy(() => import("./pages/SupplierNewPage"));

export const suppliersRoutes = [
  {
    path: ROUTES.SUPPLIERS_LIST,
    handle: { permission: "SupplierView" },
    element: <SuppliersPage />,
  },
  {
    path: ROUTES.SUPPLIERS_NEW,
    handle: { permission: "SupplierCreate" },
    element: <SupplierNewPage />,
  },
  {
    path: ROUTES.SUPPLIERS_DETAIL,
    handle: { permission: "SupplierView" },
    element: <SupplierDetailPage />,
  },
  {
    path: ROUTES.SUPPLIERS_EDIT,
    handle: { permission: "SupplierUpdate" },
    element: <SupplierEditPage />,
  },
];