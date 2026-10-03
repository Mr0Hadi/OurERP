import StatusBadge from "./StatusBadge";
import { usePurchaseStatusLabels } from "@/shared/services/enums/queries";
import { PURCHASE_STATUS_ICONS } from "./statusIcons";
import { PURCHASE_STATUS_TONES } from "@/shared/domain/enums/purchaseStatus";

/** وضعیتِ سندِ خرید. `withIcon` برای کارت‌ها؛ در جدول‌ها بدون آیکن فشرده‌تر است. */
export default function PurchaseStatusBadge({ status, withIcon = false, ...props }) {
  const labels = usePurchaseStatusLabels();
  return (
    <StatusBadge
      tone={PURCHASE_STATUS_TONES[status]}
      icon={withIcon ? PURCHASE_STATUS_ICONS[status] : undefined}
      {...props}
    >
      {labels[status] ?? status}
    </StatusBadge>
  );
}
