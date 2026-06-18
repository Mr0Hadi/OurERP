// src/shared/components/layout/Header.jsx
import { Layout, Breadcrumb, Input, Badge, Avatar, Dropdown, theme } from 'antd';
import {
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useMatches, Link } from 'react-router';

const { Header: AntHeader } = Layout;

// تابع کمکی برای استخراج breadcrumb از route handles (اختیاری)
const getBreadcrumbs = (matches) => {
  return matches
    .filter((match) => match.handle && match.handle.breadcrumb)
    .map((match) => ({
      title: match.handle.breadcrumb(match),
      path: match.pathname,
    }));
};

const Header = () => {
  const matches = useMatches();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // برای سادگی از breadcrumb ساده مبتنی بر مسیر استفاده می‌کنیم
  const pathParts = matches[matches.length - 1].pathname
    .split('/')
    .filter(Boolean);

  const breadcrumbItems = [
    { title: <Link to="/dashboard">داشبورد</Link> },
    ...pathParts.slice(1).map((part, index) => ({
      title: part,
    })),
  ];

  const userMenuItems = [
    { key: 'profile', label: 'پروفایل', icon: <UserOutlined /> },
    { key: 'settings', label: 'تنظیمات', icon: <SettingOutlined /> },
    { type: 'divider' },
    { key: 'logout', label: 'خروج', icon: <LogoutOutlined /> },
  ];

  return (
    <AntHeader
      className="flex items-center justify-between px-6 bg-white shadow-sm"
      style={{
        padding: '0 24px',
        background: colorBgContainer,
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      {/* ناحیه سمت راست: breadcrumb */}
      <Breadcrumb items={breadcrumbItems} className="text-sm" />

      {/* ناحیه سمت چپ: جستجو، اعلان و کاربر */}
      <div className="flex items-center gap-4">
        <Input.Search
          placeholder="جستجوی سریع..."
          size="small"
          className="w-48 hidden md:block"
          style={{ borderRadius: 8 }}
        />
        <Badge count={5} size="small">
          <BellOutlined className="text-lg cursor-pointer text-gray-600" />
        </Badge>
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
          <div className="flex items-center gap-2 cursor-pointer">
            <Avatar icon={<UserOutlined />} />
            <span className="hidden md:inline text-sm font-medium">مدیر سیستم</span>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;