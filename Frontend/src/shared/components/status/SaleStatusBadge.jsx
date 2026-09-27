import StatusBadge from "./StatusBadge";
import { SALE_STATUS_ICONS } from "./statusIcons";
import { SALE_STATUS_LABELS, SALE_STATUS_TONES } from "@/shared/domain/enums/saleStatus";

/** وضعیتِ سندِ فروش. `withIcon` برای کارت‌ها؛ در جدول‌ها بدون آیکن فشرده‌تر است. */
export default function SaleStatusBadge({ status, withIcon = false, ...props }) {
  return (
    <StatusBadge
      tone={SALE_STATUS_TONES[status]}
      icon={withIcon ? SALE_STATUS_ICONS[status] : undefined}
      {...props}
    >
      {SALE_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  );
}
