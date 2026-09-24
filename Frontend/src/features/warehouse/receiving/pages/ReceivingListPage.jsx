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
import { useQueueRows } from "../../shared/useQueueRows";
import { needsDocumentList } from "../../shared/queueFilters";

/**
 * صفِ دریافت = `GetPurchaseList` فیلترشده روی وضعیت‌های قابلِ دریافت.
 *
 * کالای مرجوعی (جایگزینِ تامین‌کننده، برگشتیِ مشتری) در کارتِ جدای
 * «کالای مرجوعی منتظر دریافت» بالای همین صفحه می‌آید.
 */
const ReceivingListPage = () => {
  const { pagination, sorting, setPagination, setSorting } =
    useReceivingFilterStore();
  const debouncedFilters = useDebouncedReceivingFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useReceivablePurchasesQuery(debouncedFilters, pagination, sorting);

  const { data: suppliersData, isLoading: isSuppliersLoading } =
    useSuppliersQuery(
      {},
      { pageIndex: 0, pageSize: 200 },
      { id: "name", desc: false },
    );

  // کالای مرجوعیِ منتظر (`useQueueRows`): جایگزین روی ردیفِ همان خرید/فروش
  // علامت می‌خورد؛ برگشتیِ مشتری / عودت به تامین‌کننده ردیفِ خودش را دارد.
  const buildRows = useQueueRows("in", debouncedFilters, pagination.pageIndex === 0);
  const rows = buildRows(data?.items ?? []);
  // دو حالتِ مرجوعیِ فیلتر یک صفحه‌اند و صفحه‌بندیِ سرور ندارند.
  const totalPages = needsDocumentList(debouncedFilters.status)
    ? data?.totalPages ?? 1
    : 1;
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
