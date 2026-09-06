import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const SalesOrdersPage = lazy(() => import("./orders/pages/SalesOrdersPage"));
const SaleNewPage = lazy(() => import("./orders/pages/SaleNewPage"));
const SalePage = lazy(() => import("./orders/pages/SalePage"));
const SaleDetailPage = lazy(() => import("./orders/pages/SaleDetailPage"));
const SalesInvoiceNewPage = lazy(() => import("./orders/pages/SalesInvoiceNewPage"));
const SalesProformaPage = lazy(() => import("./orders/pages/SalesProformaPage"));
const SalesReturnsListPage = lazy(() => import("./returns/pages/SalesReturnsListPage"));
const SalesReturnNewPage = lazy(() => import("./returns/pages/SalesReturnNewPage"));
const SalesReturnDetailPage = lazy(() => import("./returns/pages/SalesReturnDetailPage"));

export const salesRoutes = [
  {
    path: ROUTES.SALES,
    element: <SalePage />,
  },
  {
    path: ROUTES.SALES_DETAIL,
    element: <SaleDetailPage />,
  },
  {
    path: ROUTES.SALES_ORDERS,
    element: <SalesOrdersPage />,
  },
  {
    path: ROUTES.SALES_NEW,
    element: <SaleNewPage />,
  },
  {
    path: ROUTES.SALES_INVOICES_NEW,
    element: <SalesInvoiceNewPage />,
  },
  {
    path: ROUTES.SALES_PROFORMA,
    element: <SalesProformaPage/>,
  },
  {
    path: ROUTES.SALES_RETURNS_LIST,
    element: <SalesReturnsListPage />,
  },
  {
    path: ROUTES.SALES_RETURNS_NEW,
    element: <SalesReturnNewPage />,
  },
  {
    path: ROUTES.SALES_RETURNS_DETAIL,
    element: <SalesReturnDetailPage />,
  },
];
