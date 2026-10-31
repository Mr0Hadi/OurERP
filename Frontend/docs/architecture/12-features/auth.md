# auth — ورود و نشست

**مسیرها:** `ROUTES.LOGIN` = `/auth/login` و `ROUTES.CHANGE_PASSWORD` = `/auth/change-password` زیرِ `AuthLayout` (`authRoutes` در `src/features/auth/routes.jsx`، با `Suspense` خودش)؛ `ROUTES.ACCOUNT` = `/account` زیرِ `AppLayout` (`accountRoutes`). هیچ‌کدام مجوز نمی‌خواهد.

| بخش | فایل‌ها |
| --- | --- |
| صفحه | `src/features/auth/pages/LoginPage.jsx` (react-hook-form + `useSessionCheck`)، `src/features/auth/pages/AccountPage.jsx` (حسابِ خودِ کاربر)، `src/features/auth/pages/ChangePasswordPage.jsx` (تغییرِ رمزِ اجباری) |
| کامپوننت | `src/features/auth/components/ChangePasswordForm.jsx` (با فهرستِ زنده‌ی شرط‌های رمز، `passwordChecks`)، `src/features/auth/components/ProfileForm.jsx`؛ نمایشِ نام/سرنام در `src/features/auth/domain/userDisplay.js` |
| store | `src/features/auth/store/authStore.js` — `useAuthStore` (persist `auth-storage`) |
| سرویس | `src/features/auth/services/api-v1.js` — `login` (`POST /Account/Login`)، `logout` (`POST /Account/Logout`)، `getUserInfo` (`GET /User/GetUserInfo`)، `getMyPermissions` (`GET /Permission/GetMyPermissions`) |
| mutation | `src/features/auth/services/mutations.js` — `useChangePasswordMutation` (`PUT /User/ChangePassword`)، `useUpdateUserInfoMutation` (`PUT /User/UpdateUserInfo`) |
| query/mutation | `src/features/auth/services/queries.js` — `useLoginMutation`، `useSessionCheck`، `useLogoutMutation`، `useUserInfoQuery`، `useMyPermissionsQuery`، `useFeatureFlagsQuery` (`GET /Setting/GetFeatureFlags`)؛ هوکِ `hooks/useFeatureFlags.js`؛ کلید `authKeys` (ریشه `["auth"]`) |
| hook | `src/features/auth/hooks/usePermission.js` (`satisfies`، `usePermission`)، `src/features/auth/hooks/useCurrentUser.js` |

پرمصرف‌ترین فیچر در importهای دیگران (هر فیچر → `auth` برای مجوز).

جریان‌ها و نکته‌ها: [04-auth-and-session.md](../04-auth-and-session.md)، [05-permissions.md](../05-permissions.md).
