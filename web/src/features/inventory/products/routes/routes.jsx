import { ROUTES } from '@/shared/constants/routes';
import { ProductsPage, ProductNewPage, ProductDetailPage } from "./index";

export const inventoryRoutes = [
  {
    path: ROUTES.PRODUCTS_LIST,
    element: <ProductsPage />,
  },
  {
    path: ROUTES.PRODUCTS_NEW,
    element: <ProductNewPage />,
  },
  {
    path: ROUTES.PRODUCTS_DETAIL,
    element: <ProductDetailPage />,
  }
];