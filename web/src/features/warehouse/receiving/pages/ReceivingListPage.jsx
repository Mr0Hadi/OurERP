import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import useReceivingFilterStore from "../store/receivingFilterStore";
import { useDebouncedReceivingFilters } from "../hooks/useDebouncedReceivingFilters";
import { useReceivingPurchasesQuery } from "../services/queries";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import ReceivingFilters from "../components/table/ReceivingFilters";
import ReceivingTable from "../components/table/ReceivingTable";

const ReceivingListPage = () => {
  const { pagination, sorting, setPagination, setSorting } =
    useReceivingFilterStore();
  const debouncedFilters = useDebouncedReceivingFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useReceivingPurchasesQuery(debouncedFilters, pagination, sorting);

  const { data: suppliersData, isLoading: isSuppliersLoading } =
    useSuppliersQuery(
      {},
      { pageIndex: 0, pageSize: 200 },
      { id: "name", desc: false }
    );

  const suppliers = suppliersData?.items ?? [];
  const purchases = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>دریافت کالاهای انبار</CardTitle>
          <div className="text-sm text-muted-foreground">
            بررسی و تأیید کالاهای خریداری شده
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <ReceivingFilters
            suppliers={suppliers}
            isSuppliersLoading={isSuppliersLoading}
          />

          {isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {error?.message ?? "خطایی رخ داده است"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                تلاش مجدد
              </Button>
            </div>
          ) : (
            <div className="relative">
              {isFetching && !isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/60 backdrop-blur-[2px]">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              )}
              <ReceivingTable
                data={purchases}
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

export default ReceivingListPage;
