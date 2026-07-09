import { ROUTES } from '@/shared/constants/routes';
import { CustomersPage, CustomerDetailPage, CustomerNewPage } from "./index";


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