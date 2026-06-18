// src/shared/components/layout/Logo.jsx
import { Typography } from 'antd';

const { Text } = Typography;

const Logo = ({ collapsed }) => (
  <div className="flex items-center justify-center h-16 border-b border-gray-200">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white text-lg font-bold">E</span>
      </div>
      {!collapsed && (
        <Text strong className="text-base whitespace-nowrap text-gray-800">
          حساب‌رَس
        </Text>
      )}
    </div>
  </div>
);

export default Logo;