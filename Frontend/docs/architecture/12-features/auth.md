# auth — ورود و نشست

**مسیرها:** `ROUTES.LOGIN` = `/auth/login` زیرِ `AuthLayout` (`src/features/auth/routes.jsx`، با `Suspense` خودش). بدونِ مجوز.

| بخش | فایل‌ها |
| --- | --- |
| صفحه | `src/features/auth/pages/LoginPage.jsx` (react-hook-form + `useSessionCheck`) |
| store | `src/features/auth/store/authStore.js` — `useAuthStore` (persist `auth-storage`) |
| سرویس | `src/features/auth/services/api-v1.js` — `login` (`POST /Account/Login`)، `logout` (`POST /Account/Logout`)، `getUserInfo` (`GET /User/GetUserInfo`)، `getMyPermissions` (`GET /Permission/GetMyPermissions`) |
| query/mutation | `src/features/auth/services/queries.js` — `useLoginMutation`، `useSessionCheck`، `useLogoutMutation`، `useUserInfoQuery`، `useMyPermissionsQuery`؛ کلید `authKeys` (ریشه `["auth"]`) |
| hook | `src/features/auth/hooks/usePermission.js` (`satisfies`، `usePermission`)، `src/features/auth/hooks/useCurrentUser.js` |

پرمصرف‌ترین فیچر در importهای دیگران (هر فیچر → `auth` برای مجوز).

جریان‌ها و نکته‌ها: [04-auth-and-session.md](../04-auth-and-session.md)، [05-permissions.md](../05-permissions.md).
