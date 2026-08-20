import { lazy } from 'react';

export const SalesOrdersPage = lazy(() => import('../orders/pages/SalesOrdersPage'));
export const SaleNewPage = lazy(() => import('../orders/pages/SaleNewPage'));
export const SalePage = lazy(() => import('../orders/pages/SalePage'));
export const SaleDetailPage = lazy(() => import('../orders/pages/SaleDetailPage'));
export const SalesInvoiceNewPage = lazy(() => import('../orders/pages/SalesInvoiceNewPage'));
export const SalesProformaPage = lazy(() => import('../orders/pages/SalesProformaPage'));
export const SalesReturnsListPage = lazy(() => import('../returns/pages/SalesReturnsListPage'));
export const SalesReturnNewPage = lazy(() => import('../returns/pages/SalesReturnNewPage'));
export const SalesReturnDetailPage = lazy(() => import('../returns/pages/SalesReturnDetailPage'));
