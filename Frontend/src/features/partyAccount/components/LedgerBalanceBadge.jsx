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
        className={`bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 ${className}`}
      >
        بدهکار {amount} ریال
      </Badge>
    );
  }
  if (value < 0) {
    return (
      <Badge
        className={`bg-sky-100/80 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/50 ${className}`}
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
