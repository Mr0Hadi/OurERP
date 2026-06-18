import { useAuthStore } from '../store/authStore';

export function usePermissions() {
  const { user, currentTeam } = useAuthStore();
  
  const getUserPermissions = () => {
    if (!currentTeam) return [];
    if (currentTeam.permissions.includes('all')) {
      return ['all']; // دسترسی کامل
    }
    return currentTeam.permissions || [];
  };
  
  const hasPermission = (permission) => {
    const permissions = getUserPermissions();
    if (permissions.includes('all')) return true;
    return permissions.includes(permission);
  };
  
  const hasAnyPermission = (permissionList) => {
    return permissionList.some(p => hasPermission(p));
  };
  
  const hasAllPermissions = (permissionList) => {
    return permissionList.every(p => hasPermission(p));
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions
  };
}