import { Navigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import {
  ProductsPage,
  ProductNewPage,
  ProductDetailPage,
  ReceivingListPage,
  ReceivingDetailPage,
  UnitLabelsPage,
  ShippingListPage,
  ShippingDetailPage,
  ReceivingReturnDetailPage,
  SupplierReturnDetailPage,
} from "./index";

export const warehouseRoutes = [
  // «انبار» در سایدبار به این مسیر لینک می‌دهد ولی صفحه‌ی مرورِ کلی
  // ندارد — برخلاف مشتریان/خرید/فروش که مسیر ریشه‌شان خودش یک لیست
  // است. تا وقتی چنین صفحه‌ای ساخته شود، به پرکاربردترین زیرصفحه
  // هدایت می‌شود؛ قبلاً NotFound می‌داد.
  {
    path: ROUTES.WAREHOUSE,
    element: <Navigate to={ROUTES.WAREHOUSE_PRODUCTS} replace />,
  },
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
  },
  {
    path: ROUTES.WAREHOUSE_UNIT_LABELS,
    element: <UnitLabelsPage />,
  },
  {
    path: ROUTES.WAREHOUSE_SHIPPING,
    element: <ShippingListPage />,
  },
  {
    path: ROUTES.WAREHOUSE_SHIPPING_DETAIL,
    element: <ShippingDetailPage />,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL,
    element: <ReceivingReturnDetailPage />,
  },
  {
    path: ROUTES.WAREHOUSE_SHIPPING_SUPPLIER_RETURN_DETAIL,
    element: <SupplierReturnDetailPage />,
  },
];
