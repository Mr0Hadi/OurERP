import { ROUTES } from '@/shared/constants/routes';
import { ProductsPage, ProductNewPage, ProductDetailPage } from "./index";

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
  }
];