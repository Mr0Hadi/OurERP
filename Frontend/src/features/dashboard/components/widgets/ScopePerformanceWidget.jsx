import { useMemo } from "react";
import { Hourglass } from "lucide-react";
import ChartCard from "@/shared/components/charts/ChartCard";
import GroupedBarChart from "@/shared/components/charts/GroupedBarChart";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import KpiCard from "../KpiCard";
import MemberRankList from "./MemberRankList";
import { ReportScopeEnum } from "../../domain/dashboardContext";
import {
  buildScopeKpis,
  buildScopeSeries,
  rankMembers,
  scopeSides,
} from "../../domain/scopeMetrics";
import { useScopePerformanceQuery } from "../../services/queries";

const SCOPE_COPY = {
  [ReportScopeEnum.ME]: {
    title: "عملکرد من",
    description: "فروش و خریدی که با حسابِ خودتان ثبت شده است.",
  },
  [ReportScopeEnum.TEAM]: {
    title: "عملکرد تیم",
    description: "جمعِ اسنادِ اعضای فعلیِ تیم و سهمِ هر نفر.",
  },
  [ReportScopeEnum.DEPARTMENT]: {
    title: "عملکرد واحد",
    description: "جمعِ اسنادِ همه‌ی اعضای فعلیِ واحد، در همه‌ی تیم‌هایش.",
  },
};

function UnavailableState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center">
      <Hourglass className="size-5 text-muted-foreground" />
      <p className="text-sm font-medium">این گزارش هنوز روی سرور فعال نشده است</p>
      <p className="max-w-md text-xs leading-5 text-muted-foreground">
        به‌محضِ این‌که گزارشِ «عملکردِ محدوده» در سرور اضافه شود، همین‌جا
        عددهای شما نمایش داده می‌شود؛ نیازی به کاری از طرفِ شما نیست.
      </p>
    </div>
  );
}

/**
 * «من»، «تیم من» و «واحد من» — یک کامپوننت، سه محدوده.
 *
 * هر سه روی یک endpoint سوارند و فقط `scope` فرق می‌کند؛ سرور خودش از
 * روی توکن می‌داند تیم و واحدِ کاربر کدام است و به کسی که مسئول نیست
 * ۴۰۳ می‌دهد. محدوده‌ی «من» جدولِ اعضا ندارد و نمودارش تمام‌عرض است.
 */
export default function ScopePerformanceWidget({ context, scope, params }) {
  const copy = SCOPE_COPY[scope];
  const isPersonal = scope === ReportScopeEnum.ME;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    isUnavailable,
    error,
    refetch,
  } = useScopePerformanceQuery(scope, params);

  const series = useMemo(
    () => buildScopeSeries(data?.periods, params.periodType),
    [data, params.periodType],
  );
  const sides = useMemo(
    () =>
      scopeSides(series, {
        sells: context.sells,
        buys: context.buys,
        isPersonal,
      }),
    [series, context.sells, context.buys, isPersonal],
  );
  const kpis = useMemo(
    () => buildScopeKpis(series, params.periodType, sides),
    [series, params.periodType, sides],
  );
  const members = useMemo(
    () => rankMembers(data?.members, sides),
    [data, sides],
  );

  const chartSeries = [
    sides.showSales && {
      key: "saleInvoiceAmount",
      label: "فروش",
      color: "var(--chart-1)",
    },
    sides.showPurchases && {
      key: "purchaseInvoiceAmount",
      label: "خرید",
      color: "var(--chart-4)",
    },
  ].filter(Boolean);

  const title = data?.scopeName ? `${copy.title} — ${data.scopeName}` : copy.title;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {isUnavailable ? (
          <UnavailableState />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <FetchingOverlay active={isFetching && !isLoading}>
            <div className="min-w-0 space-y-4">
              {/* یک طرف (فقط فروش یا فقط خرید) دو کارت است؛ در گریدِ
                  چهارستونه نیمی از ردیف خالی می‌ماند. */}
              <div
                className={cn(
                  "grid min-w-0 grid-cols-2 gap-3",
                  kpis.length > 2 && "xl:grid-cols-4",
                )}
              >
                {kpis.map((kpi) => (
                  <div key={kpi.key} className="min-w-0">
                    <KpiCard kpi={kpi} isLoading={isLoading} />
                  </div>
                ))}
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-5">
                <div className={isPersonal ? "min-w-0 xl:col-span-5" : "min-w-0 xl:col-span-3"}>
                  <ChartCard
                    title="روند مبلغ فاکتورها"
                    description="بر اساس تاریخ فاکتور، با همان قاعده‌ی گزارشِ کلِ سازمان؛ پیش‌فاکتوری که هنوز تاریخِ فاکتور ندارد حساب نمی‌شود."
                    isLoading={isLoading}
                    className="shadow-none"
                  >
                    <GroupedBarChart data={series} series={chartSeries} height={220} />
                  </ChartCard>
                </div>

                {!isPersonal && (
                  <div className="min-w-0 xl:col-span-2">
                    <ChartCard
                      title="سهم اعضا"
                      description="سهمِ هر عضو از جمعِ مبلغ در بازه‌ی انتخاب‌شده."
                      isLoading={false}
                      className="shadow-none"
                    >
                      <MemberRankList
                        members={members}
                        sides={sides}
                        currentUserId={context.user?.id}
                        isLoading={isLoading}
                        showTeam={scope === ReportScopeEnum.DEPARTMENT}
                      />
                    </ChartCard>
                  </div>
                )}
              </div>
            </div>
          </FetchingOverlay>
        )}
      </CardContent>
    </Card>
  );
}
