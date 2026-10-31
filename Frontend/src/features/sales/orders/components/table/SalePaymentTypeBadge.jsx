import PaymentTypeBadge from "@/shared/components/status/PaymentTypeBadge";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SALE_TERMS_LABEL } from "../../domain/proformaFlow";

/**
 * شیوه‌ی پرداختِ یک فروش در فهرست‌ها. فرانت روی فروشِ غیراقساطی همیشه «نسیه» می‌نویسد
 * (`proformaPaymentType`) و روشِ واقعی روی ردیف‌های دریافت است؛ پس «نسیه» این‌جا یعنی «نقد / نسیه»، نه
 * فروشِ بی‌پول. فروش‌های قدیمی با نوعِ دیگر همان نوعِ خودشان را نشان می‌دهند.
 */
export default function SalePaymentTypeBadge({ type }) {
  if (Number(type) === PaymentTypeEnum.CREDIT) return <StatusBadge tone="neutral">{SALE_TERMS_LABEL}</StatusBadge>;
  return <PaymentTypeBadge type={type} />;
}
