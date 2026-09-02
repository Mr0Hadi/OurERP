// src/features/reports/components/ActivityReportSection.jsx
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

import ActivityRangeToolbar from "./ActivityRangeToolbar";
import ActivityRankList from "./ActivityRankList";
import ActivitySummary from "./ActivitySummary";

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
    pagination,
    setFromDate,
    setToDate,
    setPagination,
    resetFilters,
  } = useFilterStore();

  const { data, isLoading, isFetching, isError, error, refetch } = useReportQuery({
    filters: { fromDate, toDate },
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
      <ActivityRangeToolbar
        fromDate={fromDate}
        toDate={toDate}
        onRangeChange={handleRangeChange}
        onReset={resetFilters}
      />

      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <ActivitySummary
            items={items}
            isLoading={isLoading}
            countLabel={{ label: countLabel, key: countKey }}
            nameKey={nameKey}
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
