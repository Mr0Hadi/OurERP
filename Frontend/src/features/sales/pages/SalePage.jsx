import { useNavigate } from "react-router-dom";
import { Plus, AlertCircle, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import useSaleFilterStore from "../store/saleFilterStore";
import useDebouncedSaleFilters from "../hooks/useDebouncedSaleFilters";
import { useSalesQuery } from "../services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";
import SaleFilters from "../components/SaleFilters";
import SaleTable from "../components/SaleTable";
import { ROUTES } from "@/shared/constants/routes";

const SalePage = () => {
  const navigate = useNavigate();
  const { pagination, sorting, setPagination, setSorting } =
    useSaleFilterStore();
  const debouncedFilters = useDebouncedSaleFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useSalesQuery(debouncedFilters, pagination, sorting);

  const { data: customersData, isLoading: isCustomersLoading } =
    useCustomersQuery(
      {},
      { pageIndex: 0, pageSize: 200 },
      { id: "name", desc: false }
    );

  const customers = customersData?.items ?? [];
  const sales = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت فروش‌ها</CardTitle>
          <Button onClick={() => navigate(ROUTES.SALES_NEW)} className="gap-2">
            <Plus className="h-4 w-4" />
            فروش جدید
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <SaleFilters
            customers={customers}
            isCustomersLoading={isCustomersLoading}
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
              <SaleTable
                data={sales}
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

export default SalePage;