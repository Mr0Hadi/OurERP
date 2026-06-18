// src/shared/components/layout/AppLayout.jsx
import { useState, useEffect } from 'react';
import { Layout, ConfigProvider, theme as antTheme } from 'antd';
import { useThemeStore } from '../../store/themeStore';
import Sidebar from './Sidebar';
import Header from './Header';
import faIR from 'antd/locale/fa_IR';

const { Content } = Layout;

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <ConfigProvider
      locale={faIR}
      direction="rtl"
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#f5222d',
          colorInfo: '#1677ff',
          borderRadius: 6,
          fontFamily: 'Vazirmatn, sans-serif',
        },
        components: {
          Layout: {
            headerBg: isDark ? '#1f1f1f' : '#ffffff',
            siderBg: isDark ? '#1f1f1f' : '#ffffff',
            bodyBg: isDark ? '#141414' : '#fafafa',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(22, 119, 255, 0.2)',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
          },
        },
      }}
    >
      <Layout className="min-h-screen" dir="rtl">
        <Sidebar collapsed={collapsed} />
        <Layout>
          <Header collapsed={collapsed} setCollapsed={setCollapsed} />
          <Content className="m-6 animate-in">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm min-h-[calc(100vh-120px)]">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
