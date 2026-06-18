// src/shared/components/layout/Sidebar.jsx
import { Layout } from 'antd';
import Logo from './Logo';
import SidebarMenu from './SidebarMenu';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const Sidebar = ({ collapsed, onCollapse }) => {
  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="lg"
      collapsedWidth={80}
      width={240}
      className="bg-white shadow-md z-10"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        insetInlineEnd: 0,
      }}
    >
      <Logo collapsed={collapsed} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarMenu />
      </div>
      {/* دکمه جمع‌شدن در پایین سایدبار */}
      <div
        className="flex justify-center py-4 border-t border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => onCollapse(!collapsed)}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>
    </Sider>
  );
};

export default Sidebar;