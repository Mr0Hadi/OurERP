import { Badge } from "@/shared/components/ui/badge";
/**
 * مانده‌ی دفتر حساب (`ledgerBalance`): مثبت = طرف به ما بدهکار است،
 * منفی = ما به او بدهکاریم (بستانکار)، صفر = تسویه.
 */
export default function LedgerBalanceBadge({ balance, className = "" }) {
  const value = Number(balance) || 0;
  const amount = Math.abs(value).toLocaleString("fa-IR");

  if (value > 0) {
    return (
      <Badge
        className={`bg-warning/12 text-warning border-warning/25 ${className}`}
      >
        بدهکار {amount} ریال
      </Badge>
    );
  }
  if (value < 0) {
    return (
      <Badge
        className={`bg-info/12 text-info border-info/25 ${className}`}
      >
        بستانکار {amount} ریال
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`text-muted-foreground ${className}`}>
      تسویه
    </Badge>
  );
}
