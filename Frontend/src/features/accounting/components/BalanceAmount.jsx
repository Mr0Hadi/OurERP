import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/**
 * مانده‌ی حساب با برچسبِ «بد/بس» به‌جای علامت — زبانِ دفترداری؛ همان قاعده‌ی کارتِ گردشِ
 * حساب (`PartyStatementCard`): مثبت = طرف به ما بدهکار است، منفی = ما بدهکاریم.
 */
export default function BalanceAmount({ value, className }) {
  const number = Number(value) || 0;
  if (number === 0) return <span className={cn("text-muted-foreground", className)}>تسویه</span>;

  return (
    <span className={cn("whitespace-nowrap tabular-nums font-medium", number > 0 ? "text-warning" : "text-info", className)}>
      {formatNumber(Math.abs(number))}
      <span className="ms-1 text-[10px] font-normal opacity-80">{number > 0 ? "بد" : "بس"}</span>
    </span>
  );
}
