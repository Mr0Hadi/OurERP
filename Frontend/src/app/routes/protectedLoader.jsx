import { redirect } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ROUTES } from "@/shared/constants/routes";

export function protectedLoader({ request }) {
  const { isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated) {
    const url = new URL(request.url);
    const params = new URLSearchParams({ from: url.pathname + url.search });
    return redirect(`${ROUTES.LOGIN}?${params.toString()}`);
  }

  return null;
}