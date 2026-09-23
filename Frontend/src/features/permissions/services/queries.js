import { useQuery } from "@tanstack/react-query";

import {
  getDepartmentPermissionTemplate,
  getUserPermissions,
} from "./api-v1";
import { permissionKeys } from "./queryKeys";

export function useUserPermissionsQuery(userId, { enabled = true } = {}) {
  return useQuery({
    queryKey: permissionKeys.user(userId),
    queryFn: () => getUserPermissions(userId),
    enabled: enabled && userId != null,
  });
}

/**
 * الگوی واحد. `departmentId` در صفحه‌ی کارمند همان مقدارِ *فعلیِ فرم* است
 * (نه واحدِ ذخیره‌شده)، پس با عوض‌کردنِ واحد در فرم، الگوی واحدِ مقصد
 * خوانده می‌شود.
 */
export function useDepartmentPermissionTemplateQuery(
  departmentId,
  { enabled = true } = {},
) {
  return useQuery({
    queryKey: permissionKeys.template(departmentId),
    queryFn: () => getDepartmentPermissionTemplate(departmentId),
    enabled: enabled && departmentId != null && departmentId !== "",
  });
}
