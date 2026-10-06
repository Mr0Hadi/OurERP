import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronLeft } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import StatusBadge from "@/shared/components/status/StatusBadge";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import DataTablePagination from "@/shared/components/table/DataTablePagination";
import { InstallmentPlanStatusBadge } from "./InstallmentStatusBadge";
import { useInstallmentCountQuery, useInstallmentPlansQuery } from "../services/queries";
import { installmentListParams } from "../domain/installmentViews";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { gregorianToPersian, todayIso } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";


/**
 * قراردادهای اقساطیِ یک مشتری (`GetSaleInstallmentPlanList?customerId`) — مانده، اقساطِ
 * پرداخت‌شده و سررسیدِ بعدیِ هر قرارداد، و شمارِ اقساطِ سررسیدگذشته‌اش. هر ردیف به فاکتور
 * می‌رود و «همه‌ی اقساط» به صفحه‌ی اقساط با فیلترِ همین مشتری.
 */
export default function CustomerInstallmentsCard({ customerId }) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
  const plans = useInstallmentPlansQuery({ customerId }, pagination, null);
  const overdue = useInstallmentCountQuery(installmentListParams({ view: "overdue", customerId }));
  const today = todayIso();
  const rows = plans.data?.items ?? [];

  return (
    <Card className="shadow-md rounded-2xl overflow-hidden pt-0 gap-0">
      <CardHeader className="border-b bg-muted/30 py-4 px-6">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2.5 text-lg font-bold">
          <span className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarClock className="h-4.5 w-4.5 text-primary" />
            </span>
            اقساط
          </span>
          {overdue.data > 0 && (
            <StatusBadge tone="danger">{formatNumber(overdue.data)} قسطِ سررسیدگذشته</StatusBadge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 py-5 space-y-3">
        {plans.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : plans.isError ? (
          <QueryErrorState error={plans.error} onRetry={() => plans.refetch()} />
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            هیچ قرارداد اقساطی برای این مشتری ثبت نشده است.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {rows.map((plan) => {
                const isActive = plan.status === SaleInstallmentPlanStatusEnum.ACTIVE;
                const late = isActive && plan.nextDueDate && String(plan.nextDueDate).slice(0, 10) < today;
                return (
                  <li key={plan.planId}>
                    <Link
                      to={routeWithId(ROUTES.SALES_DETAIL, plan.saleId)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs">{plan.invoiceNumber || `#${formatDigits(plan.saleId)}`}</span>
                          <InstallmentPlanStatusBadge status={plan.status} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatNumber(plan.paidInstallmentCount)} از {formatNumber(plan.installmentCount)} قسط
                          {isActive && plan.nextDueDate && (
                            <span className={late ? toneText("danger") : undefined}>
                              {" · "}سررسیدِ بعدی {gregorianToPersian(plan.nextDueDate)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="text-[11px] text-muted-foreground">مانده</p>
                        <p className="font-semibold tabular-nums">
                          {Number(plan.remainingAmount) > 0 ? formatNumber(plan.remainingAmount) : "تسویه"}
                        </p>
                      </div>
                      <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {(plans.data?.totalPages ?? 1) > 1 && (
              <DataTablePagination
                currentPage={pagination.pageIndex}
                totalPages={plans.data.totalPages}
                pageSize={pagination.pageSize}
                onPaginationChange={setPagination}
              />
            )}
          </>
        )}
        <Button asChild variant="ghost" size="sm" className="w-full gap-1.5">
          <Link to={`${ROUTES.SALES_INSTALLMENTS}?view=unpaid&customerId=${customerId}`}>
            همه‌ی اقساطِ پرداخت‌نشده‌ی این مشتری
            <ChevronLeft className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
