import { lazy } from 'react';

export const PurchasesPage = lazy(() => import('../orders/pages/PurchasesPage'));
export const PurchasesNewPage = lazy(() => import('../orders/pages/PurchasesNewPage'));
export const PurchasesInvoicesPage = lazy(() => import('../orders/pages/PurchasesInvoicesPage'));
export const PurchaseInvoiceDetailPage = lazy(() => import('../orders/pages/PurchaseInvoiceDetailPage'));
export const PurchaseDetailPage = lazy(() => import('../orders/pages/PurchaseDetailPage'));
export const PurchaseReturnNewPage = lazy(() => import('../returns/pages/PurchaseReturnNewPage'));
export const PurchaseReturnsListPage = lazy(() => import('../returns/pages/PurchaseReturnsListPage'));
export const PurchaseReturnDetailPage = lazy(() => import('../returns/pages/PurchaseReturnDetailPage'));
