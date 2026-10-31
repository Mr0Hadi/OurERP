# permissions — مدیریتِ دسترسی

**مسیرها** (`src/features/permissions/routes.jsx`): `ACCESS` → ریدایرکت به `ACCESS_USERS`؛ `ACCESS_USERS`، `ACCESS_USERS_DETAIL` → `UserAccessPage`؛ `ACCESS_TEMPLATES`، `ACCESS_TEMPLATES_DETAIL` → `DepartmentTemplatesPage`. همه `PermissionView`.

| بخش | فایل‌ها |
| --- | --- |
| صفحه‌ها | `src/features/permissions/pages/UserAccessPage.jsx`، `src/features/permissions/pages/DepartmentTemplatesPage.jsx` |
| کامپوننت‌ها | `PermissionEditor.jsx`، `UserPermissionsPanel.jsx`، `DepartmentTemplatePanel.jsx`، `TemplateBar.jsx`، `SaveBar.jsx`، `GroupChips.jsx`، `EmployeeAccessSummaryCard.jsx`، `DepartmentTemplateSummaryCard.jsx`، `permissionSets.js` در `src/features/permissions/components/` |
| hook | `src/features/permissions/hooks/usePermissionDraft.js` |
| سرویس | `src/features/permissions/services/api-v1.js` — `getUserPermissions` (`GET /Permission/GetUserPermissions`)، `updateUserPermissions` (`PUT /Permission/UpdateUserPermissions`)، `getDepartmentPermissionTemplate` (`GET /Permission/GetDepartmentPermissionTemplate`)، `updateDepartmentPermissionTemplate` (`PUT /Permission/UpdateDepartmentPermissionTemplate`) |
| query/mutation | `useUserPermissionsQuery`، `useDepartmentPermissionTemplateQuery` (`queries.js`)؛ `useUpdateUserPermissionsMutation`، `useUpdateDepartmentPermissionTemplateMutation` (`mutations.js`)؛ کلید `permissionKeys` (ریشه `["permissions"]`) |

importهای بیرونی: `auth`، `employees`، `organization`.

جریان، کاتالوگِ چک‌باکس‌ها و invalidation: [05-permissions.md](../05-permissions.md).
