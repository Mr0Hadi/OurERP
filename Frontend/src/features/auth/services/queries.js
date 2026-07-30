import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./api";
import { useAuthStore } from "../store/authStore";

export function useLoginMutation() {
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      loginSuccess({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    },
  });
}

export function useLogoutMutation() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useMeQuery(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}