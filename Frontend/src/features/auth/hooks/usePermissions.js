import { useAuthStore } from "../store/authStore";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  // نقش‌های سازمانی مبتنی بر HeadID/DeputyID که در Department/Team تعریف شدن
  const isDepartmentHead = user?.departmentRole === "head";
  const isDepartmentDeputy = user?.departmentRole === "deputy";
  const isTeamHead = user?.teamRole === "head";
  const isTeamDeputy = user?.teamRole === "deputy";

  return {
    user,
    hasPermission,
    isDepartmentHead,
    isDepartmentDeputy,
    isTeamHead,
    isTeamDeputy,
  };
}