import DashboardPage from "./pages/DashboardPage";
import { ROUTES } from '@/shared/constants/routes';

export const dashboardRoutes = [
  {
    path: ROUTES.DASHBOARD,
    element: <DashboardPage />,
  },
  {
    index: true,
    element: <DashboardPage />,
  },
];
