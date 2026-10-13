import { Link } from "react-router-dom";

import ChartCard from "@/shared/components/charts/ChartCard";
import { ROUTES } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";
import AgingBar from "../AgingBar";
import { agingOverdue, agingTotal } from "../../domain/aging";
import { AccountingPartyTypeEnum } from "../../domain/accountingEnums";
import { withFilters } from "../../hooks/useUrlPreset";

function AgingRow({ title, aging, to }) {
  const total = agingTotal(aging);
  const overdue = agingOverdue(aging);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <Link to={to} className="text-sm font-medium hover:text-primary hover:underline">
          {title}
        </Link>
        <p className="text-xs text-muted-foreground">
          باز <span className="tabular-nums text-foreground">{formatNumber(total)}</span>
          {overdue > 0 && (
            <>
              {" · "}سررسیدگذشته <span className="tabular-nums text-destructive">{formatNumber(overdue)}</span>
            </>
          )}
        </p>
      </div>
      <AgingBar aging={aging} showLegend />
    </div>
  );
}

/**
 * سنی‌بندیِ طلب‌ها و بدهی‌ها — از اسنادِ باز و اقساطِ پرداخت‌نشده، «همین حالا». با مانده‌ی
 * دفتر می‌تواند فرق کند (چیزی که بیرون از هر سندِ بازی روی حساب است، مثلِ تسویه‌ی مرجوعی
 * «در حساب»)؛ توضیحِ کارت همین را می‌گوید.
 */
export default function AgingCard({ receivables, payables, isLoading }) {
  return (
    <ChartCard
      title="سنی‌بندی بدهی‌ها"
      description="مانده‌ی فاکتورهای باز و اقساطِ پرداخت‌نشده بر اساسِ روزهای گذشته از سررسید (تاریخِ پرداخت، وگرنه تاریخِ فاکتور). این مبالغ از اسناد است و می‌تواند با مانده‌ی دفترِ اشخاص به اندازه‌ی تسویه‌های «در حساب» و پیش‌پرداخت‌های بی‌سند فرق کند."
      isLoading={isLoading}
      height={180}
    >
      <div className="space-y-5">
        <AgingRow
          title="طلب از مشتریان"
          aging={receivables?.aging}
          to={withFilters(ROUTES.ACCOUNTING_PARTIES, { partyType: AccountingPartyTypeEnum.CUSTOMER })}
        />
        <AgingRow
          title="بدهی به تامین‌کنندگان"
          aging={payables?.aging}
          to={withFilters(ROUTES.ACCOUNTING_PARTIES, { partyType: AccountingPartyTypeEnum.SUPPLIER })}
        />
      </div>
    </ChartCard>
  );
}
