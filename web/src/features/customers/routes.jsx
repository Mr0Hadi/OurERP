import { ROUTES } from '@/shared/constants/routes';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CustomerNewPage from './pages/CustomerNewPage';

export const customersRoutes = [
  {
    path: ROUTES.CUSTOMERS_LIST,
    element: <CustomersPage />,
  },
  {
    path: ROUTES.CUSTOMERS_NEW,
    element: <CustomerNewPage />,
  },
  {
    path: ROUTES.CUSTOMERS_DETAIL,
    element: <CustomerDetailPage />,
  }
];