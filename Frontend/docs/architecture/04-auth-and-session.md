# ۰۴ — احراز هویت و نشست

## هدف

بدانید توکن کجا نگه داشته می‌شود، نشست چطور سنجیده می‌شود، ۴۰۱ چطور به refresh و تکرارِ درخواست ختم می‌شود، و خروج دقیقاً چه چیزی را پاک می‌کند.

## فایل‌های کلیدی

| فایل | نقش |
| --- | --- |
| `src/features/auth/store/authStore.js` | `useAuthStore` — فقط توکن‌ها و پرچم‌ها، persist در `localStorage["auth-storage"]` |
| `src/features/auth/services/api-v1.js` | `login`، `logout`، `getUserInfo`، `getMyPermissions` |
| `src/features/auth/services/queries.js` | `useLoginMutation`، `useSessionCheck`، `useLogoutMutation`، `useUserInfoQuery`، `useMyPermissionsQuery`، `useFeatureFlagsQuery` |
| `src/features/auth/services/queryKeys.js` | `authKeys.session()`، `authKeys.myPermissions()` |
| `src/features/auth/hooks/useCurrentUser.js` | `useCurrentUser()` — دادهِ `useUserInfoQuery` یا `null` |
| `src/features/auth/pages/LoginPage.jsx` | فرم (react-hook-form) + سنجشِ خودکارِ نشست |
| `src/shared/services/api/axios.js` | افزودنِ Bearer، صفِ refresh، logout در شکست |
| `src/shared/services/sessionCleanup.js` | `leaveSession()`، `purgeLegacyApiCache()` |
| `src/shared/components/layout/NavUser.jsx` | دکمه‌ی خروج |
| `src/app/routes/protectedLoader.jsx`، `src/app/layouts/AppLayout.jsx` | گاردهای مسیر (فایل [03](03-bootstrap-and-routing.md)) |

## چطور کار می‌کند

### state: سه پرچم با معناهای متفاوت

| فیلد در `useAuthStore` | persist؟ | یعنی |
| --- | --- | --- |
| `accessToken`، `refreshToken` | بله | توکن‌ها |
| `isAuthenticated` | بله | «توکنی در localStorage هست» — نه بیشتر |
| `sessionVerified` | **نه** | سرور در *همین بارگذاری* توکن را پذیرفته |
| `hasHydrated` | نه | rehydrateِ persist تمام شده (`onRehydrateStorage` → `setHasHydrated(true)`) |

اکشن‌ها: `loginSuccess({ accessToken, refreshToken })` (هر دو پرچم true)، `setTokens(access, refresh)` (بعد از refresh؛ اگر `refresh` نیامد قبلی می‌ماند)، `markSessionVerified()`، `logout()` (توکن‌ها null و هر دو پرچم false).

**هویتِ کاربر در store نیست.** `POST /Account/Login` فقط `TokenDto` می‌دهد؛ کاربر از `GET /User/GetUserInfo` با `useUserInfoQuery` (کلید `authKeys.session()`، `staleTime` ۱۰ دقیقه) می‌آید و مجوزها از `GET /Permission/GetMyPermissions` با `useMyPermissionsQuery` (۵ دقیقه). نام، واحد و تیم را از `useCurrentUser()` یا `useUserInfoQuery()` بخوانید، نه از store.

### جریانِ کامل: ورود → درخواست → ۴۰۱ → refresh → تکرار

