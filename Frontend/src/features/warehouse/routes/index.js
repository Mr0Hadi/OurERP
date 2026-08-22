import { lazy } from 'react';

export const ProductsPage = lazy(() => import('../products/pages/ProductsPage'));
export const ProductDetailPage = lazy(() => import('../products/pages/ProductDetailPage'));
export const ProductNewPage = lazy(() => import('../products/pages/ProductNewPage'));
export const ReceivingListPage = lazy(() => import('../receiving/pages/ReceivingListPage'));
export const ReceivingDetailPage = lazy(() => import('../receiving/pages/ReceivingDetailPage'));
export const UnitLabelsPage = lazy(() => import('../units/pages/UnitLabelsPage'));
export const ShippingListPage = lazy(() => import('../shipping/pages/ShippingListPage'));
export const ShippingDetailPage = lazy(() => import('../shipping/pages/ShippingDetailPage'));
export const ReceivingReturnDetailPage = lazy(() => import('../receiving/pages/ReceivingReturnDetailPage'));
export const SupplierReturnDetailPage = lazy(() => import('../shipping/pages/SupplierReturnDetailPage'));
