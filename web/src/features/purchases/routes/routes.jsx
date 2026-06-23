// src/features/purchases/routes.jsx
import { ROUTES } from '@/shared/constants/routes';
import { PurchasesListPage, PurchasesNewPage, PurchasesInvoicesPage, PurchaseInvoiceDetailPage, PurchaseReturnNewPage, PurchaseReturnsListPage} from "./index";

export const purchasesRoutes = [
  {
    path: ROUTES.PURCHASES,
    element: <PurchasesListPage />,
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
];