import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { useSaleFilterStore } from "../store/saleFilterStore";
import { useDebouncedSaleFilters } from "../hooks/useDebouncedSaleFilters";
import { useSalesQuery } from "../services/queries";
import { useCustomersQuery } from "@/features/customers/services/queries";
import SaleFilters from "../components/table/SaleFilters";
import SaleTable from "../components/table/SaleTable";
import { ROUTES } from "@/shared/constants/routes";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

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
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : (
            <FetchingOverlay active={isFetching && !isLoading}>
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
            </FetchingOverlay>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalePage;