// src/features/employees/components/table/EmployeeRoleBadge.jsx
import { Shield, User } from "lucide-react";
import { UserRoleEnum, USER_ROLE_LABELS } from "@/shared/domain/enums/userRole";

const ROLE_CONFIG = {
  [UserRoleEnum.ADMIN]: {
    icon: Shield,
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300",
  },
  [UserRoleEnum.USER]: {
    icon: User,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export default function EmployeeRoleBadge({ roleId, roleName }) {
  const config = ROLE_CONFIG[roleId] ?? ROLE_CONFIG[UserRoleEnum.USER];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {USER_ROLE_LABELS[roleId] ?? roleName ?? "نامشخص"}
    </span>
  );
}
