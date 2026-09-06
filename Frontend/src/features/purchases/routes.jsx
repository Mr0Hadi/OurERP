import { lazy } from "react";
import { ROUTES } from "@/shared/constants/routes";

const PurchasesPage = lazy(() => import("./orders/pages/PurchasesPage"));
const PurchasesNewPage = lazy(() => import("./orders/pages/PurchasesNewPage"));
const PurchasesInvoicesPage = lazy(() => import("./orders/pages/PurchasesInvoicesPage"));
const PurchaseInvoiceDetailPage = lazy(() => import("./orders/pages/PurchaseInvoiceDetailPage"));
const PurchaseDetailPage = lazy(() => import("./orders/pages/PurchaseDetailPage"));
const PurchaseReturnNewPage = lazy(() => import("./returns/pages/PurchaseReturnNewPage"));
const PurchaseReturnsListPage = lazy(() => import("./returns/pages/PurchaseReturnsListPage"));
const PurchaseReturnDetailPage = lazy(() => import("./returns/pages/PurchaseReturnDetailPage"));

export const purchasesRoutes = [
  {
    path: ROUTES.PURCHASES,
    element: <PurchasesPage />,
  },
  {
    path: ROUTES.PURCHASES_NEW,
    element: <PurchasesNewPage />,
  },
  {
    path: ROUTES.PURCHASES_INVOICES,
    element: <PurchasesInvoicesPage />,
  },
  {
    path: ROUTES.PURCHASES_DETAIL,
    element: <PurchaseDetailPage />,
  },
  {
    path: ROUTES.PURCHASES_INVOICE_DETAIL,
    element: <PurchaseInvoiceDetailPage />,
  },
  {
    path: ROUTES.PURCHASES_RETURNS_NEW,
    element: <PurchaseReturnNewPage />,
  },
  {
    path: ROUTES.PURCHASES_RETURNS_LIST,
    element: <PurchaseReturnsListPage />,
  },
  {
    path: ROUTES.PURCHASES_RETURNS_DETAIL,
    element: <PurchaseReturnDetailPage />,
  },
];