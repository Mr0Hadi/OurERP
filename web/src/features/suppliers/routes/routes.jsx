import { ROUTES } from '@/shared/constants/routes';
import { SuppliersPage, SupplierNewPage, SupplierDetailPage, SupplierEditPage } from "./index";

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