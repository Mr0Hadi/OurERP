import { ROUTES } from '@/shared/constants/routes';
import LoginPage from './pages/LoginPage';

export const authRoutes = [
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  }
];