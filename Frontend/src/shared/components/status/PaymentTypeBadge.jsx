import StatusBadge from "./StatusBadge";
import { usePaymentTypeLabels } from "@/shared/services/enums/queries";
import { PAYMENT_TYPE_TONES } from "@/shared/domain/enums/paymentType";

/** برچسب نوع پرداختِ یک سند. */
export default function PaymentTypeBadge({ type }) {
  const labels = usePaymentTypeLabels();
  return (
    <StatusBadge tone={PAYMENT_TYPE_TONES[type]}>
      {labels[type] ?? type}
    </StatusBadge>
  );
}
