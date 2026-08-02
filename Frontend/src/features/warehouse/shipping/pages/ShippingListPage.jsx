import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import useShippingFilterStore from "../store/shippingFilterStore";
import { useDebouncedShippingFilters } from "../hooks/useDebouncedShippingFilters";
import { useOutgoingQueueQuery } from "../services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";
import ShippingFilters from "../components/table/ShippingFilters";
import ShippingTable from "../components/table/ShippingTable";

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
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{error?.message ?? "خطایی رخ داده است"}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" />تلاش مجدد
              </Button>
            </div>
          ) : (
            <div className="relative">
              {isFetching && !isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/60 backdrop-blur-[2px]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              )}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingListPage;