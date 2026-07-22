import { useAuthStore } from "../store/authStore";

export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const fullName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

  return {
    id: user.id,
    name: fullName,
    username: user.username,
    email: user.email || `${user.username}@pasargad-motorpart.com`,
    avatar: user.avatar || "",
    permissions: user.permissions || [],
    isSuperAdmin: user.isSuperAdmin || user.permissions?.includes("all"),
    departmentRole: user.departmentRole,
    teamRole: user.teamRole,
  };
}