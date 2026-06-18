import { ROUTES } from '@/shared/constants/routes';
import SettingsHomePage from './pages/SettingsHomePage';
import GeneralSettingsPage from './pages/GeneralSettingsPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import InvoiceSettingsPage from './pages/InvoiceSettingsPage';
import TaxSettingsPage from './pages/TaxSettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import RolePermissionsPage from './pages/RolePermissionsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import BackupSettingsPage from './pages/BackupSettingsPage';

export const settingsRoutes = [
  {
    path: ROUTES.SETTINGS,
    element: <SettingsHomePage />,
  },
  {
    path: ROUTES.SETTINGS_GENERAL,
    element: <GeneralSettingsPage />,
  },
  {
    path: ROUTES.SETTINGS_COMPANY,
    element: <CompanyProfilePage />,
  },
  {
    path: ROUTES.SETTINGS_INVOICE,
    element: <InvoiceSettingsPage />,
  },
  {
    path: ROUTES.SETTINGS_TAX,
    element: <TaxSettingsPage />,
  },
  {
    path: ROUTES.SETTINGS_USERS,
    element: <UserManagementPage />,
  },
  {
    path: ROUTES.SETTINGS_ROLES,
    element: <RolePermissionsPage />,
  },
  {
    path: ROUTES.SETTINGS_NOTIFICATIONS,
    element: <NotificationSettingsPage />,
  },
  {
    path: ROUTES.SETTINGS_BACKUP,
    element: <BackupSettingsPage />,
  },
];