import { lazy } from "react";
import { ROUTES } from '@/shared/constants/routes';

const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/CustomerDetailPage"));
const CustomerNewPage = lazy(() => import("./pages/CustomerNewPage"));

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