```mermaid
sequenceDiagram
  participant U as کاربر
  participant LP as LoginPage
  participant Q as queries.js
  participant S as useAuthStore
  participant AX as axios.js interceptors
  participant BE as Backend /api

  U->>LP: submit(username, password)
  LP->>Q: cancelSessionCheck(); useLoginMutation.mutate
  Q->>AX: login() → POST /Account/Login (timeout 45s)
  AX->>BE: درخواست
  BE-->>AX: { Data: { accessToken, refreshToken }, Message, ... }
  AX-->>Q: پوشش باز شد → { accessToken, refreshToken }
  Q->>S: loginSuccess() → isAuthenticated, sessionVerified = true
  LP->>LP: useEffect: verified → navigate(from)

  Note over AX: هر درخواستِ بعدی
  AX->>S: getState().accessToken
  AX->>BE: Authorization: Bearer <access>
  BE-->>AX: 401
  alt بدون refreshToken
    AX->>S: logout() و reject
  else توکنِ فرستاده‌شده ≠ توکنِ فعلی (refresh جای دیگر انجام شده)
    AX->>BE: تکرار با توکنِ فعلی
  else isRefreshing (refreshِ دیگری در جریان است)
    AX->>AX: subscribeTokenRefresh → صبر در refreshSubscribers
  else اولین ۴۰۱
    AX->>BE: axios.post(baseURL + /Account/RefreshToken, { accessToken, refreshToken }) — نمونه‌ی خامِ axios، بدون interceptor
    BE-->>AX: توکن‌های تازه
    AX->>S: setTokens(new)
    AX->>AX: onRefreshed(new) → همه‌ی منتظرها تکرار می‌شوند
    AX->>BE: تکرارِ درخواستِ اصلی (_retry = true)
  end
```

شاخه‌های شکستِ refresh در `catch`ِ همان interceptor (`src/shared/services/api/axios.js`):

1. **۴۰۰ و توکنِ store در این فاصله عوض شده** (`refreshedElsewhere`) — refreshِ تبِ دیگر برنده شده؛ منتظرها reject و درخواستِ اصلی با توکنِ تازه تکرار می‌شود.
2. **سرور پاسخ داده (هر وضعیتی، از جمله ۴۰۰ با توکنِ عوض‌نشده)** — `logout()`، `onRefreshFailed`، و `window.location.href = ROUTES.LOGIN` (بارگذاریِ کامل).
3. **بی‌پاسخ (شبکه/timeout)** — فقط `onRefreshFailed`؛ کاربر بیرون انداخته نمی‌شود.

`isRefreshing` در `finally` دوباره false می‌شود.

### سنجشِ نشست در هر بارگذاری

چون `sessionVerified` persist نمی‌شود، `protectedLoader` هر بارگذاریِ کامل را به `/auth/login?from=...` می‌فرستد. آنجا `useSessionCheck()`:

```js
const { isSuccess, isError, error } = useQuery({
  queryKey: authKeys.session(),
  queryFn: ({ signal }) => getUserInfo({ signal }),
  enabled: isAuthenticated && !verified,
  retry: false,
  staleTime: 10 * 60 * 1000,
});
// موفق → markSessionVerified() ؛ خطا با response → logout() ؛ خطای شبکه → هیچ
```

موفقیت → `LoginPage` به `from` برمی‌گردد. نتیجه در همان کلیدِ `authKeys.session()` می‌ماند، پس `useUserInfoQuery` در سایدبار درخواستِ دوم نمی‌زند. اگر کاربر حین سنجش فرم را بفرستد، `cancel()` آن query را لغو می‌کند.

### همگام‌سازیِ چند تب

`authStore.js` به رویدادِ `storage` گوش می‌دهد: اگر `event.key === "auth-storage"` در تبِ دیگری عوض شد، `useAuthStore.persist.rehydrate()`. پس refresh یا خروج در یک تب به بقیه می‌رسد؛ خروج در تبِ دیگر `isAuthenticated` را false می‌کند و `AppLayout` با `<Navigate>` به ورود می‌برد.

### خروج

`NavUser.jsx` → `logoutMutation.mutate(undefined, { onSettled: leaveSession })`:

1. `useLogoutMutation` → `POST /Account/Logout` (بدون بدنه؛ سرور از هدر کاربر را می‌شناسد).
2. `onSettled` (موفق یا ناموفق): `logout()` در store و `queryClient.clear()`.
3. `leaveSession()` (`src/shared/services/sessionCleanup.js`): `purgeLegacyApiCache()` و `window.location.replace(ROUTES.LOGIN)` — بارگذاریِ کامل تا همه‌ی stateِ درونِ حافظه (پیش‌نویس‌ها، فرم‌ها، فیلترها) پاک شود.

## قراردادها و نکته‌ها

