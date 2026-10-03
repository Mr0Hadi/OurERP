import StatusBadge from "./StatusBadge";
import { PAYMENT_TYPE_LABELS, PAYMENT_TYPE_TONES } from "@/shared/domain/enums/paymentType";

/** برچسب نوع پرداختِ یک سند. */
export default function PaymentTypeBadge({ type }) {
  return (
    <StatusBadge tone={PAYMENT_TYPE_TONES[type]}>
      {PAYMENT_TYPE_LABELS[type] ?? type}
    </StatusBadge>
  );
}
