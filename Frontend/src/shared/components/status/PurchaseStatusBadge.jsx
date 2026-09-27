import StatusBadge from "./StatusBadge";
import { PURCHASE_STATUS_ICONS } from "./statusIcons";
import {
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_TONES,
} from "@/shared/domain/enums/purchaseStatus";

/** وضعیتِ سندِ خرید. `withIcon` برای کارت‌ها؛ در جدول‌ها بدون آیکن فشرده‌تر است. */
export default function PurchaseStatusBadge({ status, withIcon = false, ...props }) {
  return (
    <StatusBadge
      tone={PURCHASE_STATUS_TONES[status]}
      icon={withIcon ? PURCHASE_STATUS_ICONS[status] : undefined}
      {...props}
    >
      {PURCHASE_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  );
}
