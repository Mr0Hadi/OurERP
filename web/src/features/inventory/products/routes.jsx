import { ROUTES } from '@/shared/constants/routes';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductEditPage from './pages/ProductEditPage';
import ProductNewPage from './pages/ProductNewPage';

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
  },
  {
    path: ROUTES.PRODUCTS_EDIT,
    element: <ProductEditPage />,
  },
];