// src/features/warehouse/units/components/UnitStatusBadge.jsx
import { Package, ShoppingCart, Truck, Undo2, Trash2 } from "lucide-react";

import { UNIT_STATUSES, UNIT_STATUS_LABELS } from "../services/mockData";

/**
 * وضعیت چرخه‌ی عمر واحد. عمداً از createRowStatus استفاده نمی‌کند —
 * آن ابزار برای مقایسه‌ی «انتظار در برابر واقعیت» است، ولی اینجا یک
 * enum پنج‌حالته داریم نه مقایسه‌ی عددی.
 */
const STATUS_CONFIG = {
  [UNIT_STATUSES.IN_STOCK]: {
    icon: Package,
    className:
      "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
  },
  [UNIT_STATUSES.SOLD]: {
    icon: ShoppingCart,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  [UNIT_STATUSES.SHIPPED]: {
    icon: Truck,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
  [UNIT_STATUSES.RETURNED]: {
    icon: Undo2,
    className: "bg-muted text-muted-foreground border-border",
  },
  [UNIT_STATUSES.SCRAPPED]: {
    icon: Trash2,
    className: "bg-destructive/5 text-destructive border-destructive/20",
  },
};

export default function UnitStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[UNIT_STATUSES.IN_STOCK];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {UNIT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
