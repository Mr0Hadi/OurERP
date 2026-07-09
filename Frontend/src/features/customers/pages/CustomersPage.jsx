// features/customers/pages/CustomersPage.jsx
import { useCustomersQuery } from "../services/queries";
import { useCustomerFilterStore } from "../store/customerFilterStore";
import { useDebouncedFilters } from "../hooks/useDebouncedFilters";
import CustomerTable from "../components/CustomerTable";
import CustomerFilters from "../components/CustomerFilters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";

const CustomersPage = () => {
  const navigate = useNavigate();
  const { pagination, sorting, setPagination, setSorting } =
    useCustomerFilterStore();

  const debouncedFilters = useDebouncedFilters();

  const { data, isLoading, isFetching, isError, error, refetch } =
    useCustomersQuery(debouncedFilters, pagination, sorting);

  const customers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ? data.page - 1 : pagination.pageIndex;

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>مدیریت مشتریان</CardTitle>
          <Button onClick={() => navigate(ROUTES.CUSTOMERS_NEW)} className="gap-2">
            <Plus className="h-4 w-4" />
            مشتری جدید
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <CustomerFilters />

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
              <CustomerTable
                data={customers}
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

export default CustomersPage;
