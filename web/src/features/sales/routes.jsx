import { ROUTES } from "@/shared/constants/routes";
import SalesOrdersPage from "./pages/SalesOrdersPage";
import SaleNewPage from "./pages/SaleNewPage";
import SalesInvoiceNewPage from "./pages/SalesInvoiceNewPage";
import SalesProformaPage from "./pages/SalesProformaPage";
import SalesReturnsListPage from "./pages/SalesReturnsListPage";
import SalesReturnNewPage from "./pages/SalesReturnNewPage";


export const salesRoutes = [
  {
    path: ROUTES.SALES,
    element: <SalesOrdersPage />,
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
    element: <SalesProformaPage />,
  },
  {
    path: ROUTES.SALES_RETURNS_NEW,
    element: <SalesReturnNewPage />,
  },
  {
    path: ROUTES.SALES_RETURNS_LIST,
    element: <SalesReturnsListPage />,
  },
];

// export const salesRoutes = [
//   {
//     path: ROUTES.SALES_ORDERS,
//     element: <SalesOrdersPage />,
//   },
//   {
//     path: ROUTES.SALES_NEW,
//     element: <SaleNewPage />,
//   },
//   {
//     path: ROUTES.SALES_ORDER_DETAIL,
//     element: <SaleDetailPage />,
//   },
//   {
//     path: ROUTES.SALES_INVOICES_NEW,
//     element: <SalesInvoiceNewPage />,
//   },
//   {
//     path: ROUTES.SALES_PROFORMA,
//     element: <SalesProformaPage />,
//   },
//   {
//     path: ROUTES.SALES_RETURNS_LIST,
//     element: <SalesReturnsListPage />,
//   },
//   {
//     path: ROUTES.SALES_RETURNS_NEW,
//     element: <SalesReturnNewPage />,
//   },
// ];
