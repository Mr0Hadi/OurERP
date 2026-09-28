import { Package, ShoppingCart, Undo2, Trash2, ShieldAlert } from "lucide-react";

import StatusBadge from "@/shared/components/status/StatusBadge";
import {
  ProductUnitStatusEnum as UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  UNIT_STATUS_TONES,
} from "@/shared/domain/enums/unitStatus";

/**
 * وضعیت چرخه‌ی عمر دانه. عمداً از createRowStatus استفاده نمی‌کند —
 * آن ابزار برای مقایسه‌ی «انتظار در برابر واقعیت» است، ولی اینجا یک
 * enum پنج‌حالته داریم نه مقایسه‌ی عددی.
 */
const STATUS_ICONS = {
  [UNIT_STATUSES.IN_STOCK]: Package,
  [UNIT_STATUSES.SOLD]: ShoppingCart,
  [UNIT_STATUSES.RETURNED_TO_SUPPLIER]: Undo2,
  [UNIT_STATUSES.SCRAPPED]: Trash2,
  [UNIT_STATUSES.QUARANTINED]: ShieldAlert,
};

export default function UnitStatusBadge({ status }) {
  return (
    <StatusBadge tone={UNIT_STATUS_TONES[status]} icon={STATUS_ICONS[status] ?? Package}>
      {UNIT_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  );
}