- **فرانت نمی‌تواند انقضای توکن را بخواند.** طبقِ کامنتِ `axios.js`، access token یک JWEِ پنج‌بخشی است (امضا و رمزنگاری‌شده)؛ تنها مرجعِ انقضا ۴۰۱ِ سرور است. refreshِ پیش‌دستانه نسازید.
- درخواستِ refresh عمداً با `axios` خام (نه `axiosInstance`) زده می‌شود تا interceptorها روی خودش اجرا نشوند؛ تشخیصِ «این خودش refresh است» هم با `url.includes("/Account/RefreshToken")` است.
- پاسخِ refresh هم ممکن است پوشش داشته باشد؛ با `isEnvelope`/`unwrapEnvelope` باز می‌شود.
- `LOGIN_TIMEOUT_MS = 45_000` در `api-v1.js` — اولین درخواست بعد از خوابِ IIS کند است.
- بعد از هر تغییرِ جایگاهِ کارمند یا مجوزهای خودِ کاربر، `authKeys.session()` یا `authKeys.myPermissions()` باید invalidate شود — الان این کار را `useUpdateUserMutation` و `useChangeUserTeamMutation` (`src/features/employees/services/mutations.js`)، `useUpdateUserPermissionsMutation` (`src/features/permissions/services/mutations.js`)، و mutationهای `src/features/organization/teams/services/mutations.js` و `src/features/organization/departments/services/mutations.js` انجام می‌دهند. mutationِ تازه‌ای که روی کاربرِ جاری اثر دارد باید همین کار را بکند.
- **خروج همه‌ی localStorage را پاک نمی‌کند.** این‌ها می‌مانند: `dashboard-layout` (`src/features/dashboard/store/dashboardLayoutStore.js`، عمداً — ترجیحِ دستگاه)، `unit-label-template` (`src/features/warehouse/units/store/unitFilterStore.js`)، `print-settings` (`src/shared/store/printSettingsStore.js`)، `TERMINAL_KEY` در `src/shared/components/payments/pos/PosReadyForm.jsx`، و `vite-ui-theme`.

## برای تغییرِ X، به Y بروید

| می‌خواهم… | کجا |
| --- | --- |
| اطلاعاتِ کاربرِ جاری را نشان دهم | `useCurrentUser()` از `src/features/auth/hooks/useCurrentUser.js` |
| endpoint یا timeoutِ ورود | `login` در `src/features/auth/services/api-v1.js` |
| رفتار در ۴۰۱/شکستِ refresh | interceptorِ پاسخ در `src/shared/services/api/axios.js` |
| چیزی هنگامِ خروج پاک شود | `useLogoutMutation` (`onSettled`) در `src/features/auth/services/queries.js` یا `leaveSession` در `src/shared/services/sessionCleanup.js` |
| ظاهرِ صفحه‌ی ورود | `src/features/auth/pages/LoginPage.jsx` |
| بعد از ورود به کجا برود | `from` در `LoginPage.jsx` (پیش‌فرض `ROUTES.DASHBOARD`) |

## سؤال‌های باز / بدهی

- در شاخه‌ی ۲ِ شکستِ refresh، `window.location.href` (نه `leaveSession`) استفاده می‌شود و `queryClient.clear()` صدا زده نمی‌شود؛ بارگذاریِ کامل حافظه را پاک می‌کند، پس اثرِ عملی ندارد، ولی دو مسیرِ خروج یکسان نیستند.
- `src/shared/services/api/axios.js` (لایه‌ی shared) مستقیم از `@/features/auth/store/authStore` import می‌کند — مرزِ لایه (فایل ۰۲ و ۱۴).
- کلیدهای `VITE_ACCESS_TOKEN_KEY`، `VITE_REFRESH_TOKEN_KEY`، `VITE_TOKEN_REFRESH_ENDPOINT` در `.env.example` استفاده نمی‌شوند (فایل ۰۱).
- `unit-label-template` بعد از خروج می‌ماند. UNCLEAR: عمدی است یا نه؛ کامنتی در `unitFilterStore.js` درباره‌ی خروج پیدا نشد.
- توکن‌ها در `localStorage` هستند (در دسترسِ هر اسکریپتِ هم‌دامنه)؛ این تصمیمِ موجود است، نه پیشنهاد.
