import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/routers";
import { AppProviders } from "./app/providers/AppProviders";
import { useAuthStore } from "@/features/auth/store/authStore";

function App() {
  // تا وقتی auth-storage از localStorage rehydrate نشده، protectedLoader
  // نمی‌تونه بفهمه کاربر واردشده یا نه — رندر کردنِ روت‌ها قبل از این یعنی
  // یک فریم از داشبورد قبل از ریدایرکت به لاگین دیده بشه.
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // صفحه‌ی بارگذاریِ `index.html` تا اولین رندرِ واقعی می‌ماند و بعد محو می‌شود.
  useEffect(() => {
    const splash = document.getElementById("app-splash");
    if (!splash) return undefined;
    splash.classList.add("hide");
    const timer = setTimeout(() => splash.remove(), 250);
    return () => clearTimeout(timer);
  }, [hasHydrated]);

  if (!hasHydrated) return null;

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

export default App;
