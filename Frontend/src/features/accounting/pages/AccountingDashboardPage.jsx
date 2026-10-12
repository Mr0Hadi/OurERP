import {
  ArrowDownLeft,
  ArrowLeftRight,
  Boxes,
  CalendarClock,
  HandCoins,
  LayoutDashboard,
  Percent,
  Receipt,
  ShoppingBag,
} from "lucide-react";

import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { ROUTES } from "@/shared/constants/routes";
import { TWELVE_MONTH_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import { gregorianToPersian, toDateOnly } from "@/shared/lib/dateUtils";
import { formatCompact } from "@/shared/components/charts/chartUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import AccountingNav from "../components/AccountingNav";
import StatTile from "../components/dashboard/StatTile";
import DashboardSection from "../components/dashboard/DashboardSection";
import PeriodTypeSelect from "../components/dashboard/PeriodTypeSelect";
import TradeSeriesCard from "../components/dashboard/TradeSeriesCard";
import CashSeriesCard from "../components/dashboard/CashSeriesCard";
import CashByTypeCard from "../components/dashboard/CashByTypeCard";
import AgingCard from "../components/dashboard/AgingCard";
import AttentionCard from "../components/dashboard/AttentionCard";
import { agingOverdue } from "../domain/aging";
import { AccountingPartyTypeEnum, PartyBalanceStateEnum } from "../domain/accountingEnums";
import { withFilters } from "../hooks/useUrlPreset";
import { useAccountingDashboardQuery } from "../services/queries";
import { useAccountingDashboardStore } from "../store/accountingFilterStores";

/**
 * داشبوردِ مالی (`GetAccountingDashboard`) — یک درخواست برای همه‌ی کاشی‌ها و نمودارها.
 *
 * دو جور عدد دارد و صفحه هم دو بخش: «همین حالا» (مانده‌ها، موجودی، اقساط — مستقل از بازه)
 * و «در بازه» (فروش، خرید، جریانِ نقد، مالیات). بدونِ این جداسازی کاربر انتظار داشت طلب از
 * مشتریان هم با عوضِ بازه عوض شود.
 *
 * فروش و خرید بر اساسِ فاکتورِ صادرشده‌اند؛ بهای تمام‌شده و سود اینجا نیست (فیچرِ جدا).
 * هر کاشی دفترِ پشتِ عددش را باز می‌کند و جمعِ آن دفتر با همان بازه برابرِ کاشی است.
 */
export default function AccountingDashboardPage() {
  const { periodType, fromDate, toDate, setPeriodType, setRange, resetFilters } = useAccountingDashboardStore();
  const query = useAccountingDashboardQuery({ periodType, fromDate, toDate });
  const { data, isLoading, isFetching, isError, error, refetch } = query;

  // بازه‌ی کاشی‌های دوره‌ای همان بازه‌ای است که سرور واقعاً حساب کرده (پیش‌فرضِ ۱۲ ماه هم).
  const range = { fromDate: toDateOnly(data?.fromDate) || fromDate, toDate: toDateOnly(data?.toDate) || toDate };
  const rangeLink = (path, extra = {}) => withFilters(path, { ...range, ...extra });

  const receivablesOverdue = agingOverdue(data?.receivables?.aging);
  const payablesOverdue = agingOverdue(data?.payables?.aging);

  return (
    <div className="w-full min-w-0 space-y-4">
      <AccountingNav />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <LayoutDashboard className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-lg font-semibold sm:text-xl">داشبورد مالی</h1>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              طلب‌ها، بدهی‌ها، فروش و خرید بر اساسِ فاکتورِ صادرشده، و جریانِ نقد.
            </p>
          </div>
        </div>
        {data?.generatedAt && (
          <p className="text-[11px] text-muted-foreground">
            به‌روز تا {gregorianToPersian(data.generatedAt)}، ساعت{" "}
            {new Date(data.generatedAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {isError && !data ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        // پوششِ `FetchingOverlay` نوارِ بازه را هم می‌پوشاند و وسطِ واکشی نمی‌شد بازه را عوض کرد؛
        // پس فقط خودِ ارقام کم‌رنگ می‌شوند.
        <div className={cn("space-y-5 transition-opacity", isFetching && !isLoading && "[&_[data-figures]]:opacity-60")} aria-busy={isFetching}>
          <DashboardSection title="همین حالا" caption="مستقل از بازه‌ی تاریخ">
            <div data-figures className="grid grid-cols-2 gap-2 transition-opacity sm:gap-3 xl:grid-cols-4">
              <StatTile
                icon={HandCoins}
                label="طلب از مشتریان"
                hint="جمعِ مانده‌ی بدهکارِ مشتریان در دفترِ حسابِ اشخاص. سررسیدگذشته از اسنادِ باز و اقساط حساب می‌شود."
                value={data?.receivables?.total}
                isLoading={isLoading}
                to={withFilters(ROUTES.ACCOUNTING_PARTIES, {
                  partyType: AccountingPartyTypeEnum.CUSTOMER,
                  balanceState: PartyBalanceStateEnum.DEBTOR,
                })}
                sub={
                  <>
                    <p>{formatNumber(data?.receivables?.partyCount)} مشتریِ بدهکار</p>
                    {receivablesOverdue > 0 && (
                      <p className="text-destructive">سررسیدگذشته {formatCompact(receivablesOverdue)}</p>
                    )}
                  </>
                }
              />
              <StatTile
                icon={ArrowDownLeft}
                label="بدهی به تامین‌کنندگان"
                hint="جمعِ مانده‌ی بستانکارِ تامین‌کنندگان در دفترِ حسابِ اشخاص — آنچه ما بدهکاریم."
                value={data?.payables?.total}
                isLoading={isLoading}
                to={withFilters(ROUTES.ACCOUNTING_PARTIES, {
                  partyType: AccountingPartyTypeEnum.SUPPLIER,
                  balanceState: PartyBalanceStateEnum.CREDITOR,
                })}
                sub={
                  <>
                    <p>{formatNumber(data?.payables?.partyCount)} تامین‌کننده‌ی بستانکار</p>
                    {payablesOverdue > 0 && (
                      <p className="text-warning">سررسیدگذشته {formatCompact(payablesOverdue)}</p>
                    )}
                  </>
                }
              />
              <StatTile
                icon={Boxes}
                label="ارزش موجودی"
                hint="آخرین ردیفِ دفترِ ارزشِ موجودیِ هر کالا: موجودیِ قابلِ فروش به‌اضافه‌ی کالای پول‌داده‌شده در قرنطینه. این بخش بهایی حساب نمی‌کند."
                value={data?.inventory?.totalValue}
                isLoading={isLoading}
                to={ROUTES.ACCOUNTING_INVENTORY}
                sub={
                  <>
                    <p>
                      {formatNumber(data?.inventory?.productCount)} کالا · {formatNumber(data?.inventory?.stock)} عدد
                    </p>
                    {Number(data?.inventory?.offPoolValue) > 0 && (
                      <p>در قرنطینه {formatCompact(data.inventory.offPoolValue)}</p>
                    )}
                  </>
                }
              />
              <StatTile
                icon={CalendarClock}
                label="اقساطِ دریافت‌نشده"
                hint="اقساطِ پرداخت‌نشده‌ی قراردادهای زنده، با هر سررسیدی."
                value={data?.installments?.outstandingAmount}
                isLoading={isLoading}
                to={withFilters(ROUTES.SALES_INSTALLMENTS, { view: "unpaid" })}
                sub={
                  <>
                    <p>
                      {formatNumber(data?.installments?.outstandingCount)} قسط از{" "}
                      {formatNumber(data?.installments?.activePlanCount)} قرارداد
                    </p>
                    {Number(data?.installments?.overdueAmount) > 0 && (
                      <p className="text-destructive">
                        سررسیدگذشته {formatCompact(data.installments.overdueAmount)} (
                        {formatNumber(data.installments.overdueCount)} قسط)
                      </p>
                    )}
                  </>
                }
              />
            </div>
          </DashboardSection>

          <DashboardSection title="در بازه" caption="فاکتورهای صادرشده با تاریخِ فاکتور، پرداخت‌ها با تاریخِ پرداخت">
            <DateRangeToolbar
              fromDate={fromDate}
              toDate={toDate}
              onRangeChange={setRange}
              onReset={resetFilters}
              presets={TWELVE_MONTH_RANGE_PRESETS}
              emptyLabel="۱۲ ماهِ منتهی به امروز"
              extra={<PeriodTypeSelect value={periodType} onChange={setPeriodType} />}
            />

            <div data-figures className="grid grid-cols-2 gap-2 transition-opacity sm:gap-3 xl:grid-cols-4">
              <StatTile
                icon={Receipt}
                label="فروش"
                hint="جمعِ فاکتورهای فروشِ صادرشده با مالیات. مانده = قابلِ پرداخت منهای پرداخت‌شده (اقساطی: جمعِ قرارداد)."
                value={data?.sales?.totalAmount}
                isLoading={isLoading}
                to={rangeLink(ROUTES.ACCOUNTING_SALES)}
                sub={
                  <>
                    <p>
                      {formatNumber(data?.sales?.count)} فاکتور · مالیات {formatCompact(data?.sales?.taxAmount)}
                    </p>
                    <p>مانده‌ی دریافت‌نشده {formatCompact(data?.sales?.remainingAmount)}</p>
                  </>
                }
              />
              <StatTile
                icon={ShoppingBag}
                label="خرید"
                hint="جمعِ فاکتورهای خرید با مالیات. مانده بدونِ سهمِ اقلامِ بسته‌شده با کسری است."
                value={data?.purchases?.totalAmount}
                isLoading={isLoading}
                to={rangeLink(ROUTES.ACCOUNTING_PURCHASES)}
                sub={
                  <>
                    <p>
                      {formatNumber(data?.purchases?.count)} فاکتور · مالیات {formatCompact(data?.purchases?.taxAmount)}
                    </p>
                    <p>مانده‌ی پرداخت‌نشده {formatCompact(data?.purchases?.remainingAmount)}</p>
                  </>
                }
              />
              <StatTile
                icon={ArrowLeftRight}
                label="خالص جریان نقد"
                hint="دریافت‌ها منهای پرداخت‌ها در بازه، با هر روشی (نقد، کارت، حواله، چک، قسط). ردیف‌های باطل‌شده حساب نمی‌شوند."
                value={data?.cash?.net}
                tone={Number(data?.cash?.net) < 0 ? "danger" : undefined}
                isLoading={isLoading}
                to={rangeLink(ROUTES.ACCOUNTING_PAYMENTS)}
                sub={
                  <p>
                    دریافت {formatCompact(data?.cash?.totalIn)} · پرداخت {formatCompact(data?.cash?.totalOut)}
                  </p>
                }
              />
              <StatTile
                icon={Percent}
                label="مالیات خالص ارزش افزوده"
                hint="مالیاتِ فروش منهای مالیاتِ خرید. منفی یعنی اعتبارِ مالیاتی."
                value={data?.tax?.netTaxPayable}
                tone={Number(data?.tax?.netTaxPayable) < 0 ? "info" : undefined}
                isLoading={isLoading}
                to={rangeLink(ROUTES.ACCOUNTING_TAX)}
                sub={
                  <p>
                    فروش {formatCompact(data?.tax?.outputTax)} · خرید {formatCompact(data?.tax?.inputTax)}
                  </p>
                }
              />
            </div>

            <div data-figures className="grid min-w-0 grid-cols-1 gap-3 transition-opacity xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <TradeSeriesCard series={data?.series} periodType={periodType} isLoading={isLoading} />
              </div>
              <div className="min-w-0">
                <CashByTypeCard byType={data?.cash?.byType} isLoading={isLoading} />
              </div>
              <div className="min-w-0 xl:col-span-3">
                <CashSeriesCard series={data?.series} periodType={periodType} isLoading={isLoading} />
              </div>
            </div>
          </DashboardSection>

          <DashboardSection title="طلب، بدهی و پیگیری" caption="همین حالا">
            <div data-figures className="grid min-w-0 grid-cols-1 gap-3 transition-opacity xl:grid-cols-2">
              <div className="min-w-0">
                <AgingCard receivables={data?.receivables} payables={data?.payables} isLoading={isLoading} />
              </div>
              <div className="min-w-0">
                <AttentionCard data={data} isLoading={isLoading} />
              </div>
            </div>
          </DashboardSection>
        </div>
      )}
    </div>
  );
}
