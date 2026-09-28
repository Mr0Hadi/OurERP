import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";

const EMPTY_ROWS = [];

/**
 * وضعیتِ صفحه‌بندی از پاسخِ نرمال‌شده‌ی لیست (`{ items, total, page, totalPages }`).
 * `page` سرور از ۱ شروع می‌شود و `pageIndex` جدول از ۰.
 */
function pageStateOf(data, pagination) {
  return {
    items: data?.items ?? EMPTY_ROWS,
    totalPages: data?.totalPages ?? 1,
    currentPage: data?.page ? data.page - 1 : pagination.pageIndex,
  };
}

/**
 * اتصالِ یک کوئریِ لیستِ سرور-ساید به جدولش — همان چند خطی که در هر صفحه‌ی
 * لیست تکرار می‌شد: خطا با «تلاش دوباره»، overlay هنگامِ واکشیِ صفحه‌ی بعد،
 * و محاسبه‌ی صفحه‌ی فعلی.
 *
 * @param {object} props
 * @param {import("@tanstack/react-query").UseQueryResult} props.query نتیجه‌ی کوئریِ لیست
 * @param {object} props.listState استورِ فیلتر (`createFilterStore`): pagination/sorting و setterها
 * @param {React.ComponentType} props.table جدولی با propsِ `DataTable`
 * @param {(items: object[]) => object[]} [props.transform] تبدیلِ ردیف‌ها قبل از نمایش
 *   (مثلاً افزودنِ ردیف‌های مرجوعی به صفِ انبار)
 * @param {boolean} [props.singlePage] نتیجه صفحه‌بندیِ سرور ندارد؛ همیشه «صفحه ۱ از ۱»
 * بقیه‌ی props مستقیم به جدول می‌رسد.
 */
export default function ServerTable({
  query,
  listState,
  table: Table,
  transform,
  singlePage = false,
  ...tableProps
}) {
  const { data, isLoading, isFetching, isError, error, refetch } = query;
  const { pagination, sorting, setPagination, setSorting } = listState;

  if (isError) return <QueryErrorState error={error} onRetry={() => refetch()} />;

  const { items, totalPages, currentPage } = pageStateOf(data, pagination);

  return (
    <FetchingOverlay active={isFetching && !isLoading}>
      <Table
        data={transform ? transform(items) : items}
        isLoading={isLoading}
        totalPages={singlePage ? 1 : totalPages}
        currentPage={currentPage}
        pageSize={pagination.pageSize}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        {...tableProps}
      />
    </FetchingOverlay>
  );
}
