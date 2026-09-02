// src/features/reports/components/ActivityReportSection.jsx
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

import ActivityRangeToolbar from "./ActivityRangeToolbar";
import ActivityRankTable from "./ActivityRankTable";
import ActivitySummary from "./ActivitySummary";

/**
 * یک گزارشِ فعالیتِ کامل: نوارِ بازه، خلاصه، و جدولِ رتبه‌بندی.
 *
 * هر چهار گزارش دقیقاً همین سه تکه را دارند و فقط در «کدام هوک» و
 * «عنوانِ ستون‌ها» فرق می‌کنند؛ پس صفحه‌ها این کامپوننت را با یک استور و
 * یک هوک صدا می‌زنند و خودشان هیچ منطقِ داده‌ای ندارند.
 */
export default function ActivityReportSection({
  useFilterStore,
  useReportQuery,
  hint,
  nameHeader,
  nameKey = "fullName",
  countHeader,
  countKey,
  countLabel,
  amountHeader,
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
  // شماره‌ی صفحه‌ی سرور یک‌مبناست و جدول صفرمبنا.
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="space-y-3">
      <ActivityRangeToolbar
        hint={hint}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onReset={resetFilters}
      />

      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <ActivitySummary
            items={items}
            isLoading={isLoading}
            countLabel={countLabel}
            nameKey={nameKey}
          />

          <FetchingOverlay active={isFetching && !isLoading}>
            <ActivityRankTable
              data={items}
              isLoading={isLoading}
              totalPages={totalPages}
              currentPage={currentPage}
              pageSize={pagination.pageSize}
              onPaginationChange={setPagination}
              nameHeader={nameHeader}
              nameKey={nameKey}
              countHeader={countHeader}
              countKey={countKey}
              amountHeader={amountHeader}
              showPayment={showPayment}
              emptyMessage={emptyMessage}
            />
          </FetchingOverlay>
        </>
      )}
    </div>
  );
}
