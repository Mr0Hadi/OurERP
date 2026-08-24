import { Badge } from "@/shared/components/ui/badge";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";

const PAYMENT_STYLES = {
  [PaymentTypeEnum.CASH]:
    "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100",
  [PaymentTypeEnum.CREDIT]:
    "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-100",
  [PaymentTypeEnum.CHECK]: "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-100",
  [PaymentTypeEnum.TRANSFER]:
    "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-100",
  [PaymentTypeEnum.MIXED]:
    "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100",
};

/** برچسب نوع پرداخت. labels از mockData ماژول مربوطه پاس داده می‌شود. */
export default function PaymentTypeBadge({ type, labels }) {
  return (
    <Badge className={PAYMENT_STYLES[type] ?? "bg-gray-100 text-gray-800"}>
      {labels?.[type] ?? type}
    </Badge>
  );
}
