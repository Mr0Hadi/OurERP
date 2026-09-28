import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/routers";
import { AppProviders } from "./app/providers/AppProviders";
import { useAuthStore } from "@/features/auth/store/authStore";
import AppUpdateDialog from "@/shared/components/app-update/AppUpdateDialog";

function App() {
  // تا وقتی auth-storage از localStorage rehydrate نشده، protectedLoader
  // نمی‌تونه بفهمه کاربر واردشده یا نه — رندر کردنِ روت‌ها قبل از این یعنی
  // یک فریم از داشبورد قبل از ریدایرکت به لاگین دیده بشه.
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) return null;

  return (
    <AppProviders>
      <RouterProvider router={router} />
      <AppUpdateDialog />
    </AppProviders>
  );
}

export default App;
