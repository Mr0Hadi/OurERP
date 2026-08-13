
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useShippingFilterStore } from "../store/shippingFilterStore";
import { useDebouncedShippingFilters } from "../hooks/useDebouncedShippingFilters";
import { useOutgoingQueueQuery } from "../services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";
import ShippingFilters from "../components/table/ShippingFilters";
import ShippingTable from "../components/table/ShippingTable";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

const ShippingListPage = () => {
  const { pagination, sorting, setPagination, setSorting } = useShippingFilterStore();
  const debouncedFilters = useDebouncedShippingFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useOutgoingQueueQuery(debouncedFilters, pagination, sorting);

  const { data: customersData, isLoading: isCustomersLoading } = useCustomersQuery(
    {},
    { pageIndex: 0, pageSize: 200 },
    { id: "name", desc: false },
  );

  const customers = customersData?.items ?? [];
  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex sm:flex-row flex-col sm:items-center justify-between">
          <CardTitle>ارسال کالاهای انبار</CardTitle>
          <div className="text-sm text-muted-foreground">
            آماده‌سازی و ارسال سفارش‌های مشتریان و کالاهای جایگزین مرجوعی
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <ShippingFilters customers={customers} isCustomersLoading={isCustomersLoading} />

          {isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
              <ShippingTable
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

export default ShippingListPage;