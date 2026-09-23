import { lazy } from "react";
import { ROUTES } from '@/shared/constants/routes';

const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/CustomerDetailPage"));
const CustomerNewPage = lazy(() => import("./pages/CustomerNewPage"));

export const customersRoutes = [
  {
    path: ROUTES.CUSTOMERS_LIST,
    handle: { permission: "CustomerView" },
    element: <CustomersPage />,
  },
  {
    path: ROUTES.CUSTOMERS_NEW,
    handle: { permission: "CustomerCreate" },
    element: <CustomerNewPage />,
  },
  {
    path: ROUTES.CUSTOMERS_DETAIL,
    handle: { permission: "CustomerView" },
    element: <CustomerDetailPage />,
  }
];