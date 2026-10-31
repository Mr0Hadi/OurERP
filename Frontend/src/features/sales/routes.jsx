import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const SaleNewPage = lazy(() => import("./orders/pages/SaleNewPage"));
const SalePage = lazy(() => import("./orders/pages/SalePage"));
const SaleDetailPage = lazy(() => import("./orders/pages/SaleDetailPage"));
const SalesReturnsListPage = lazy(() => import("./returns/pages/SalesReturnsListPage"));
const SalesReturnNewPage = lazy(() => import("./returns/pages/SalesReturnNewPage"));
const SalesReturnDetailPage = lazy(() => import("./returns/pages/SalesReturnDetailPage"));

export const salesRoutes = [
  {
    path: ROUTES.SALES,
    handle: { permission: "SaleView" },
    element: <SalePage />,
  },
  {
    path: ROUTES.SALES_DETAIL,
    handle: { permission: "SaleView" },
    element: <SaleDetailPage />,
  },
  {
    path: ROUTES.SALES_NEW,
    handle: { permission: ["SaleCreate", "SaleInPerson"] },
    element: <SaleNewPage />,
  },
  {
    path: ROUTES.SALES_RETURNS_LIST,
    handle: { permission: "SaleReturnView" },
    element: <SalesReturnsListPage />,
  },
  {
    path: ROUTES.SALES_RETURNS_NEW,
    handle: { permission: "SaleReturnCreate" },
    element: <SalesReturnNewPage />,
  },
  {
    path: ROUTES.SALES_RETURNS_DETAIL,
    handle: { permission: "SaleReturnView" },
    element: <SalesReturnDetailPage />,
  },
];
