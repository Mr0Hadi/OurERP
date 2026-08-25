// src/features/employees/components/table/EmployeePositionBadge.jsx
import { Crown, Star } from "lucide-react";

import {
  OrgPositionEnum,
  ORG_POSITION_LABELS,
} from "@/shared/domain/enums/orgPosition";

const SCOPE_LABELS = { department: "واحد", team: "تیم" };

const POSITION_CONFIG = {
  [OrgPositionEnum.HEAD]: {
    icon: Crown,
    className:
      "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
  },
  [OrgPositionEnum.DEPUTY]: {
    icon: Star,
    className:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300",
  },
};

/**
 * فقط برای مدیر و معاون بج نشان می‌دهد. «عضو» حالت پیش‌فرض است و بج
 * دادن به آن، ستون را پر از نویز می‌کند بدون اینکه چیزی بگوید.
 */
export default function EmployeePositionBadge({ position, scope }) {
  const config = POSITION_CONFIG[position];
  if (!config) return <span className="text-sm text-muted-foreground">—</span>;

  const Icon = config.icon;
  const scopeLabel = SCOPE_LABELS[scope];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {ORG_POSITION_LABELS[position]}
      {scopeLabel ? ` ${scopeLabel}` : ""}
    </span>
  );
}
