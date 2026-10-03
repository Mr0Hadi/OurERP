import StatusBadge from "./StatusBadge";
import { useSaleStatusLabels } from "@/shared/services/enums/queries";
import { SALE_STATUS_ICONS } from "./statusIcons";
import { SALE_STATUS_TONES } from "@/shared/domain/enums/saleStatus";

/** وضعیتِ سندِ فروش. `withIcon` برای کارت‌ها؛ در جدول‌ها بدون آیکن فشرده‌تر است. */
export default function SaleStatusBadge({ status, withIcon = false, ...props }) {
  const labels = useSaleStatusLabels();
  return (
    <StatusBadge
      tone={SALE_STATUS_TONES[status]}
      icon={withIcon ? SALE_STATUS_ICONS[status] : undefined}
      {...props}
    >
      {labels[status] ?? status}
    </StatusBadge>
  );
}
