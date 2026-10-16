# employees، organization — کارمند، واحد، تیم

## مسیرها

| `ROUTES` | آدرس | مجوز | صفحه |
| --- | --- | --- | --- |
| `EMPLOYEES` | `/employees` | `UserView` | `src/features/employees/pages/EmployeesPage.jsx` |
| `EMPLOYEES_NEW` | `/employees/new` | `UserCreate` | `src/features/employees/pages/EmployeeNewPage.jsx` |
| `EMPLOYEES_DETAIL` | `/employees/:id` | **`UserUpdate`** | `src/features/employees/pages/EmployeeDetailPage.jsx` |
| `ORG_DEPARTMENTS` | `/organization/departments` | `DepartmentView` | `src/features/organization/departments/pages/DepartmentsPage.jsx` |
| `ORG_DEPARTMENTS_NEW` | `/organization/departments/new` | `DepartmentManage` | `src/features/organization/departments/pages/DepartmentNewPage.jsx` |
| `ORG_DEPARTMENTS_DETAIL` | `/organization/departments/:id` | `DepartmentView` | `src/features/organization/departments/pages/DepartmentDetailPage.jsx` |
| `ORG_TEAMS` | `/organization/teams` | `TeamView` | `src/features/organization/teams/pages/TeamsPage.jsx` |
| `ORG_TEAMS_NEW` | `/organization/teams/new` | `TeamManage` | `src/features/organization/teams/pages/TeamNewPage.jsx` |
| `ORG_TEAMS_DETAIL` | `/organization/teams/:id` | `TeamView` | `src/features/organization/teams/pages/TeamDetailPage.jsx` |

## سرویس‌ها

- employees (`src/features/employees/services/api-v1.js`): `getUserList` GET `/User/GetUserList`، `getUserUpdate` GET `/User/GetUserUpdate`، `createUser` POST، `updateUser` PUT، `changeUserTeam` PUT `/User/ChangeUserTeam`، `resetUserPassword` PUT، `logoutUserById` POST `/Account/LogoutUserById`. هوک‌ها: `useUserListQuery`، `useAllUsersQuery`، `useUserUpdateQuery`، `useDepartmentUserCountQuery`، `useTeamMembersQuery`، `useTeamCandidatesQuery`؛ `useCreateUserMutation`، `useUpdateUserMutation`، `useChangeUserTeamMutation`، `useLogoutUserByIdMutation`، `useResetUserPasswordMutation`. کلید `userKeys` (`["users"]`).
- departments: `/Department/*` (`getDepartmentList`، `getDepartmentDetail`، `createDepartment`، `updateDepartment`، `deleteDepartment`)؛ `departmentKeys` (`["departments"]`).
- teams: `/Team/*`؛ `useTeamOptionsQuery(departmentId)`؛ `teamKeys` (`["teams"]`).
- مشترکِ دو زیرماژولِ سازمان: `src/features/organization/components/OrgLeadershipForm.jsx`، `OrgDetailLoading.jsx`، `src/features/organization/hooks/useEmployeeOptions.js`، `useSyncLeadershipValues.js`.

فرم‌ها react-hook-form با هوکِ `use<X>Form`: `src/features/employees/hooks/useEmployeeForm.js`، `src/features/organization/departments/hooks/useDepartmentForm.js`، `src/features/organization/teams/hooks/useTeamForm.js`.

## جریان‌ها

**تغییرِ واحد/تیمِ کارمند**
- از فرمِ کارمند: `EmployeeOrgForm` با عوض‌شدنِ واحد `teamId` را پاک می‌کند → `useUpdateUserMutation` → invalidate `userKeys.lists()`، `userKeys.detail(id)`، `teamKeys.all`، `departmentKeys.all`، **`authKeys.session()`** (چون سایدبار واحد/تیمِ کاربرِ جاری را از `useUserInfoQuery` نشان می‌دهد).
- از صفحه‌ی تیم: `TeamMembersCard` → `useChangeUserTeamMutation` (افزودن/حذف، سرپرست/جانشین؛ `isHead` → `isDeputy` خاموش) → `userKeys.all`، `teamKeys.all`، `departmentKeys.all`، `authKeys.session()`.
- mutationهای واحد/تیم تابعِ داخلیِ `invalidateOrgChart` را صدا می‌زنند (ریشه‌های واحد، تیم، کاربر + `session`).

**رفت‌وبرگشت با پیش‌نویس (`useFormDraft`)** — [08](../08-client-state-zustand.md):
- `EmployeeNewPage` (`DRAFT_KEY = "employee:new"`): `leaveForCreate` پیش‌نویس را ذخیره و به `ORG_DEPARTMENTS_NEW` یا `ORG_TEAMS_NEW` با `state: { returnTo: ROUTES.EMPLOYEES_NEW }` می‌رود؛ در برگشت `mergeDraft(draft, location.state)` شناسه‌ی واحدِ تازه را می‌نشاند.
- `DepartmentDetailPage` (`department:${id}`): به `ORG_TEAMS_NEW` با `{ departmentId }` یا به جزئیاتِ تیم؛ `TeamNewPage` بعد از ساخت `goBack({ departmentId })`.
- `EmployeeDetailPage` و `TeamDetailPage` همین الگو را دارند.

## importهای بیرونی

`employees` → `organization` (گزینه‌های واحد/تیم، کلیدها)، `auth` (`useCurrentUser`، `usePermission`، `authKeys`)، `permissions` (`EmployeeAccessSummaryCard`). `organization` → `employees` (`useDepartmentUserCountQuery`، `useTeamMembersQuery`، `useChangeUserTeamMutation`، `useAllUsersQuery`، `userKeys`)، `permissions` (`DepartmentTemplateSummaryCard`). وابستگیِ دوطرفه‌ی `employees` ↔ `organization`.

## نکته‌ها و بدهی

- `EMPLOYEES_DETAIL` مجوزِ `UserUpdate` می‌خواهد نه `UserView` (برخلافِ بقیه‌ی صفحه‌های جزئیات).
- `invalidateOrgChart` دو بار تعریف شده (`src/features/organization/departments/services/mutations.js` و `src/features/organization/teams/services/mutations.js`).
- حذفِ واحد `userKeys` و `authKeys.session()` را باطل نمی‌کند؛ حذفِ تیم `authKeys.session()` را. ساخت/ویرایش می‌کنند.
- `EmployeeNewPage` بعد از ساخت همیشه به `ROUTES.EMPLOYEES` می‌رود و `returnTo` را نادیده می‌گیرد.
- importِ کلیدها بین `departments` و `teams` نسبی است (`../../teams/...`).
