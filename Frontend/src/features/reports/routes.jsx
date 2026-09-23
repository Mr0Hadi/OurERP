import { ROUTES } from '@/shared/constants/routes';
import ReportsHomePage from './pages/ReportsHomePage';
import SalesReportsPage from './pages/SalesReportsPage';
import PurchaseReportsPage from './pages/PurchaseReportsPage';
import FinancialReportsPage from './pages/FinancialReportsPage';
import ProfitLossReportPage from './pages/ProfitLossReportPage';
// نامِ کامپوننت باید با حرف بزرگ شروع شود؛ وگرنه JSX آن را یک تگِ ناشناخته‌ی HTML می‌گیرد و صفحه خالی می‌ماند.
import WarehouseReportsPage from './pages/warehouseReportsPage';
import EmployeeActivityPage from './pages/EmployeeActivityPage';
import CustomerActivityPage from './pages/CustomerActivityPage';
import SupplierActivityPage from './pages/SupplierActivityPage';

export const reportsRoutes = [
  {
    path: ROUTES.REPORTS,
    handle: { permission: "ReportView" },
    element: <ReportsHomePage />,
  },
  // گزارش‌های فعالیت — روی `api/Report` واقعی (بخش ۱۸ سند).
  {
    path: ROUTES.REPORTS_EMPLOYEES,
    handle: { permission: "ReportView" },
    element: <EmployeeActivityPage />,
  },
  {
    path: ROUTES.REPORTS_CUSTOMERS,
    handle: { permission: "ReportView" },
    element: <CustomerActivityPage />,
  },
  {
    path: ROUTES.REPORTS_SUPPLIERS,
    handle: { permission: "ReportView" },
    element: <SupplierActivityPage />,
  },
  {
    path: ROUTES.REPORTS_SALES,
    handle: { permission: "ReportView" },
    element: <SalesReportsPage />,
  },
  {
    path: ROUTES.REPORTS_PURCHASES,
    handle: { permission: "ReportView" },
    element: <PurchaseReportsPage />,
  },
  {
    path: ROUTES.REPORTS_FINANCIAL,
    handle: { permission: "ReportView" },
    element: <FinancialReportsPage />,
  },
  {
    path: ROUTES.REPORTS_PROFIT_LOSS,
    handle: { permission: "ReportView" },
    element: <ProfitLossReportPage />,
  },
  {
    path: ROUTES.REPORTS_WAREHOUSE,
    handle: { permission: "ReportView" },
    element: <WarehouseReportsPage />,
  },
];