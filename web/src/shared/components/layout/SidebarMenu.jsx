// src/shared/components/layout/SidebarMenu.jsx
import { useNavigate, useLocation } from 'react-router';
import { Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  FileTextOutlined,
  SwapOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'داشبورد' },
  { key: '/customers', icon: <UserOutlined />, label: 'مشتریان' },
  { key: '/products', icon: <ShoppingCartOutlined />, label: 'محصولات' },
  { key: '/inventory', icon: <InboxOutlined />, label: 'انبار' },
  { key: '/invoices', icon: <FileTextOutlined />, label: 'فاکتورها' },
  { key: '/transactions', icon: <SwapOutlined />, label: 'تراکنش‌ها' },
  { key: '/suppliers', icon: <TeamOutlined />, label: 'تأمین‌کنندگان' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'گزارش‌ها' },
  { key: '/settings', icon: <SettingOutlined />, label: 'تنظیمات' },
];

const SidebarMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // تعیین آیتم فعال بر اساس مسیر فعلی
  const selectedKey = location.pathname.split('/')[1] 
    ? `/${location.pathname.split('/')[1]}` 
    : '/dashboard';

  const handleClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      onClick={handleClick}
      items={menuItems}
      className="border-e-0 text-sm font-medium py-2"
      style={{ background: 'transparent' }}
    />
  );
};

export default SidebarMenu;