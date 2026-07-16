import { ROUTES } from '@/shared/constants/routes';
import { ProductsPage, ProductNewPage, ProductDetailPage, ReceivingListPage, ReceivingDetailPage } from "./index";

export const warehouseRoutes = [
  {
    path: ROUTES.WAREHOUSE_PRODUCTS,
    element: <ProductsPage />,
  },
  {
    path: ROUTES.WAREHOUSE_PRODUCTS_NEW,
    element: <ProductNewPage />,
  },
  {
    path: ROUTES.WAREHOUSE_PRODUCTS_DETAIL,
    element: <ProductDetailPage />,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIVING,
    element: <ReceivingListPage />,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIVING_DETAIL,
    element: <ReceivingDetailPage />,
  }
];