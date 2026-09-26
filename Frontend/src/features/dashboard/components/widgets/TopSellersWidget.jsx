import { Link } from "react-router-dom";
import ChartCard from "@/shared/components/charts/ChartCard";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";
import { useSalesPerformanceByEmployeeQuery } from "@/features/reports/services/queries";
import MemberRankList from "./MemberRankList";

const TOP = 5;
const SIDES = { showSales: true, showPurchases: false };

/**
 * پنج کارمندِ پرفروش — پیش‌نمایشِ صفحه‌ی «فعالیت کارمندان».
 *
 * روی همان `GetSalesPerformanceByEmployee` است که آن صفحه؛ فقط با
 * `take=5`. سهمِ هر ردیف نسبت به جمعِ همین پنج نفر است، نه کلِ فروش —
 * سرور جمعِ کل را در این پاسخ نمی‌دهد و ساختنش از یک صفحه غلط بود.
 *
 * `GetSalesPerformanceByEmployee` بازه را فقط با تاریخ می‌گیرد، نه با
 * «نوع بازه»؛ پس تا وقتی تاریخی انتخاب نشده، کلِ سابقه است.
 */
export default function TopSellersWidget({ context, params }) {
  const { data, isLoading, isError, error, refetch } =
    useSalesPerformanceByEmployeeQuery({
      filters: { fromDate: params.fromDate, toDate: params.toDate },
      pagination: { pageIndex: 0, pageSize: TOP },
    });

  const items = data?.items ?? [];
  const total = items.reduce((acc, row) => acc + (Number(row.totalInvoiceAmount) || 0), 0);
  const members = items.map((row) => ({
    userId: row.userId,
    fullName: row.fullName,
    saleInvoiceAmount: Number(row.totalInvoiceAmount) || 0,
    salesCount: row.salesCount,
    share: total > 0 ? ((Number(row.totalInvoiceAmount) || 0) / total) * 100 : 0,
  }));

  return (
    <ChartCard
      title="پرفروش‌ترین کارمندان"
      description={
        params.fromDate || params.toDate
          ? "بر اساس مبلغ فاکتورهای فروش در بازه‌ی انتخاب‌شده."
          : "بر اساس مبلغ فاکتورهای فروش در کلِ سابقه؛ برای محدودکردن، تاریخ انتخاب کنید."
      }
      isLoading={false}
      action={
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link to={ROUTES.REPORTS_EMPLOYEES}>همه</Link>
        </Button>
      }
    >
      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <MemberRankList
          members={members}
          sides={SIDES}
          currentUserId={context.user?.id}
          isLoading={isLoading}
        />
      )}
    </ChartCard>
  );
}
