import { ROUTES } from '@/shared/constants/routes';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import SupplierEditPage from './pages/SupplierEditPage';
import SupplierNewPage from './pages/SupplierNewPage';

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