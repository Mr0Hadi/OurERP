import StatusBadge from "@/shared/components/status/StatusBadge";
import { RETURN_STATUS_TONES } from "@/shared/domain/returns/statuses";

/**
 * وضعیتِ یک مرجوعی. متن از پیکربندیِ همان سمت می‌آید، چون خرید و فروش
 * برای یک وضعیت متنِ متفاوت دارند («رد شده» در برابر «رد شده توسط تامین‌کننده»).
 *
 * @param {object} props
 * @param {number} props.status `RETURN_STATUSES`
 * @param {object} props.side خروجیِ `sideConfig(RETURN_SIDES.X)`
 */
export default function ReturnStatusBadge({ status, side, ...props }) {
  return (
    <StatusBadge tone={RETURN_STATUS_TONES[status]} {...props}>
      {side.statusLabels[status] ?? status}
    </StatusBadge>
  );
}
