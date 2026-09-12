import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { useReceivingFilterStore } from "../store/receivingFilterStore";
import { useDebouncedReceivingFilters } from "../hooks/useDebouncedReceivingFilters";
import { useReceivablePurchasesQuery } from "../services/queries";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import ReceivingFilters from "../components/table/ReceivingFilters";
import ReceivingTable from "../components/table/ReceivingTable";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

/**
 * صفِ دریافت = `GetPurchaseList` فیلترشده روی وضعیت‌های قابلِ دریافت.
 *
 * تحویل‌گرفتنِ کالای برگشتیِ مشتری در این صف نیست: بکند چنین لیستِ
 * ترکیبی‌ای ندارد و آن کار یک دورِ اثرِ `GOODS_IN` روی خودِ مرجوعیِ فروش
 * است — از صفحه‌ی همان مرجوعی باز می‌شود.
 */
const ReceivingListPage = () => {
  const { pagination, sorting, setPagination, setSorting } =
    useReceivingFilterStore();
  const debouncedFilters = useDebouncedReceivingFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useReceivablePurchasesQuery(debouncedFilters, pagination);

  const { data: suppliersData, isLoading: isSuppliersLoading } =
    useSuppliersQuery(
      {},
      { pageIndex: 0, pageSize: 200 },
      { id: "name", desc: false },
    );

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex sm:flex-row flex-col sm:items-center justify-between">
          <CardTitle>دریافت کالاهای انبار</CardTitle>
          <div className="text-sm text-muted-foreground">
            بررسی و ثبت کالاهای خریداری‌شده‌ای که هنوز کامل نرسیده‌اند
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <ReceivingFilters
            suppliers={suppliersData?.items ?? []}
            isSuppliersLoading={isSuppliersLoading}
          />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <ReceivingTable
                data={rows}
                isLoading={isLoading}
                totalPages={totalPages}
                currentPage={currentPage}
                pageSize={pagination.pageSize}
                onPaginationChange={setPagination}
                sorting={sorting}
                onSortingChange={setSorting}
              />
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceivingListPage;
