import { lazy } from 'react';

export const ProductsPage = lazy(() => import('../products/pages/ProductsPage'));
export const ProductDetailPage = lazy(() => import('../products/pages/ProductDetailPage'));
export const ProductNewPage = lazy(() => import('../products/pages/ProductNewPage'));
export const ReceivingListPage = lazy(() => import('../receiving/pages/ReceivingListPage'));
