import { Link } from "react-router-dom";
import { CalendarClock, ChevronLeft, FileWarning, RotateCcw, Wallet } from "lucide-react";

import ChartCard from "@/shared/components/charts/ChartCard";
import { ROUTES } from "@/shared/constants/routes";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { AccountingPartyTypeEnum, InvoicePaymentStateEnum, PartyBalanceStateEnum } from "../../domain/accountingEnums";
import { withFilters } from "@/shared/hooks/useUrlPreset";

const OVERDUE = { paymentState: InvoicePaymentStateEnum.OVERDUE };

/**
 * یک ردیفِ «نیازمندِ پیگیری»: عنوان، تعداد و مبلغ، و لینک به همان فهرست با فیلترِ آماده.
 * ردیفِ صفر کم‌رنگ می‌شود ولی می‌ماند؛ «صفر» هم خبر است و چیدمانِ ثابت چشم را گم نمی‌کند.
 */
function AttentionRow({ icon: Icon, title, detail, amount, tone = "danger", to }) {
  const active = Number(amount) > 0;
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
      >
        <Icon className={cn("size-4 shrink-0", active ? toneText(tone) : "text-muted-foreground")} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", !active && "text-muted-foreground")}>{title}</span>
          {detail && <span className="block truncate text-[11px] text-muted-foreground">{detail}</span>}
        </span>
        <span className={cn("shrink-0 text-sm font-medium tabular-nums", active ? toneText(tone) : "text-muted-foreground")}>
          {formatNumber(amount)}
        </span>
        <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
      </Link>
    </li>
  );
}

/**
 * چیزهایی که حسابدار باید امروز دنبالشان برود — همه «لحظه‌ای» و مستقل از بازه. هر ردیف
 * فهرستِ پشتِ عددش را با فیلترِ آماده باز می‌کند.
 *
 * فروشِ اقساطی در «فاکتورهای فروشِ سررسیدگذشته» نیست؛ از راهِ اقساطش حساب می‌شود (سرور).
 * پولِ مرجوعی = اثرهای پولیِ تصمیم‌گرفته‌شده ولی پرداخت‌نشده‌ی مرجوعی‌های باز.
 */
export default function AttentionCard({ data, isLoading }) {
  const pending = data?.pendingReturnMoney;

  return (
    <ChartCard
      title="نیازمندِ پیگیری"
      description="ارقامِ همین حالا، مستقل از بازه‌ی انتخاب‌شده. هر ردیف فهرستِ پشتِ عددش را باز می‌کند."
      isLoading={isLoading}
      height={200}
    >
      <ul className="-mx-2 divide-y divide-border">
        <AttentionRow
          icon={FileWarning}
          title="فاکتورهای فروشِ سررسیدگذشته"
          detail={`${formatNumber(data?.overdueSales?.count)} فاکتور`}
          amount={data?.overdueSales?.amount}
          to={withFilters(ROUTES.ACCOUNTING_SALES, OVERDUE)}
        />
        <AttentionRow
          icon={CalendarClock}
          title="اقساطِ سررسیدگذشته"
          detail={`${formatNumber(data?.installments?.overdueCount)} قسط`}
          amount={data?.installments?.overdueAmount}
          to={withFilters(ROUTES.TREASURY_INSTALLMENTS, { view: "overdue" })}
        />
        <AttentionRow
          icon={CalendarClock}
          title="اقساطِ ۳۰ روزِ آینده"
          detail={`${formatNumber(data?.installments?.dueNext30DaysCount)} قسط`}
          amount={data?.installments?.dueNext30DaysAmount}
          tone="warning"
          to={withFilters(ROUTES.TREASURY_INSTALLMENTS, { view: "upcoming" })}
        />
        <AttentionRow
          icon={FileWarning}
          title="فاکتورهای خریدِ سررسیدگذشته"
          detail={`${formatNumber(data?.overduePurchases?.count)} فاکتور`}
          amount={data?.overduePurchases?.amount}
          tone="warning"
          to={withFilters(ROUTES.ACCOUNTING_PURCHASES, OVERDUE)}
        />
        <AttentionRow
          icon={Wallet}
          title="بستانکاریِ مشتریان"
          detail={`${formatNumber(data?.receivables?.oppositePartyCount)} مشتری — اضافه‌پرداخت یا اعتبارِ مرجوعی`}
          amount={data?.receivables?.oppositeTotal}
          tone="info"
          to={withFilters(ROUTES.ACCOUNTING_PARTIES, {
            partyType: AccountingPartyTypeEnum.CUSTOMER,
            balanceState: PartyBalanceStateEnum.CREDITOR,
          })}
        />
        <AttentionRow
          icon={Wallet}
          title="طلب از تامین‌کنندگان"
          detail={`${formatNumber(data?.payables?.oppositePartyCount)} تامین‌کننده — اضافه‌پرداختِ ما یا بازپرداختِ مرجوعی`}
          amount={data?.payables?.oppositeTotal}
          tone="info"
          to={withFilters(ROUTES.ACCOUNTING_PARTIES, {
            partyType: AccountingPartyTypeEnum.SUPPLIER,
            balanceState: PartyBalanceStateEnum.DEBTOR,
          })}
        />
        <AttentionRow
          icon={RotateCcw}
          title="مرجوعیِ فروش: بازپرداخت به مشتری"
          detail={`دریافتنی از مشتری ${formatNumber(pending?.saleReturnMoneyIn)}`}
          amount={pending?.saleReturnMoneyOut}
          tone="special"
          to={ROUTES.SALES_RETURNS_LIST}
        />
        <AttentionRow
          icon={RotateCcw}
          title="مرجوعیِ خرید: بازپرداختِ تامین‌کننده"
          detail={`پرداختنی به تامین‌کننده ${formatNumber(pending?.purchaseReturnMoneyOut)}`}
          amount={pending?.purchaseReturnMoneyIn}
          tone="special"
          to={ROUTES.PURCHASES_RETURNS_LIST}
        />
      </ul>
    </ChartCard>
  );
}
