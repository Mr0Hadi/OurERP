import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const ProductsPage = lazy(() => import("./products/pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./products/pages/ProductDetailPage"));
const ProductNewPage = lazy(() => import("./products/pages/ProductNewPage"));
const ReceivingListPage = lazy(() => import("./receiving/pages/ReceivingListPage"));
const ReceivingDetailPage = lazy(() => import("./receiving/pages/ReceivingDetailPage"));
const UnitLabelsPage = lazy(() => import("./units/pages/UnitLabelsPage"));
const CategoriesPage = lazy(() => import("./categories/pages/CategoriesPage"));
const ShippingListPage = lazy(() => import("./shipping/pages/ShippingListPage"));
const ShippingDetailPage = lazy(() => import("./shipping/pages/ShippingDetailPage"));
const ReceivingReturnDetailPage = lazy(() => import("./receiving/pages/ReceivingReturnDetailPage"));
const SupplierReturnDetailPage = lazy(() => import("./shipping/pages/SupplierReturnDetailPage"));

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
    handle: { permission: "ProductView" },
    element: <ProductsPage />,
  },
  {
    path: ROUTES.WAREHOUSE_PRODUCTS_NEW,
    handle: { permission: "ProductCreate" },
    element: <ProductNewPage />,
  },
  {
    path: ROUTES.WAREHOUSE_PRODUCTS_DETAIL,
    handle: { permission: "ProductView" },
    element: <ProductDetailPage />,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIVING,
    handle: { permission: "PurchaseReceive" },
    element: <ReceivingListPage />,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIVING_DETAIL,
    handle: { permission: "PurchaseReceive" },
    element: <ReceivingDetailPage />,
  },
  {
    path: ROUTES.WAREHOUSE_UNIT_LABELS,
    handle: { permission: "ProductUnitView" },
    element: <UnitLabelsPage />,
  },
  {
    path: ROUTES.WAREHOUSE_CATEGORIES,
    handle: { permission: "ProductCategoryView" },
    element: <CategoriesPage />,
  },
  {
    path: ROUTES.WAREHOUSE_SHIPPING,
    handle: { permission: "SaleShip" },
    element: <ShippingListPage />,
  },
  {
    path: ROUTES.WAREHOUSE_SHIPPING_DETAIL,
    handle: { permission: "SaleShip" },
    element: <ShippingDetailPage />,
  },
  {
    path: ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL,
    handle: { permission: "SaleReturnExecute" },
    element: <ReceivingReturnDetailPage />,
  },
  {
    path: ROUTES.WAREHOUSE_SHIPPING_RETURN_DETAIL,
    handle: { permission: "PurchaseReturnExecute" },
    element: <SupplierReturnDetailPage />,
  },
];
