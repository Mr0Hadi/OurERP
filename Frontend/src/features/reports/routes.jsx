import { ROUTES } from '@/shared/constants/routes';
import ReportsHomePage from './pages/ReportsHomePage';
import SalesReportsPage from './pages/SalesReportsPage';
import PurchaseReportsPage from './pages/PurchaseReportsPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import ProfitLossReportPage from './pages/ProfitLossReportPage';
import warehouseReportsPage from './pages/warehouseReportsPage';

export const reportsRoutes = [
  {
    path: ROUTES.REPORTS,
    element: <ReportsHomePage />,
  },
  {
    path: ROUTES.REPORTS_SALES,
    element: <SalesReportsPage />,
  },
  {
    path: ROUTES.REPORTS_PURCHASES,
    element: <PurchaseReportsPage />,
  },
  {
    path: ROUTES.REPORTS_FINANCIAL,
    element: <FinancialReportsPage />,
  },
  {
    path: ROUTES.REPORTS_PROFIT_LOSS,
    element: <ProfitLossReportPage />,
  },
  {
    path: ROUTES.REPORTS_WAREHOUSE,
    element: <warehouseReportsPage />,
  },
];