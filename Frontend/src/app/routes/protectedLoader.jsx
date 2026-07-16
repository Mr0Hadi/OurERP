import { redirect } from "react-router";
import { useAuthStore } from "../../features/auth/store/authStore";

// نکته: اینجا نمی‌تونیم hook استفاده کنیم، پس getState می‌گیریم.
export function protectedLoader({ request }) {
  const { isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated) {
    const url = new URL(request.url);
    const from = url.pathname + url.search;
    throw redirect("/auth/login", {
      state: { from: { pathname: from } },
    });
  }

  return null;
}
