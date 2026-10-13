import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import ActivityRankList from "./ActivityRankList";
import SummaryStrip from "../../components/SummaryStrip";
import { formatPercent } from "@/shared/components/charts/chartUtils";

/**
 * خلاصه‌ی بالای فهرست، فقط از ردیف‌های **همین صفحه** (سرور جمعِ کل را برنمی‌گرداند و گرفتنِ
 * همه‌ی صفحه‌ها برای یک عدد سنگین است؛ عنوانِ نوار همین را می‌گوید).
 */
function pageSummary(items, { nameKey, countKey, countLabel }) {
  const totalAmount = items.reduce((sum, row) => sum + (Number(row.totalInvoiceAmount) || 0), 0);
  const totalCount = items.reduce((sum, row) => sum + (Number(row[countKey]) || 0), 0);
  const top = items[0];
  const topShare = top && totalAmount > 0 ? ((Number(top.totalInvoiceAmount) || 0) / totalAmount) * 100 : null;

  return [
    { key: "amount", label: "جمع مبلغ", value: totalAmount, emphasis: true },
    { key: "count", label: countLabel, value: totalCount, format: "count" },
    {
      key: "top",
      label: topShare != null ? `صدرنشین (${formatPercent(topShare)})` : "صدرنشین",
      value: top?.[nameKey] || "—",
      format: "text",
    },
  ];
}

/**
 * یک گزارشِ فعالیتِ کامل: نوارِ بازه، خلاصه، و فهرستِ رتبه‌بندی.
 *
 * هر چهار گزارش دقیقاً همین سه تکه را دارند و فقط در «کدام هوک» و
 * «برچسبِ ستون‌ها» فرق می‌کنند؛ پس صفحه‌ها این کامپوننت را با یک استور و
 * یک هوک صدا می‌زنند و خودشان هیچ منطقِ داده‌ای ندارند.
 */
export default function ActivityReportSection({
  useFilterStore,
  useReportQuery,
  nameKey = "fullName",
  countKey,
  countLabel,
  countUnit,
  showPayment = false,
  emptyMessage,
}) {
  const {
    fromDate,
    toDate,
    teamId,
    departmentId,
    pagination,
    setFromDate,
    setToDate,
    setPagination,
    resetFilters,
  } = useFilterStore();

  const { data, isLoading, isFetching, isError, error, refetch } = useReportQuery({
    filters: { fromDate, toDate, teamId, departmentId },
    pagination,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  // شماره‌ی صفحه‌ی سرور یک‌مبناست و فهرست صفرمبنا.
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  /** نوارِ بازه دو تاریخ را با هم می‌دهد (دکمه‌های آماده هر دو را می‌سازند). */
  const handleRangeChange = (range) => {
    if (range.fromDate !== fromDate) setFromDate(range.fromDate);
    if (range.toDate !== toDate) setToDate(range.toDate);
  };

  return (
    <div className="space-y-3">
      <DateRangeToolbar
        fromDate={fromDate}
        toDate={toDate}
        onRangeChange={handleRangeChange}
        onReset={resetFilters}
      />

      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <SummaryStrip
            items={pageSummary(items, { nameKey, countKey, countLabel })}
            isLoading={isLoading}
            caption="جمعِ همین صفحه — سرور جمعِ کلِ گزارش را نمی‌دهد"
          />

          <FetchingOverlay active={isFetching && !isLoading}>
            <ActivityRankList
              items={items}
              isLoading={isLoading}
              totalPages={totalPages}
              currentPage={currentPage}
              pageSize={pagination.pageSize}
              onPaginationChange={setPagination}
              nameKey={nameKey}
              countKey={countKey}
              countUnit={countUnit}
              showPayment={showPayment}
              emptyMessage={emptyMessage}
            />
          </FetchingOverlay>
        </>
      )}
    </div>
  );
}
