import StatusBadge from "@/shared/components/status/StatusBadge";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * مانده‌ی دفتر حساب (`ledgerBalance`): مثبت = طرف به ما بدهکار است،
 * منفی = ما به او بدهکاریم (بستانکار)، صفر = تسویه.
 */
export default function LedgerBalanceBadge({ balance, className }) {
  const value = Number(balance) || 0;

  if (value > 0) {
    return <StatusBadge tone="warning" className={className}>بدهکار {formatRial(value)}</StatusBadge>;
  }
  if (value < 0) {
    return <StatusBadge tone="info" className={className}>بستانکار {formatRial(-value)}</StatusBadge>;
  }
  return <StatusBadge tone="neutral" className={className}>تسویه</StatusBadge>;
}
